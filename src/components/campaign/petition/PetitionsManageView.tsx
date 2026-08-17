import { RichTextPreview } from "@/components/commons/editor/preview";
import { truncateText } from "@/utils/truncateWords";
import {
  Link as LinkIcon,
  Trash2,
  Video as VideoIcon,
  Youtube,
} from "lucide-react";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { cn } from "@/lib/utils";

export function PetitionsManageView({
  isLoading,
  isError,
  cards,
  onAdd,
  onEdit,
  onDeleteClick,
  isPetitionEnabled = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  isLoading: boolean;
  isError: boolean;
  cards: {
    _id: string;
    name: string;
    description?: string;
    participants: number;
    hasVideo: boolean;
    ytId: string | null;
    externalLinks: string[];
    isEnabled: boolean;
  }[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  /** When false, show message instead of Add Petition button. */
  isPetitionEnabled?: boolean;
  /** Co-owner: when false, Add button disabled + tooltip */
  canCreate?: boolean;
  /** Co-owner: when false, card disabled + tooltip on hover */
  canEdit?: boolean;
  /** Co-owner: when false, trash icon disabled + tooltip on hover */
  canDelete?: boolean;
}) {
  return (
    <div className="p-4 min-h-screen">
      <div className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-[#111]">
              Manage Petitions
            </div>
            <div className="mt-1 text-xs text-black/50">
              Create, update assets/links, or delete petitions. Works in any
              campaign status.
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPetitionEnabled ? (
              <PermissionDisabledTooltip hasPermission={canCreate}>
                <button
                  type="button"
                  onClick={onAdd}
                  className="rounded-full bg-[#E4F2DF] px-5 py-2.5 text-sm font-semibold text-[#315326] inline-flex items-center gap-2"
                >
                  + Add Petition
                </button>
              </PermissionDisabledTooltip>
            ) : (
              <p className="text-sm text-black/60">
                If you want to create petition then enable it on add-info page
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-black/60">Loading petitions...</div>
        ) : null}

        {!isLoading && isError ? (
          <div className="mt-6 text-sm text-black/60">
            Failed to load petitions.
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="mt-6 grid grid-cols-3 gap-4">
            {cards.length === 0 ? (
              <div className="col-span-3 rounded-xl bg-white border border-black/10 p-6 text-sm text-black/60">
                No petitions yet. Click{" "}
                <span className="font-semibold">Add Petition</span> to launch
                one.
              </div>
            ) : null}

            {cards.map((p) => (
              <PermissionDisabledTooltip
                key={p._id}
                hasPermission={canEdit}
                className="block w-full"
              >
                <button
                  type="button"
                  onClick={() => onEdit(p._id)}
                  disabled={!canEdit}
                  className={cn(
                    "w-full text-left rounded-2xl bg-white border border-black/10 transition overflow-hidden py-3",
                    canEdit && "hover:border-black/20 hover:shadow-sm cursor-pointer",
                    !canEdit && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 px-3">
                    <div className="font-semibold text-[#111] line-clamp-2">
                      {p.name}
                    </div>

                    <PermissionDisabledTooltip hasPermission={canDelete}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(p._id, p.name);
                        }}
                        className="rounded-lg p-2 hover:bg-black/5"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </PermissionDisabledTooltip>
                  </div>

                  <p className="text-xs text-black/60 line-clamp-3">
                    <RichTextPreview content={truncateText(p.description, 140)} />
                  </p>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-black/50 px-3">
                    <div className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-black/70 text-white text-[11px] px-3 py-1">
                        {p.participants} participants
                      </span>

                      {p.hasVideo ? (
                        <VideoIcon className="h-4 w-4 text-black" />
                      ) : null}
                      {p.ytId ? (
                        <Youtube className="h-4 w-4 text-red-600" />
                      ) : null}
                    </div>

                    <div className="inline-flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5" />
                      {p.externalLinks.length} link(s)
                    </div>
                  </div>
                </button>
              </PermissionDisabledTooltip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
