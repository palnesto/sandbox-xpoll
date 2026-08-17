import { amount } from "./base";
import { type AssetType } from "./asset";

/**
 * Shorten a big asset amount to its first N digits.
 * Always works from base units → parent units (readable).
 *
 * @param value - Raw base unit amount (string | number | bigint)
 * @param assetId - Asset type (e.g. "xMYST", "xOcta", etc.)
 * @param digits - Number of leading digits to keep (default = 5)
 * @returns string (first N digits + "…" if truncated)
 */
export function shortenAmount(
  value: string | number | bigint,
  assetId: AssetType,
  digits = 5
): string {
  const r = amount({
    op: "toParent",
    assetId,
    value,
    output: "string",
    trim: true,
  });

  if (!r.ok) return "—";

  const str = r.value.replace(/,/g, ""); // remove commas
  if (str.length <= digits) return str;

  return str.slice(0, digits) + "..";
}
