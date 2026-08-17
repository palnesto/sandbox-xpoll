import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import type { ApiDraftTrial } from "@/schema/draft-trial.schema";
import TrailCreateView from "@/components/campaign/trails/trail-create-view";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

function pickDataRoot(resp: unknown) {
  return (resp as any)?.data?.data ?? (resp as any)?.data ?? resp ?? null;
}

function draftToInitialData(d: ApiDraftTrial | null) {
  if (!d) return undefined;
  return {
    title: d.title ?? null,
    description: d.description ?? null,
    resourceAssets: (d.resourceAssets ?? []).map((a) => ({
      type: a.type,
      value: String(a.value),
    })),
    rewards: (d.rewards ?? []).map((r) => ({
      assetId: String(r.assetId),
      amount: typeof r.amount === "number" ? r.amount : Number(r.amount) || 0,
      rewardAmountCap: typeof r.rewardAmountCap === "number" ? r.rewardAmountCap : Number(r.rewardAmountCap) || 0,
      rewardType: r.rewardType === "max" ? ("max" as const) : ("min" as const),
    })),
    polls: (d.polls ?? []).map((p) => ({
      title: p.title ?? "",
      description: p.description ?? "",
      options: p.options ?? [],
      resourceAssets: (p.resourceAssets ?? []).map((a: any) => ({ type: a.type, value: String(a.value) })),
    })),
  };
}

export default function DraftTrailEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const pathMatch = location.pathname.match(/\/campaigns\/edit\/([^/]+)\/trails\/draft-trail\/edit\/([^/]+)/);
  const campaignId = pathMatch?.[1] ?? params.id ?? "";
  const draftId = pathMatch?.[2] ?? params.draftId ?? "";

  const setCampaignId = useCreateCampaignStore((s) => s.setCampaignId);

  const campaignRoute = campaignId ? endpoints.campaigns.getCampaignByIdOwner(campaignId) : "";
  const { data: campaignRes } = useApiQuery(campaignRoute, {
    queryKey: [campaignRoute],
    enabled: !!campaignId,
  });
  const apiCampaign = useMemo(() => pickDataRoot(campaignRes), [campaignRes]);
  const {
    campaignName,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignOwnerLoading,
  } = useCampaignByOwner(campaignId);

  const draftRoute = draftId ? endpoints.campaigns.getDraftTrialById(draftId) : "";
  const { data: draftRes, isLoading: draftLoading, isError: draftError } = useApiQuery(draftRoute, {
    queryKey: [draftRoute],
    enabled:
      !!draftId &&
      /^[a-f0-9]{24}$/i.test(draftId) &&
      !isCampaignOwnerLoading &&
      !isPaymentRequired,
  });
  const draft = useMemo(() => pickDataRoot(draftRes) as ApiDraftTrial | null, [draftRes]);

  useEffect(() => {
    if (campaignId) setCampaignId(campaignId);
  }, [campaignId, setCampaignId]);

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const displayName = campaignName || String(apiCampaign?.name ?? "Campaign");

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialDataFromDraft = useMemo(
    () => draftToInitialData(draft),
    [draft]
  );

  if (isPaymentRequired) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`)}
        onRewards={() => {}}
      >
        <div className="p-4">
          <CampaignPaymentRequiredPrompt
            campaignId={campaignId}
            featureName="Trails"
            isMainOwner={isMainOwner}
            billingMode={billingMode}
          />
        </div>
      </CampaignLayout>
    );
  }

  if (draftId && !/^[a-f0-9]{24}$/i.test(draftId)) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`)}
        onRewards={() => {}}
      >
        <div className="p-4 text-red-600">Invalid draft ID.</div>
      </CampaignLayout>
    );
  }

  if (draftLoading || (draftId && !draft && !draftError)) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`)}
        onRewards={() => {}}
      >
        <div className="p-4 text-black/60">Loading draft…</div>
      </CampaignLayout>
    );
  }

  if (draftError || (draftId && !draft)) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`)}
        onRewards={() => {}}
      >
        <div className="p-4 text-red-600">Draft not found.</div>
      </CampaignLayout>
    );
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={campaignId}
          campaignName={displayName}
          activeTab="trails"
          onTabChange={(tab) => requestLeave(() => goTab(tab))}
          onBack={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`))}
          onRewards={() => {}}
        >
          <TrailCreateView
            canEdit={true}
            mode="edit-draft"
            allowAiSuggestions={!isBasic}
            draftId={draftId}
            initialDataFromDraft={initialDataFromDraft}
            onViewAllTrails={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`))}
            onSaved={() => {}}
            onDraftUpdated={() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail`)}
            onDirtyChange={setHasUnsavedChanges}
            onLoadToCreate={(payload) => {
              navigate(`/campaigns/edit/${campaignId}/trails/create`, {
                state: { loadFromDraft: { ...payload, _id: draftId } },
              });
            }}
          />
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
