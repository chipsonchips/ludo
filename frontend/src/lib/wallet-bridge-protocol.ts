/**
 * ChipsOnChips wallet-bridge message protocol.
 *
 * The hub (parent window) proxies its connected EIP-1193 wallet to games it
 * embeds in an iframe. Games ship a `chipsHubConnector` wagmi connector that
 * speaks this protocol; when the handshake gets no answer (game opened
 * directly), the connector stays inert and the game's own wallets take over.
 *
 * This file is intentionally dependency-free and is vendored verbatim into
 * each game repo — keep both sides byte-identical when changing it.
 */

export const BRIDGE_SOURCE = "chipsonchips-wallet-bridge";
export const BRIDGE_VERSION = 1;

export interface BridgeHello {
  source: typeof BRIDGE_SOURCE;
  version: number;
  kind: "hello";
}

export interface BridgeRequest {
  source: typeof BRIDGE_SOURCE;
  version: number;
  kind: "request";
  id: number;
  method: string;
  params?: unknown;
}

export interface BridgeReady {
  source: typeof BRIDGE_SOURCE;
  version: number;
  kind: "ready";
  accounts: string[];
  chainId: number;
}

export interface BridgeResponse {
  source: typeof BRIDGE_SOURCE;
  version: number;
  kind: "response";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface BridgeEvent {
  source: typeof BRIDGE_SOURCE;
  version: number;
  kind: "event";
  event: "accountsChanged" | "chainChanged" | "disconnect";
  data: unknown;
}

export type ChildToParentMessage = BridgeHello | BridgeRequest;
export type ParentToChildMessage = BridgeReady | BridgeResponse | BridgeEvent;

export function isBridgeMessage(data: unknown): data is { source: typeof BRIDGE_SOURCE; kind: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === BRIDGE_SOURCE
  );
}
