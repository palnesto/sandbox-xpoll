// import React from "react";
// import { Home, User, ArrowLeftRight, ChartNoAxesColumn } from "lucide-react";
// import PollingSidebarIcon from "@/assets/sidebarpoll.webp";
// import PollingBottomIcon from "@/assets/poll.webp";
// import CampaignsSidebarIcon from "@/assets/campaign.webp";
// import CampaignsBottomIcon from "@/assets/camp.webp";

// export interface NavItem {
//   label?: string;
//   mobileLabel?: string;
//   to: string;
//   icon?: React.ComponentType<{ className?: string }>;
//   sidebarImgSrc?: string;
//   sidebarIconImgSrc?: string;
//   bottomImgSrc?: string;
//   isSpecial?: boolean;
//   isCustomSvg?: boolean;
//   isCampaigns?: boolean;
//   isCoins?: boolean;
//   isMarketplace?: boolean;
//   isBookmarked?: boolean;
// }

// export const NAV_ITEMS: NavItem[] = [
//   { label: "Home", to: "/home", icon: Home },
//   {
//     label: "Campaigns",
//     mobileLabel: "Camps",
//     to: "/campaigns/all-campaigns",
//     isCampaigns: true,
//     sidebarIconImgSrc: CampaignsSidebarIcon,
//     bottomImgSrc: CampaignsBottomIcon,
//     icon: ChartNoAxesColumn,
//   },
//   { label: "Coins", to: "/coins", isCoins: true },
//   { label: "Add", to: "/add-polls", isCustomSvg: true },
//   {
//     label: "User Polls",
//     to: "/feed/polls",
//     sidebarImgSrc: PollingSidebarIcon,
//     bottomImgSrc: PollingBottomIcon,
//     isSpecial: true,
//   },

//   { label: "Exchange", to: "/exchange", icon: ArrowLeftRight },

//   { label: "Market", to: "/marketplace", isMarketplace: true },

//   { label: "Favorite campaigns", to: "/bookmarks", isBookmarked: true },

//   { label: "Profile", to: "/profile", icon: User },
// ];
import React from "react";
import { Home, User, ArrowLeftRight, ChartNoAxesColumn } from "lucide-react";
import SidebarCampaignIcon from "@/assets/createCamp.webp";
import PollingBottomIcon from "@/assets/poll.webp";
import CampaignsSidebarIcon from "@/assets/campaign.webp";
import CampaignsBottomIcon from "@/assets/camp.webp";

export interface NavItem {
  label?: string;
  mobileLabel?: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  sidebarImgSrc?: string;
  sidebarIconImgSrc?: string;
  bottomImgSrc?: string;
  isSpecial?: boolean;
  isCustomSvg?: boolean;
  isCampaigns?: boolean;
  isCoins?: boolean;
  isMarketplace?: boolean;
  isBookmarked?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/home", icon: Home },
  {
    label: "Campaigns",
    mobileLabel: "Camps",
    to: "/campaigns/all-campaigns",
    isCampaigns: true,
    sidebarIconImgSrc: CampaignsSidebarIcon,
    bottomImgSrc: CampaignsBottomIcon,
    icon: ChartNoAxesColumn,
  },
  { label: "Coins", to: "/coins", isCoins: true },
  { label: "Add", to: "/add-polls", isCustomSvg: true },
  {
    label: "User Polls",
    to: "/feed/polls",
    sidebarIconImgSrc: PollingBottomIcon,
    bottomImgSrc: PollingBottomIcon,
    icon: ChartNoAxesColumn,
  },

  { label: "Exchange", to: "/exchange", icon: ArrowLeftRight },

  { label: "Market", to: "/marketplace", isMarketplace: true },

  { label: "Favorite campaigns", to: "/bookmarks", isBookmarked: true },
  {
    label: "Create Campaign",
    to: "/add-campaign",
    sidebarImgSrc: SidebarCampaignIcon,
    isSpecial: true,
  },

  { label: "Profile", to: "/profile", icon: User },
];
