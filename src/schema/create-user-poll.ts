// src/schema/create-user-poll.ts
import { z } from "zod";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import {
  expireRewardAtZodCommon,
  resourceAssetsZodCommon, // final/server-compatible schema
  rewardsZodCommon,
} from "./common-definitions";

export const ADD_POLL_PAGE_PATHS = {
  basicInfo: "/add-polls/basic-info",
  options: "/add-polls/add-options",
  rewards: "/add-polls/add-rewards",
  preview: "/add-polls/preview",
};

export const optionZod = z.object({
  text: z.string().min(1).max(500).trim(),
});

/**
 * Client-side resource asset for Basic Info ONLY.
 * Accept a single File OR string for `value` (not an array).
 */
const resourceAssetClientZod = z.union([
  z.object({
    type: z.literal("youtube"),
    value: z.string().min(1, "Enter a valid YouTube URL or ID").trim(),
  }),
  z.object({
    type: z.literal("image"),
    value: z.union([
      z.instanceof(File),
      z.string().min(1, "Image is required"),
    ]),
  }),
]);

const resourceAssetsClientZod = z
  .array(resourceAssetClientZod)
  .max(1, "Only one media asset allowed");

/** Base object (server-compatible final schema) */
const pollObject = z.object({
  // Step 1 — Basic
  title: z.string().min(3).max(1000).trim(),
  description: z.string().min(3).max(2000).trim(),
  resourceAssets: resourceAssetsZodCommon, // final shape only (string URL/ID)

  // Step 2 — Options
  options: z.array(optionZod).min(2).max(4),

  // Step 3 — Rewards
  rewards: rewardsZodCommon,
  expireRewardAt: expireRewardAtZodCommon.optional(),
});

export const pollSchema = pollObject;
export type PollForm = z.infer<typeof pollSchema>;

/* Step slices */
// Basic Info page: accept client-friendly resource assets (File|string), max 1
export const basicInfoSchema = z.object({
  title: pollObject.shape.title,
  description: pollObject.shape.description,
  resourceAssets: resourceAssetsClientZod.default([]),
});
export type BasicInfoForm = z.infer<typeof basicInfoSchema>;

export const optionsSchema = pollObject.pick({ options: true });
export type OptionsForm = z.infer<typeof optionsSchema>;

export const rewardsSchema = pollObject.pick({
  rewards: true,
  expireRewardAt: true,
});
export type RewardsForm = z.infer<typeof rewardsSchema>;

/** defaults */
export const defaultPollValues: PollForm = {
  title: "",
  description: "",
  resourceAssets: [],
  options: [{ text: "" }, { text: "" }],
  rewards: [],
};

export function makeRewardsSchema(
  balances: Record<AssetType, number | string>
) {
  return z.object({
    rewards: z
      .array(
        z
          .object({
            assetId: z.string() as z.ZodType<AssetType>,
            rewardAmountCap: z.number().min(1, "Total tokens must be > 0"),
            amount: z.number().min(1, "Per-user reward must be > 0"),
            rewardType: z.enum(["max", "min"]),
          })
          .superRefine((val, ctx) => {
            const bal = Number(balances[val.assetId] ?? 0);

            // Check sufficient balance
            if (val.rewardAmountCap > bal) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Not enough balance. Available: ${bal}`,
                path: ["rewardAmountCap"],
              });
            }

            // Check per-user <= total
            if (val.amount > val.rewardAmountCap) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Per-user reward cannot exceed total tokens",
                path: ["amount"],
              });
            }
          })
      )
      .min(1, "At least one reward is required"),

    expireRewardAt: z.string().optional(),
  });
}
/** Optional export for API conversion */
export function toBaseUnits(amount: number | string, asset: AssetType): bigint {
  const dec = assetSpecs[asset].decimal;
  const s = typeof amount === "number" ? String(amount) : amount;
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid numeric amount");
  const [intPart, fracPart = ""] = s.split(".");
  if (fracPart.length > dec) {
    throw new Error(
      `Too many decimal places for ${assetSpecs[asset].symbol} (max ${dec}).`
    );
  }
  const padded = fracPart.padEnd(dec, "0");
  return BigInt(intPart + padded);
}
