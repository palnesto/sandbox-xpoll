import z from "zod";

export const PAYMENT_INTENT_PURPOSE = {
  PURCHASE_CAMPAIGN_PLAN: "purchase-campaign-plan",
  PURCHASE_ASSET_TOKEN: "purchase-asset-token",
  WEB3_LAUNCH_CAMPAIGN: "web3-launch-campaign",
  AD_EXPERIENCE_SUBSCRIPTION: "ad-experience-subscription",
  SOUL_BOUND_SUBSCRIPTION: "soul-bound-subscription",
} as const;

export const paymentIntentPurposes = [
  PAYMENT_INTENT_PURPOSE.PURCHASE_CAMPAIGN_PLAN,
  PAYMENT_INTENT_PURPOSE.PURCHASE_ASSET_TOKEN,
  PAYMENT_INTENT_PURPOSE.WEB3_LAUNCH_CAMPAIGN,
  PAYMENT_INTENT_PURPOSE.AD_EXPERIENCE_SUBSCRIPTION,
  PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION,
] as const;

export const paymentIntentPurposeZod = z.enum(paymentIntentPurposes);
export type PaymentIntentPurpose = z.infer<typeof paymentIntentPurposeZod>;

// campaign subscription mode
export const campaignSubscriptionModeZod = z.enum(["QUEUE", "REPLACE_NOW"]);
export type CampaignSubscriptionMode = z.infer<
  typeof campaignSubscriptionModeZod
>;
