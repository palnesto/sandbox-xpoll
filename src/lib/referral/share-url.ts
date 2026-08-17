import {
  makeInkdRuForBlog,
  makeInkdRuForTrial,
  makeRuForCampaign,
  makeRuForPoll,
  makeRuForTrial,
} from "./referral-token";

export type Kind = "poll" | "trial" | "campaign";

export function buildShareUrl(
  kind: Kind,
  opts: {
    baseUrl: string;
    id: string;
    externalAccountId?: string | null;
    trialId?: string | null; // only used for campaigns
  },
) {
  const { baseUrl, id, externalAccountId, trialId } = opts;

  const path =
    kind === "poll"
      ? `/feed/polls/${encodeURIComponent(id)}`
      : kind === "trial"
        ? `/trial/${encodeURIComponent(id)}`
        : `/campaigns/all-campaigns/${encodeURIComponent(id)}`;

  const u = new URL(path, baseUrl);

  if (externalAccountId) {
    const ru =
      kind === "poll"
        ? makeRuForPoll(externalAccountId, id)
        : kind === "trial"
          ? makeRuForTrial(externalAccountId, id)
          : makeRuForCampaign(externalAccountId, id);

    u.searchParams.set("ru", ru);
  }

  // Only campaigns care about trialId
  if (kind === "campaign" && trialId) {
    u.searchParams.set("trialId", trialId);
  }

  return u.toString();
}

/* Existing wrappers stay exactly the same behavior-wise */

export const buildPollShareUrl = (opts: {
  baseUrl: string;
  pollId: string;
  externalAccountId?: string | null;
}) =>
  buildShareUrl("poll", {
    baseUrl: opts.baseUrl,
    id: opts.pollId,
    externalAccountId: opts.externalAccountId,
  });

export const buildTrialShareUrl = (opts: {
  baseUrl: string;
  trialId: string;
  externalAccountId?: string | null;
}) =>
  buildShareUrl("trial", {
    baseUrl: opts.baseUrl,
    id: opts.trialId,
    externalAccountId: opts.externalAccountId,
  });

/**
 * Campaign share URL
 *
 * Case 1:
 *   /campaigns/all-campaigns/{campaignId}?ru=...
 *
 * Case 2:
 *   /campaigns/all-campaigns/{campaignId}?ru=...&trialId={trialId}
 */
export const buildCampaignShareUrl = (opts: {
  baseUrl: string;
  campaignId: string;
  externalAccountId?: string | null;
  trialId?: string | null;
}) =>
  buildShareUrl("campaign", {
    baseUrl: opts.baseUrl,
    id: opts.campaignId,
    externalAccountId: opts.externalAccountId,
    trialId: opts.trialId,
  });

export const buildInkDBlogShareUrl = (opts: {
  baseUrl: string;
  inkdBlogId: string;
  externalAccountId?: string | null;
}) => {
  const u = new URL(
    `/inkd/inkd-blog/${encodeURIComponent(opts.inkdBlogId)}`,
    opts.baseUrl,
  );

  if (opts.externalAccountId) {
    u.searchParams.set(
      "inkdRu",
      makeInkdRuForBlog(opts.externalAccountId, opts.inkdBlogId),
    );
  }

  return u.toString();
};

export const buildInkDTrialShareUrl = (opts: {
  baseUrl: string;
  trialId: string;
  externalAccountId?: string | null;
}) => {
  const u = new URL(`/trial/${encodeURIComponent(opts.trialId)}`, opts.baseUrl);

  if (opts.externalAccountId) {
    u.searchParams.set(
      "inkdRu",
      makeInkdRuForTrial(opts.externalAccountId, opts.trialId),
    );
  }

  return u.toString();
};
