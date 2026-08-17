import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";
import { CampaignSocialPlatformCard } from "@/components/campaign/social/campaign-social-platform-card";
import { getCampaignSocialPlatformDisplayState } from "@/lib/campaign/social";
import type {
  ApiCampaignById,
  ApiCampaignSocialStatus,
  CampaignSocialPlatformKey,
  CampaignUploadPostProfile,
} from "@/types/campaigns";

function getConnectedCount(
  profile: CampaignUploadPostProfile | null | undefined,
) {
  if (!profile) return 0;
  return [profile.x, profile.instagram, profile.facebook].filter(
    (item) => !!item?.connected,
  ).length;
}

function getEnabledCount(
  profile: CampaignUploadPostProfile | null | undefined,
) {
  if (!profile) return 0;
  return [profile.x, profile.instagram, profile.facebook].filter(
    (item) => !!item?.connected && (item.enabled ?? true),
  ).length;
}

function getReconnectRequiredCount(
  socialStatus: ApiCampaignSocialStatus | null | undefined,
) {
  const profile = socialStatus?.uploadPostProfile ?? null;
  const platformHealth = socialStatus?.platformHealth ?? null;
  if (!profile || !platformHealth) return 0;

  return (["x", "instagram", "facebook"] as const).filter((platform) => {
    return (
      getCampaignSocialPlatformDisplayState(
        profile[platform],
        platformHealth[platform],
      ) === "reconnect_required"
    );
  }).length;
}

export function CampaignSocialSnapshotCard(props: {
  socialStatus: ApiCampaignSocialStatus;
  campaign: ApiCampaignById | null;
  description: string;
  footer?: React.ReactNode;
  onPlatformManageOrConnect?: (platform: CampaignSocialPlatformKey) => void;
  onPlatformToggleEnabled?: (
    platform: CampaignSocialPlatformKey,
    nextEnabled: boolean,
  ) => void;
  platformActionsDisabled?: boolean;
  platformManageOrConnectPending?: boolean;
  platformTogglePending?: CampaignSocialPlatformKey | null;
}) {
  const profile = props.socialStatus.uploadPostProfile ?? null;
  if (!profile) return null;

  const connectedCount = getConnectedCount(profile);
  const enabledCount = getEnabledCount(profile);
  const reconnectRequiredCount = getReconnectRequiredCount(props.socialStatus);

  return (
    <section className="rounded-2xl border border-[#D9E4EC] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-black/5 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#117C7C]">
            Stored snapshot
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#132238]">
            {connectedCount > 0
              ? `${connectedCount} of 3 platforms connected`
              : "Social profile snapshot available"}
          </h2>
          {connectedCount > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#E8FBFB] px-3 py-1 text-xs font-semibold text-[#117C7C]">
                {enabledCount} enabled for posting
              </span>
              {reconnectRequiredCount > 0 ? (
                <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#9A3412]">
                  {reconnectRequiredCount} require reconnect
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
            {props.description}
          </p>
        </div>

        <CampaignStatePills
          input={props.campaign}
          ownershipType={props.socialStatus.ownershipType}
          billingMode={props.socialStatus.billingMode}
          showBillingMode={props.socialStatus.billingMode != null}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <CampaignSocialPlatformCard
          platform="x"
          snapshot={profile.x}
          health={props.socialStatus.platformHealth?.x ?? null}
          onManageOrConnect={
            props.onPlatformManageOrConnect
              ? () => props.onPlatformManageOrConnect?.("x")
              : undefined
          }
          onToggleEnabled={
            props.onPlatformToggleEnabled && profile.x?.connected
              ? () =>
                  props.onPlatformToggleEnabled?.(
                    "x",
                    !(profile.x?.enabled ?? true),
                  )
              : undefined
          }
          actionsDisabled={props.platformActionsDisabled}
          manageOrConnectPending={props.platformManageOrConnectPending}
          togglePending={props.platformTogglePending === "x"}
        />
        <CampaignSocialPlatformCard
          platform="instagram"
          snapshot={profile.instagram}
          health={props.socialStatus.platformHealth?.instagram ?? null}
          onManageOrConnect={
            props.onPlatformManageOrConnect
              ? () => props.onPlatformManageOrConnect?.("instagram")
              : undefined
          }
          onToggleEnabled={
            props.onPlatformToggleEnabled && profile.instagram?.connected
              ? () =>
                  props.onPlatformToggleEnabled?.(
                    "instagram",
                    !(profile.instagram?.enabled ?? true),
                  )
              : undefined
          }
          actionsDisabled={props.platformActionsDisabled}
          manageOrConnectPending={props.platformManageOrConnectPending}
          togglePending={props.platformTogglePending === "instagram"}
        />
        <CampaignSocialPlatformCard
          platform="facebook"
          snapshot={profile.facebook}
          health={props.socialStatus.platformHealth?.facebook ?? null}
          onManageOrConnect={
            props.onPlatformManageOrConnect
              ? () => props.onPlatformManageOrConnect?.("facebook")
              : undefined
          }
          onToggleEnabled={
            props.onPlatformToggleEnabled && profile.facebook?.connected
              ? () =>
                  props.onPlatformToggleEnabled?.(
                    "facebook",
                    !(profile.facebook?.enabled ?? true),
                  )
              : undefined
          }
          actionsDisabled={props.platformActionsDisabled}
          manageOrConnectPending={props.platformManageOrConnectPending}
          togglePending={props.platformTogglePending === "facebook"}
        />
      </div>

      {props.footer}
    </section>
  );
}
