import "dotenv/config";

/**
 * ChipsBank operator config — all optional. When any piece is missing,
 * `config.bank` is null and the server simply can't settle real stakes:
 * `set_stake` rejects anything above 0 with `stake_unavailable`. This lets
 * the room server ship and run today without an operator key, the same
 * posture spaceship uses for its `SETTLEMENT_MODE` flag.
 */
export interface BankConfig {
  chain: "base" | "celo";
  rpcUrl: string;
  chipsBankAddress: `0x${string}`;
  operatorPrivateKey: `0x${string}`;
}

/** 0x-prefixed 32-byte hex string — anything else crashes viem's privateKeyToAccount. */
function isValidPrivateKey(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

function loadBankConfig(): BankConfig | null {
  const chipsBankAddress = process.env.CHIPSBANK_ADDRESS?.trim();
  const operatorPrivateKey = process.env.LUDO_OPERATOR_KEY?.trim();
  if (!chipsBankAddress || !operatorPrivateKey) return null;

  if (!isValidPrivateKey(operatorPrivateKey)) {
    console.error(
      "LUDO_OPERATOR_KEY is set but is not a valid 0x-prefixed 32-byte private key " +
        "(check for stray whitespace or a truncated paste) — ChipsBank settlement " +
        "stays disabled, only stake 0 (Friendly) tables will work."
    );
    return null;
  }

  return {
    chain: (process.env.CHAIN || "celo") as "base" | "celo",
    rpcUrl: process.env.RPC_URL || "",
    chipsBankAddress: chipsBankAddress as `0x${string}`,
    operatorPrivateKey,
  };
}

export const config = {
  bank: loadBankConfig(),
};
