import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import SubscriptionManagementPanel from "@/components/campaign/subscription-management-panel";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";

function pickDataRoot(resp: any) {
  return resp?.data?.data ?? resp?.data ?? resp ?? null;
}

export default function EditCampaignSubscriptionManagementPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");
  const [activeTab, setActiveTab] =
    useState<CampaignTabKey>("subscription-management");

  const campaignRoute = campaignId
    ? endpoints.campaigns.getCampaignByIdOwner(campaignId)
    : "";
  const { data: campaignResp, refetch: refetchCampaign } = useApiQuery(
    campaignRoute,
    {
      enabled: !!campaignId,
    },
  );
  const apiCampaign = useMemo(() => pickDataRoot(campaignResp), [campaignResp]);
  const campaignName = String(apiCampaign?.name ?? "Campaign");

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab={activeTab}
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => console.log("Rewards")}
    >
      <div className="hidden md:block">
        <SubscriptionManagementPanel
          campaignId={campaignId}
          apiCampaign={apiCampaign}
          refetchCampaign={refetchCampaign}
        />
      </div>
    </CampaignLayout>
  );
}
