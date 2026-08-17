import { useNavigate } from "react-router";
import { TriangleAlert, Pencil, EllipsisVertical, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { cn } from "@/lib/utils";
import { truncateText } from "@/utils/truncateWords";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { SortableTrialItem } from "./drag-drop-trial";
import ReorderTrailsModal from "@/components/modals/reorder-trails";
import TopUpTrailRewardsModal from "@/components/modals/top-up-trail-modal";
import { baseToParentGrouped } from "./trails-manage-shared";
import type { TrailCard } from "@/types/campaigns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ManageTrailCard({
  card,
  canEdit,
  canTopUp,
  canDelete,
  onTopUpClick,
  onEditClick,
  onDeleteClick,
}: {
  card: TrailCard;
  canEdit: boolean;
  canTopUp: boolean;
  canDelete: boolean;
  onTopUpClick: (trialId: string) => void;
  onEditClick?: (trialId: string) => void;
  /** Called when user clicks Delete in dropdown (parent should show confirmation then delete) */
  onDeleteClick: (trialId: string) => void;
}) {
  const thumb = card.images?.[0] ?? null;
  const thumbType = card.thumbMediaType ?? "image";
  const rewards = card.rewards ?? [];

  return (
    <article
      key={card.id}
      className={cn(
        "rounded-2xl bg-white border border-black/5 overflow-hidden",
      )}
    >
      <div className="flex min-h-[100px] 2xl:min-h-[150px] p-3 space-x-2">
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
            <RichTextPreview
              content={truncateText(card.description, 90)}
            />
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
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full bg-[#F4F4F4] px-3 py-1 text-[10px]",
                    )}
                  >
                    {spec?.img ? (
                      <img
                        src={spec.img}
                        alt=""
                        className="h-3.5 w-3.5"
                      />
                    ) : null}
                    <span className="tabular-nums">{v}</span>
                    <span className="text-[#6E6E6E]">
                      {spec?.parentSymbol ?? ""}
                    </span>
                  </span>
                );
              })}

              {!rewards.length ? (
                <span className="text-[10px] text-[#9A9A9A]">
                  No rewards
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <section className="flex items-center shrink-0">
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
              <DropdownMenuItem
                onClick={() => onTopUpClick(card.id)}
                disabled={!canTopUp}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Top up
              </DropdownMenuItem>
              {onEditClick && (
                <DropdownMenuItem onClick={() => onEditClick(card.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDeleteClick(card.id)}
                disabled={!canDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>
      </div>
    </article>
  );
}

export function TrailsManageFooterAndModals({
  canEdit,
  campaignId,
  cards,
  reorderOpen,
  reorderItems,
  saveSequence,
  savingOrder,
  topUpOpen,
  topUpTrialId,
  onOpenReorder,
  onCloseTopUp,
  onCloseReorder,
  isLoading = false,
}: {
  canEdit: boolean;
  campaignId: string;
  cards: { id: string }[];
  reorderOpen: boolean;
  isLoading?: boolean;
  reorderItems: SortableTrialItem[];
  saveSequence: (trialIds: string[]) => void;
  savingOrder: boolean;
  topUpOpen: boolean;
  topUpTrialId: string | null;
  onOpenReorder: () => void;
  onCloseTopUp: () => void;
  onCloseReorder: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <footer className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-[#ED0C1D] text-xs">
          <TriangleAlert className="h-4 w-4" />
          <span>To save draft or to publish go to overview dashboard</span>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => canEdit && onOpenReorder()}
            disabled={!canEdit || !cards.length}
            className="min-w-[180px] rounded-full border border-[#24B3B3] text-[#24B3B3] bg-[#E8FBFB] px-6 py-3 font-semibold tracking-wide"
          >
            REORDER
          </button>

          <button
            type="button"
            onClick={() => {
              if (!campaignId) return;
              navigate(`/campaigns/edit/${campaignId}/overview`);
            }}
            disabled={!campaignId || isLoading}
            className="min-w-[180px] rounded-full bg-[#0EA5A5] text-white px-6 py-3 font-semibold tracking-wide"
          >
            SAVE TRAIL
          </button>
        </div>
      </footer>

      <TopUpTrailRewardsModal
        open={topUpOpen}
        trialId={topUpTrialId}
        onClose={onCloseTopUp}
      />

      <ReorderTrailsModal
        open={reorderOpen}
        items={reorderItems}
        saving={savingOrder}
        onClose={() => {
          if (savingOrder) return;
          onCloseReorder();
        }}
        onSave={saveSequence}
      />
    </>
  );
}
