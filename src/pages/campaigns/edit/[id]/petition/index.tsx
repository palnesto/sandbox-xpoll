import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { PetitionsManageView } from "@/components/campaign/petition/PetitionsManageView";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { PetitionRow, safeArr, sumVotes } from "@/types/petition";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { normalizeCampaignBlockedStateFromResponse } from "@/lib/campaign";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

export default function PetitionManagePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    name?: string;
  }>({ open: false, id: null });
  const [saving, setSaving] = useState(false);

  const listRoute = endpoints.campaigns.getPetitionsListings;
  const listParams = useMemo(
    () => ({
      belongsToCampaignId: campaignId,
      isAdmin: true,
      page: 1,
      pageSize: 50,
    }),
    [campaignId],
  );
  const listQueryKey = useMemo(() => [listRoute, listParams], [listRoute, listParams]);

  const {
    campaignName,
    campaignData,
    permissions,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignLoading,
  } = useCampaignByOwner(campaignId);
  const isPetitionEnabled = Boolean((campaignData as any)?.isPetitionEnabled);

  const {
    data: petitionsResp,
    isLoading,
    isError,
    refetch: refetchPetitions,
  } = useApiQuery(listRoute, {
    enabled:
      !!campaignId && !isCampaignLoading && !isBasic && !isPaymentRequired,
    params: listParams,
    queryKey: listQueryKey,
  } as any);
  const petitionBlockedState = useMemo(
    () => normalizeCampaignBlockedStateFromResponse(petitionsResp),
    [petitionsResp],
  );
  const showPaymentRequired =
    isPaymentRequired || petitionBlockedState?.kind === "payment_required";

  const petitions: PetitionRow[] = useMemo(() => {
    const root = petitionsResp?.data?.data ?? petitionsResp?.data ?? {};
    const entries = safeArr(root?.entries ?? root?.items ?? root?.results ?? []);
    return entries
      ?.map((x: any) => ({ ...x, _id: String(x?._id ?? x?.id ?? "") }))
      .filter((x: any) => !!x._id)
      .filter((x: any) => String(x?.belongsToCampaignId ?? "") === campaignId);
  }, [petitionsResp, campaignId]);

  const cards = useMemo(() => {
    return petitions.map((p) => {
      const participants = sumVotes(p?.voteCountCache);
      const hasVideo = safeArr(p?.uploadedVideoLinks).length > 0;
      const ytId = safeArr(p?.ytVideoLinks)[0] ?? null;
      return {
        _id: String((p as any)?._id ?? (p as any)?.id ?? ""),
        name: p.name,
        description: p.description,
        participants,
        hasVideo,
        ytId: ytId ? String(ytId) : null,
        externalLinks: safeArr(p.externalLinks),
        isEnabled: p.isEnabled ?? true,
      };
    });
  }, [petitions]);

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  async function deletePetition(idToDelete: string) {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}${endpoints.campaigns.deletePetition(idToDelete)}`,
        { method: "DELETE", credentials: "include" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || "Delete petition failed");
      }
      appToast.success("Petition deleted");
      setDeleteConfirm({ open: false, id: null });
      await refetchPetitions?.();
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    } catch (e: any) {
      appToast.error(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab="petitions"
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => {}}
    >
      {showPaymentRequired ? (
        <CampaignPaymentRequiredPrompt
          campaignId={campaignId}
          featureName="Petitions"
          isMainOwner={isMainOwner}
          billingMode={billingMode}
        />
      ) : isBasic ? (
        <BasicFeatureUpgradePrompt
          campaignId={campaignId}
          featureName="Petitions"
          isMainOwner={isMainOwner}
        />
      ) : (
        <PetitionsManageView
          isLoading={!!isLoading}
          isError={!!isError}
          cards={cards}
          isPetitionEnabled={isPetitionEnabled}
          canCreate={permissions.campaignPetition.create}
          canEdit={permissions.campaignPetition.edit}
          canDelete={permissions.campaignPetition.delete}
          onAdd={() => navigate(`/campaigns/edit/${campaignId}/petition/create`)}
          onEdit={(pid) => navigate(`/campaigns/edit/${campaignId}/petition/edit/${pid}`)}
          onDeleteClick={(pid, name) => setDeleteConfirm({ open: true, id: pid, name })}
        />
      )}

      <CampaignActionConfirmModal
        open={deleteConfirm.open}
        title="Delete petition?"
        description={`This will permanently delete "${deleteConfirm.name || "this petition"}".`}
        confirmLabel="Delete"
        tone="danger"
        loading={saving}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => {
          if (!deleteConfirm.id) return;
          deletePetition(deleteConfirm.id);
        }}
      />
    </CampaignLayout>
  );
}
