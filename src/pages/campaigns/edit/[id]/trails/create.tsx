import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CampaignLayout, { CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import TrailCreateView from "@/components/campaign/trails/trail-create-view";
import { CampaignStatus } from "@/types/campaigns";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { queryClient } from "@/api/queryClient";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

function pickDataRoot(resp: any) {
  return resp?.data?.data ?? resp?.data ?? resp ?? null;
}

export default function EditCampaignTrailsCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const id = String(params.id ?? "");

  const [activeTab, setActiveTab] = useState<CampaignTabKey>("trails");

  const storeCampaignName = useCreateCampaignStore((s) => s.campaignName);
  const storeCampaignId = useCreateCampaignStore((s) => s.campaignId);

  const setCampaignId = useCreateCampaignStore((s) => s.setCampaignId);
  const setBasics = useCreateCampaignStore((s) => s.setBasics);
  const setCampaignStatus = useCreateCampaignStore((s) => s.setCampaignStatus);

  const campaignRoute = id ? endpoints.campaigns.getCampaignByIdOwner(id) : "";
  const { data: campaignRes } = useApiQuery(campaignRoute, {
    queryKey: [campaignRoute],
    enabled: !!id,
  });
  const {
    permissions,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
  } = useCampaignByOwner(id);
  const apiCampaign = useMemo(() => pickDataRoot(campaignRes), [campaignRes]);

  const apiStatus = String(
    apiCampaign?.status ?? "",
  ).toLowerCase() as CampaignStatus;
  const canEdit = apiStatus === "draft" || apiStatus === "paused";

  useEffect(() => {
    if (!id) return;
    if (!apiCampaign) return;
    if (!canEdit) return;

    if (storeCampaignId !== id) {
      setCampaignId(id);
      setCampaignStatus(apiStatus);

      setBasics({
        campaignId: id,
        campaignName: String(apiCampaign?.name ?? ""),
        goal: String(apiCampaign?.goal ?? ""),
      } as any);
    }
  }, [
    id,
    apiCampaign,
    canEdit,
    apiStatus,
    storeCampaignId,
    setCampaignId,
    setCampaignStatus,
    setBasics,
  ]);

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    navigateCampaignEditTab(navigate, id, tab);
  };

  const campaignName = canEdit
    ? storeCampaignName
    : String(apiCampaign?.name ?? "");

  const goToManage = () => navigate(`/campaigns/edit/${id}/trails`);

  const loadFromDraft = (location.state as { loadFromDraft?: Record<string, unknown> } | null)?.loadFromDraft;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={id}
          campaignName={campaignName}
          activeTab={activeTab}
          onTabChange={(tab) => requestLeave(() => goTab(tab))}
          onBack={() => requestLeave(() => navigate(-1))}
          onRewards={() => console.log("Rewards")}
        >
          {isPaymentRequired ? (
            <div className="p-4">
              <CampaignPaymentRequiredPrompt
                campaignId={id}
                featureName="Trails"
                isMainOwner={isMainOwner}
                billingMode={billingMode}
              />
            </div>
          ) : (
            <TrailCreateView
              canEdit={canEdit}
              canDraftCreate={permissions.campaignTrial.draftCreate}
              allowAiSuggestions={!isBasic}
              onViewAllTrails={() => requestLeave(goToManage)}
              initialDataFromDraft={loadFromDraft as any}
              onDirtyChange={setHasUnsavedChanges}
              onDraftSaved={() => {
                const draftUrl = endpoints.campaigns.getDraftTrialListingsUrl({ belongsToCampaignId: id, page: 1, pageSize: 100 });
                const draftListUrl = endpoints.campaigns.getDraftTrialListingsUrl({ belongsToCampaignId: id, page: 1, pageSize: 50 });
                queryClient.invalidateQueries({ queryKey: [draftUrl] });
                queryClient.invalidateQueries({ queryKey: [draftListUrl] });
                navigate(`/campaigns/edit/${id}/trails/draft-trail`);
              }}
              onSaved={() => {
                queryClient.invalidateQueries({
                  queryKey: [endpoints.campaigns.getCampaignByIdOwner(id)],
                });
                queryClient.invalidateQueries({
                  queryKey: [endpoints.campaigns.getTrialsListings(id)],
                });
                goToManage();
              }}
            />
          )}
    </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
