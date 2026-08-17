type BasePayload = { a: string; t: number }; // accountId, timestamp
type PollPayload = BasePayload & { p: string };
type TrialPayload = BasePayload & { tr: string };
type CampaignPayload = BasePayload & { c: string };
type InkDBlogPayload = BasePayload & { ib: string };
type InkDTrialPayload = BasePayload & { tr: string };

function toB64(json: string) {
  return typeof window !== "undefined"
    ? window.btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf8").toString("base64");
}

export function makeRuForPoll(externalAccountId: string, pollId: string) {
  const payload: PollPayload = {
    a: externalAccountId,
    p: pollId,
    t: Date.now(),
  };
  return `v1.${toB64(JSON.stringify(payload))}`;
}

export function makeRuForTrial(externalAccountId: string, trialId: string) {
  const payload: TrialPayload = {
    a: externalAccountId,
    tr: trialId,
    t: Date.now(),
  };
  return `v1.${toB64(JSON.stringify(payload))}`;
}

export function makeRuForCampaign(
  externalAccountId: string,
  campaignId: string
) {
  const payload: CampaignPayload = {
    a: externalAccountId,
    c: campaignId,
    t: Date.now(),
  };
  return `v1.${toB64(JSON.stringify(payload))}`;
}

export function makeInkdRuForBlog(externalAccountId: string, inkdBlogId: string) {
  const payload: InkDBlogPayload = {
    a: externalAccountId,
    ib: inkdBlogId,
    t: Date.now(),
  };
  return `v1.${toB64(JSON.stringify(payload))}`;
}

export function makeInkdRuForTrial(externalAccountId: string, trialId: string) {
  const payload: InkDTrialPayload = {
    a: externalAccountId,
    tr: trialId,
    t: Date.now(),
  };
  return `v1.${toB64(JSON.stringify(payload))}`;
}
