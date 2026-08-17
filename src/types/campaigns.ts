import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { getYouTubeThumbnailUrl } from "@/types/petition";
import type { PurchasableBuyConfig } from "@/lib/payments/buy-config";

export type CampaignType = "non_political" | "political";

export type YesNo = "yes" | "no";

export type PriceKey = `${YesNo}_${CampaignType}`;

export type DurationKey = "m1" | "m2" | "m3";

export type DurationOption = { key: DurationKey; label: string };

export type PriceMatrix = Record<PriceKey, Record<DurationKey, number>>;

export type ActiveModal =
  | "confirm"
  | "political"
  | "dataAccess"
  | null;

export type ApiUserMini = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type CampaignTier = "basic" | "paid";

export type CampaignVisibility = "listed" | "unlisted";

export const CAMPAIGN_BILLING_MODES = ["one_time", "subscription"] as const;

export type CampaignBillingMode = (typeof CAMPAIGN_BILLING_MODES)[number];

export type CampaignOwnerAccessState = "full" | "payment_required";

export type CampaignFeatureAccessState = "upgrade_required" | "hidden";

export type CampaignOwnerGatedFeature =
  | "trails"
  | "petitions"
  | "blogs"
  | "co_owners"
  | "qr"
  | "social_accounts";

export type BasicCampaignExcludedFeature =
  | "petition"
  | "qr"
  | "campaign_trial_ai";

export type CampaignBlockedResponseBase = {
  reason?: string | null;
  action?: string | null;
  campaignId?: string | null;
  tier?: CampaignTier | null;
  visibility?: CampaignVisibility | null;
  message?: string | null;
  code?: string | null;
};

export type CampaignPaymentRequiredResponse = CampaignBlockedResponseBase & {
  ownerAccessState: "payment_required";
  dataAccessState: "payment_required";
  reason: "payment_required";
  feature: CampaignOwnerGatedFeature;
};

export type CampaignUpgradeRequiredResponse = CampaignBlockedResponseBase & {
  featureAccessState: CampaignFeatureAccessState;
  reason: "upgrade_required" | "hidden_for_basic";
  feature: BasicCampaignExcludedFeature;
};

