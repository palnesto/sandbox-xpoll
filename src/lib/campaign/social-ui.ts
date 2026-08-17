import type {
  ApiCampaignById,
  ApiCampaignSocialStatus,
  CampaignBillingMode,
} from "@/types/campaigns";

export const CAMPAIGN_SOCIAL_FEATURE_NAME = "Social Accounts";
export const CAMPAIGN_SOCIAL_PLATFORM_LABEL = "X, Instagram, and Facebook";

export function getCampaignSocialManageReason(
  socialStatus: ApiCampaignSocialStatus | null | undefined,
) {
  return socialStatus?.manageReason ?? socialStatus?.manageState ?? null;
}

export function isCampaignSocialMainOwner(
  socialStatus: ApiCampaignSocialStatus | null | undefined,
  campaign: ApiCampaignById | null | undefined,
) {
  if (socialStatus?.ownershipType) {
    return socialStatus.ownershipType === "main-owner";
  }

  return campaign?.ownership?.type !== "co-owner";
}

export function getCampaignSocialRecoveryTarget(args: {
  campaignId: string;
  socialStatus: ApiCampaignSocialStatus | null | undefined;
  campaign: ApiCampaignById | null | undefined;
  reasonOverride?: string | null;
}) {
  const manageReason =
    args.reasonOverride ??
    getCampaignSocialManageReason(args.socialStatus) ??
    null;
  const mainOwner = isCampaignSocialMainOwner(args.socialStatus, args.campaign);
  const tier = args.socialStatus?.tier ?? args.campaign?.tier ?? "paid";
  const billingMode =
    args.socialStatus?.billingMode ?? args.campaign?.billing?.mode ?? null;

  if (!mainOwner) {
    return {
      to: `/campaigns/edit/${args.campaignId}/overview`,
      label: "Open campaign overview",
    };
  }

  if (tier === "basic" || manageReason === "upgrade_required") {
    return {
      to: `/campaigns/edit/${args.campaignId}/overview?upgrade=1`,
      label: "Upgrade any time",
    };
  }

  if (manageReason === "payment_required") {
    if (billingMode === "subscription") {
      return {
        to: `/campaigns/edit/${args.campaignId}/subscription-management`,
        label: "Open subscription management",
      };
    }

    return {
      to: `/campaigns/edit/${args.campaignId}/overview`,
      label: "Open campaign overview",
    };
  }

  return {
    to: `/campaigns/edit/${args.campaignId}/overview`,
    label: "Open campaign overview",
  };
}

export function getCampaignSocialUpgradeDescription(isMainOwner: boolean) {
  return isMainOwner
    ? `Upgrade this Basic campaign any time to connect ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} through Upload Post.`
    : `This Basic campaign has to be upgraded by the main owner before co-owners can review or manage ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} for this campaign.`;
}

export function getCampaignSocialPaymentRequiredDescription(args: {
  isMainOwner: boolean;
  billingMode?: CampaignBillingMode | null;
}) {
  if (args.isMainOwner) {
    return args.billingMode === "subscription"
      ? `Active paid coverage is required before this campaign can manage ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} or change their posting state. Any saved snapshot stays visible in read-only mode until subscription coverage is restored.`
      : `Active paid coverage is required before this campaign can manage ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} or change their posting state. Any saved snapshot stays visible in read-only mode until paid coverage is restored.`;
  }

  return `Active paid coverage is required before this campaign can manage ${CAMPAIGN_SOCIAL_PLATFORM_LABEL}. Any saved snapshot stays visible in read-only mode until the main owner restores coverage.`;
}

export function getCampaignSocialDisconnectDescription() {
  return "This removes the saved social snapshot from this campaign only. The Upload Post profile stays intact, so this campaign can be reconnected later without deleting the remote profile.";
}

export function getCampaignSocialEligibleEmptyDescription(
  socialStatus: ApiCampaignSocialStatus,
) {
  if (socialStatus.profileStatus === "failed") {
    return `A previous Upload Post session could not be completed. Start a fresh connection to attach ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} to this campaign.`;
  }
  if (socialStatus.profileStatus === "ready") {
    return `This campaign already has an Upload Post profile, but no ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} account is currently connected. Attach at least one account to save a current snapshot here.`;
  }
  return `Connect ${CAMPAIGN_SOCIAL_PLATFORM_LABEL} for this campaign through Upload Post. The same underlying social account can still be linked to other campaigns.`;
}

export function getCampaignSocialReadonlySnapshotDescription(
  socialStatus: ApiCampaignSocialStatus,
) {
  const blockerReason = getCampaignSocialManageReason(socialStatus);

  if (socialStatus.manageState === "main_owner_only") {
    return "Only the main owner can manage campaign social accounts. Co-owners can review the current snapshot here.";
  }
  if (blockerReason === "upgrade_required") {
    return "This snapshot stays visible in read-only mode while the campaign is on Basic. Upgrade the campaign any time to restore social account management.";
  }
  if (blockerReason === "payment_required") {
    return "This snapshot stays visible in read-only mode while paid coverage is inactive. Connection changes and posting-state updates stay locked until active coverage is restored.";
  }
  if (blockerReason === "campaign_closed") {
    return "This campaign is no longer in an active management state, so any saved social accounts remain read-only.";
  }
  return "This campaign already has a stored Upload Post social snapshot.";
}
