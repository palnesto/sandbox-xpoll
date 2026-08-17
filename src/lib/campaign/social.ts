import apiInstance from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { isBasicCampaign } from "./access";
import type {
  ApiCampaignBlogSocialPublicationCreateResult,
  ApiCampaignBlogSocialPublicationRateLimitListResult,
  ApiCampaignSocialConnectResult,
  ApiCampaignSocialFinalizeResult,
  ApiCampaignSocialMutationResult,
  ApiCampaignSocialPublicationListResult,
  ApiCampaignSocialPublicationReconcileResult,
  CampaignSocialPlatformHealth,
  ApiCampaignSocialStatus,
  CampaignSocialPublishRateLimitSnapshot,
  CreateCampaignBlogSocialPublicationInput,
  CampaignSocialPlatformKey,
  CampaignUploadPostProfile,
  CampaignUploadPostPlatformSnapshot,
} from "@/types/campaigns";

type ApiEnvelope<T> = {
  data?: T;
  success?: boolean;
  message?: string;
} & Record<string, unknown>;

function unwrapApiData<T>(payload: ApiEnvelope<T> | T) {
  return ((payload as ApiEnvelope<T>)?.data ?? payload) as T;
}

export async function connectCampaignSocial(
  campaignId: string,
  input?: {
    returnToPath?: string | null;
  },
) {
  const response = await apiInstance.post(
    endpoints.campaigns.connectCampaignSocial(campaignId),
    {
      returnToPath: input?.returnToPath ?? undefined,
    },
  );

  return unwrapApiData(response.data) as ApiCampaignSocialConnectResult;
}

export async function finalizeCampaignSocial(
  campaignId: string,
  sessionId: string,
) {
  const response = await apiInstance.post(
    endpoints.campaigns.finalizeCampaignSocial(campaignId),
    {
      sessionId,
    },
  );

  return unwrapApiData(response.data) as ApiCampaignSocialFinalizeResult;
}

export async function syncCampaignSocial(campaignId: string) {
  const response = await apiInstance.post(
    endpoints.campaigns.syncCampaignSocial(campaignId),
  );

  return unwrapApiData(response.data) as ApiCampaignSocialMutationResult;
}

export async function disconnectCampaignSocial(campaignId: string) {
  const response = await apiInstance.delete(
    endpoints.campaigns.disconnectCampaignSocial(campaignId),
  );

  return unwrapApiData(response.data) as ApiCampaignSocialMutationResult;
}

export async function setCampaignSocialPlatformPreference(
  campaignId: string,
  input: {
    platform: CampaignSocialPlatformKey;
    enabled: boolean;
  },
) {
  const response = await apiInstance.put(
    endpoints.campaigns.setCampaignSocialPlatformPreference(campaignId),
    input,
  );

  return unwrapApiData(response.data) as ApiCampaignSocialMutationResult;
}

export async function reconcileCampaignBlogSocialPublications(
  campaignId: string,
  campaignBlogId: string,
) {
  const response = await apiInstance.post(
    endpoints.campaigns.reconcileCampaignBlogSocialPublications(
      campaignId,
      campaignBlogId,
    ),
  );

  return unwrapApiData(
    response.data,
  ) as ApiCampaignSocialPublicationReconcileResult;
}

export async function publishCampaignBlogSocialPublication(
  campaignId: string,
  campaignBlogId: string,
  input: CreateCampaignBlogSocialPublicationInput,
) {
  const response = await apiInstance.post(
    endpoints.campaigns.publishCampaignBlogSocialPublication(
      campaignId,
      campaignBlogId,
    ),
    input,
  );

  return unwrapApiData(
    response.data,
  ) as ApiCampaignBlogSocialPublicationCreateResult;
}

export async function getCampaignBlogSocialPublicationRateLimits(
  campaignId: string,
  blogIds: string[],
) {
  const response = await apiInstance.post(
    endpoints.campaigns.getCampaignBlogSocialPublicationRateLimitsBase(
      campaignId,
    ),
    {
      blogIds,
    },
  );

  return unwrapApiData(
    response.data,
  ) as ApiCampaignBlogSocialPublicationRateLimitListResult;
}