export type CampaignUploadPostPlatformSnapshot = {
  connected: boolean;
  enabled: boolean;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type CampaignUploadPostProfile = {
  x: CampaignUploadPostPlatformSnapshot;
  instagram: CampaignUploadPostPlatformSnapshot;
  facebook: CampaignUploadPostPlatformSnapshot;
};

export type CampaignInkDAutoSocialPublishConfig = {
  enabled: boolean;
  imageUrl?: string | null;
  updatedByExternalAccountId?: string | null;
  updatedAt?: string | null;
  consentedAt?: string | null;
};

export type UpdateCampaignInkDAutoSocialPublishInput = {
  enabled: boolean;
  imageUrl: string | null;
};

export const CAMPAIGN_SOCIAL_PLATFORM_HEALTH_STATES = [
  "connected",
  "disconnected",
  "reauth_required",
  "unknown",
] as const;

export type CampaignSocialPlatformHealthState =
  (typeof CAMPAIGN_SOCIAL_PLATFORM_HEALTH_STATES)[number];

export const UPLOAD_POST_SOCIAL_WEBHOOK_EVENT_TYPES = [
  "social_account.connected",
  "social_account.disconnected",
  "social_account.reauth_required",
] as const;

export type UploadPostSocialWebhookEventType =
  (typeof UPLOAD_POST_SOCIAL_WEBHOOK_EVENT_TYPES)[number];

export type CampaignSocialPlatformHealth = {
  state: CampaignSocialPlatformHealthState;
  lastEventAt?: string | null;
  lastEventType?: UploadPostSocialWebhookEventType | null;
};

export type CampaignSocialPlatformHealthMap = {
  x: CampaignSocialPlatformHealth;
  instagram: CampaignSocialPlatformHealth;
  facebook: CampaignSocialPlatformHealth;
};

export const CAMPAIGN_SOCIAL_PLATFORM_KEYS = [
  "x",
  "instagram",
  "facebook",
] as const;

export type CampaignSocialPlatformKey =
  (typeof CAMPAIGN_SOCIAL_PLATFORM_KEYS)[number];

export const CAMPAIGN_SOCIAL_OWNERSHIP_TYPES = [
  "main-owner",
  "co-owner",
] as const;

export type CampaignSocialOwnershipType =
  (typeof CAMPAIGN_SOCIAL_OWNERSHIP_TYPES)[number];

export const CAMPAIGN_SOCIAL_MANAGE_STATES = [
  "eligible",
  "upgrade_required",
  "payment_required",
  "main_owner_only",
  "campaign_closed",
] as const;

export type CampaignSocialManageState =
  (typeof CAMPAIGN_SOCIAL_MANAGE_STATES)[number];

export const CAMPAIGN_SOCIAL_PROFILE_STATUSES = [
  "not_created",
  "ready",
  "failed",
] as const;

export type CampaignSocialProfileStatus =
  (typeof CAMPAIGN_SOCIAL_PROFILE_STATUSES)[number];

export type CampaignBlockedResponse =
  | CampaignPaymentRequiredResponse
  | CampaignUpgradeRequiredResponse;

export type CampaignTargetGeoOption =
  | string
  | {
      _id?: string;
      id?: string;
      name?: string;
      iso3?: string;
      state?: { _id?: string; name?: string } | string | null;
      country?: { _id?: string; name?: string } | string | null;
    };

export type CampaignTargetGeo = {
  countries?: CampaignTargetGeoOption[];
  states?: CampaignTargetGeoOption[];
  cities?: CampaignTargetGeoOption[];
};

export type CampaignTargetGeoPayload = {
  countries: string[];
  states: string[];
  cities: string[];
};

export type BasicCampaignCreateInput = {
  name: string;
  goal: string;
  isPolitical: boolean;
  initialPlanId: string;
};

export type ApiDecimal =
  | number
  | string
  | { $numberDecimal: string }
  | null
  | undefined;

export function toNum(v: ApiDecimal) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  if (typeof v === "object" && v && "$numberDecimal" in v) {
    return Number((v as any).$numberDecimal) || 0;
  }
  return Number(v as any) || 0;
}

export type ApiTrial = {
  _id: string;
  title: string;
  description: string;
  resourceAssets?: Array<{ type: "image" | "youtube" | "video"; value: string }>;
  rewards?: Array<{
    assetId: AssetType;
    amount: ApiDecimal;
    rewardAmountCap: ApiDecimal;
    rewardType: "min" | "max";
  }>;
  archivedAt?: string | null;
  alreadyCasted?: boolean;
};

export type TrailCard = {
  id: string;
  trailName: string;
  description: string;
  images: (string | null)[]; 
  thumbMediaType?: "image" | "youtube" | "video";
  rewards: Array<{
    id: string;
    assetId: AssetType;
    amount: number;
    rewardAmountCap: number;
    rewardType: "min" | "max";
  }>;
};
export type FormValues = {
  campaignName: string;
  goal: string;
  getDataAccess: boolean;
  campaignType: CampaignType;
  duration: string;
  agree: boolean;
};

export type CampaignPlan = {
  _id: string;
  code: string;
  name: string;
  isPolitical: boolean;
  donationSupported: boolean;
  durationDays: number;
  isActive: boolean;
  archivedAt: string | null;
  tier?: CampaignTier;
  visibility?: CampaignVisibility;
  buyConfig?: PurchasableBuyConfig | null;
  features: Record<string, any>;
};

export type CreateTrialPayload = {
  campaignId: string;
  trial: {
    resourceAssets: Array<
      | { type: "image"; value: string }
      | { type: "youtube"; value: string }
      | { type: "video"; value: string }
    >;
    title: string;
    description: string;
    rewards: Array<{
      assetId: string;
      amount: number;
      rewardAmountCap: number;
      rewardType: "min" | "max";
    }>;
  };
  polls: Array<{
    title: string;
    description: string;
    resourceAssets: Array<
      | { type: "image"; value: string }
      | { type: "youtube"; value: string }
      | { type: "video"; value: string }
    >;
    options: { text: string }[];
  }>;
};

