import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampaignSocialEmptyStateCard } from "@/components/campaign/social/campaign-social-empty-state-card";
import { CampaignSocialReadonlyPanel } from "@/components/campaign/social/campaign-social-readonly-panel";
import { CampaignSocialSnapshotCard } from "@/components/campaign/social/campaign-social-snapshot-card";
import { isCampaignSocialManageEligible } from "@/lib/campaign/social";
import { getCampaignSocialEligibleEmptyDescription } from "@/lib/campaign/social-ui";
import type {
  ApiCampaignById,
  ApiCampaignSocialStatus,
  CampaignSocialPlatformKey,
} from "@/types/campaigns";

export function CampaignSocialPanel(props: {
  campaignId: string;
  campaign: ApiCampaignById | null;
  socialStatus: ApiCampaignSocialStatus | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  feedback?: React.ReactNode;
  actionsBlocked?: boolean;
  connectPending?: boolean;
  preferencePendingPlatform?: CampaignSocialPlatformKey | null;
  onConnect: () => void;
  onPlatformToggleEnabled: (
    platform: CampaignSocialPlatformKey,
    nextEnabled: boolean,
  ) => void;
}) {
  const actionsDisabled = !!(props.actionsBlocked || props.connectPending);

  const isEligibleMainOwner = isCampaignSocialManageEligible(
    props.socialStatus,
  );

  if (!isEligibleMainOwner) {
    return (
      <div className="space-y-4">
        {props.feedback}
        <CampaignSocialReadonlyPanel
          campaignId={props.campaignId}
          campaign={props.campaign}
          socialStatus={props.socialStatus}
          isLoading={props.isLoading}
          isError={props.isError}
          onRetry={props.onRetry}
        />
      </div>
    );
  }

  const snapshot = props.socialStatus?.uploadPostProfile ?? null;

  return (
    <div className="space-y-4">
      {props.feedback}

      {snapshot ? (
        <CampaignSocialSnapshotCard
          socialStatus={props.socialStatus}
          campaign={props.campaign}
          description={""}
          onPlatformManageOrConnect={() => props.onConnect()}
          onPlatformToggleEnabled={props.onPlatformToggleEnabled}
          platformActionsDisabled={actionsDisabled}
          platformManageOrConnectPending={props.connectPending}
          platformTogglePending={props.preferencePendingPlatform ?? null}
        />
      ) : (
        <CampaignSocialEmptyStateCard
          icon={<Link2 className="h-6 w-6" />}
          eyebrow="Ready to connect"
          title="Connect social accounts for this campaign"
          description={getCampaignSocialEligibleEmptyDescription(
            props.socialStatus,
          )}
          footer={
            <Button
              type="button"
              disabled={actionsDisabled}
              className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
              onClick={props.onConnect}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {props.connectPending
                ? "Opening Upload Post..."
                : "Connect social accounts"}
            </Button>
          }
        />
      )}
    </div>
  );
}
