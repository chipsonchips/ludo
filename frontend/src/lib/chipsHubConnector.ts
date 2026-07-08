/**
 * wagmi connector for the ChipsOnChips hub wallet bridge.
 *
 * When this app runs inside the hub's game iframe, the hub proxies its
 * connected wallet over postMessage (see wallet-bridge-protocol.ts). This
 * connector handshakes with the parent window; if the hub answers, wagmi can
 * connect through it and the player is signed in with the same wallet they
 * connected at the hub. If the handshake gets no answer (app opened directly,
 * or embedded somewhere else), the connector is inert and the regular
 * connectors behave exactly as before.
 */
import { createConnector } from "wagmi";
import { getAddress, numberToHex } from "viem";
import {
  BRIDGE_SOURCE,
  BRIDGE_VERSION,
  isBridgeMessage,
  type BridgeReady,
  type BridgeResponse,
  type BridgeEvent,
} from "./wallet-bridge-protocol";

const HELLO_TIMEOUT_MS = 500;
const HELLO_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 300_000; // signing can legitimately take minutes

type EventName = "accountsChanged" | "chainChanged" | "disconnect";

export class HubBridgeProvider {
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private listeners: Record<EventName, Set<(data: unknown) => void>> = {
    accountsChanged: new Set(),
    chainChanged: new Set(),
    disconnect: new Set(),
  };
  private hubOrigin: string | null = null;
  private detectPromise: Promise<BridgeReady | null> | null = null;
  private allowedOrigins: string[] | null;
  /** Last handshake result — accounts/chain the hub reported. */
  ready: BridgeReady | null = null;

  constructor() {
    // Optional hard allowlist of hub origins (comma-separated). Without it we
    // pin whichever origin answers the handshake first; a hostile embedder
    // can only impersonate accounts, never produce signatures for them.
    const env = import.meta.env.VITE_HUB_ORIGINS as string | undefined;
    this.allowedOrigins = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : null;
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.onMessage);
    }
  }

  private originOk(origin: string): boolean {
    if (this.hubOrigin) return origin === this.hubOrigin;
    if (this.allowedOrigins) return this.allowedOrigins.includes(origin);
    return true;
  }

  private onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    if (!isBridgeMessage(event.data)) return;
    if (!this.originOk(event.origin)) return;
    const msg = event.data as BridgeReady | BridgeResponse | BridgeEvent;

    if (msg.kind === "ready") {
      this.hubOrigin = this.hubOrigin ?? event.origin;
      this.ready = msg;
      return;
    }
    if (msg.kind === "response") {
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.error) {
        entry.reject(Object.assign(new Error(msg.error.message), { code: msg.error.code }));
      } else {
        entry.resolve(msg.result);
      }
      return;
    }
    if (msg.kind === "event") {
      this.listeners[msg.event]?.forEach((fn) => fn(msg.data));
    }
  };

  /** Resolves with the hub's handshake when embedded under it, else null. */
  detect(): Promise<BridgeReady | null> {
    if (typeof window === "undefined" || window.parent === window) {
      return Promise.resolve(null);
    }
    if (this.ready) return Promise.resolve(this.ready);
    if (this.detectPromise) return this.detectPromise;

    this.detectPromise = (async () => {
      for (let attempt = 0; attempt < HELLO_ATTEMPTS; attempt++) {
        window.parent.postMessage(
          { source: BRIDGE_SOURCE, version: BRIDGE_VERSION, kind: "hello" },
          "*",
        );
        const deadline = Date.now() + HELLO_TIMEOUT_MS;
        while (Date.now() < deadline) {
          if (this.ready) return this.ready;
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      this.detectPromise = null; // allow later retries (e.g. hub mounts slowly)
      return null;
    })();
    return this.detectPromise;
  }

  async request<T = unknown>(args: { method: string; params?: unknown }): Promise<T> {
    const ready = await this.detect();
    if (!ready || !this.hubOrigin) {
      throw Object.assign(new Error("ChipsOnChips hub not available"), { code: 4900 });
    }
    const id = this.nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Object.assign(new Error(`Hub request timed out: ${args.method}`), { code: -32603 }));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
    });
    window.parent.postMessage(
      { source: BRIDGE_SOURCE, version: BRIDGE_VERSION, kind: "request", id, ...args },
      this.hubOrigin,
    );
    return promise as Promise<T>;
  }

  on(event: EventName, fn: (data: unknown) => void) {
    this.listeners[event]?.add(fn);
  }

  removeListener(event: EventName, fn: (data: unknown) => void) {
    this.listeners[event]?.delete(fn);
  }
}

