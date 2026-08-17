import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RefreshCw,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { CampaignSocialEmptyStateCard } from "@/components/campaign/social/campaign-social-empty-state-card";
import { CampaignSocialSnapshotCard } from "@/components/campaign/social/campaign-social-snapshot-card";
import {
  getCampaignSocialManageReason,
  getCampaignSocialPaymentRequiredDescription,
  getCampaignSocialReadonlySnapshotDescription,
  getCampaignSocialUpgradeDescription,
} from "@/lib/campaign/social-ui";
import type {
  ApiCampaignById,
  ApiCampaignSocialStatus,
} from "@/types/campaigns";

function LoadingState() {
  return (
    <section className="rounded-2xl border border-[#D9E4EC] bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-8 w-80 max-w-full rounded-full bg-slate-200" />
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-2/3 rounded-full bg-slate-100" />
        <div className="grid gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CampaignSocialReadonlyPanel(props: {
  campaignId: string;
  campaign: ApiCampaignById | null;
  socialStatus: ApiCampaignSocialStatus | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (props.isLoading) {
    return <LoadingState />;
  }

  if (props.isError || !props.socialStatus) {
    return (
      <CampaignSocialEmptyStateCard
        icon={<AlertCircle className="h-6 w-6" />}
        eyebrow="We hit a snag"
        title="Couldn’t load campaign social accounts"
        description="This tab couldn’t load the latest campaign social status right now. Try again to refresh the saved connection state."
        footer={
          <Button
            type="button"
            className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0f6d6d]"
            onClick={props.onRetry}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const socialStatus = props.socialStatus;
  const viewerState = socialStatus.manageState;
  const blockerReason = getCampaignSocialManageReason(socialStatus) ?? viewerState;
  const isMainOwner = socialStatus.ownershipType === "main-owner";
  const snapshot = (
    <CampaignSocialSnapshotCard
      socialStatus={socialStatus}
      campaign={props.campaign}
      description={getCampaignSocialReadonlySnapshotDescription(socialStatus)}
    />
  );

  if (blockerReason === "upgrade_required") {
    return (
      <div className="space-y-4">
        <BasicFeatureUpgradePrompt
          campaignId={props.campaignId}
          featureName="Social Accounts"
          isMainOwner={isMainOwner}
          description={getCampaignSocialUpgradeDescription(isMainOwner)}
        />
        {snapshot}
      </div>
    );
  }

  if (blockerReason === "payment_required") {
    return (
      <div className="space-y-4">
        <CampaignPaymentRequiredPrompt
          campaignId={props.campaignId}
          featureName="Social Accounts"
          isMainOwner={isMainOwner}
          billingMode={socialStatus.billingMode}
          description={getCampaignSocialPaymentRequiredDescription({
            isMainOwner,
            billingMode: socialStatus.billingMode,
          })}
        />
        {snapshot}
      </div>
    );
  }

  if (blockerReason === "campaign_closed") {
    return (
      <div className="space-y-4">
        <CampaignSocialEmptyStateCard
          icon={<Clock3 className="h-6 w-6" />}
          eyebrow="Read only"
          title="This campaign can’t manage social accounts right now"
          description="Campaign social accounts are only manageable while the campaign is in draft, live, or paused status. Any stored snapshot can still be reviewed below."
        />
        {snapshot}
      </div>
    );
  }

  if (socialStatus.uploadPostProfile) {
    return snapshot;
  }

  if (viewerState === "main_owner_only") {
    return (
      <CampaignSocialEmptyStateCard
        icon={<LockKeyhole className="h-6 w-6" />}
        eyebrow="Read only"
        title="Only the main owner can manage social accounts"
        description="Once the main owner links this campaign in Upload Post, the connected X, Instagram, and Facebook accounts will appear here for co-owners to review."
      />
    );
  }

  if (viewerState === "eligible") {
    return (
      <CampaignSocialEmptyStateCard
        icon={
          socialStatus.profileStatus === "failed" ? (
            <RefreshCw className="h-6 w-6" />
          ) : socialStatus.profileStatus === "ready" ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Share2 className="h-6 w-6" />
          )
        }
        eyebrow="Ready to connect"
        title="No social accounts connected yet"
        description="This paid campaign is eligible for campaign-owned social account linking. Once connected, the latest X, Instagram, and Facebook snapshot will appear here."
      />
    );
  }

  return (
    <CampaignSocialEmptyStateCard
      icon={<AlertCircle className="h-6 w-6" />}
      eyebrow="Status unavailable"
      title="Campaign social status couldn’t be interpreted"
      description="This tab received an unexpected campaign social state. Refresh the page to retry, or return later if the campaign was just updated."
      footer={
        <Button
          type="button"
          className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0f6d6d]"
          onClick={props.onRetry}
        >
          Refresh status
        </Button>
      }
    />
  );
}
