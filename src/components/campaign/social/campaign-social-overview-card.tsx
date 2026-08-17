import { ArrowRight, Link2, LockKeyhole, RefreshCw, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  countConnectedCampaignSocialPlatforms,
  getConnectedCampaignSocialPlatforms,
} from "@/lib/campaign/social";
import {
  CAMPAIGN_SOCIAL_FEATURE_NAME,
  getCampaignSocialEligibleEmptyDescription,
  getCampaignSocialManageReason,
  getCampaignSocialPaymentRequiredDescription,
  getCampaignSocialRecoveryTarget,
  getCampaignSocialReadonlySnapshotDescription,
  getCampaignSocialUpgradeDescription,
  isCampaignSocialMainOwner,
} from "@/lib/campaign/social-ui";
import {
  pickDataRoot,
  type ApiCampaignById,
  type ApiCampaignSocialStatus,
} from "@/types/campaigns";

const PLATFORM_LABELS: Record<"x" | "instagram" | "facebook", string> = {
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
};

function LoadingState() {
  return (
    <section className="mb-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-80 max-w-full rounded-full bg-slate-200" />
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-3/4 rounded-full bg-slate-100" />
      </div>
    </section>
  );
}

export function CampaignSocialOverviewCard(props: {
  campaignId: string;
  campaign: ApiCampaignById | null;
}) {
  const navigate = useNavigate();
  const socialRoute = props.campaignId
    ? endpoints.campaigns.getCampaignSocial(props.campaignId)
    : "";
  const { data, isLoading, isError } = useApiQuery(socialRoute, {
    enabled: !!props.campaignId,
    retry: false,
    queryKey: [socialRoute],
  });

  const socialStatus = pickDataRoot<ApiCampaignSocialStatus>(data);

  if (isLoading) {
    return <LoadingState />;
  }

  const connectedPlatforms = getConnectedCampaignSocialPlatforms(
    socialStatus?.uploadPostProfile ?? props.campaign?.uploadPostProfile ?? null,
  );
  const connectedCount = countConnectedCampaignSocialPlatforms(
    socialStatus?.uploadPostProfile ?? props.campaign?.uploadPostProfile ?? null,
  );
  const isMainOwner = isCampaignSocialMainOwner(socialStatus, props.campaign);
  const manageReason = getCampaignSocialManageReason(socialStatus);
  const openSocialTab = () =>
    navigate(`/campaigns/edit/${props.campaignId}/social`);
  const recoveryTarget = getCampaignSocialRecoveryTarget({
    campaignId: props.campaignId,
    socialStatus,
    campaign: props.campaign,
  });

  let eyebrow = CAMPAIGN_SOCIAL_FEATURE_NAME;
  let title = "Open Social Accounts";
  let description =
    "Review and manage this campaign’s Upload Post connection from the Social Accounts tab.";
  let accentClassName = "bg-[#E8FBFB] text-[#0EA5A5]";
  let eyebrowClassName = "text-[#0EA5A5]";
  let icon = <Link2 className="h-5 w-5" />;

  if (isError || !socialStatus) {
    title = "Social account status is ready to review";
    description =
      "We couldn’t load the latest social account status here, but the Social Accounts tab is the right place to retry and review this campaign’s connection.";
  } else if (connectedCount > 0) {
    title =
      connectedCount === 1
        ? "1 platform connected"
        : `${connectedCount} platforms connected`;
    description =
      manageReason && manageReason !== "eligible"
        ? getCampaignSocialReadonlySnapshotDescription(socialStatus)
        : "Open Social Accounts to review this campaign’s saved Upload Post snapshot, manage linked accounts through Upload Post, and control posting state per connected platform.";
    accentClassName = "bg-[#F0FDF4] text-[#15803D]";
    icon = <Share2 className="h-5 w-5" />;
    if (manageReason === "upgrade_required") {
      eyebrow = "Upgrade required";
      eyebrowClassName = "text-[#B45309]";
      accentClassName = "bg-[#FFFBEB] text-[#B45309]";
    } else if (manageReason === "payment_required") {
      eyebrow = "Payment required";
      eyebrowClassName = "text-[#B91C1C]";
      accentClassName = "bg-[#FEF2F2] text-[#B91C1C]";
    } else if (manageReason === "main_owner_only" || manageReason === "campaign_closed") {
      eyebrow = "Read only";
      eyebrowClassName = "text-[#475569]";
      accentClassName = "bg-[#F8FAFC] text-[#334155]";
    }
  } else if (manageReason === "upgrade_required") {
    eyebrow = "Upgrade required";
    title = "Social Accounts are available on paid campaigns";
    description = getCampaignSocialUpgradeDescription(isMainOwner);
    accentClassName = "bg-[#FFFBEB] text-[#B45309]";
    eyebrowClassName = "text-[#B45309]";
    icon = <LockKeyhole className="h-5 w-5" />;
  } else if (manageReason === "payment_required") {
    eyebrow = "Payment required";
    title = "Social Accounts are read-only until coverage resumes";
    description = getCampaignSocialPaymentRequiredDescription({
      isMainOwner,
      billingMode: socialStatus.billingMode,
    });
    accentClassName = "bg-[#FEF2F2] text-[#B91C1C]";
    eyebrowClassName = "text-[#B91C1C]";
    icon = <RefreshCw className="h-5 w-5" />;
  } else if (manageReason === "main_owner_only") {
    eyebrow = "Read only";
    title = "Social Accounts are read-only for co-owners";
    description =
      "Once the main owner connects this campaign through Upload Post, the saved X, Instagram, and Facebook snapshot will appear here for co-owners to review.";
    accentClassName = "bg-[#F8FAFC] text-[#334155]";
    eyebrowClassName = "text-[#475569]";
    icon = <LockKeyhole className="h-5 w-5" />;
  } else if (manageReason === "campaign_closed") {
    eyebrow = "Read only";
    title = "Social Accounts can’t be managed right now";
    description =
      "This campaign is outside the active management window, so Social Accounts stay read-only until the campaign returns to a supported status.";
    accentClassName = "bg-[#F8FAFC] text-[#334155]";
    eyebrowClassName = "text-[#475569]";
    icon = <LockKeyhole className="h-5 w-5" />;
  } else if (socialStatus) {
    title = "No social accounts connected yet";
    description = getCampaignSocialEligibleEmptyDescription(socialStatus);
  }

  const shouldShowRecoveryButton =
    !!socialStatus &&
    manageReason === "payment_required" &&
    recoveryTarget.to !== `/campaigns/edit/${props.campaignId}/social` &&
    recoveryTarget.to !== `/campaigns/edit/${props.campaignId}/overview`;

  return (
    <section className="mb-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentClassName}`}
          >
            {icon}
          </div>

          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.22em] ${eyebrowClassName}`}
            >
              {eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#132238]">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">
              {description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {connectedCount > 0 ? (
                <span className="rounded-full bg-[#E8FBFB] px-3 py-1 text-xs font-semibold text-[#117C7C]">
                  {connectedCount} connected
                </span>
              ) : null}
              {connectedPlatforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full bg-[#F5F9FC] px-3 py-1 text-xs font-medium text-[#506273]"
                >
                  {PLATFORM_LABELS[platform]}
                </span>
              ))}
              {manageReason === "upgrade_required" ? (
                <span className="rounded-full bg-[#FFFBEB] px-3 py-1 text-xs font-medium text-[#B45309]">
                  Paid campaign feature
                </span>
              ) : null}
              {manageReason === "payment_required" ? (
                <span className="rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-medium text-[#B91C1C]">
                  Coverage inactive
                </span>
              ) : null}
              {manageReason === "main_owner_only" ? (
                <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
                  Co-owner read only
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          {shouldShowRecoveryButton ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#D7DCE2] px-5 text-[#1E293B]"
              onClick={() => navigate(recoveryTarget.to)}
            >
              {recoveryTarget.label}
            </Button>
          ) : null}
          <Button
            type="button"
            className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
            onClick={openSocialTab}
          >
            Open Social Accounts
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
