/**
 * Real-money stake tiers for online 1v1 tables (CHIPS.md Phase 2). Fixed
 * tiers rather than free-form amounts: no fat-finger stakes, and both the
 * client picker and the server's validation read from the same list.
 */

/** USDC, display units (not on-chain 6-decimal units). 0 = Friendly. */
export const STAKE_TIERS_USDC = [0, 0.25, 1, 2.5] as const;

/** House cut of the pot on a settled real-money game, in basis points. */
export const RAKE_BPS = 300;

/** USDC display amount -> on-chain units (6 decimals). Safe for the fixed tiers above. */
export function usdcToUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}
