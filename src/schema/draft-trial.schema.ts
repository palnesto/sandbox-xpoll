 
import { z } from "zod";

const trimString = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const draftTrialResourceAssetZ = z.object({
  type: z.enum(["youtube", "image", "video"]),
  value: z.string().min(1),
});

export const draftTrialRewardRowZ = z.object({
  assetId: z.string().trim().min(1, "Coin is required"),
  amount: z.union([
    z.string().regex(/^\d+$/, "Unsigned integer").transform(Number),
    z.number().int().min(0),
  ]),
  rewardAmountCap: z.union([
    z.string().regex(/^\d+$/, "Unsigned integer").transform(Number),
    z.number().int().min(0),
  ]),
  rewardType: z.enum(["min", "max"]),
});

export const draftTrialTargetGeoZ = z
  .object({
    countries: z.array(z.string().length(2).transform((s) => s.toUpperCase())).max(200).default([]),
    states: z.array(z.string().trim().min(1).transform((s) => s.toUpperCase())).max(200).default([]),
    cities: z.array(z.string()).max(200).default([]),
  })
  .default({ countries: [], states: [], cities: [] });

export const draftTrialPollRowZ = z.object({
  trialId: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(1000).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  options: z.array(z.string().trim().min(1, "Option min 1 char").max(25, "Option max 25 chars")).max(4).default([]),
  resourceAssets: z.array(draftTrialResourceAssetZ).max(20).default([]),
  rewards: z.array(draftTrialRewardRowZ).max(1).default([]),
  expireRewardAt: z.union([z.string(), z.date()]).optional(),
  targetGeo: draftTrialTargetGeoZ.optional(),
});

export const draftTrialFormZ = z.object({
  title: z.preprocess(trimString, z.string().trim().min(1, "Title is required").max(1000)),
  description: z.preprocess(trimString, z.string().trim().min(1, "Description is required").max(2000)),
  resourceAssets: z.array(draftTrialResourceAssetZ).max(20).default([]),
  rewards: z.array(draftTrialRewardRowZ).max(1).default([]),
  expireRewardAt: z.union([z.string(), z.date()]).optional().nullable(),
  targetGeo: draftTrialTargetGeoZ.optional(),
  polls: z.array(draftTrialPollRowZ).max(50).default([]),
});

export type DraftTrialResourceAsset = z.infer<typeof draftTrialResourceAssetZ>;
export type DraftTrialRewardRow = z.infer<typeof draftTrialRewardRowZ>;
export type DraftTrialPollRow = z.infer<typeof draftTrialPollRowZ>;
export type DraftTrialFormValues = z.infer<typeof draftTrialFormZ>;

/** API response shape for a single draft trial (GET by id) */
export type ApiDraftTrial = {
  _id: string;
  title?: string | null;
  description?: string | null;
  resourceAssets?: Array<{ type: "youtube" | "image" | "video"; value: string }>;
  rewards?: Array<{
    assetId: string;
    amount: number | string;
    rewardAmountCap: number | string;
    rewardType: "min" | "max";
  }>;
  expireRewardAt?: string | null;
  targetGeo?: { countries?: string[]; states?: string[]; cities?: string[] };
  polls?: Array<{
    trialId?: string;
    title?: string;
    description?: string;
    options?: string[];
    resourceAssets?: Array<{ type: string; value: string }>;
    rewards?: unknown[];
  }>;
  belongsToCampaignId?: string | null;
};

/** Map API draft to form values (for edit page) */
export function apiDraftToFormValues(d: ApiDraftTrial | null): Partial<DraftTrialFormValues> {
  if (!d) return {};
  return {
    title: d.title?.trim() ?? "",
    description: d.description?.trim() ?? "",
    resourceAssets: (d.resourceAssets ?? []).map((a) => ({ type: a.type as "youtube" | "image" | "video", value: String(a.value) })),
    rewards: (d.rewards ?? []).slice(0, 1).map((r) => ({
      assetId: String(r.assetId),
      amount: typeof r.amount === "number" ? r.amount : Number(r.amount) || 0,
      rewardAmountCap: typeof r.rewardAmountCap === "number" ? r.rewardAmountCap : Number(r.rewardAmountCap) || 0,
      rewardType: r.rewardType === "max" ? "max" : "min",
    })),
    expireRewardAt: d.expireRewardAt ?? null,
    targetGeo: d.targetGeo ?? {},
    polls: (d.polls ?? []).map((p) => ({
      trialId: p.trialId ?? "",
      title: p.title ?? "",
      description: p.description ?? "",
      options: (p.options ?? []).slice(0, 4),
      resourceAssets: (p.resourceAssets ?? []).map((a: any) => ({ type: a.type, value: String(a.value) })),
      rewards: [],
      targetGeo: {},
    })),
  };
}
