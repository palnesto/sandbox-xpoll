import { Trash2, Pencil, Video, Youtube } from "lucide-react";
import { FieldErrors, UseFormSetValue } from "react-hook-form";
import type { TrailCreateValues } from "@/schema/campaign.schemas";
import type { TrailPoll } from "@/stores/create-campaign.store";
import { getYouTubeThumbnailUrl } from "@/types/petition";

export function getPollIssues(poll: TrailPoll): string[] {
  const issues: string[] = [];
  const pollName = String(poll.pollName ?? "").trim();
  const pollDescription = String(poll.pollDescription ?? "").trim();
  const options = (poll.options ?? [])
    .map((option) => String(option ?? "").trim())
    .filter(Boolean);

  if (pollName.length < 3) issues.push("Poll name must be at least 3 chars");
  if (pollName.length > 25) issues.push("Poll name must be at most 25 chars");
  if (pollDescription.length < 3)
    issues.push("Poll description must be at least 3 chars");
  if (pollDescription.length > 350)
    issues.push("Poll description must be at most 350 chars");
  if (options.length < 2) issues.push("At least 2 options are required");
  if (options.length > 4) issues.push("At most 4 options are allowed");
  const rawOptions = (poll.options ?? []).map((o) => String(o ?? "").trim());
  for (let i = 0; i < rawOptions.length; i++) {
    const len = rawOptions[i].length;
    if (len < 1) issues.push(`Option ${i + 1}: min 1 character required`);
    else if (len > 25) issues.push(`Option ${i + 1}: max 25 characters allowed`);
  }

  return issues;
}

const MAX_POLLS = 50;

export function TrailCreatePollsSection({
  polls,
  errors,
  canEdit,
  onAddPoll,
  onEditPoll,
  onEditPollMedia,
  canEditPollMediaOnly = false,
  setValue,
}: {
  polls: TrailPoll[];
  errors: FieldErrors<TrailCreateValues>;
  canEdit: boolean;
  onAddPoll: () => void;
  onEditPoll?: (poll: TrailPoll) => void;
  /** When set, pencil edits only poll media (e.g. on launched trail edit). Pencil calls this instead of onEditPoll. */
  onEditPollMedia?: (poll: TrailPoll) => void;
  canEditPollMediaOnly?: boolean;
  setValue: UseFormSetValue<TrailCreateValues>;
}) {
  const showPencil = (canEdit && onEditPoll) || (canEditPollMediaOnly && onEditPollMedia);
  const onPencilClick = canEditPollMediaOnly && onEditPollMedia
    ? onEditPollMedia
    : onEditPoll;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[#7A7A7A]">Add polls</div>
        {!canEditPollMediaOnly && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#7A7A7A]">{polls.length}/{MAX_POLLS}</span>
          <button
            type="button"
            onClick={() => canEdit && polls.length < MAX_POLLS && onAddPoll()}
            disabled={!canEdit || polls.length >= MAX_POLLS}
            className="rounded-full bg-[#E4F2DF] px-3 py-1 text-sm font-medium text-[#315326] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add poll
          </button>
        </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl bg-white border border-black/10 p-4">
        {polls.length ? (
          polls?.map((p: TrailPoll, pollIndex: number) => {
            const pollErrors = Array.isArray(errors.polls)
              ? (errors.polls[pollIndex] as
                  | {
                      pollName?: { message?: string };
                      pollDescription?: { message?: string };
                      options?: { message?: string };
                    }
                  | undefined)
              : undefined;
            const derivedIssues = getPollIssues(p);
            const firstFormIssue =
              pollErrors?.pollName?.message ||
              pollErrors?.pollDescription?.message ||
              pollErrors?.options?.message;
            const firstIssue = String(firstFormIssue || derivedIssues[0] || "");
            const hasIssue = Boolean(firstIssue);

            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-[#F3F3F3] px-5 py-2"
              >
                <section className="flex items-center gap-2 min-w-0">
                  <figure className="w-24 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-300 flex items-center justify-center">
                    {(() => {
                      const first = p?.resourceAssets?.[0];
                      if (!first) {
                        return (
                          <span className="text-xs text-gray-500">No media</span>
                        );
                      }
                      if (first.type === "image") {
                        const src =
                          typeof first.value === "string"
                            ? first.value
                            : first.value instanceof File
                              ? URL.createObjectURL(first.value)
                              : null;
                        return src ? (
                          <img
                            src={src}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">Image</span>
                        );
                      }
                      if (first.type === "youtube") {
                        const thumb = getYouTubeThumbnailUrl(String(first.value));
                        return thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Youtube className="h-6 w-6 text-red-600" />
                        );
                      }
                      if (first.type === "video") {
                        const src =
                          typeof first.value === "string"
                            ? first.value
                            : first.value instanceof File
                              ? URL.createObjectURL(first.value)
                              : null;
                        return src ? (
                          <video
                            src={src}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="h-6 w-6 text-[#315326]" />
                        );
                      }
                      return <Video className="h-6 w-6 text-[#315326]" />;
                    })()}
                  </figure>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm text-[#2B2B2B] line-clamp-1">
                      {p.pollName}
                    </h2>
                    {hasIssue ? (
                      <p className="text-xs text-red-600 line-clamp-1">
                        {firstIssue}
                      </p>
                    ) : null}
                  </div>
                </section>
                <div className="flex items-center gap-1">
                  {hasIssue ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      Needs fix
                    </span>
                  ) : null}
                  {showPencil && onPencilClick && (
                    <button
                      type="button"
                      onClick={() => onPencilClick(p)}
                      className="p-2 rounded text-[#315326] hover:bg-[#E4F2DF]"
                      aria-label={canEditPollMediaOnly ? "Edit poll media" : "Edit poll"}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  )}
                  {!canEditPollMediaOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "polls",
                          polls.filter((x: { id: string }) => x.id !== p.id),
                          { shouldDirty: true, shouldValidate: true },
                        )
                      }
                      disabled={!canEdit}
                      className="p-2 rounded text-red-500 hover:text-red-600 hover:bg-red-50"
                      aria-label="delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-[#8A8A8A]">No polls yet</p>
        )}
      </div>
      {errors.polls?.message ? (
        <p className="mt-2 text-xs text-red-600">
          {String(errors.polls.message)}
        </p>
      ) : null}
    </div>
  );
}
