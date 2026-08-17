import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useParams } from "react-router-dom";
import CampaignLayout, { CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import { CampaignStatus } from "@/types/campaigns";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { useTrailsManage } from "@/components/campaign/trails/TrailsManageSection";
import { lazy, Suspense } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

const TrailsManageSection = lazy(
  () =>
    import("@/components/campaign/trails/TrailsManageSection").then((m) => ({
      default: m.TrailsManageSection,
    })),
);

const TrailsManageFooterAndModals = lazy(
  () =>
    import("@/components/campaign/trails/TrailsManageFooterAndModals").then((m) => ({
      default: m.TrailsManageFooterAndModals,
    })),
);

function pickDataRoot(resp) {
  return resp?.data?.data ?? resp?.data ?? resp ?? null;
}

export default function EditCampaignTrailsPage() {
  const navigate = useNavigate();
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
  const apiCampaign = useMemo(() => pickDataRoot(campaignRes), [campaignRes]);
  const {
    permissions,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isOwnerCampaignLoading,
  } = useCampaignByOwner(id);

  const apiStatus = String(
    apiCampaign?.status ?? "",
  ).toLowerCase() as CampaignStatus;
  const canEdit = apiStatus === "draft" || apiStatus === "paused";

  const trails = useTrailsManage({
    campaignId: id,
    enabled: !isOwnerCampaignLoading && !isPaymentRequired,
  });
  const showPaymentRequired =
    isPaymentRequired || trails.blockedState?.kind === "payment_required";

  const [deleteConfirmTrialId, setDeleteConfirmTrialId] = useState<string | null>(null);
  const { mutate: deleteTrial, isPending: isDeleting } = useApiMutation<void, unknown>({
    route: deleteConfirmTrialId ? endpoints.campaigns.deleteTrial(deleteConfirmTrialId) : "",
    method: "DELETE",
    onSuccess: () => {
      if (deleteConfirmTrialId) {
        trails.setCards((prev) => prev.filter((x) => x.id !== deleteConfirmTrialId));
        queryClient.invalidateQueries({ queryKey: [trails.listingRoute] });
        appToast.success("Trail deleted");
        setDeleteConfirmTrialId(null);
      }
    },
    onError: () => {
      appToast.error("Delete failed");
      setDeleteConfirmTrialId(null);
    },
  });

  const handleDeleteTrailClick = (trialId: string) => {
    setDeleteConfirmTrialId(trialId);
  };

  const handleDeleteTrailConfirm = () => {
    if (!deleteConfirmTrialId) return;
    deleteTrial(undefined as never);
  };

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

  const draftListingsUrl = useMemo(
    () =>
      id
        ? endpoints.campaigns.getDraftTrialListingsUrl({
            belongsToCampaignId: id,
            page: 1,
            pageSize: 100,
          })
        : "",
    [id],
  );
  const { data: draftListingsData } = useApiQuery(draftListingsUrl, {
    queryKey: [draftListingsUrl],
    enabled:
      !!id &&
      !!draftListingsUrl &&
      canEdit &&
      !isOwnerCampaignLoading &&
      !showPaymentRequired,
  });
  const draftCount = useMemo(() => {
    const raw = draftListingsData as any;
    const root = raw?.data?.data ?? raw?.data ?? raw ?? {};
    const entries = root?.entries ?? root?.items ?? root?.results ?? root?.list ?? [];
    const arr = Array.isArray(entries) ? entries : [];
    const total = root?.total;
    if (typeof total === "number" && total >= 0) return total;
    const totalCount = root?.totalCount;
    if (typeof totalCount === "number" && totalCount >= 0) return totalCount;
    return arr.length;
  }, [draftListingsData]);

  const myDraftsButton = (
    <button
      type="button"
      onClick={() => navigate(`/campaigns/edit/${id}/trails/draft-trail`)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[#78BC61] bg-white px-4 py-2 text-base font-medium text-[#315326] hover:bg-[#E4F2DF] relative",
        !canEdit && "opacity-60 cursor-not-allowed",
      )}
    >
      <FileText className="h-4 w-4" />
      My drafts
      {draftCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#ED0C1D] text-white text-[10px] font-bold flex items-center justify-center px-1">
          {draftCount > 99 ? "99+" : draftCount}
        </span>
      )}
    </button>
  );

  return (
    <CampaignLayout
      campaignId={id}
      campaignName={campaignName}
      activeTab={activeTab}
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => console.log("Rewards")}
    >
      <Suspense fallback={<div className="text-sm text-black/60 p-4">Loading…</div>}>
        {showPaymentRequired ? (
          <div className="p-4">
            <CampaignPaymentRequiredPrompt
              campaignId={id}
              featureName="Trails"
              isMainOwner={isMainOwner}
              billingMode={billingMode}
            />
          </div>
        ) : (
          <>
            <TrailsManageSection
              canEdit={canEdit}
              onAddTrail={() => navigate(`/campaigns/edit/${id}/trails/create`)}
              canCreate={permissions.campaignTrial.create}
              canDelete={permissions.campaignTrial.delete}
              canTopUp={permissions.campaignTrial.topUp}
              cards={trails.cards}
              isLoading={trails.isLoading}
              isError={trails.isError}
              listingRoute={trails.listingRoute}
              onDeleteCard={handleDeleteTrailClick}
              onTopUpClick={(trialId) => {
                trails.setTopUpTrialId(trialId);
                trails.setTopUpOpen(true);
              }}
              onEditCard={(trialId) =>
                navigate(`/campaigns/edit/${id}/trails/edit/${trialId}`)
              }
              leftHeaderContent={myDraftsButton}
            />

            <TrailsManageFooterAndModals
              canEdit={canEdit}
              campaignId={trails.campaignId}
              cards={trails.cards}
              reorderOpen={trails.reorderOpen}
              reorderItems={trails.reorderItems}
              saveSequence={trails.saveSequence}
              savingOrder={trails.savingOrder}
              topUpOpen={trails.topUpOpen}
              topUpTrialId={trails.topUpTrialId}
              onOpenReorder={() => trails.setReorderOpen(true)}
              onCloseTopUp={() => {
                trails.setTopUpOpen(false);
                trails.setTopUpTrialId(null);
              }}
              onCloseReorder={() => trails.setReorderOpen(false)}
              isLoading={trails.isLoading}
            />
          </>
        )}

        <CampaignActionConfirmModal
          open={deleteConfirmTrialId != null}
          title="Delete trail?"
          description="This trail will be permanently deleted. You cannot undo this action."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="danger"
          loading={isDeleting}
          onClose={() => !isDeleting && setDeleteConfirmTrialId(null)}
          onConfirm={handleDeleteTrailConfirm}
        />
      </Suspense>
    </CampaignLayout>
  );
}
