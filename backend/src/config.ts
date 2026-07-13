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

function loadBankConfig(): BankConfig | null {
  const chipsBankAddress = process.env.CHIPSBANK_ADDRESS;
  const operatorPrivateKey = process.env.LUDO_OPERATOR_KEY;
  if (!chipsBankAddress || !operatorPrivateKey) return null;

  return {
    chain: (process.env.CHAIN || "celo") as "base" | "celo",
    rpcUrl: process.env.RPC_URL || "",
    chipsBankAddress: chipsBankAddress as `0x${string}`,
    operatorPrivateKey: operatorPrivateKey as `0x${string}`,
  };
}

export const config = {
  bank: loadBankConfig(),
};