export type CampaignStatus =
  | "draft"
  | "live"
  | "paused"
  | "ended"
  | "archived"
  | "deleted";

export type CampaignCardVariant = "sm" | "lg";

export type EarningToken = {
  symbol: string;
  amount: number;
};

export type CampaignCardModel = {
  _id: string;
  name: string;
  goal: string;
  username?: string;
  avatarUrl?: string;
  imageLinks?: string[];
  status: CampaignStatus;
  locked?: boolean;
  isSaved?: boolean;

  trailsCompleted?: number;
  trailsTotal?: number;

  earningPotential?: EarningToken[];
  description?: string;
};

export type ApiCampaign = {
  _id: string;
  name: string;
  goal: string;
  status: CampaignStatus;
  tier?: CampaignTier;
  visibility?: CampaignVisibility;
  ownerAccessState?: CampaignOwnerAccessState;
  description?: string | null;
  imageLinks?: string[];

  externalAuthor?: {
    username?: string;
    avatar?: {
      imageUrl?: string;
    };
  };

  totalActive?: number;
  totalAttempted?: number;

  rewardSums?: {
    activeTrials?: {
      computedByAsset?: Array<{
        assetId: AssetType;
        total: string;
      }>;
    };
  };
};

export function mapApiCampaignToNewCard(c: ApiCampaign): CampaignCardModel {
  const earningPotential: EarningToken[] =
    c.rewardSums?.activeTrials?.computedByAsset?.map((r) => {
      const asset = r.assetId;
      const decimalsToShow = Math.min(assetSpecs[asset].decimal, 3);

      const rewardParent = unwrapString(
        amount({
          op: "toParent",
          assetId: asset,
          value: r.total.toString(),
          output: "string",
          fixed: decimalsToShow,
          group: false,
        }),
        "0",
      );

      return {
        symbol: assetSpecs[asset].parentSymbol,
        amount: Number(rewardParent),
      };
    }) ?? [];

  return {
    _id: c._id,
    name: c.name,
    goal: c.goal,
    status: c.status,

    imageLinks: c.imageLinks ?? [],
    username: c.externalAuthor?.username,
    avatarUrl: c.externalAuthor?.avatar?.imageUrl,

    earningPotential,
  };
}

export function mapApiCampaignToParticipatedCard(
  c: ApiCampaign,
): CampaignCardModel {
  return {
    _id: c._id,
    name: c.name,
    goal: c.goal,
    status: c.status,

    imageLinks: c.imageLinks ?? [],
    username: c.externalAuthor?.username,
    avatarUrl: c.externalAuthor?.avatar?.imageUrl,

    trailsCompleted: c.totalAttempted ?? 0,
    trailsTotal: c.totalActive ?? 0,
  };
}

export type EarnToken = {
  amount: number; // base
  assetId: AssetType;
  computedReward?: number;
};

export type TrailRowModel = {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  /** When first asset is youtube or video, coverImageUrl is thumbnail/video URL */
  coverMediaType?: "image" | "youtube" | "video";
  rewards: EarnToken[];
  alreadyCasted?: boolean;
};

export type CampaignDetailModel = {
  _id: string;
  organizerName: string;
  title: string;
  subtitle: string;
  description: string;
  images: [string | null, string | null, string | null];
  earningPotential: EarnToken[];
  usersContributed: number;
  coinsContributed: number;
  trails: TrailRowModel[];
};

