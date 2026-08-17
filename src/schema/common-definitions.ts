import { coinAssetEnum } from "@/utils/currency-assets/asset";
import z from "zod";
import { dateSchema, mongoIdZod, resourceZod } from "@/utils/common-schemas";

const REWARD_TYPE = {
  MIN: "min",
  MAX: "max",
} as const;
const rewardTypes = [REWARD_TYPE.MIN, REWARD_TYPE.MAX] as const;
export const rewardTypeEnum = z.enum(rewardTypes);

export const targetGeoZod = z
  .object({
    countries: z.array(z.string().length(2)).default([]),
    states: z.array(z.string().min(3)).default([]),
    cities: z.array(mongoIdZod).default([]),
  })
  .strict();

export function normalizeTargetGeo(
  raw?: Partial<{ countries: string[]; states: string[]; cities: string[] }>
) {
  const uniq = <T>(a?: T[]) =>
    Array.from(new Set((a ?? []).map((v) => String(v).trim()).filter(Boolean)));
  return {
    countries: uniq(raw?.countries).map((c) => c.toUpperCase()),
    states: uniq(raw?.states).map((s) => s.toUpperCase()),
    cities: uniq(raw?.cities),
  };
}

export const rewardZodCommon = z
  .object({
    assetId: coinAssetEnum,
    amount: z.number().int().positive().min(1),
    rewardAmountCap: z.number().int().positive().min(1),
    rewardType: rewardTypeEnum.default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    path: ["rewardAmountCap"],
    message: "rewardAmountCap must be >= amount",
  });

export type Reward = z.infer<typeof rewardZodCommon>;
export const resourceAssetsZodCommon = z.array(resourceZod);
export const rewardsZodCommon = z
  .array(rewardZodCommon)
  .min(1)
  .superRefine((rewards, ctx) => {
    const seen = new Set<string>();
    for (const r of rewards) {
      if (seen.has(r.assetId)) {
        ctx.addIssue({
          code: "custom",
          path: ["assetId"],
          message: `Duplicate reward assetId: ${r.assetId}`,
        });
      }
      seen.add(r.assetId);
    }
  });
export const expireRewardAtZodCommon = dateSchema;
