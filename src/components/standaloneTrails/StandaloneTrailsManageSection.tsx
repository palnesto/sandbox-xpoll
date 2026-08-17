import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, EllipsisVertical, Pencil, Trash2, Wallet } from "lucide-react";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";
import { queryClient } from "@/api/queryClient";
import type { TrailCard } from "@/types/campaigns";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { truncateText } from "@/utils/truncateWords";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { baseToParentGrouped } from "@/components/campaign/trails/trails-manage-shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";

function StandaloneTrailCard({
  card,
  onEdit,
  onTopUp,
  onDeleteClick,
  canEdit,
}: {
  card: TrailCard;
  onEdit: (id: string) => void;
  onTopUp: (id: string) => void;
  onDeleteClick: (id: string) => void;
  canEdit: boolean;
}) {
  const thumb = card.images?.[0] ?? null;
  const thumbType = card.thumbMediaType ?? "image";
  const rewards = card.rewards ?? [];

  return (
    <article className="rounded-2xl bg-white border border-black/5 overflow-hidden flex items-start min-h-[100px] 2xl:min-h-[150px] p-3 space-x-2">
      <figure className="bg-[#EDEDED] h-28 xl:h-28 2xl:h-40 w-36 xl:w-48 2xl:w-72 rounded-lg overflow-hidden shrink-0">
        {thumb ? (
          thumbType === "video" ? (
            <video
              src={thumb}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={thumb}
              alt="Trail cover"
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
            No image
          </div>
        )}
      </figure>

      <div className="w-full flex flex-col items-start justify-center">
        <h3 className="text-[12px] xl:text-lg font-semibold text-[#111] px-2">
          {truncateText(card.trailName, 15)}
        </h3>
        <p className="text-[10px] 2xl:text-sm text-[#7A7A7A] -ml-2 -my-4">
          <RichTextPreview content={truncateText(card.description, 90)} />
        </p>

        <div className="mt-4 px-2">
          <div className="text-[10px] font-semibold text-[#3A3A3A]">
            REWARDS
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {rewards.slice(0, 4).map((r) => {
              const spec = assetSpecs[r.assetId as AssetType];
              const v = baseToParentGrouped(
                r.assetId as AssetType,
                r.amount,
                3,
              );
              return (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F4F4F4] px-3 py-1 text-[10px]"
                >
                  {spec?.img ? (
                    <img src={spec.img} alt="" className="h-3.5 w-3.5" />
                  ) : null}
                  <span className="tabular-nums">{v}</span>
                  <span className="text-[#6E6E6E]">
                    {spec?.parentSymbol ?? ""}
                  </span>
                </span>
              );
            })}
            {!rewards.length && (
              <span className="text-[10px] text-[#9A9A9A]">No rewards</span>
            )}
          </div>
        </div>
      </div>

      <section className="hidden lg:flex items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canEdit}
            >
              <EllipsisVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTopUp(card.id)}>
              <Wallet className="mr-2 h-4 w-4" />
              Top up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(card.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteClick(card.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
    </article>
  );
}

export function StandaloneTrailsManageSection({
  cards,
  isLoading,
  isError,
  listingRoute,
  onAddTrail,
  onEditCard,
  onTopUpClick,
  onDeleteCard,
  leftHeaderContent,
}: {
  cards: TrailCard[];
  isLoading: boolean;
  isError: boolean;
  listingRoute: string;
  onAddTrail: () => void;
  onEditCard: (trialId: string) => void;
  onTopUpClick: (trialId: string) => void;
  onDeleteCard: (trialId: string) => void;
  leftHeaderContent?: React.ReactNode;
}) {
  const [deleteConfirmTrialId, setDeleteConfirmTrialId] = useState<
    string | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { mutate: deleteTrial, isPending: isDeleting } = useApiMutation<
    void,
    unknown
  >({
    route: deleteConfirmTrialId
      ? endpoints.standaloneTrail.delete(deleteConfirmTrialId)
      : "",
    method: "DELETE",
    onSuccess: () => {
      if (deleteConfirmTrialId) {
        onDeleteCard(deleteConfirmTrialId);
        queryClient.invalidateQueries({ queryKey: [listingRoute] });
        appToast.success("Trail deleted");
        setDeleteConfirmTrialId(null);
      }
      setDeletingId(null);
    },
    onError: () => {
      appToast.error("Delete failed");
      setDeletingId(null);
    },
  });

  const handleDeleteClick = (trialId: string) => {
    setDeleteConfirmTrialId(trialId);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmTrialId) return;
    setDeletingId(deleteConfirmTrialId);
    deleteTrial(undefined as never);
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) setDeleteConfirmTrialId(null);
  };

  return (
    <section className="shadow-sm font-poppins">
      <header className="flex flex-col md:flex-row lg:items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2B2B2B]">
          Manage Standalone Trails
        </h2>
        <div className="flex items-center gap-3">
          <p className="lg:hidden">Trails can be created on desktop only.</p>
          {leftHeaderContent}
          <button
            type="button"
            onClick={onAddTrail}
            className="hidden lg:inline-flex items-center gap-2 rounded-full bg-[#E4F2DF] px-5 py-2 text-xl font-medium text-[#315326] hover:bg-[#D3EAC7]"
          >
            <Plus className="h-4 w-4" />
            Add Trail
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="mt-6 text-sm text-black/60">Loading trails...</div>
      )}
      {!isLoading && isError && (
        <div className="mt-6 text-sm text-red-600">Failed to load trails.</div>
      )}
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {cards?.map((t) => (
          <StandaloneTrailCard
            key={t.id}
            card={t}
            canEdit={true}
            onEdit={onEditCard}
            onTopUp={onTopUpClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
      </div>

      {!isLoading && !isError && cards.length === 0 && (
        <div className="mt-10 relative flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="relative h-52 w-full max-w-sm mb-10 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-10 right-0 top-1/2 rounded-2xl border border-black/10 bg-white shadow-xl"
                initial={{ y: 30 + i * 16, opacity: 0, scale: 0.96 }}
                animate={{
                  y: [-20, -120],
                  opacity: [0, 1, 1, 0],
                  scale: [0.96, 1, 1, 0.94],
                }}
                transition={{
                  duration: 2.6,
                  delay: i * 0.4,
                  repeat: Infinity,
                  repeatDelay: 0.6,
                  ease: "easeInOut",
                }}
                style={{
                  width: 320 - i * 24,
                  height: 180 - i * 14,
                }}
              >
                <div className="p-4 space-y-3">
                  <div className="h-4 w-40 rounded bg-black/15" />
                  <div className="h-3 w-52 rounded bg-black/10" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-10 rounded-xl bg-black/10" />
                    <div className="h-10 rounded-xl bg-black/10" />
                    <div className="h-10 rounded-xl bg-black/10" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold"
          >
            No Trails Yet
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-2 text-sm text-black/60 max-w-xs"
          >
            Create a standalone trail to start building signal.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={onAddTrail}
            className="mt-6 rounded-full bg-[#0EA5A5] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(14,165,165,0.25)]"
          >
            ADD TRAIL
          </motion.button>
        </div>
      )}

      <CampaignActionConfirmModal
        open={deleteConfirmTrialId != null}
        title="Delete trail?"
        description="This trail will be permanently deleted. You cannot undo this action."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={isDeleting && deletingId === deleteConfirmTrialId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </section>
  );
}
