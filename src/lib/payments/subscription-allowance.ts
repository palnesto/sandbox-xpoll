export const SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC = 3_000n * 10n ** 6n;

export function parseAtomicBigInt(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}
