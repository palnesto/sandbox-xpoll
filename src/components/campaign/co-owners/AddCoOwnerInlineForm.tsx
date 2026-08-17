import { X } from "lucide-react";
import { type UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { LEVELS } from "@/config/levelConfig";
import UserSelect, {
  type ExternalUserLite,
} from "@/components/commons/selects/user-select";
import {
  type AddCoOwnerFormValues,
  externalUserId,
  safeId,
} from "./model";

type Props = {
  form: UseFormReturn<AddCoOwnerFormValues>;
  userSelectKey: number;
  excludeIdsCsv: string;
  remainingSlots: number;
  pendingAddCount: number;
  submitDisabled: boolean;
  isSubmitting: boolean;
  onSelectCandidateUser: (user: ExternalUserLite | null) => void;
  onCancel: () => void;
  onSubmit: (values: AddCoOwnerFormValues) => void;
};

function selectedUserLabel(user: ExternalUserLite) {
  const uid = externalUserId(user);
  return (
    user.username?.trim() ||
    user.email?.trim() ||
    user.googleEmail?.trim() ||
    uid
  );
}

function selectedUserSubLabel(user: ExternalUserLite) {
  const uid = externalUserId(user);
  return user.email?.trim() || user.googleEmail?.trim() || uid;
}

function LevelBadge({ levelId }: { levelId: number | null }) {
  const lvl = LEVELS.find((l) => l.id === (levelId ?? 1)) ?? LEVELS[0];

  return (
    <div className="shrink-0 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
      <img src={lvl.image} alt={lvl.title} className="h-4 w-4" />
      <span className="hidden text-xs font-medium text-gray-900 sm:inline">
        {lvl.title}
      </span>
    </div>
  );
}

function Avatar({ u }: { u: ExternalUserLite }) {
  const url = u.avatar?.imageUrl;
  const fallback = (
    u.username?.[0] ??
    u.email?.[0] ??
    u.googleEmail?.[0] ??
    "U"
  ).toUpperCase();

  return url ? (
    <img
      src={url}
      alt={u.avatar?.name ?? "avatar"}
      className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
    />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 sm:h-9 sm:w-9">
      {fallback}
    </div>
  );
}

export default function AddCoOwnerInlineForm({
  form,
  userSelectKey,
  excludeIdsCsv,
  remainingSlots,
  pendingAddCount,
  submitDisabled,
  isSubmitting,
  onSelectCandidateUser,
  onCancel,
  onSubmit,
}: Props) {
  const selectedUsers = form.watch("selectedUsers", []);

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[#111]">Add Co Owner</h2>
        <p className="mt-1 text-xs text-black/55">
          Search user by username/email and add up to {remainingSlots} more.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <UserSelect
            key={`co-owner-inline-select-${userSelectKey}`}
            placeholder="Search co-owner by username or email..."
            queryParams={excludeIdsCsv ? { excludeIds: excludeIdsCsv } : {}}
            onChange={onSelectCandidateUser}
            selectProps={{
              menuPortalTarget: document.body,
              menuPosition: "fixed",
              styles: {
                menuPortal: (base) => ({ ...base, zIndex: 120 }),
              },
            }}
          />
          <p className="mt-2 text-xs text-black/50">
            Selected: {pendingAddCount} / {remainingSlots}
          </p>
        </div>

        <div className="max-h-[32vh] overflow-y-auto rounded-lg border border-black/10 bg-white p-3">
          {selectedUsers.length === 0 ? (
            <p className="text-sm text-black/55">No users selected yet.</p>
          ) : (
            <div className="space-y-2">
              {selectedUsers.map((user) => {
                const uid = externalUserId(user);
                const username = selectedUserLabel(user);
                const email = selectedUserSubLabel(user);
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#FAFAFA] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar u={user} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">
                                {username}
                              </div>
                              {email ? (
                                <div className="hidden truncate text-xs text-gray-600 sm:block">
                                  {email}
                                </div>
                              ) : null}
                            </div>
                            <LevelBadge levelId={user.level ?? 1} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = form.getValues("selectedUsers") ?? [];
                        form.setValue(
                          "selectedUsers",
                          current.filter(
                            (item) =>
                              safeId(item.externalAccountId || item._id) !== uid,
                          ),
                          { shouldDirty: true },
                        );
                      }}
                      className="rounded-full p-1.5 text-black/60 hover:bg-black/5 hover:text-black"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-semibold text-white",
              submitDisabled
                ? "cursor-not-allowed bg-[#9CA3AF]"
                : "bg-[#0EA5A5] hover:bg-[#0C9A9A]",
            )}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
