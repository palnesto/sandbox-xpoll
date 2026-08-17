// /** Format with up to 4 decimals, thousands for integer part */
// export function formatAmountShort(v: number | string): string {
//   const n = typeof v === "string" ? Number(v) : v;
//   if (!isFinite(n)) return String(v ?? "-");
//   const [i, f = ""] = String(n).split(".");
//   const int = Number(i).toLocaleString();
//   const frac = f.slice(0, 4);
//   return frac ? `${int}.${frac}` : int;
// }

// /** Full value for tooltip (don’t trim decimals) */
// export function formatAmountFull(v: number | string): string {
//   const n = typeof v === "string" ? Number(v) : v;
//   if (!isFinite(n)) return String(v ?? "-");
//   return n.toLocaleString(undefined, {
//     maximumFractionDigits: 20,
//     useGrouping: true,
//   });
// }
// NO COMMAS version
export function formatAmountShortNoComma(v: number | string): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return String(v ?? "-");
  const [i, f = ""] = String(n).split(".");
  const frac = f.slice(0, 4);
  return frac ? `${i}.${frac}` : i; // no thousands separators, max 4 decimals
}

export function formatAmountFullNoComma(v: number | string): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return String(v ?? "-");
  return String(n); // raw number string (no commas)
}