export function readCampaignSocialErrorCode(error: unknown) {
  const code = (error as any)?.response?.data?.code;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

export function readCampaignSocialErrorMessage(
  error: unknown,
  fallback: string,
) {
  return (
    (error as any)?.response?.data?.message ||
    (error instanceof Error ? error.message : fallback)
  );
}

export function readCampaignSocialRateLimitMeta(error: unknown) {
  return (
    ((error as any)?.response?.data?.meta?.publishRateLimits as
      | {
          resetAt?: string | null;
          exhaustedScopes?: string[];
          user?: CampaignSocialPublishRateLimitSnapshot | null;
          campaign?: CampaignSocialPublishRateLimitSnapshot | null;
          blog?: CampaignSocialPublishRateLimitSnapshot | null;
        }
      | null
      | undefined) ?? null
  );
}

export function countConnectedCampaignSocialPlatforms(
  uploadPostProfile: CampaignUploadPostProfile | null | undefined,
) {
  if (!uploadPostProfile) return 0;

  return [
    uploadPostProfile.x,
    uploadPostProfile.instagram,
    uploadPostProfile.facebook,
  ].filter((platform) => !!platform?.connected).length;
}

export function countEnabledCampaignSocialPlatforms(
  uploadPostProfile: CampaignUploadPostProfile | null | undefined,
) {
  if (!uploadPostProfile) return 0;

  return [
    uploadPostProfile.x,
    uploadPostProfile.instagram,
    uploadPostProfile.facebook,
  ].filter(
    (platform) => !!platform?.connected && (platform.enabled ?? true),
  ).length;
}

export function getConnectedCampaignSocialPlatforms(
  uploadPostProfile: CampaignUploadPostProfile | null | undefined,
) {
  if (!uploadPostProfile) return [] as Array<"x" | "instagram" | "facebook">;

  return (["x", "instagram", "facebook"] as const).filter(
    (platform) => !!uploadPostProfile[platform]?.connected,
  );
}

export function getPublishableCampaignSocialPlatforms(
  socialStatus: ApiCampaignSocialStatus | null | undefined,
) {
  const uploadPostProfile = socialStatus?.uploadPostProfile ?? null;
  const platformHealth = socialStatus?.platformHealth ?? null;
  if (!uploadPostProfile || !platformHealth) {
    return [] as CampaignSocialPlatformKey[];
  }

  return (["x", "instagram", "facebook"] as const).filter((platform) => {
    const snapshot = uploadPostProfile[platform];
    const health = platformHealth[platform];
    return (
      !!snapshot?.connected &&
      !!snapshot?.enabled &&
      health?.state === "connected"
    );
  });
}

export function countPublishableCampaignSocialPlatforms(
  socialStatus: ApiCampaignSocialStatus | null | undefined,
) {
  return getPublishableCampaignSocialPlatforms(socialStatus).length;
}

export function hasPendingCampaignSocialPublications(
  publicationList: ApiCampaignSocialPublicationListResult | null | undefined,
) {
  const entries = publicationList?.entries ?? [];
  return entries.some((entry) =>
    ["initiated", "accepted", "processing"].includes(entry.status),
  );
}

export function isCampaignSocialManageEligible(
  socialStatus: ApiCampaignSocialStatus | null | undefined,
) {
  return (
    socialStatus?.ownershipType === "main-owner" &&
    socialStatus?.manageState === "eligible"
  );
}

export function formatCampaignSocialRateLimitResetAt(
  resetAt: string | Date | null | undefined,
) {
  if (!resetAt) return "the next UTC midnight";

  const date = resetAt instanceof Date ? resetAt : new Date(resetAt);
  if (Number.isNaN(date.getTime())) {
    return "the next UTC midnight";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function getCampaignSocialPublishRateLimitExhaustedScopes(args: {
  user?: CampaignSocialPublishRateLimitSnapshot | null;
  campaign?: CampaignSocialPublishRateLimitSnapshot | null;
  blog?: CampaignSocialPublishRateLimitSnapshot | null;
}) {
  const exhaustedScopes: string[] = [];

  if (args.user?.exhausted) exhaustedScopes.push("user");
  if (args.campaign?.exhausted) exhaustedScopes.push("campaign");
  if (args.blog?.exhausted) exhaustedScopes.push("blog");

  return exhaustedScopes;
}

function joinRateLimitScopes(scopes: string[]) {
  if (scopes.length <= 1) return scopes[0] ?? "publish";
  if (scopes.length === 2) return `${scopes[0]} and ${scopes[1]}`;
  return `${scopes.slice(0, -1).join(", ")}, and ${scopes.at(-1)}`;
}

export function getCampaignSocialPublishRateLimitDisabledReason(args: {
  resetAt?: string | Date | null;
  user?: CampaignSocialPublishRateLimitSnapshot | null;
  campaign?: CampaignSocialPublishRateLimitSnapshot | null;
  blog?: CampaignSocialPublishRateLimitSnapshot | null;
}) {
  const exhaustedScopes = getCampaignSocialPublishRateLimitExhaustedScopes({
    user: args.user,
    campaign: args.campaign,
    blog: args.blog,
  });

  if (exhaustedScopes.length === 0) {
    return null;
  }

  return `No social media publish will be done until the ${joinRateLimitScopes(
    exhaustedScopes,
  )} daily limit resets at ${formatCampaignSocialRateLimitResetAt(
    args.resetAt,
  )}.`;
}

export function getCampaignBlogSocialPublishDisabledReason(args: {
  campaign: unknown;
  socialStatus: ApiCampaignSocialStatus | null | undefined;
  publishRateLimits?: {
    resetAt?: string | Date | null;
    user?: CampaignSocialPublishRateLimitSnapshot | null;
    campaign?: CampaignSocialPublishRateLimitSnapshot | null;
    blog?: CampaignSocialPublishRateLimitSnapshot | null;
  } | null;
  isMainOwner: boolean;
  isPaymentRequired: boolean;
  socialStatusLoading?: boolean;
  socialStatusError?: boolean;
}) {
  if (args.isPaymentRequired || isBasicCampaign(args.campaign)) {
    return "Manual social publishing is available for paid campaigns only.";
  }

  if (!args.isMainOwner) {
    return "Only the main owner can manually publish this blog.";
  }

  if (args.socialStatusLoading) {
    return "Checking connected social accounts...";
  }

  if (args.socialStatusError) {
    return "Couldn't load connected social account status right now.";
  }

  const connectedCount = countConnectedCampaignSocialPlatforms(
    args.socialStatus?.uploadPostProfile,
  );
  if (connectedCount === 0) {
    return "Connect at least one social account before publishing.";
  }

  const enabledCount = countEnabledCampaignSocialPlatforms(
    args.socialStatus?.uploadPostProfile,
  );
  if (enabledCount === 0) {
    return "Connected accounts exist, but none are enabled for posting.";
  }

  const publishablePlatforms = getPublishableCampaignSocialPlatforms(
    args.socialStatus,
  );
  if (publishablePlatforms.length === 0) {
    return "Connected social accounts need attention before publishing.";
  }

  if (!isCampaignSocialManageEligible(args.socialStatus)) {
    return "This campaign can't publish to social right now.";
  }

  const rateLimitReason = getCampaignSocialPublishRateLimitDisabledReason({
    resetAt:
      args.publishRateLimits?.resetAt ??
      args.socialStatus?.publishRateLimits?.resetAt,
    user:
      args.publishRateLimits?.user ?? args.socialStatus?.publishRateLimits?.user,
    campaign:
      args.publishRateLimits?.campaign ??
      args.socialStatus?.publishRateLimits?.campaign,
    blog: args.publishRateLimits?.blog,
  });
  if (rateLimitReason) {
    return rateLimitReason;
  }

  return null;
}

export function getCampaignSocialPlatformDisplayState(
  snapshot: CampaignUploadPostPlatformSnapshot | null | undefined,
  health: CampaignSocialPlatformHealth | null | undefined,
) {
  if (!snapshot?.connected) {
    return "not_connected" as const;
  }

  if (health?.state === "reauth_required") {
    return "reconnect_required" as const;
  }

  return "connected" as const;
}
