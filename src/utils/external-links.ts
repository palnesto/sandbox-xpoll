export const MAX_BLOG_EXTERNAL_LINKS = 3;

/**
 * Normalize for validation: add https:// when no protocol so that
 * x.com/..., www.x.com/..., app.xpoll.io all parse as valid URLs.
 */
export function normalizeExternalLink(raw: any) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.toLowerCase().startsWith("www.")) return `https://${s}`;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

/**
 * ✅ SAME RULES AS YOU GAVE:
 * - empty string is allowed (blank row)
 * - must be valid URL
 * - only http/https
 * - host must contain dot
 * - tld alpha length 2..24
 * - sld must exist (avoid ".com")
 */
export function isValidExternalLink(raw: any) {
  const s = normalizeExternalLink(raw);
  if (!s) return true;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  const host = (u.hostname || "").toLowerCase();
  if (!host || host === "www" || host === "www.") return false;
  if (!host.includes(".")) return false;

  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1];
  if (!/^[a-z]{2,24}$/.test(tld)) return false;

  const sld = parts[parts.length - 2];
  if (!sld || sld.length < 1) return false;

  return true;
}

/**
 * Keeps UI rows (including blanks), but trims to max 3 rows.
 */
export function clampLinkRows(rows: any[], max = MAX_BLOG_EXTERNAL_LINKS) {
  const arr = Array.isArray(rows) ? rows : [];
  return arr.slice(0, max).map((x) => String(x ?? ""));
}

/**
 * ✅ For payload:
 * - trim
 * - remove blanks
 * - normalize (www.)
 * - slice max 3
 */
export function buildExternalLinksPayload(
  rows: any[],
  max = MAX_BLOG_EXTERNAL_LINKS,
) {
  return (Array.isArray(rows) ? rows : [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .map(normalizeExternalLink)
    .slice(0, max);
}

/**
 * ✅ For UI validation:
 * Returns per-row error messages for max 3 rows.
 * Blank row => null (no error)
 */
export function getExternalLinkRowErrors(
  rows: any[],
  max = MAX_BLOG_EXTERNAL_LINKS,
) {
  const r = clampLinkRows(rows, max);

  return r.map((v) => {
    const raw = String(v ?? "").trim();
    if (!raw) return null;
    return isValidExternalLink(raw) ? null : "Enter valid link";
  });
}

/**
 * ✅ Strict final check before submit.
 * If any non-empty row invalid => false
 */
export function hasInvalidExternalLinks(
  rows: any[],
  max = MAX_BLOG_EXTERNAL_LINKS,
) {
  const r = clampLinkRows(rows, max);
  return r.some((v) => {
    const raw = String(v ?? "").trim();
    if (!raw) return false;
    return !isValidExternalLink(raw);
  });
}