export type ApiShareFeature = {
  isEnabled: boolean;
  referral_levels?: Array<{
    totalUniqueVisitsRequired: number;
    rewards: Array<{
      assetId: AssetType;
      amount: string; // base string
      payoutCap: string; // base string
      payoutDistributed?: string;
      isExhausted?: boolean;
    }>;
  }>;
};
export type ApiCampaignById = {
  _id: string;
  tier?: CampaignTier;
  visibility?: CampaignVisibility;
  ownerAccessState?: CampaignOwnerAccessState;
  uploadPostProfile?: CampaignUploadPostProfile | null;
  inkdAutoSocialPublish?: CampaignInkDAutoSocialPublishConfig | null;
  billing?: {
    mode?: CampaignBillingMode | null;
    paymentSubscriptionId?: string | null;
  } | null;
  ownership?: {
    type?: "main-owner" | "co-owner";
    permissions?: Record<string, any> | null;
    mainOwner?: Record<string, any> | null;
  } | null;
  externalAuthor?: {
    _id?: string;
    username?: string;
    avatar?: {
      name?: string;
      imageUrl?: string;
    };
  };
  name: string;
  goal: string;
  status: string;
  description?: string | null;
  websiteLink?: string | null;
  emailLink?: string | null;
  twitterLink?: string | null;
  instagramLink?: string | null;
  telegramLink?: string | null;
  videoLink?: string | null;
  imageLinks?: string[];
  uploadedVideoLinks?: string[];
  rewardSums?: {
    activeTrials?: {
      computedByAsset?: Array<{
        assetId: AssetType;
        total: string;
      }>;
    };
  };
  usersContributed?: number;
  coinsContributed?: number;
  trials?: any[];
  targetGeo?: CampaignTargetGeo | null;
  shareFeatureField?: ApiShareFeature;
  currentPlan?: {
    endsAt?: string | null;
    startsAt?: string | null;
    donation?: {
      supported?: boolean;
      enabled?: boolean;
      startAt?: string | null;
      endAt?: string | null;
    } | null;
  } | null;
};

export type ApiCampaignSocialStatus = {
  campaignId: string;
  tier?: CampaignTier | null;
  billingMode?: CampaignBillingMode | null;
  ownershipType?: CampaignSocialOwnershipType | null;
  manageState?: CampaignSocialManageState | null;
  manageReason?: CampaignSocialManageState | null;
  uploadPostProfile?: CampaignUploadPostProfile | null;
  platformHealth?: CampaignSocialPlatformHealthMap | null;
  profileStatus?: CampaignSocialProfileStatus | null;
  lastLinkedAt?: string | null;
  lastSyncedAt?: string | null;
  detachedAt?: string | null;
  lastWebhookEventAt?: string | null;
  publishRateLimits?: CampaignSocialPublishRateLimits | null;
};

export type CampaignSocialPublishRateLimitSnapshot = {
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
};

export type CampaignSocialPublishRateLimitRule = {
  limit: number;
  window: "day";
  resetTimezone: "UTC";
};

export type CampaignSocialPublishRateLimits = {
  resetAt: string;
  user: CampaignSocialPublishRateLimitSnapshot;
  campaign: CampaignSocialPublishRateLimitSnapshot;
  blogRule: CampaignSocialPublishRateLimitRule;
};

export type ApiCampaignBlogSocialPublicationRateLimitListResult = {
  resetAt: string;
  blogs: Array<{
    campaignBlogId: string;
    rateLimit: CampaignSocialPublishRateLimitSnapshot;
  }>;
};

export type ApiCampaignSocialConnectResult = {
  accessUrl: string;
  sessionId: string;
  expiresAt?: string | null;
  returnToPath?: string | null;
};

export type ApiCampaignSocialFinalizeSession = {
  sessionId: string;
  status?: "pending" | "completed" | "failed" | "expired" | null;
  expiresAt?: string | null;
  completedAt?: string | null;
};

export type ApiCampaignSocialMutationResult = {
  social: ApiCampaignSocialStatus;
};

export type ApiCampaignSocialFinalizeResult = ApiCampaignSocialMutationResult & {
  returnToPath?: string | null;
  session?: ApiCampaignSocialFinalizeSession | null;
};

export const CAMPAIGN_SOCIAL_PUBLICATION_MEDIA_TYPES = [
  "photo",
  "video",
] as const;

export type CampaignSocialPublicationMediaType =
  (typeof CAMPAIGN_SOCIAL_PUBLICATION_MEDIA_TYPES)[number];

export const CAMPAIGN_SOCIAL_PUBLICATION_STATUSES = [
  "initiated",
  "accepted",
  "processing",
  "published",
  "rate_limited",
  "failed",
] as const;

