/**
 * StellarDice room server: a single Node process holding all live rooms in
 * memory, speaking the shared JSON protocol over WebSockets.
 *
 *   PORT (default 5100)   HTTP health endpoint + WS upgrade on the same port
 */
import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomError, RoomManager } from './rooms';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';

const PORT = Number(process.env.PORT ?? 5100);
const MAX_FRAME_BYTES = 4096;
const HEARTBEAT_MS = 30_000;
const SWEEP_MS = 60_000;

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
const manager = new RoomManager(log);

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: manager.roomCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_FRAME_BYTES });

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

const alive = new WeakSet<WebSocket>();

wss.on('connection', (ws) => {
  alive.add(ws);
  ws.on('pong', () => alive.add(ws));

  ws.on('message', (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
      if (typeof msg !== 'object' || msg === null || typeof msg.t !== 'string') throw new Error();
    } catch {
      send(ws, { t: 'error', code: 'invalid_message', message: 'Malformed message.' });
      return;
    }

    try {
      switch (msg.t) {
        case 'create_room': manager.create(ws, msg.name, msg.avatarId); break;
        case 'join_room': manager.join(ws, msg.code, msg.name, msg.avatarId); break;
        case 'rejoin': manager.rejoin(ws, msg.code, msg.playerToken); break;
        case 'set_rules': manager.setRules(ws, msg.rules); break;
        case 'set_ready': manager.setReady(ws, msg.ready); break;
        case 'start_game': manager.startGame(ws); break;
        case 'roll': manager.roll(ws); break;
        case 'move': manager.move(ws, msg.tokenId); break;
        case 'chat': manager.chat(ws, msg.text); break;
        case 'reaction': manager.reaction(ws, msg.icon); break;
        case 'leave': manager.leave(ws); break;
        default:
          send(ws, { t: 'error', code: 'invalid_message', message: 'Unknown message type.' });
      }
    } catch (err) {
      if (err instanceof RoomError) {
        send(ws, { t: 'error', code: err.code, message: err.message });
      } else {
        log(`unexpected error: ${err instanceof Error ? err.stack : String(err)}`);
        send(ws, { t: 'error', code: 'invalid_message', message: 'Something went wrong.' });
      }
    }
  });

  ws.on('close', () => manager.onSocketClosed(ws));
  ws.on('error', () => ws.close());
});

// Heartbeat: drop connections that stop answering pings
setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) {
      ws.terminate();
      continue;
    }
    alive.delete(ws);
    ws.ping();
  }
}, HEARTBEAT_MS);

setInterval(() => manager.sweep(), SWEEP_MS);

httpServer.listen(PORT, () => log(`room server listening on :${PORT}`));
