/**
 * ChipsBank operator client: reads player balances and settles stakes
 * (debitFor at match start, creditFor at payout/refund). Mirrors
 * spin-extreme/server/src/bank.ts — same tx-queue-per-operator-account
 * reasoning, same ERC-1271/6492-aware signature verification.
 *
 * Everything here is null/no-op when `config.bank` is unset so the room
 * server keeps working for Friendly (stake 0) tables without an operator
 * key configured.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, celo } from "viem/chains";
import { CHIPS_BANK_ABI } from "@chipsonchips/shared/abi";
import { config } from "./config";

const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;

function buildClients() {
  if (!config.bank) return null;
  const chain = config.bank.chain === "celo" ? celo : base;
  const rpcUrl = config.bank.rpcUrl || chain.rpcUrls.default.http[0];
  const account = privateKeyToAccount(config.bank.operatorPrivateKey);
  return {
    publicClient: createPublicClient({ chain, transport: http(rpcUrl) }),
    walletClient: createWalletClient({ account, chain, transport: http(rpcUrl) }),
    address: config.bank.chipsBankAddress,
  };
}

const clients = buildClients();

export const bankAvailable = clients !== null;

function toRef(reference: string): `0x${string}` {
  return keccak256(toBytes(reference));
}

export function buildLoginMessage(address: string, timestamp: number): string {
  return `LuduChips — sign in\n\nWallet: ${address}\nTimestamp: ${timestamp}`;
}

/** Verifies a hub-wallet login signature. Requires the bank to be configured (needs an RPC client). */
export async function verifyWallet(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  if (!clients) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;

  const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
  if (!timestampMatch) return false;
  const timestamp = Number(timestampMatch[1]);
  if (Math.abs(Date.now() - timestamp) > SIGNATURE_MAX_AGE_MS) return false;

  const walletMatch = message.match(/Wallet:\s*(0x[a-fA-F0-9]{40})/);
  if (!walletMatch || walletMatch[1].toLowerCase() !== address.toLowerCase()) return false;

  try {
    return await clients.publicClient.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export async function playerBalanceUnits(player: `0x${string}`): Promise<bigint> {
  if (!clients) throw new Error("ChipsBank not configured");
  return clients.publicClient.readContract({
    abi: CHIPS_BANK_ABI,
    address: clients.address,
    functionName: "playerBalances",
    args: [player],
  }) as Promise<bigint>;
}

// Settlement writes go through one promise chain: the operator account's tx
// nonce is assigned per-write, so two matches settling at once would
// otherwise race eth_getTransactionCount and collide.
let txQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = txQueue.then(job, job);
  txQueue = run.catch(() => {});
  return run;
}

async function settle(
  functionName: "debitFor" | "creditFor",
  player: `0x${string}`,
  units: bigint,
  reference: string
): Promise<`0x${string}`> {
  if (!clients) throw new Error("ChipsBank not configured");
  return enqueue(async () => {
    const hash = await clients.walletClient.writeContract({
      abi: CHIPS_BANK_ABI,
      address: clients.address,
      functionName,
      args: [player, units, toRef(reference)],
    });
    const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`${functionName} reverted: ${hash}`);
    }
    return hash;
  });
}

/** Take a stake out of the player's balance into house liquidity (escrow at match start). */
export function debitFor(player: `0x${string}`, units: bigint, reference: string) {
  return settle("debitFor", player, units, reference);
}

/** Pay a pot/refund into the player's balance out of house liquidity. */
export function creditFor(player: `0x${string}`, units: bigint, reference: string) {
  return settle("creditFor", player, units, reference);
}
