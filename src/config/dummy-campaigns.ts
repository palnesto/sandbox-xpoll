import type { CampaignCardModel } from "@/components/commons/campaign-card-variants";

export type CampaignTrail = {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  rewards: { amount: number; symbol: string }[];
};

export type CampaignDetailModel = CampaignCardModel & {
  descriptionLong: string;
  stats: {
    usersContributed: number;
    xpollContributed: number;
  };
  social?: {
    x?: string;
    instagram?: string;
    telegram?: string;
    email?: string;
    website?: string;
  };
  trails: CampaignTrail[];
};

export const DUMMY_PARTICIPATED: CampaignCardModel[] = [
  {
    _id: "p1",
    title: "Rhode Island Rising with Aaron Guckian",
    organizerName: "Aaron Guckian",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80",
    status: "ended",
    isSaved: true,
    trailsCompleted: 2,
    trailsTotal: 4,
  },
  {
    _id: "p2",
    title: "Cost of Living Pulse\nRI Households",
    organizerName: "Stanton Terranova",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1200&q=80",
    status: "ended",
    isSaved: false,
    trailsCompleted: 2,
    trailsTotal: 4,
  },
  {
    _id: "p3",
    title: "Schools & Skills — RI Education Check-in",
    organizerName: "Henry Creel",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=1200&q=80",
    status: "ended",
    isSaved: false,
    trailsCompleted: 2,
    trailsTotal: 4,
  },
  {
    _id: "p4",
    title: "Safe Streets, Trusted Government",
    organizerName: "Jane Hopper",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80",
    status: "ended",
    isSaved: false,
    trailsCompleted: 2,
    trailsTotal: 4,
  },
];

export const DUMMY_NEW_FOR_YOU: CampaignCardModel[] = [
  {
    _id: "n1",
    title: "Global Cost of Living Pulse 2025",
    organizerName: "Dr. Maria Álvarez",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1550525811-e5869dd03032?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=1200&q=80",
    status: "ended",
    isSaved: false,
    earningPotential: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
    description:
      "A worldwide snapshot of how inflation, rent, food prices, and utilities are reshaping everyday life in big cities.",
  },
  {
    _id: "n2",
    title: "Future of Work & AI — Global Snapshot",
    organizerName: "Amina Okafor",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1581092919535-7146c0c55f6f?w=1200&q=80",
    status: "ended",
    isSaved: true,
    earningPotential: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
    description:
      "From call centers to classrooms, AI is changing work everywhere. This maps where people see impact first.",
  },
  {
    _id: "n3",
    title: "Climate-Safe Cities Network",
    organizerName: "Kenji Nakamura",
    organizerAvatarUrl:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&q=80",
    coverImageUrl:
      "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=80",
    status: "ended",
    isSaved: false,
    earningPotential: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
    description:
      "Residents from coastal, river, and heat-struck cities share what it really feels like on the ground.",
  },
];

// --- Detail mock (what your [id] page reads) ---
const TRAILS: CampaignTrail[] = [
  {
    id: "t1",
    title: "Cost of Living & Jobs in Rhode Island",
    description:
      "From rent and groceries to gas and utilities, Rhode Islanders are feeling the squeeze...",
    coverImageUrl:
      "https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=1200&q=80",
    rewards: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
  },
  {
    id: "t2",
    title: "Education, Youth & Families",
    description:
      "Rhode Islanders future runs through its classrooms and campuses. Help Aaron understand where...",
    coverImageUrl:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80",
    rewards: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
  },
  {
    id: "t3",
    title: "Coastline, Climate & Infrastructure",
    description:
      "Storms, flooding, aging roads and bridges — Rhode Island’s infrastructure and shoreline are under pressure...",
    coverImageUrl:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80",
    rewards: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
  },
  {
    id: "t4",
    title: "Community Safety & Trust in Government",
    description:
      "Safety isn't just about crime statistics — it's about how secure and heard you feel where you live...",
    coverImageUrl:
      "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=1200&q=80",
    rewards: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
  },
];

export const DUMMY_DETAILS: CampaignDetailModel[] = [
  {
    ...DUMMY_PARTICIPATED[0],
    earningPotential: [
      { amount: 0.224, symbol: "XPOLL" },
      { amount: 0.224, symbol: "XSUI" },
      { amount: 0.224, symbol: "XRP" },
      { amount: 0.224, symbol: "XAPTOS" },
    ],
    descriptionLong:
      "Understand Rhode Islanders’ top concerns on jobs, cost of living, and safety. Collect quick voter feedback to guide Aaron’s next policy moves.\n\nAaron Guckian is running to make sure Rhode Island works better for the people who actually live here — not just the insiders. This XPOLL campaign is your space to rank priorities, react to real choices, and show Aaron what matters most in your town, your wallet, and your future.",
    stats: { usersContributed: 5950, xpollContributed: 112.34754 },
    social: { x: "#", instagram: "#", telegram: "#", email: "#", website: "#" },
    trails: TRAILS,
  },
];

export function findCampaignDetailById(id: string) {
  return DUMMY_DETAILS.find((c) => c._id === id) ?? null;
}
