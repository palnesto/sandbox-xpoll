const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
export type CampaignUrlMatch =
  | { ok: true; campaignId: string }
  | { ok: false; campaignId: null };
export function matchCampaignUrl(url: string): CampaignUrlMatch {
  let pathname: string;
  try {
    const u = url.startsWith("http")
      ? new URL(url)
      : new URL(url, window.location.origin);
    pathname = u.pathname;
  } catch {
    return { ok: false, campaignId: null };
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 3) {
    return { ok: false, campaignId: null };
  }
  const [root, sub, id] = parts;
  if (root !== "campaigns" || sub !== "all-campaigns") {
    return { ok: false, campaignId: null };
  }
  if (!MONGO_ID_REGEX.test(id)) {
    return { ok: false, campaignId: null };
  }
  return { ok: true, campaignId: id };
}

export const makePublicCampaignPageUrl = (id: string) =>
  `/public-pages/all-campaigns/${id}`;
