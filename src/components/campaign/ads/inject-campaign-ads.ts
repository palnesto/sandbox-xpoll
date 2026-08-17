import type { AdItem } from "@/components/swipe-factory/ads/types";
import type { TrailRowModel } from "@/types/campaigns";

export type CampaignTrailsItem =
  | { kind: "trial"; trial: TrailRowModel }
  | { kind: "ad"; ad: AdItem; slot: number };

export function countAdSlots(
  trialsLen: number,
  firstInsertAfter: number,
  gap: number,
) {
  if (trialsLen <= 0) return 0;
  if (firstInsertAfter <= 0) return 0;
  if (gap <= 0) return 0;

  if (trialsLen < firstInsertAfter) return 0;
  return Math.floor((trialsLen - firstInsertAfter) / gap) + 1;
}

/**
 * Inserts ads AFTER N trials, then after every `gap` trials.
 * Example: firstInsertAfter=1, gap=3:
 *  T1, AD, T2, T3, T4, AD, T5, T6, T7, AD ...
 */
export function injectCampaignAds(
  trials: TrailRowModel[],
  ads: AdItem[],
  opts: { firstInsertAfter: number; gap: number },
): CampaignTrailsItem[] {
  const out: CampaignTrailsItem[] = [];
  const { firstInsertAfter, gap } = opts;

  if (!Array.isArray(trials) || trials.length === 0) return out;

  // no ads available => trials only
  if (!Array.isArray(ads) || ads.length === 0) {
    return trials.map((t) => ({ kind: "trial", trial: t }));
  }

  let slot = 0;

  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i]!;
    out.push({ kind: "trial", trial });

    const trialCount = i + 1;

    const shouldInsert =
      trialCount >= firstInsertAfter &&
      (trialCount - firstInsertAfter) % gap === 0;

    if (shouldInsert) {
      const ad = ads[slot % ads.length]!;
      out.push({ kind: "ad", ad, slot });
      slot++;
    }
  }

  return out;
}
