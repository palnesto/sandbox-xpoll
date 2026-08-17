import type { CampaignInkDAutoSocialPublishConfig } from "@/types/campaigns";

export type InkDAgentCreatorType = "admin" | "campaign_user";
export type InkDAgentStatus = "active" | "idle";
export type InkDAgentGenerationMode =
  | "inkd_only"
  | "campaign_only"
  | "inkd_and_campaign";
export type CampaignInkDAgentOwnershipType = "main-owner" | "co-owner";
export type CampaignInkDAgentManageReason =
  | "eligible"
  | "upgrade_required"
  | "payment_required"
  | "main_owner_only"
  | "campaign_closed";

export type CampaignInkDAgentCampaignTarget = {
  _id: string;
  name: string;
  status?: string | null;
  archivedAt?: string | null;
  imageLinks: string[];
};

export type CampaignInkDAgentScheduleRule = {
  _id: string;
  weekdays: string[];
  timeUtc: string;
};

export type CampaignInkDAgent = {
  _id: string;
  internalAgentId: string;
  name: string;
  displayName?: string | null;
  status: InkDAgentStatus;
  creatorType: InkDAgentCreatorType;
  createdByExternalAccountId?: string | null;
  userOwnedCampaignId?: string | null;
  foundationalInformation?: string | null;
  brandLanguage?: string | null;
  maxBlogDescriptionLength?: number | null;
  generationMode: InkDAgentGenerationMode;
  campaignTargets: CampaignInkDAgentCampaignTarget[];
  prioritySources: string[];
  scheduleRules: CampaignInkDAgentScheduleRule[];
  nextSchedule?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CampaignInkDAgentListingResult = {
  campaignId: string;
  ownershipType: CampaignInkDAgentOwnershipType;
  ownerAccessState?: "full" | "payment_required" | null;
  manageReason: CampaignInkDAgentManageReason;
  tier?: "basic" | "paid" | null;
  inkdAutoSocialPublish?: CampaignInkDAutoSocialPublishConfig | null;
  canManageUserOwnedAgent: boolean;
  counts: {
    userOwned: number;
    adminConnected: number;
    total: number;
  };
  userOwnedAgent: CampaignInkDAgent | null;
  adminConnectedAgents: CampaignInkDAgent[];
};

export type InkDAgentTaskLog = {
  _id: string;
  inkdInternalAgentId: string;
  internalAgentId: string;
  scheduleRuleId?: string | null;
  generationModeSnapshot: InkDAgentGenerationMode;
  campaignTargetIdsSnapshot: string[];
  triggerSource: "manual" | "scheduled";
  claimPriority: number;
  scheduledForUtc: string | null;
  state: "queued" | "running" | "completed" | "failed" | "cancelled";
  attemptCount: number;
  failedAttempts: number;
  claimedUntilUtc?: string | null;
  claimedByTaskRunId?: string | null;
  retryAfterUtc?: string | null;
  metadata: {
    success: {
      completedAtUtc?: string | null;
      data?: {
        createdCampaignBlogIds?: string[];
        skippedCampaignTargetIds?: string[];
      } | null;
    };
    failure: {
      failedAtUtc?: string | null;
      lastCode?: string | null;
      lastMessage?: string | null;
      history: Array<{
        attemptNo: number;
        atUtc: string | null;
        code?: string | null;
        message?: string | null;
      }>;
    };
    cancellation: {
      cancelledAtUtc?: string | null;
      cancelledBy?: string | null;
      reason?: string | null;
    };
  };
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InkDAgentTaskLogListResult = {
  page: number;
  pageSize: number;
  total: number;
  entries: InkDAgentTaskLog[];
};

export type CampaignInkDAgentActivityLog = InkDAgentTaskLog & {
  inkdAgentName: string | null;
  creatorType: InkDAgentCreatorType;
};

export type CampaignInkDAgentActivityLogListResult = {
  page: number;
  pageSize: number;
  total: number;
  entries: CampaignInkDAgentActivityLog[];
};

export function getAllCampaignConnectedInkDAgents(
  listing: CampaignInkDAgentListingResult | null | undefined,
) {
  if (!listing) return [] as CampaignInkDAgent[];

  return [
    ...(listing.userOwnedAgent ? [listing.userOwnedAgent] : []),
    ...(Array.isArray(listing.adminConnectedAgents)
      ? listing.adminConnectedAgents
      : []),
  ];
}
