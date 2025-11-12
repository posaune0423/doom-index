/**
 * Round the market cap values to 6 decimal places
 * Increased from 4 to 6 to better detect small market cap changes
 * for tokens with large supply (e.g., 1B supply Solana tokens)
 * @param input - The market cap values to round
 * @returns The rounded market cap values
 */
export function roundMc4<T extends Record<string, number>>(input: T): T {
  const out: Record<string, number> = {};
  for (const k of Object.keys(input)) {
    const v = input[k] ?? 0;
    // Use 6 decimal places instead of 4 to detect smaller market cap changes
    out[k] = Math.round(v * 1_000_000) / 1_000_000;
  }
  return out as T;
}
