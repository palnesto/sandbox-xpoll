// Pick the canonical ISO2 code (prefer meta.country._id, then state.countryId, then avatar.country)
export const pickIso2 = (p: any): string | null => {
  const iso =
    p?.profile?.meta?.country?._id || // ✅ green arrow
    p?.profile?.meta?.state?.countryId || // fallback via state
    p?.profile?.apps?.xpoll?.avatar?.country || // last resort (red arrow)
    null;
  if (!iso) return null;
  // normalize like "US" -> "us"; ignore things that aren't 2 letters
  const clean = String(iso).trim();
  return clean.length === 2 ? clean.toUpperCase() : null;
};

export const flagUrlFromIso2 = (iso2?: string | null, size: number = 320) =>
  iso2 ? `https://flagcdn.com/w${size}/${iso2.toLowerCase()}.png` : null;
