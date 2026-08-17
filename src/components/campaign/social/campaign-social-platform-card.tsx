import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getCampaignSocialPlatformDisplayState } from "@/lib/campaign/social";
import type {
  CampaignSocialPlatformHealth,
  CampaignSocialPlatformKey,
  CampaignUploadPostPlatformSnapshot,
} from "@/types/campaigns";

const PLATFORM_META: Record<
  CampaignSocialPlatformKey,
  {
    label: string;
    badge: string;
    accentClassName: string;
    surfaceClassName: string;
  }
> = {
  x: {
    label: "X",
    badge: "X",
    accentClassName: "bg-[#111827] text-white",
    surfaceClassName: "border-[#D1D5DB] bg-[#F9FAFB]",
  },
  instagram: {
    label: "Instagram",
    badge: "IG",
    accentClassName: "bg-[#FCE7F3] text-[#BE185D]",
    surfaceClassName: "border-[#FBCFE8] bg-[#FFF7FB]",
  },
  facebook: {
    label: "Facebook",
    badge: "f",
    accentClassName: "bg-[#DBEAFE] text-[#1D4ED8]",
    surfaceClassName: "border-[#BFDBFE] bg-[#F8FBFF]",
  },
};

export function CampaignSocialPlatformCard(props: {
  platform: CampaignSocialPlatformKey;
  snapshot: CampaignUploadPostPlatformSnapshot | null | undefined;
  health?: CampaignSocialPlatformHealth | null;
  onManageOrConnect?: () => void;
  onToggleEnabled?: () => void;
  actionsDisabled?: boolean;
  manageOrConnectPending?: boolean;
  togglePending?: boolean;
}) {
  const meta = PLATFORM_META[props.platform];
  const snapshot = props.snapshot ?? null;
  const displayState = getCampaignSocialPlatformDisplayState(
    snapshot,
    props.health ?? null,
  );
  const isConnected = displayState !== "not_connected";
  const isReconnectRequired = displayState === "reconnect_required";
  const isPostingEnabled = !!snapshot?.connected && (snapshot?.enabled ?? true);
  const displayName =
    String(snapshot?.displayName ?? "").trim() ||
    String(snapshot?.username ?? "").trim() ||
    meta.label;
  const username = String(snapshot?.username ?? "").trim() || null;
  const avatarUrl = String(snapshot?.avatarUrl ?? "").trim() || null;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 shadow-sm transition-colors",
        meta.surfaceClassName,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold",
              meta.accentClassName,
            )}
          >
            {meta.badge}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#132238]">
              {meta.label}
            </p>
            <p className="text-xs text-[#64748B]">
              {isReconnectRequired
                ? "Reconnect required"
                : isConnected
                  ? "Connected"
                  : "Not connected"}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isReconnectRequired
              ? "bg-[#FFF7ED] text-[#9A3412]"
              : isConnected
              ? "bg-[#DCFCE7] text-[#166534]"
              : "bg-white/80 text-[#64748B]",
          )}
        >
          {isReconnectRequired
            ? "Reconnect required"
            : isConnected
              ? "Connected"
              : "Not connected"}
        </span>
      </div>

      {isConnected ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {isReconnectRequired ? (
            <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[11px] font-semibold text-[#9A3412]">
              Reconnect required
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              isPostingEnabled
                ? "bg-[#E8FBFB] text-[#0F766E]"
                : "bg-[#FFF7ED] text-[#9A3412]",
            )}
          >
            {isPostingEnabled ? "Posting enabled" : "Posting paused"}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/80 p-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-sm font-semibold text-[#132238]">
            {meta.badge}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#132238]">
            {displayName}
          </p>
          <p className="truncate text-xs text-[#64748B]">
            {username ? `@${username.replace(/^@+/, "")}` : "No username synced"}
          </p>
        </div>
      </div>

      {props.onManageOrConnect ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={props.actionsDisabled}
            variant={isConnected ? "outline" : "default"}
            className={cn(
              "w-full rounded-full px-4",
              isConnected
                ? "border-[#D7DCE2] text-[#1E293B]"
                : "bg-[#117C7C] text-white hover:bg-[#0F6D6D]",
            )}
            onClick={props.onManageOrConnect}
          >
            {props.manageOrConnectPending
              ? "Opening Upload Post..."
              : isReconnectRequired
                ? "Reconnect"
                : isConnected
                ? "Manage"
                : "Connect"}
          </Button>

          {isConnected && props.onToggleEnabled ? (
            <Button
              type="button"
              disabled={props.actionsDisabled}
              className={cn(
                "w-full rounded-full px-4",
                isPostingEnabled
                  ? "bg-[#FFF1F2] text-[#BE123C] hover:bg-[#FFE4E6]"
                  : "bg-[#E8FBFB] text-[#0F766E] hover:bg-[#DDF7F7]",
              )}
              onClick={props.onToggleEnabled}
            >
              {props.togglePending
                ? "Saving..."
                : isPostingEnabled
                  ? "Disable posting"
                  : "Enable posting"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
