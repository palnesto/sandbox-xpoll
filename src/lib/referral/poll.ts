// src/referral/poll.ts

import { postReferralLog } from "./referral-log";

const POLL_RE = /^\/feed\/polls\/([a-fA-F0-9]{24})\/?$/;

function getBrowserLoc() {
  if (typeof window === "undefined") return null;
  const { pathname, search, href } = window.location;
  return { pathname, search, href };
}

function parsePollReferralFromBrowser() {
  const loc = getBrowserLoc();
  if (!loc) return null;

  const m = loc.pathname.match(POLL_RE);
  const pollId = m?.[1] ?? null;
  if (!pollId) return null;

  const usp = new URLSearchParams(loc.search);
  const ru = usp.get("ru");
  if (!ru) return null;

  return {
    pollId,
    ru,
    url: loc.href,
    path: loc.pathname + loc.search,
  };
}

/**
 * Zero-arg invocation.
 * If current URL is /feed/polls/:id?ru=..., logs it.
 * Returns server response or null if not applicable.
 */
export async function logPollRuOnlyFromUrl() {
  const parsed = parsePollReferralFromBrowser();
  if (!parsed) return null;

  const { pollId, ru, url, path } = parsed;
  const source = window.location.href;
  return postReferralLog({
    kind: "poll",
    id: pollId,
    ru,
    url,
    path,
    source,
  });
}
