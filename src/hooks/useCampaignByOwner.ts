import type { UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { ApiCampaignById } from "@/types/campaigns";
import {
  getCampaignOwnerAccessState,
  getCampaignTier,
  getCampaignVisibility,
  isPaymentRequired,
  isBasicCampaign,
  isPaidCampaign,
  isUnlistedCampaign,
  normalizeCampaignBlockedState,
} from "@/lib/campaign";
 
export type CampaignPermissions = {
  campaign: {
    edit: boolean;
    pause: boolean;
    live: boolean;
    end: boolean;
    archive: boolean;
    delete: boolean;
    shareReward: boolean;
    toggleDonation: boolean;
  };
  campaignTrial: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    topUp: boolean;
    draftCreate: boolean;
    draftEdit: boolean;
    draftDelete: boolean;
  };
  campaignPetition: {
    toggleGlobalEnable: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  campaignQr: {
    create: boolean;
    edit: boolean;
    delete?: boolean;
  };
  campaignBlog: {
    create: boolean;
    edit: boolean;
    draft: boolean;
    live: boolean;
    delete: boolean;
  };
};

const DEFAULT_PERMISSIONS: CampaignPermissions = {
  campaign: {
    edit: true,
    pause: true,
    live: true,
    end: true,
    archive: true,
    delete: true,
    shareReward: true,
    toggleDonation: true,
  },
  campaignTrial: {
    create: true,
    edit: true,
    delete: true,
    topUp: true,
    draftCreate: true,
    draftEdit: true,
    draftDelete: true,
  },
  campaignPetition: {
    toggleGlobalEnable: true,
    create: true,
    edit: true,
    delete: true,
  },
  campaignQr: {
    create: true,
    edit: true,
    delete: true,
  },
  campaignBlog: {
    create: true,
    edit: true,
    draft: true,
    live: true,
    delete: true,
  },
};

function normalizePermissions(raw: any): CampaignPermissions {
  if (!raw || typeof raw !== "object") return DEFAULT_PERMISSIONS;
  return {
    campaign: {
      edit: !!raw.campaign?.edit,
      pause: !!raw.campaign?.pause,
      live: !!raw.campaign?.live,
      end: !!raw.campaign?.end,
      archive: !!raw.campaign?.archive,
      delete: !!raw.campaign?.delete,
      shareReward: !!raw.campaign?.shareReward,
      toggleDonation: !!raw.campaign?.toggleDonation,
    },
    campaignTrial: {
      create: !!raw.campaignTrial?.create,
      edit: !!raw.campaignTrial?.edit,
      delete: !!raw.campaignTrial?.delete,
      topUp: !!raw.campaignTrial?.topUp,
      draftCreate: !!raw.campaignTrial?.draftCreate,
      draftEdit: !!raw.campaignTrial?.draftEdit,
      draftDelete: !!raw.campaignTrial?.draftDelete,
    },
    campaignPetition: {
      toggleGlobalEnable: !!raw.campaignPetition?.toggleGlobalEnable,
      create: !!raw.campaignPetition?.create,
      edit: !!raw.campaignPetition?.edit,
      delete: !!raw.campaignPetition?.delete,
    },
    campaignQr: {
      create: !!raw.campaignQr?.create,
      edit: !!raw.campaignQr?.edit,
      delete: raw.campaignQr?.delete !== false,
    },
    campaignBlog: {
      create: !!raw.campaignBlog?.create,
      edit: !!raw.campaignBlog?.edit,
      draft: !!raw.campaignBlog?.draft,
      live: !!raw.campaignBlog?.live,
      delete: !!raw.campaignBlog?.delete,
    },
  };
}

type CampaignByOwnerQueryOptions = Omit<
  UseQueryOptions<any, any>,
  "queryKey" | "queryFn"
>;
 
export function useCampaignByOwner(
  campaignId: string | null | undefined,
  queryOptions?: CampaignByOwnerQueryOptions,
) {
  const queryEnabled = !!campaignId && (queryOptions?.enabled ?? true);
  const { data: campaignResp, ...rest } = useApiQuery(
    campaignId ? endpoints.campaigns.getCampaignByIdOwner(campaignId) : "",
    {
      ...queryOptions,
      enabled: queryEnabled,
    } as any,
  );

  const campaignData = useMemo<ApiCampaignById | null>(
    () => (campaignResp?.data?.data ?? campaignResp?.data ?? null) as ApiCampaignById | null,
    [campaignResp],
  );

  const permissions = useMemo((): CampaignPermissions => {
    const type = campaignData?.ownership?.type;
    const perms = campaignData?.ownership?.permissions;
    if (type !== "co-owner" || !perms) return DEFAULT_PERMISSIONS;
    return normalizePermissions(perms);
  }, [campaignData]);

  const isCoOwner = campaignData?.ownership?.type === "co-owner";
  const isMainOwner = campaignData?.ownership?.type !== "co-owner";
  const ownershipType = campaignData?.ownership?.type ?? "main-owner";
  const tier = useMemo(() => getCampaignTier(campaignData), [campaignData]);
  const visibility = useMemo(
    () => getCampaignVisibility(campaignData),
    [campaignData],
  );
  const ownerAccessState = useMemo(
    () => getCampaignOwnerAccessState(campaignData),
    [campaignData],
  );
  const blockedState = useMemo(
    () => normalizeCampaignBlockedState(campaignData),
    [campaignData],
  );
  const billingMode = campaignData?.billing?.mode ?? null;
  const isSubscriptionBilling = billingMode === "subscription";

  return {
    campaignData,
    permissions,
    ownershipType,
    isMainOwner,
    isCoOwner,
    tier,
    visibility,
    ownerAccessState,
    blockedState,
    billingMode,
    isSubscriptionBilling,
    isBasic: isBasicCampaign(campaignData),
    isPaid: isPaidCampaign(campaignData),
    isUnlisted: isUnlistedCampaign(campaignData),
    isListed: !isUnlistedCampaign(campaignData),
    isPaymentRequired: isPaymentRequired(campaignData),
    campaignName: campaignData?.name ?? "Campaign",
    ...rest,
  };
}
