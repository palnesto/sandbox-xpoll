// src/referral/campaign.ts

import { postReferralLog } from "./referral-log";

const CAMPAIGN_RE = /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/;

function getBrowserLoc() {
  if (typeof window === "undefined") return null;
  const { pathname, search, href } = window.location;
  return { pathname, search, href };
}

function parseCampaignReferralFromBrowser() {
  const loc = getBrowserLoc();
  if (!loc) return null;

  const m = loc.pathname.match(CAMPAIGN_RE);
  const campaignId = m?.[1] ?? null;
  if (!campaignId) return null;

  const usp = new URLSearchParams(loc.search);
  const ru = usp.get("ru");
  if (!ru) return null;

  const trialIdRaw = usp.get("trialId");
  const trialId = trialIdRaw ? decodeURIComponent(trialIdRaw) : null;

  return {
    campaignId,
    ru,
    trialId,
    url: loc.href,
    path: loc.pathname + loc.search,
  };
}

/**
 * Zero-arg invocation.
 * If current URL is /campaigns/all-campaigns/:id?ru=..., logs it.
 * Returns server response or null if not applicable.
 */
export async function logCampaignRuOnlyFromUrl() {
  const parsed = parseCampaignReferralFromBrowser();
  if (!parsed) return null;

  const { campaignId, ru, url, path, trialId } = parsed;

  // NOTE: even if trialId exists, this function still logs as campaign.
  // If you want different source when trialId exists, we can do that below.
  const source = window.location.href;

  return postReferralLog({
    kind: "campaign",
    id: campaignId,
    ru,
    url,
    path,
    source,
  });
}

/**
 * Optional: strictly require trialId as well.
 * Returns null if trialId is missing.
 */
export async function logCampaignRuTrialFromUrl() {
  const parsed = parseCampaignReferralFromBrowser();
  if (!parsed?.trialId) return null;

  const { campaignId, ru, trialId, url, path } = parsed;

  return postReferralLog({
    kind: "campaign",
    id: campaignId,
    ru,
    url,
    path,
    source: "campaign_share_with_trial",
  });
}

/**
 * Optional utility if you want to remove ru from address bar after logging.
 */
export function stripRuFromUrlNoReload() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("ru")) return;
  url.searchParams.delete("ru");
  window.history.replaceState(
    {},
    "",
    url.pathname + (url.search ? url.search : ""),
  );
}
