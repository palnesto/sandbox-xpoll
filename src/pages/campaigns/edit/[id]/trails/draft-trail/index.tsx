import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { queryClient } from "@/api/queryClient";
import apiInstance, { BASE_URL } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { Pencil, ArrowLeft, Trash2 } from "lucide-react";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { truncateText } from "@/utils/truncateWords";
import { MAX_DRAFT_TRAILS_STANDALONE } from "@/constants/trail-create-constants";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { normalizeCampaignBlockedStateFromResponse } from "@/lib/campaign";

function pickDataRoot(resp: unknown) {
  return (resp as any)?.data?.data ?? (resp as any)?.data ?? resp ?? null;
}

/** Format date to dd/mm/yy */
function formatUpdatedAt(updatedAt: string | number | undefined | null): string {
  if (updatedAt == null) return "—";
  const d = typeof updatedAt === "number" ? new Date(updatedAt) : new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

type DraftTrialRow = {
  _id: string;
  title?: string;
  updatedAt?: string | number | null;
};

export default function DraftTrailListPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");

  const campaignRoute = campaignId ? endpoints.campaigns.getCampaignByIdOwner(campaignId) : "";
  const { data: campaignRes } = useApiQuery(campaignRoute, {
    queryKey: [campaignRoute],
    enabled: !!campaignId,
  });
  const apiCampaign = useMemo(() => pickDataRoot(campaignRes), [campaignRes]);
  const {
    campaignName,
    permissions,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignOwnerLoading,
  } = useCampaignByOwner(campaignId);

  const listUrl = useMemo(
    () =>
      campaignId
        ? endpoints.campaigns.getDraftTrialListingsUrl({
            belongsToCampaignId: campaignId,
            page: 1,
            pageSize: 50,
          })
        : "",
    [campaignId],
  );
  const { data: listResp, isLoading, isError } = useApiQuery(listUrl, {
    queryKey: [listUrl],
    enabled: !!campaignId && !isCampaignOwnerLoading && !isPaymentRequired,
  });
  const blockedState = useMemo(
    () => normalizeCampaignBlockedStateFromResponse(listResp),
    [listResp],
  );
  const showPaymentRequired =
    isPaymentRequired || blockedState?.kind === "payment_required";

  const drafts: DraftTrialRow[] = useMemo(() => {
    const root = pickDataRoot(listResp) ?? {};
    const entries = root?.entries ?? root?.items ?? root?.results ?? root?.data ?? [];
    const arr = Array.isArray(entries) ? entries : [];
    return arr
      .filter((d: any) => String(d?.belongsToCampaignId ?? "") === campaignId || !d?.belongsToCampaignId)
      .map((d: any) => ({
        _id: String(d?._id ?? d?.id ?? ""),
        title: d?.title ?? "",
        updatedAt: d?.updatedAt ?? d?.updated_at ?? null,
      }));
  }, [listResp, campaignId]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmDraftId, setDeleteConfirmDraftId] = useState<string | null>(null);

  const handleDeleteClick = (draftId: string) => {
    setDeleteConfirmDraftId(draftId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDraftId) return;
    setDeletingId(deleteConfirmDraftId);
    try {
      await apiInstance.delete(`${BASE_URL}${endpoints.campaigns.deleteDraftTrial(deleteConfirmDraftId)}`);
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getDraftTrialListingsUrl({ belongsToCampaignId: campaignId, page: 1, pageSize: 100 })],
      });
      appToast.success("Draft deleted");
      setDeleteConfirmDraftId(null);
    } catch (e) {
      appToast.error((e as Error)?.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    if (!deletingId) setDeleteConfirmDraftId(null);
  };

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const displayName = campaignName || String(apiCampaign?.name ?? "Campaign");

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={displayName}
      activeTab="trails"
      onTabChange={goTab}
      onBack={() => navigate(`/campaigns/edit/${campaignId}/trails`)}
      onRewards={() => {}}
    >
      {showPaymentRequired ? (
        <section className="min-h-screen rounded-2xl border border-black/5 bg-[#F5F5F5] p-5 shadow-sm font-poppins">
          <CampaignPaymentRequiredPrompt
            campaignId={campaignId}
            featureName="Trails"
            isMainOwner={isMainOwner}
            billingMode={billingMode}
          />
        </section>
      ) : (
      <section className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5 font-poppins min-h-screen">
        <header className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate(`/campaigns/edit/${campaignId}/trails`)}
            className="inline-flex items-center gap-2 text-[#315326] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Manage Trails
          </button>
          <section className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#2B2B2B] mt-4">My draft trails</h2>
            <p>Max draft limit: {MAX_DRAFT_TRAILS_STANDALONE}</p>
          </section>
        </header>
       

        {isLoading && (
          <div className="mt-6 text-sm text-black/60">Loading drafts…</div>
        )}
        {!isLoading && isError && (
          <div className="mt-6 text-sm text-red-600">Failed to load drafts.</div>
        )}
        {!isLoading && !isError && (
          <div className="mt-4 rounded-xl bg-white border border-black/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-[#F5F5F5]">
                  <th className="px-4 py-3 font-semibold text-[#2B2B2B]">Trail name</th>
                  <th className="px-4 py-3 font-semibold text-[#2B2B2B]">Draft trail id</th>
                  <th className="px-4 py-3 font-semibold text-[#2B2B2B]">Updated at</th>
                  <th className="px-4 py-3 w-24" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d._id} className="border-b border-black/5 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-[#111]">{truncateText(d.title ?? "", 20)}</td>
                    <td className="px-4 py-3 text-[#666] font-mono truncate max-w-[120px]" title={d._id}>
                      {d._id}
                    </td>
                    <td className="px-4 py-3 text-[#666]">{formatUpdatedAt(d.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PermissionDisabledTooltip hasPermission={permissions.campaignTrial.draftEdit}>
                          <button
                            type="button"
                            onClick={() => navigate(`/campaigns/edit/${campaignId}/trails/draft-trail/edit/${d._id}`)}
                            className="p-2 rounded text-[#315326] hover:bg-[#E4F2DF]"
                            aria-label="Edit draft"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </PermissionDisabledTooltip>
                        <PermissionDisabledTooltip hasPermission={permissions.campaignTrial.draftDelete}>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(d._id)}
                            disabled={deletingId === d._id}
                            className="p-2 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                            aria-label="Delete draft"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionDisabledTooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !isError && drafts.length === 0 && (
          <div className="mt-6 text-sm text-black/60">No draft trails yet.</div>
        )}
      </section>
      )}

      <CampaignActionConfirmModal
        open={deleteConfirmDraftId != null}
        title="Delete draft trail?"
        description="This draft will be permanently deleted. You cannot undo this action."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={deletingId === deleteConfirmDraftId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </CampaignLayout>
  );
}
