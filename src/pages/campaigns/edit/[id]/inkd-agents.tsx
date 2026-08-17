import { useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import {
  InkDAgentsLoadingState,
  InkDAgentsReadShell,
} from "@/components/campaign/inkd-agents/inkd-agents-read-shell";
import { InkDAgentManageModal } from "@/components/campaign/inkd-agents/inkd-agent-manage-modal";
import { InkDAutoSocialPublishModal } from "@/components/campaign/inkd-agents/inkd-auto-social-publish-modal";
import {
  type CampaignInkDAgent,
  type CampaignInkDAgentActivityLogListResult,
  type CampaignInkDAgentListingResult,
} from "@/components/campaign/inkd-agents/model";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { pickDataRoot, type ApiCampaignSocialStatus } from "@/types/campaigns";
import { appToast } from "@/utils/toast";

function readMutationError(error: any) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export default function EditCampaignInkDAgentsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [autoSocialModalOpen, setAutoSocialModalOpen] = useState(false);

  const {
    campaignName,
    isMainOwner,
    isBasic,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignLoading,
  } = useCampaignByOwner(campaignId);

  const showUpgradePrompt = !isCampaignLoading && isBasic;
  const showPaymentPrompt = !isCampaignLoading && !isBasic && isPaymentRequired;
  const listEnabled =
    !!campaignId && !isCampaignLoading && !showUpgradePrompt && !showPaymentPrompt;

  const listingQuery = useApiQuery(
    campaignId ? endpoints.campaigns.getCampaignInkDAgents(campaignId) : "",
    {
      enabled: listEnabled,
      refetchInterval: 15000,
    },
  );

  const listing = useMemo(
    () =>
      pickDataRoot<CampaignInkDAgentListingResult>(listingQuery.data) ??
      null,
    [listingQuery.data],
  );
  const activeAdminConnectedAgents = useMemo(
    () =>
      (listing?.adminConnectedAgents ?? []).filter(
        (agent) =>
          agent.status === "active" &&
          agent.creatorType === "admin" &&
          agent._id !== listing?.userOwnedAgent?._id,
      ),
    [listing?.adminConnectedAgents, listing?.userOwnedAgent?._id],
  );
  const autoSocialManageDisabledReason = useMemo(() => {
    if (!listing) return null;
    if (listing.ownershipType !== "main-owner") {
      return "Only the main owner can configure automatic social publishing.";
    }
    if (listing.manageReason === "upgrade_required") {
      return "Upgrade this campaign to configure automatic social publishing.";
    }
    if (listing.manageReason === "payment_required") {
      return "Restore paid campaign coverage to configure automatic social publishing.";
    }
    if (listing.manageReason !== "eligible") {
      return "Automatic social publishing can’t be configured right now.";
    }
    return null;
  }, [listing]);

  const activityRoute = endpoints.campaigns.getCampaignInkDAgentRecentActivity(
    campaignId,
    1,
    10,
    5,
  );
  const activityQuery = useApiQuery(activityRoute, {
    enabled: listEnabled,
    refetchInterval: 10000,
  });
  const activityLogs = useMemo(
    () =>
      pickDataRoot<CampaignInkDAgentActivityLogListResult>(activityQuery.data)
        ?.entries ?? [],
    [activityQuery.data],
  );
  const socialQuery = useApiQuery(
    campaignId ? endpoints.campaigns.getCampaignSocial(campaignId) : "",
    {
      enabled: listEnabled,
      retry: false,
      refetchInterval: 15000,
    },
  );
  const socialStatus = useMemo(
    () => pickDataRoot<ApiCampaignSocialStatus>(socialQuery.data),
    [socialQuery.data],
  );

  const statusMut = useApiMutation<{ status: "active" | "idle" }, unknown>({
    route:
      listing?.userOwnedAgent
        ? endpoints.campaigns.changeCampaignInkDAgentStatus(
            campaignId,
            listing.userOwnedAgent._id,
          )
        : "",
    method: "POST",
  });

  const invalidateInkDAgentQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.getCampaignInkDAgents(campaignId)],
    });
    queryClient.invalidateQueries({
      queryKey: [activityRoute],
    });
  };

  const handleToggleUserOwnedAgentStatus = async () => {
    const agent = listing?.userOwnedAgent;
    if (!agent) return;

    try {
      const nextStatus = agent.status === "active" ? "idle" : "active";
      await statusMut.mutateAsync({ status: nextStatus });
      invalidateInkDAgentQueries();
      appToast.success(
        nextStatus === "active" ? "InkD agent turned on" : "InkD agent turned off",
      );
    } catch (error: any) {
      appToast.error(readMutationError(error));
    }
  };

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab="inkd-agents"
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => {}}
    >
      <div className="min-h-screen p-4">
        <div className="rounded-[32px] border border-[#D9E4EC] bg-[#F8FBFD] p-5 shadow-sm">
          {showUpgradePrompt ? (
            <BasicFeatureUpgradePrompt
              campaignId={campaignId}
              featureName="InkD Agents"
              isMainOwner={isMainOwner}
              description={
                isMainOwner
                  ? "Upgrade this Basic campaign to unlock a campaign-owned InkD agent and review connected InkD activity."
                  : "InkD Agents is available on paid campaigns. Ask the main owner to upgrade this campaign to unlock the campaign-owned agent view."
              }
            />
          ) : showPaymentPrompt ? (
            <CampaignPaymentRequiredPrompt
              campaignId={campaignId}
              featureName="InkD Agents"
              isMainOwner={isMainOwner}
              billingMode={billingMode}
              description={
                isMainOwner
                  ? "Payment is required to restore InkD Agents for this paid campaign. Once access is restored, the connected agent view and recent task logs will appear here again."
                  : "Payment is required to restore InkD Agents for this paid campaign. The connected agent view will reappear once the main owner restores paid access."
              }
            />
          ) : listingQuery.isLoading ? (
            <InkDAgentsLoadingState />
          ) : listingQuery.isError || !listing ? (
            <section className="rounded-[28px] border border-[#FECACA] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-[#B91C1C]" />
                <div>
                  <p className="text-sm font-semibold text-[#7F1D1D]">
                    Couldn’t load campaign InkD agents
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#991B1B]">
                    The latest campaign-owned and admin-connected agent data
                    couldn’t be loaded right now.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => listingQuery.refetch()}
                className="mt-5 rounded-full bg-[#B91C1C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a11111]"
              >
                Try again
              </button>
            </section>
          ) : (
      <InkDAgentsReadShell
              campaignId={campaignId}
              listing={listing}
              isMainOwner={isMainOwner}
              autoSocialManageDisabledReason={autoSocialManageDisabledReason}
              publishRateLimits={socialStatus?.publishRateLimits ?? null}
              adminConnectedAgents={activeAdminConnectedAgents}
              activityLogs={activityLogs}
              activityLogsLoading={activityQuery.isLoading}
              activityLogsError={activityQuery.isError}
              userOwnedStatusPending={statusMut.isPending}
              onRetryActivity={() => activityQuery.refetch()}
              onOpenAutoSocialModal={() => setAutoSocialModalOpen(true)}
              onOpenManageModal={() => setManageModalOpen(true)}
              onToggleUserOwnedAgentStatus={handleToggleUserOwnedAgentStatus}
            />
          )}
        </div>
      </div>

      <InkDAgentManageModal
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
        campaignId={campaignId}
        campaignName={campaignName}
        agent={(listing?.userOwnedAgent ?? null) as CampaignInkDAgent | null}
        canManage={!!listing?.canManageUserOwnedAgent}
      />
      <InkDAutoSocialPublishModal
        open={autoSocialModalOpen}
        onOpenChange={setAutoSocialModalOpen}
        campaignId={campaignId}
        config={listing?.inkdAutoSocialPublish ?? null}
      />
    </CampaignLayout>
  );
}
