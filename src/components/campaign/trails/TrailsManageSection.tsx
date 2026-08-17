import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import type { TrailCard } from "@/types/campaigns";
import { SortableTrialItem } from "./drag-drop-trial";
import { getActiveTrials, mapTrialToCard } from "./trails-manage-shared";
import { ManageTrailCard } from "./TrailsManageFooterAndModals";
import { normalizeCampaignBlockedStateFromResponse } from "@/lib/campaign";
 
export function useTrailsManage(options?: {
  campaignId?: string | null;
  enabled?: boolean;
}) {
  const storeCampaignId = useCreateCampaignStore((s) => s.campaignId);
  const campaignId = options?.campaignId ?? storeCampaignId;
  const listingRoute = campaignId
    ? endpoints.campaigns.getTrialsListings(campaignId)
    : "";
  const isEnabled = options?.enabled ?? true;

  const { data: listingData, isLoading, isError } = useApiQuery(listingRoute, {
    queryKey: [listingRoute],
    enabled: !!campaignId && isEnabled,
  });

  const apiActiveTrials = useMemo(
    () => getActiveTrials(listingData),
    [listingData],
  );
  const blockedState = useMemo(
    () => normalizeCampaignBlockedStateFromResponse(listingData),
    [listingData],
  );

  const [cards, setCards] = useState<TrailCard[]>([]);
  useEffect(() => {
    setCards(apiActiveTrials.map(mapTrialToCard));
  }, [apiActiveTrials]);

  const [reorderOpen, setReorderOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpTrialId, setTopUpTrialId] = useState<string | null>(null);

  const reorderItems: SortableTrialItem[] = useMemo(() => {
    return cards.map((c) => ({
      id: c.id,
      title: c.trailName,
      thumb: c.images?.[0] ?? null,
      thumbMediaType: c.thumbMediaType,
    }));
  }, [cards]);

  const { mutate: updateSequence, isPending: savingOrder } = useApiMutation<
    unknown,
    unknown
  >({
    route: endpoints.campaigns.updateTrialSequence,
    method: "PATCH",
    onSuccess: () => {
      if (!listingRoute) return;
      queryClient.invalidateQueries({ queryKey: [listingRoute] });
      setReorderOpen(false);
    },
  });

  const saveSequence = (trialIds: string[]) => {
    if (!campaignId) return;
    (
      updateSequence as unknown as (payload: {
        campaignId: string;
        trialIds: string[];
      }) => void
    )({ campaignId, trialIds });
  };

  return {
    campaignId: campaignId ?? "",
    listingRoute,
    cards,
    setCards,
    isLoading,
    isError,
    reorderOpen,
    setReorderOpen,
    topUpOpen,
    topUpTrialId,
    setTopUpOpen,
    setTopUpTrialId,
    reorderItems,
    saveSequence,
    savingOrder,
    blockedState,
  };
}

export function TrailsManageSection({
  canEdit,
  onAddTrail,
  canCreate = true,
  canDelete = true,
  canTopUp = true,
  cards,
  isLoading,
  isError,
  listingRoute,
  onDeleteCard,
  onTopUpClick,
  onEditCard,
  leftHeaderContent,
}: {
  canEdit: boolean;
  onAddTrail: () => void;
  canCreate?: boolean;
  canDelete?: boolean;
  canTopUp?: boolean;
  cards: TrailCard[];
  isLoading: boolean;
  isError: boolean;
  listingRoute: string;
  onDeleteCard: (trialId: string) => void;
  onTopUpClick: (trialId: string) => void;
  /** Optional: navigate to edit launched trail (media only) */
  onEditCard?: (trialId: string) => void;
  /** Optional node rendered to the left of the "+ Add Trails" button (e.g. My drafts button) */
  leftHeaderContent?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5 font-poppins">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2B2B2B]">
          Manage Trails
        </h2>
     
        <div className="flex items-center gap-3">
          {leftHeaderContent}
        <PermissionDisabledTooltip hasPermission={canCreate}>
          <button
            type="button"
            onClick={() => canEdit && onAddTrail()}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-full bg-[#E4F2DF] px-5 py-2 text-xl font-medium text-[#315326] hover:bg-[#D3EAC7]"
          >
            <Plus className="h-4 w-4" />
            Add Trails
          </button>
        </PermissionDisabledTooltip>
        </div>
      </header>

      {isLoading && (
        <div className="mt-6 text-sm text-black/60">Loading trails...</div>
      )}

      {!isLoading && isError && (
        <div className="mt-6 text-sm text-red-600">
          Failed to load trails.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4">
        {cards?.map((t) => (
          <ManageTrailCard
            key={t.id}
            card={t}
            canEdit={canEdit}
            canTopUp={canTopUp}
            canDelete={canDelete}
            onTopUpClick={onTopUpClick}
            onEditClick={onEditCard}
            onDeleteClick={onDeleteCard}
          />
        ))}
      </div>
    </section>
  );
}
