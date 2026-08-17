// src/referral/trial.ts

import { postReferralLog } from "./referral-log";

const TRIAL_RE = /^\/trial\/([a-fA-F0-9]{24})\/?$/;

function getBrowserLoc() {
  if (typeof window === "undefined") return null;
  const { pathname, search, href } = window.location;
  return { pathname, search, href };
}

function parseTrialReferralFromBrowser() {
  const loc = getBrowserLoc();
  if (!loc) return null;

  const m = loc.pathname.match(TRIAL_RE);
  const trialId = m?.[1] ?? null;
  if (!trialId) return null;

  const usp = new URLSearchParams(loc.search);
  const ru = usp.get("ru");
  if (!ru) return null;

  return {
    trialId,
    ru,
    url: loc.href,
    path: loc.pathname + loc.search,
  };
}

/**
 * Zero-arg invocation.
 * If current URL is /trial/:id?ru=..., logs it.
 * Returns server response or null if not applicable.
 */
export async function logTrialRuOnlyFromUrl() {
  const parsed = parseTrialReferralFromBrowser();
  if (!parsed) return null;

  const { trialId, ru, url, path } = parsed;
  const source = window.location.href;
  return postReferralLog({
    kind: "trial",
    id: trialId,
    ru,
    url,
    path,
    source,
  });
}
