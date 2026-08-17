import type { FormValues } from "@/types/campaigns";

export const CAMPAIGN_PLAN_CHECKOUT_MODE = {
  CREATE: "create",
  UPGRADE: "upgrade",
} as const;

export type CampaignPlanCheckoutMode =
  (typeof CAMPAIGN_PLAN_CHECKOUT_MODE)[keyof typeof CAMPAIGN_PLAN_CHECKOUT_MODE];

export const CAMPAIGN_SUBSCRIPTION_MODE = {
  QUEUE: "QUEUE",
  REPLACE_NOW: "REPLACE_NOW",
} as const;

export type CampaignSubscriptionMode =
  (typeof CAMPAIGN_SUBSCRIPTION_MODE)[keyof typeof CAMPAIGN_SUBSCRIPTION_MODE];

export type CampaignPlanCreatePaymentContext = {
  planId: string;
  extend_campaign_plan: null;
  create_campaign: {
    name: string;
    goal: string;
    isPolitical: boolean;
  };
};

export type CampaignPlanUpgradePaymentContext = {
  planId: string;
  extend_campaign_plan: {
    campaignId: string;
    subscriptionMode: "REPLACE_NOW";
  };
  create_campaign: null;
};

export type CampaignPlanPaymentContext =
  | CampaignPlanCreatePaymentContext
  | CampaignPlanUpgradePaymentContext;

export type CampaignPlanCheckoutSummary =
  | {
      mode: "create";
      campaignName: string;
      goal: string;
      isPolitical: boolean;
      getDataAccess: boolean;
    }
  | {
      mode: "upgrade";
      campaignId: string;
      campaignName: string;
      goal: string;
      isPolitical: boolean;
      getDataAccess: null;
    };

export function buildCampaignPlanCreatePaymentContext(input: {
  planId: string;
  snapshot: FormValues;
}): CampaignPlanCreatePaymentContext {
  return {
    planId: input.planId,
    extend_campaign_plan: null,
    create_campaign: {
      name: input.snapshot.campaignName,
      goal: input.snapshot.goal,
      isPolitical: input.snapshot.campaignType === "political",
    },
  };
}

export function buildCampaignPlanUpgradePaymentContext(input: {
  planId: string;
  campaignId: string;
}): CampaignPlanUpgradePaymentContext {
  return {
    planId: input.planId,
    extend_campaign_plan: {
      campaignId: input.campaignId,
      subscriptionMode: CAMPAIGN_SUBSCRIPTION_MODE.REPLACE_NOW,
    },
    create_campaign: null,
  };
}

export function buildCampaignPlanPaymentContext(input:
  | {
      mode?: "create";
      planId: string;
      snapshot: FormValues;
    }
  | {
      mode: "upgrade";
      planId: string;
      campaignId: string;
    }): CampaignPlanPaymentContext {
  if (input.mode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE) {
    return buildCampaignPlanUpgradePaymentContext({
      planId: input.planId,
      campaignId: input.campaignId,
    });
  }

  return buildCampaignPlanCreatePaymentContext({
    planId: input.planId,
    snapshot: input.snapshot,
  });
}

export function buildCampaignPlanCheckoutSummary(input:
  | {
      mode?: "create";
      snapshot: FormValues | null;
    }
  | {
      mode: "upgrade";
      campaignId: string;
      campaignName?: string | null;
      campaignGoal?: string | null;
      isPolitical?: boolean | null;
    }): CampaignPlanCheckoutSummary | null {
  if (input.mode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE) {
    return {
      mode: "upgrade",
      campaignId: input.campaignId,
      campaignName: String(input.campaignName ?? "Campaign"),
      goal: String(
        input.campaignGoal ??
          "Upgrade this campaign to unlock the selected paid plan.",
      ),
      isPolitical: !!input.isPolitical,
      getDataAccess: null,
    };
  }

  if (!input.snapshot) return null;
  return {
    mode: "create",
    campaignName: input.snapshot.campaignName,
    goal: input.snapshot.goal,
    isPolitical: input.snapshot.campaignType === "political",
    getDataAccess: !!input.snapshot.getDataAccess,
  };
}