export type CampaignSocialPublicationStatus =
  (typeof CAMPAIGN_SOCIAL_PUBLICATION_STATUSES)[number];

export const CAMPAIGN_SOCIAL_PUBLICATION_MEDIA_ITEM_TYPES = [
  "image",
  "video",
] as const;

export type CampaignSocialPublicationMediaItemType =
  (typeof CAMPAIGN_SOCIAL_PUBLICATION_MEDIA_ITEM_TYPES)[number];

export type CampaignSocialPublicationPayloadMediaItem = {
  type: CampaignSocialPublicationMediaItemType;
  url: string;
  source?: "selected" | "default_fallback" | null;
};

export type CampaignSocialPublicationPayloadSnapshot = {
  title: string;
  caption: string;
  linkUrl?: string | null;
  mediaItems: CampaignSocialPublicationPayloadMediaItem[];
  selectedPlatforms: CampaignSocialPlatformKey[];
  mediaType?: CampaignSocialPublicationMediaType | null;
  mediaUrl?: string | null;
};

export type CampaignSocialPublicationSource = "manual" | "inkd_auto";

export type ApiCampaignSocialPublication = {
  _id: string;
  campaignId: string;
  campaignBlogId?: string | null;
  source: CampaignSocialPublicationSource;
  publishRunCode: string;
  platform: CampaignSocialPlatformKey;
  mediaType: CampaignSocialPublicationMediaType;
  status: CampaignSocialPublicationStatus;
  uploadPostProfileUsername: string;
  uploadPostRequestId?: string | null;
  uploadPostJobId?: string | null;
  postUrl?: string | null;
  platformPostId?: string | null;
  errorMessage?: string | null;
  payloadSnapshot: CampaignSocialPublicationPayloadSnapshot;
  webhookCompletedAt?: string | null;
  lastReconciledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiCampaignSocialPublicationListResult = {
  entries: ApiCampaignSocialPublication[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type ApiCampaignBlogSocialPublicationCreateResult = {
  publishRunCode: string;
  publications: ApiCampaignSocialPublication[];
  publishablePlatforms: CampaignSocialPlatformKey[];
};

export type CreateCampaignBlogSocialPublicationInput = {
  platforms: CampaignSocialPlatformKey[];
  caption: string;
  mediaItems: Array<{
    type: "image";
    url: string;
    mimeType: string;
    fileName: string;
    byteSize: number;
  }>;
};

export type ApiCampaignSocialPublicationReconcileResult = {
  checkedCount: number;
  updatedCount: number;
};

export type ApiTrialsListingResponse = {
  data: {
    activeTrials: ApiTrial[];
    allTrials: ApiTrial[];
  };
};

export function pickDataRoot<T = any>(resp: any): T | null {
  const root = resp?.data ?? resp;
  const data = root?.data ?? root;
  return (data ?? null) as T | null;
}

export function mapApiTrialToRowModel(t: any): TrailRowModel {
  const first = t?.resourceAssets?.[0];
  let coverImageUrl = "";
  let coverMediaType: "image" | "youtube" | "video" | undefined;
  if (first?.value) {
    if (first.type === "image") {
      coverImageUrl = first.value;
      coverMediaType = "image";
    } else if (first.type === "youtube") {
      const thumb = getYouTubeThumbnailUrl(String(first.value));
      coverImageUrl = thumb ?? "";
      coverMediaType = "youtube";
    } else if (first.type === "video") {
      coverImageUrl = first.value;
      coverMediaType = "video";
    }
  }

  const rewards: EarnToken[] =
    (t?.rewards ?? []).map((r: any) => ({
      assetId: r.assetId as AssetType,
      amount: Number(r.amount ?? "0"),
      computedReward: Number(r.computedReward ?? "0"),
    })) ?? [];

  return {
    id: String(t?._id ?? ""),
    title: String(t?.title ?? ""),
    description: String(t?.description ?? ""),
    coverImageUrl,
    coverMediaType,
    rewards,
    alreadyCasted: Boolean(t?.alreadyCasted), // ✅ keep it
  };
}
