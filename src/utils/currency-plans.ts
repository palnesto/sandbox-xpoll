export type CurrencyCode = string;

export const MINOR_UNIT_SCALE: Record<CurrencyCode, number> = {
  USD: 100,
  INR: 100,
  JPY: 1,
};

function fractionDigitsFromScale(scale: number): number {
  if (!scale || scale <= 1) return 0;
  return Math.round(Math.log10(scale));
}

export function fromMinor(amountMinor: number, currency: CurrencyCode): number {
  const scale = MINOR_UNIT_SCALE[currency] ?? 100;
  return amountMinor / scale;
}

export function formatMoneyFromMinor(
  amountMinor: number,
  currency: CurrencyCode,
  opts?: { locale?: string }
): string {
  const scale = MINOR_UNIT_SCALE[currency] ?? 100;
  const fractionDigits = fractionDigitsFromScale(scale);

  const amountMajor = amountMinor / scale;

  return new Intl.NumberFormat(opts?.locale ?? "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMajor);
}