let sharedProvider: HubBridgeProvider | undefined;

/** Singleton so detection state is shared between the connector and UI code. */
export function getHubBridgeProvider(): HubBridgeProvider {
  if (!sharedProvider) sharedProvider = new HubBridgeProvider();
  return sharedProvider;
}

export const CHIPS_HUB_CONNECTOR_ID = "chipsHub";

export function chipsHubConnector() {
  return createConnector<HubBridgeProvider>((config) => {
    let accountsChangedFn: ((data: unknown) => void) | undefined;
    let chainChangedFn: ((data: unknown) => void) | undefined;
    let disconnectFn: ((data: unknown) => void) | undefined;

    const onDisconnect = () => {
      config.emitter.emit("disconnect");
    };

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        onDisconnect();
      } else {
        config.emitter.emit("change", { accounts: accounts.map((a) => getAddress(a)) });
      }
    };

    const onChainChanged = (chainIdHex: string) => {
      config.emitter.emit("change", { chainId: Number(chainIdHex) });
    };

    const getChainId = async () => {
      const hex = await getHubBridgeProvider().request<string>({ method: "eth_chainId" });
      return Number(hex);
    };

    const switchChain = async ({ chainId }: { chainId: number }) => {
      const chain = config.chains.find((c) => c.id === chainId);
      if (!chain) throw new Error(`Chain ${chainId} not configured`);
      await getHubBridgeProvider().request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: numberToHex(chainId) }],
      });
      return chain;
    };

    return {
      id: CHIPS_HUB_CONNECTOR_ID,
      name: "ChipsOnChips Hub",
      type: "chipsHub" as const,

      async getProvider() {
        return getHubBridgeProvider();
      },

      async connect<withCapabilities extends boolean = false>(
        {
          chainId,
          withCapabilities,
        }: {
          chainId?: number;
          isReconnecting?: boolean;
          withCapabilities?: withCapabilities | boolean;
        } = {},
      ) {
        const provider = getHubBridgeProvider();
        const ready = await provider.detect();
        if (!ready) {
          throw new Error("Not running inside the ChipsOnChips hub");
        }

        const rawAccounts = await provider.request<string[]>({ method: "eth_requestAccounts" });
        const accounts = rawAccounts.map((a) => getAddress(a));
        let currentChainId = await getChainId();
        if (chainId && currentChainId !== chainId) {
          try {
            await switchChain({ chainId });
            currentChainId = chainId;
          } catch {
            // stay on the hub's chain — games already handle chain mismatch UI
          }
        }

        if (!accountsChangedFn) {
          accountsChangedFn = (data) => onAccountsChanged(data as string[]);
          provider.on("accountsChanged", accountsChangedFn);
        }
        if (!chainChangedFn) {
          chainChangedFn = (data) => onChainChanged(data as string);
          provider.on("chainChanged", chainChangedFn);
        }
        if (!disconnectFn) {
          disconnectFn = () => onDisconnect();
          provider.on("disconnect", disconnectFn);
        }

        return {
          accounts: (withCapabilities
            ? accounts.map((address) => ({ address, capabilities: {} }))
            : accounts) as unknown as withCapabilities extends true
            ? readonly { address: `0x${string}`; capabilities: Record<string, unknown> }[]
            : readonly `0x${string}`[],
          chainId: currentChainId,
        };
      },

      async disconnect() {
        const provider = getHubBridgeProvider();
        if (accountsChangedFn) provider.removeListener("accountsChanged", accountsChangedFn);
        if (chainChangedFn) provider.removeListener("chainChanged", chainChangedFn);
        if (disconnectFn) provider.removeListener("disconnect", disconnectFn);
        accountsChangedFn = chainChangedFn = disconnectFn = undefined;
      },

      async getAccounts() {
        const accounts = await getHubBridgeProvider().request<string[]>({ method: "eth_accounts" });
        return accounts.map((a) => getAddress(a));
      },

      getChainId,

      async isAuthorized() {
        try {
          const ready = await getHubBridgeProvider().detect();
          return Boolean(ready && ready.accounts.length > 0);
        } catch {
          return false;
        }
      },

      switchChain,

      onAccountsChanged,
      onChainChanged,
      onDisconnect,
    };
  });
}
