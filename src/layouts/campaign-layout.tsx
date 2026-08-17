import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Rocket, TriangleAlert } from "lucide-react";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import { type AssetType } from "@/utils/currency-assets/asset";
import {
  headerActionsForStatus,
  StatusPill,
  CAMPAIGN_STATUS,
  campaignStatuses,
  type CampaignStatus,
} from "@/utils/campaign-status";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { endpoints } from "@/api/endpoints";
import { useNavigate } from "react-router";
import { toNum } from "@/types/campaigns";
import { TokenChipsRow } from "@/components/campaign/trails/trails-manage-shared";
import { queryClient } from "@/api/queryClient";
import { TabPill } from "@/components/ui/tab-pill";
import { useApiMutation } from "@/hooks/useApiMutation";
import { DisabledActionTooltip } from "@/components/commons/disabled-action-tooltip";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";
import { SHOW_CAMPAIGN_SOCIAL_UI } from "@/config/features";
import { isBasicCampaign } from "@/lib/campaign/access";

export type CampaignTabKey =
  | "overview"
  | "add-info"
  | "trails"
  | "petitions"
  | "blogs"
  | "inkd-agents"
  | "social"
  | "co-owners"
  | "qr-library"
  | "subscription-management"
  | "events";
type Props = {
  campaignId?: string | null;
  campaignName: string;
  activeTab: CampaignTabKey;
  onTabChange: (t: CampaignTabKey) => void;

  onBack?: () => void;
  onRewards?: () => void;

  children: React.ReactNode;
};

type PendingHeaderAction = "END" | "ARCHIVE" | "DELETE" | null;

function pillBtn(tone: "neutral" | "danger") {
  if (tone === "danger") {
    return "bg-white border border-red-200 text-red-600 hover:bg-red-50";
  }
  return "bg-white border border-black/10 text-[#333] hover:bg-black/5";
}

function safeCampaignStatus(s: any): CampaignStatus {
  const v = String(s ?? "")
    .toLowerCase()
    .trim();
  return (campaignStatuses as readonly string[]).includes(v)
    ? (v as CampaignStatus)
    : CAMPAIGN_STATUS.DRAFT;
}

