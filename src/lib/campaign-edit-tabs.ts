import type { NavigateFunction } from "react-router-dom";
import type { CampaignTabKey } from "@/layouts/campaign-layout";

// Keep campaign edit tab routes centralized so new tabs stay consistent across
// the edit pages instead of duplicating per-page route switches.
export function getCampaignEditTabPath(
  campaignId: string,
  tab: CampaignTabKey,
) {
  if (tab === "overview") return `/campaigns/edit/${campaignId}/overview`;
  if (tab === "add-info") return `/campaigns/edit/${campaignId}/add-info`;
  if (tab === "trails") return `/campaigns/edit/${campaignId}/trails`;
  if (tab === "petitions") return `/campaigns/edit/${campaignId}/petition`;
  if (tab === "blogs") return `/campaigns/edit/${campaignId}/blog`;
  if (tab === "inkd-agents") return `/campaigns/edit/${campaignId}/inkd-agents`;
  if (tab === "social") return `/campaigns/edit/${campaignId}/social`;
  if (tab === "co-owners") return `/campaigns/edit/${campaignId}/co-owners`;
  if (tab === "qr-library") return `/campaigns/edit/${campaignId}/qr`;
  if (tab === "events") return `/campaigns/edit/${campaignId}/events`;
  return `/campaigns/edit/${campaignId}/subscription-management`;
}

export function navigateCampaignEditTab(
  navigate: NavigateFunction,
  campaignId: string,
  tab: CampaignTabKey,
) {
  navigate(getCampaignEditTabPath(campaignId, tab));
}
