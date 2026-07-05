/**
 * Thin typed wrapper around the room-server WebSocket.
 * Owns the socket lifecycle (connect, heartbeat-free client side, backoff
 * reconnect); the roomStore owns what the messages mean.
 */
import type { ClientMessage, ServerMessage } from '@shared/protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

type MessageListener = (msg: ServerMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;

const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 10000];
const MAX_RECONNECT_ATTEMPTS = 12;

export function defaultServerUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.hostname}:8787`;
}

export class GameConnection {
  private ws: WebSocket | null = null;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  status: ConnectionStatus = 'idle';

  constructor(private url: string = defaultServerUrl()) {}

  onMessage(fn: MessageListener): () => void {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    for (const fn of this.statusListeners) fn(status);
  }

  connect(): Promise<void> {
    this.intentionalClose = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setStatus('open');
        resolve();
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          for (const fn of this.messageListeners) fn(msg);
        } catch {
          // Ignore malformed frames
        }
      };
      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        if (this.intentionalClose) {
          this.setStatus('closed');
          return;
        }
        reject(new Error('connection closed'));
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        // onclose follows and handles it
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('closed');
      return;
    }
    const delay = BACKOFF_STEPS_MS[Math.min(this.reconnectAttempt, BACKOFF_STEPS_MS.length - 1)];
    this.reconnectAttempt++;
    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // scheduleReconnect is re-armed by onclose
      });
    }, delay);
  }

  send(msg: ClientMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  close() {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.ws?.close();
    this.ws = null;
    this.setStatus('closed');
  }
}