export default function CampaignLayout({
  campaignId,
  campaignName,
  activeTab,
  onTabChange,
  onRewards,
  children,
}: Props) {
  const navigate = useNavigate();

  useCreateCampaignStore((s) => s.campaignStatus);

  const route = campaignId
    ? endpoints.campaigns.getCampaignByIdOwner(campaignId)
    : "";

  const {
    permissions,
    campaignData,
    isMainOwner,
    ownershipType,
    billingMode,
    isLoading: campaignLoading,
    error: campaignLoadError,
  } = useCampaignByOwner(campaignId ?? undefined);
  const apiCampaign = campaignData;
  const [statusOverride, setStatusOverride] = useState<CampaignStatus | null>(
    null,
  );

  const apiStatus = useMemo(() => {
    return statusOverride ?? safeCampaignStatus(apiCampaign?.status);
  }, [apiCampaign?.status, statusOverride]);
  const showPaidFeatureTabLabel = isBasicCampaign(apiCampaign);
  const hasSubscriptionBilling = billingMode === "subscription";
  const isDraft = apiStatus === CAMPAIGN_STATUS.DRAFT;
  const isPaused = apiStatus === CAMPAIGN_STATUS.PAUSED;
  const editable = isDraft || isPaused;

  const lockEdits = !editable;

  const capList =
    apiCampaign?.rewardSums?.activeTrials?.rewardCapByAsset ??
    apiCampaign?.rewardSums?.activeTrials?.rewardAmountByAsset ??
    apiCampaign?.rewardSums?.activeTrials?.computedByAsset ??
    [];

  const [pending, setPending] = useState<PendingHeaderAction>(null);
  const [err, setErr] = useState<string | null>(null);

  const rewardCapTokens = useMemo(() => {
    return (Array.isArray(capList) ? capList : [])
      .map((x) => ({
        assetId: String(x.assetId) as AssetType,
        amount: toNum(x.total),
      }))
      .filter((x) => !!x.assetId && Number.isFinite(x.amount))
      .slice(0, 6);
  }, [capList]);

  const headerActions = useMemo(
    () => headerActionsForStatus(apiStatus),
    [apiStatus],
  );

  const actionMeta = useMemo(() => {
    const meta: Record<
      Exclude<PendingHeaderAction, null>,
      {
        title: string;
        desc: string;
        confirm: string;
        tone: "primary" | "danger";
        endpoint: string;
        method: "POST" | "DELETE";
        nextStatus: CampaignStatus;
      }
    > = {
      END: {
        title: "End Campaign?",
        desc: "This will end the campaign (allowed from draft/live/paused).",
        confirm: "END",
        tone: "danger",
        endpoint: endpoints.campaigns.end,
        method: "POST",
        nextStatus: CAMPAIGN_STATUS.ENDED,
      },
      ARCHIVE: {
        title: "Archive Campaign?",
        desc: "Are you sure you want to archive this campaign? Archived campaigns will no longer be active.",
        confirm: "ARCHIVE",
        tone: "primary",
        endpoint: endpoints.campaigns.archive,
        method: "DELETE",
        nextStatus: CAMPAIGN_STATUS.ARCHIVED,
      },
      DELETE: {
        title: "Delete Campaign?",
        desc: "This campaign will be permanently deleted and removed from your campaigns.",
        confirm: "DELETE",
        tone: "danger",
        endpoint: endpoints.campaigns.delete,
        method: "DELETE",
        nextStatus: CAMPAIGN_STATUS.DELETED,
      },
    };
    return meta;
  }, []);

  const invalidateCampaign = () => {
    if (campaignId) {
      queryClient.invalidateQueries({ queryKey: [route] });
    }
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.myCampaigns],
    });
  };

  const { mutate: endCampaign, isPending: ending } = useApiMutation<
    { campaignId: string },
    any
  >({
    route: endpoints.campaigns.end,
    method: "POST",
    onSuccess: () => {
      setPending(null);
      setStatusOverride(CAMPAIGN_STATUS.ENDED);
      invalidateCampaign();
    },
    onError: (e) => {
      console.error("End campaign failed", e);
      setErr(
        (e as any)?.message ||
          (e as any)?.response?.data?.message ||
          "Server error",
      );
    },
  });

  const { mutate: archiveCampaign, isPending: archiving } = useApiMutation<
    { campaignId: string },
    any
  >({
    route: endpoints.campaigns.archive,
    method: "DELETE",
    onSuccess: () => {
      setPending(null);
      setStatusOverride(CAMPAIGN_STATUS.ARCHIVED);
      invalidateCampaign();
    },
    onError: (e) => {
      console.error("Archive campaign failed", e);
      setErr(
        (e as any)?.message ||
          (e as any)?.response?.data?.message ||
          "Server error",
      );
    },
  });

  const { mutate: deleteCampaign, isPending: deleting } = useApiMutation<
    { campaignId: string },
    any
  >({
    route: endpoints.campaigns.delete,
    method: "DELETE",
    onSuccess: () => {
      setPending(null);
      setStatusOverride(CAMPAIGN_STATUS.DELETED);
      invalidateCampaign();
      navigate("/campaigns/my-campaigns", { replace: true });
    },
    onError: (e) => {
      console.error("Delete campaign failed", e);
      setErr(e?.message || "Server error");
    },
  });

  function callHeaderAction(a: Exclude<PendingHeaderAction, null>) {
    if (!campaignId) {
      setErr("Missing campaignId");
      return;
    }

    setErr(null);

    if (a === "END") return endCampaign({ campaignId });
    if (a === "ARCHIVE") return archiveCampaign({ campaignId });
    if (a === "DELETE") return deleteCampaign({ campaignId });
  }
  const busy = ending || archiving || deleting;

  if (campaignLoading) {
    return <div>Loading...</div>;
  }
  if (campaignLoadError) {
    return <div>Campaign not accessible</div>;
  }
  return (
    <div className="bg-white hidden md:block">
      <div className="p-4 font-poppins">
        <header className="border-b border-black/30 underline-offset-2">
          <div className="flex items-center gap-4 pb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate("/campaigns/my-campaigns")}
                className="px-2 border-white border-r-2 border-l-2 rounded-xl bg-[#dbdcdf30] hover:bg-black/5"
              >
                <ArrowLeft className="w-4" />
              </button>

              <div className="min-w-0 text-sm xl:text-lg flex items-center xl:gap-2">
                <Rocket />
                <span className="font-bold line-clamp-1">{campaignName}</span>

                <div className="ml-2 shrink-0">
                  <StatusPill status={apiStatus} />
                </div>
              </div>
            </div>

            <div className="ml-auto flex flex-col items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onRewards}
                className="flex items-center gap-2 font-semibold text-gray-600 hover:text-gray-900"
              >
                {rewardCapTokens.length === 0 && (
                  <TriangleAlert className="w-4 text-red-500" />
                )}
                REWARDS
              </button>

              {campaignLoading ? (
                <div className="text-[11px] text-gray-400">
                  Loading rewards...
                </div>
              ) : rewardCapTokens.length ? (
                <TokenChipsRow tokens={rewardCapTokens} isBase />
              ) : (
                <div className="text-[11px] text-gray-400">No rewards yet</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <CampaignStatePills
              input={apiCampaign}
              ownershipType={ownershipType}
              billingMode={billingMode}
              showBillingMode={billingMode != null}
            />

            {apiCampaign?.visibility === "unlisted" ? (
              <div className="text-xs font-medium text-[#8A5A00]">
                Basic campaigns appear only in the selected country, or by sharing a direct link.
              </div>
            ) : null}
          </div>
        </header>

        <section className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <TabPill
                active={activeTab === "overview"}
                onClick={() => onTabChange("overview")}
              >
                Overview
              </TabPill>
              {!permissions.campaign.edit ? (
                <PermissionDisabledTooltip hasPermission={permissions.campaign.edit}>
                  <TabPill
                    active={activeTab === "add-info"}
                    disabled
                    onClick={() => onTabChange("add-info")}
                  >
                    Add Info
                  </TabPill>
                </PermissionDisabledTooltip>
              ) : lockEdits ? (
                <DisabledActionTooltip disabled>
                  <TabPill
                    active={activeTab === "add-info"}
                    disabled
                    onClick={() => onTabChange("add-info")}
                  >
                    Add Info
                  </TabPill>
                </DisabledActionTooltip>
              ) : (
                <TabPill
                  active={activeTab === "add-info"}
                  onClick={() => onTabChange("add-info")}
                >
                  Add Info
                </TabPill>
              )}

              {!permissions.campaign.edit || !permissions.campaignTrial.create ? (
                <PermissionDisabledTooltip
                  hasPermission={
                    permissions.campaign.edit && permissions.campaignTrial.create
                  }
                >
                  <TabPill
                    active={activeTab === "trails"}
                    disabled
                    onClick={() => onTabChange("trails")}
                  >
                    Trails
                  </TabPill>
                </PermissionDisabledTooltip>
              ) : lockEdits ? (
                <DisabledActionTooltip disabled>
                  <TabPill
                    active={activeTab === "trails"}
                    disabled
                    onClick={() => onTabChange("trails")}
                  >
                    Trails
                  </TabPill>
                </DisabledActionTooltip>
              ) : (
                <TabPill
                  active={activeTab === "trails"}
                  onClick={() => onTabChange("trails")}
                >
                  Trails
                </TabPill>
              )}
              <TabPill
                active={activeTab === "petitions"}
                onClick={() => onTabChange("petitions")}
              >
                {showPaidFeatureTabLabel
                  ? "Petitions (Paid Feature)"
                  : "Petitions"}
              </TabPill>
              <TabPill
                active={activeTab === "blogs"}
                onClick={() => onTabChange("blogs")}
              >
                Blogs
              </TabPill>
              <TabPill
                active={activeTab === "inkd-agents"}
                onClick={() => onTabChange("inkd-agents")}
              >
                {showPaidFeatureTabLabel
                  ? "InkD Agents (Paid Feature)"
                  : "InkD Agents"}
              </TabPill>
              {SHOW_CAMPAIGN_SOCIAL_UI ? (
                <TabPill
                  active={activeTab === "social"}
                  onClick={() => onTabChange("social")}
                >
                  {showPaidFeatureTabLabel
                    ? "Social Accounts (Paid Feature)"
                    : "Social Accounts"}
                </TabPill>
              ) : null}
              {isMainOwner ? (
                <TabPill
                  active={activeTab === "co-owners"}
                  onClick={() => onTabChange("co-owners")}
                >
                  Co Owners
                </TabPill>
              ) : null}
              <TabPill
                active={activeTab === "qr-library"}
                onClick={() => onTabChange("qr-library")}
              >
                {showPaidFeatureTabLabel
                  ? "QR Library (Paid Feature)"
                  : "QR Library"}
              </TabPill>
              {hasSubscriptionBilling ? (
                <TabPill
                  active={activeTab === "subscription-management"}
                  onClick={() => onTabChange("subscription-management")}
                >
                  Subscription Management
                </TabPill>
              ) : null}
              <TabPill
                active={activeTab === "events"}
                onClick={() => onTabChange("events")}
              >
                {showPaidFeatureTabLabel ? "Events (Paid Feature)" : "Events"}
              </TabPill>
            </div>

            <div className="flex flex-col items-center gap-1">
              {headerActions.map((a) => {
                const tone =
                  a === "DELETE" || a === "END" ? "danger" : "neutral";
                const hasPerm =
                  a === "END"
                    ? permissions.campaign.end
                    : a === "ARCHIVE"
                      ? permissions.campaign.archive
                      : permissions.campaign.delete;
                return (
                  <PermissionDisabledTooltip key={a} hasPermission={hasPerm}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasPerm) return;
                        setErr(null);
                        setPending(a);
                      }}
                      className={cn(
                        "rounded-full px-2 py-1.5 text-[12px] font-semibold tracking-wide w-full",
                        pillBtn(tone),
                      )}
                    >
                      {a}
                    </button>
                  </PermissionDisabledTooltip>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="px-2 py-6">{children}</div>

      <CampaignActionConfirmModal
        open={!!pending}
        title={pending ? actionMeta[pending].title : ""}
        description={pending ? actionMeta[pending].desc : ""}
        confirmLabel={pending ? actionMeta[pending].confirm : "CONFIRM"}
        tone={pending ? actionMeta[pending].tone : "primary"}
        loading={busy}
        error={err}
        onClose={() => {
          if (busy) return;
          setPending(null);
          setErr(null);
        }}
        onConfirm={() => {
          if (!pending) return;
          return callHeaderAction(pending);
        }}
      />
    </div>
  );
}

// test push
