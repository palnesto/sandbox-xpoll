import { EllipsisVertical, Shield, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CoOwnerMapping,
  countPermissionsEnabled,
  initials,
  normalizePermissions,
  safeId,
  TOTAL_PERMISSION_COUNT,
  userLabel,
} from "./model";

type Props = {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  coOwners: CoOwnerMapping[];
  rowBusy: boolean;
  showActions: boolean;
  onRetry: () => void;
  onOpenPermissions: (owner: CoOwnerMapping) => void;
  onRemove: (owner: CoOwnerMapping) => void;
};

export default function CoOwnerList({
  isLoading,
  isError,
  isFetching,
  coOwners,
  rowBusy,
  showActions,
  onRetry,
  onOpenPermissions,
  onRemove,
}: Props) {
  return (
    <section className="mt-5 space-y-3">
      {isLoading && (
        <>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 rounded-xl border border-black/10 bg-white animate-pulse"
            />
          ))}
        </>
      )}

      {!isLoading && isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Failed to load co-owners.
          <button
            type="button"
            onClick={onRetry}
            className="ml-3 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && coOwners.length === 0 && (
        <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-black/60">
          No co-owners added yet.
        </div>
      )}

      {!isLoading &&
        !isError &&
        coOwners.map((owner) => {
          const permissions = normalizePermissions(owner.permissions);
          const permissionsEnabled = countPermissionsEnabled(permissions);
          const avatarUrl = owner.avatar?.imageUrl ?? "";
          const displayName = userLabel(owner);
          const externalId = safeId(owner.externalAccountId);

          return (
            <article
              key={owner._id}
              className="rounded-xl border border-black/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#DFF3F0] text-sm font-semibold text-[#0F766E]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(displayName || externalId)
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-[#1A1A1A]">
                      {displayName}
                    </h2>
                    <p className="break-all text-xs text-black/55">
                      {externalId}
                    </p>
                    <p className="mt-1 text-xs text-black/45">
                      {permissionsEnabled}/{TOTAL_PERMISSION_COUNT} permissions
                      enabled
                    </p>
                  </div>
                </div>

                {showActions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={rowBusy}
                        aria-label={`Actions for ${displayName}`}
                        className="shrink-0 rounded-lg p-2 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        disabled={rowBusy}
                        onClick={() => onOpenPermissions(owner)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={rowBusy}
                        onClick={() => onRemove(owner)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Co Owner
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </article>
          );
        })}

      {!isLoading && !isError && isFetching && (
        <div className="text-xs text-black/50">Refreshing co-owners…</div>
      )}
    </section>
  );
}
