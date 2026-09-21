import type {
  CampaignCardModel,
  CampaignDetailModel,
  TrailRowModel,
} from "@/types/campaigns";
import { ASSETS } from "@/utils/currency-assets/asset";
import aaronHero from "@/assets/campaigns/hero-camp.png";
import terranovaHero from "@/assets/campaigns/hero-camp2.jpg";
import aaronCampaignImage from "@/assets/campaigns/camp-aaron.png";
import aaronCampaignImage2 from "@/assets/campaigns/camp-aaron2.png";
import aaronCampaignImage3 from "@/assets/campaigns/camp-aaron3.png";
import terranovaCampaignImage from "@/assets/campaigns/camp-terranova.jpg";
import terranovaCampaignImage1 from "@/assets/campaigns/camp-terranova1.jpg";
import terranovaCampaignImage2 from "@/assets/campaigns/camp-terranova2.jpg";
import terranovaCampaignImage3 from "@/assets/campaigns/camp-terranova3.jpg";
import aaronCampaignImage1 from "@/assets/campaigns/camp-aaron1.png";
import aaronCampaignImage4 from "@/assets/campaigns/camp-aaron4.png";
import aaronCampaignImage5 from "@/assets/campaigns/camp-aaron5.png";
import authorAvatar from "@/assets/avatar.webp";

export const DUMMY_IDS = {
  aaronCampaign: "6500a1b2c3d4e5f610000001",
  terranovaCampaign: "6500a1b2c3d4e5f610000002",
  rhodeIslandTrial: "6500a1b2c3d4e5f610000003",
  terranovaTrial: "6500a1b2c3d4e5f610000004",
} as const;

export const dummyAuthor = {
  username: "Avestix",
  avatarUrl: authorAvatar,
};

const xplReward = (amount: number) => ({
  assetId: ASSETS.X_POLL,
  amount,
  computedReward: amount,
});

type DummyCampaignSeed = {
  id: string;
  carouselTitle: string;
  name: string;
  goal: string;
  description: string;
  owner: string;
  status: CampaignCardModel["status"];
  imageUrl: string;
  earningXpl: number;
  images?: [string | null, string | null, string | null];
  trails?: TrailRowModel[];
};

const aaronCampaignImages = [
  aaronHero,
  aaronCampaignImage,
  aaronCampaignImage1,
  aaronCampaignImage2,
  aaronCampaignImage3,
  aaronCampaignImage4,
  aaronCampaignImage5,
];

const terranovaCampaignImages = [
  terranovaHero,
  terranovaCampaignImage,
  terranovaCampaignImage1,
  terranovaCampaignImage2,
  terranovaCampaignImage3,
];

const dummyCampaigns: DummyCampaignSeed[] = [
  {
    id: DUMMY_IDS.aaronCampaign,
    carouselTitle: "Aaron for RI",
    name: "Rhode Island Governor 2026",
    goal: "Measure Rhode Island voter sentiment on the key issues shaping the 2026 gubernatorial election.",
    description:
      "A statewide sentiment campaign tracking voter views on affordability, taxes, government efficiency, housing, energy, jobs, education and healthcare ahead of the November 3, 2026 gubernatorial election.",
    owner: dummyAuthor.username,
    status: "live",
    imageUrl: aaronHero,
    earningXpl: 4200,
    images: [aaronCampaignImages[0], aaronCampaignImages[2], aaronCampaignImages[3]],
    trails: [],
  },
  {
    id: DUMMY_IDS.terranovaCampaign,
    carouselTitle: "XTERRANOVA — Farming the Future",
    name: "XTERRANOVA — Farming the Future",
    goal:
      "Regenerative agriculture pilots validated by the people who farm the land. Signal drives grant allocation.",
    description:
      "Regenerative agriculture pilots validated by the people who farm the land. Signal drives grant allocation.",
    owner: "Frontier",
    status: "paused",
    imageUrl: terranovaHero,
    earningXpl: 4500,
    images: [terranovaCampaignImages[0], terranovaCampaignImages[2], terranovaCampaignImages[4]],
  },
];

const getDummyCampaign = (id?: string | null) =>
  id ? dummyCampaigns.find((campaign) => campaign.id === id) ?? null : null;

export const dummyCampaignCards: CampaignCardModel[] = dummyCampaigns.map(
  (campaign) => ({
    _id: campaign.id,
    name: campaign.name,
    goal: campaign.goal,
    status: campaign.status,
    imageLinks: [campaign.imageUrl],
    username: campaign.owner,
    avatarUrl: dummyAuthor.avatarUrl,
    earningPotential: [{ symbol: "XPL", amount: campaign.earningXpl }],
  }),
);

export const dummyCarouselCampaigns = dummyCampaigns.map((campaign) => ({
  id: campaign.id,
  title: campaign.carouselTitle,
  imageUrl: campaign.imageUrl,
}));

export const rhodeIslandPollRows = [
  ["Cost of Living", "Lower taxes", "Lower housing costs", "Lower energy costs", "All of these"],
  ["Taxes & Fees", "Reduce them", "Keep them stable", "Increase selectively", "Not sure"],
  ["Government Spending", "Reduce spending", "Improve efficiency", "Maintain current levels", "Increase spending"],
  ["Government Accountability", "Very important", "Somewhat important", "Not very important", "Not sure"],
  ["Government Efficiency", "Modernize systems", "Reduce bureaucracy", "Improve processes", "All of these"],
  ["Housing", "Build more housing", "Streamline permitting", "Expand affordable housing", "All of these"],
  ["Energy Costs", "Lower costs", "Improve reliability", "Expand cleaner energy", "Balance all three"],
  ["Energy Policy", "Focus on affordability", "Focus on clean energy", "Balance both", "Not sure"],
  ["Jobs & Economy", "Lower business costs", "Workforce development", "Reduce regulation", "Infrastructure investment"],
  ["Education", "K-12 schools", "Career training", "Teacher support", "Higher education"],
  ["Healthcare", "Lower costs", "Improve access", "More healthcare workers", "Hospital stability"],
  ["Governor Priorities", "Affordability", "Government reform", "Housing", "Jobs & economy"],
];

const aaronPollImages = aaronCampaignImages.slice(1);
const terranovaPollImages = terranovaCampaignImages.slice(1);

export const rhodeIslandTrailRows: Array<TrailRowModel & { polls?: string[][] }> = [
  {
    id: DUMMY_IDS.rhodeIslandTrial,
    title: "Rhode Island Governor — Issues & Priorities",
    description:
      "Tracks how Rhode Island voters view the major policy issues and priorities being discussed in the 2026 governor's race.",
    coverImageUrl: aaronHero,
    coverMediaType: "image",
    rewards: [xplReward(150)],
    polls: rhodeIslandPollRows,
  },
];

export const xTerranovaPollRows = [
  ["Which packaging material feels most sustainable?", "Recycled paperboard", "Molded fiber", "Glass", "Reusable plastic"],
  ["Which package is easiest to open?", "Tear strip", "Pull tab", "Resealable pouch", "Twist lid"],
  ["Which label design is easiest to understand?", "Large product name", "Simple icon system", "Ingredient-first", "Minimal text"],
  ["What matters most when choosing shelf packaging?", "Lower waste", "Product protection", "Easy storage", "Low price"],
  ["Which package size fits your usual purchase?", "Single serving", "Small multi-pack", "Family size", "Bulk refill"],
  ["How important is resealability?", "Essential", "Very useful", "Nice to have", "Not important"],
  ["Which shelf detail catches your eye first?", "Color", "Shape", "Texture", "Product window"],
  ["Would you pay more for packaging with less waste?", "Definitely", "Probably", "Only a little", "No"],
  ["What should happen to the package after use?", "Recycle it", "Compost it", "Return it", "Reuse it at home"],
  ["Which change would make this package feel ready for launch?", "Clearer instructions", "Stronger materials", "Better shelf visibility", "Lower price"],
] as const;

export const xTerranovaTrailRows: Array<TrailRowModel & { polls?: string[][] }> = [
  {
    id: DUMMY_IDS.terranovaTrial,
    title: "Packaging that survives the shelf",
    description:
      "Ten packaging concepts tested for durability, clarity, sustainability and shelf appeal.",
    coverImageUrl: terranovaHero,
    coverMediaType: "image",
    rewards: [xplReward(150)],
    polls: xTerranovaPollRows.map((poll) => [...poll]),
  },
];

export function getDummyCampaignDetail(id?: string | null) {
  const campaign = getDummyCampaign(id);
  if (!campaign) return null;

  return {
    _id: campaign.id,
    organizerName: campaign.owner,
    title: campaign.name,
    subtitle: campaign.goal,
    description: campaign.description,
    images: campaign.images ?? [campaign.imageUrl, campaign.imageUrl, campaign.imageUrl],
    earningPotential: [],
    usersContributed: 0,
    coinsContributed: 0,
    trails:
      campaign.id === DUMMY_IDS.aaronCampaign
        ? rhodeIslandTrailRows
        : campaign.id === DUMMY_IDS.terranovaCampaign
          ? xTerranovaTrailRows
        : (campaign.trails ?? []),
  } satisfies CampaignDetailModel;
}

export function isDummyCampaignId(id?: string | null) {
  return Boolean(getDummyCampaign(id));
}

export function buildDummyTrialFixture(id?: string | null) {
  const trail =
    id === DUMMY_IDS.rhodeIslandTrial
      ? rhodeIslandTrailRows[0]
      : id === DUMMY_IDS.terranovaTrial
        ? xTerranovaTrailRows[0]
        : null;
  if (!trail) return null;

  const pollRows = trail.polls ?? [];

  const trial = {
    _id: trail.id,
    title: trail.title,
    description: trail.description,
    resourceAssets: [{ type: "image", value: trail.coverImageUrl ?? aaronHero }],
    rewards: [
      {
        assetId: ASSETS.X_POLL,
        amount: 150,
        computedReward: "150",
      },
    ],
    belongsToCampaignId:
      id === DUMMY_IDS.terranovaTrial
        ? DUMMY_IDS.terranovaCampaign
        : DUMMY_IDS.aaronCampaign,
    externalAuthor: {
      username: dummyAuthor.username,
      avatar: { imageUrl: dummyAuthor.avatarUrl },
    },
  };

  return {
    accessible: true,
    alreadyCasted: false,
    seenAt: null,
    campaign: {
      _id:
        id === DUMMY_IDS.terranovaTrial
          ? DUMMY_IDS.terranovaCampaign
          : DUMMY_IDS.aaronCampaign,
      name: getDummyCampaignDetail(
        id === DUMMY_IDS.terranovaTrial
          ? DUMMY_IDS.terranovaCampaign
          : DUMMY_IDS.aaronCampaign,
      )?.title,
      nextTrial: null,
    },
    trial,
    polls: pollRows.map(([title, ...options], index) => ({
      _id: `6500a1b2c3d4e5f6100000${String(index + 10).padStart(2, "0")}`,
      title,
      description:
        id === DUMMY_IDS.terranovaTrial
          ? `Share your view on ${title.toLowerCase()}`
          : `Share your view on ${title.toLowerCase()} in Rhode Island's 2026 governor's race.`,
      resourceAssets: [
        {
          type: "image",
          value:
            id === DUMMY_IDS.terranovaTrial
              ? terranovaPollImages[index % terranovaPollImages.length]
              : aaronPollImages[index % aaronPollImages.length],
        },
      ],
      totalVotes: 0,
      options: options.map((text, optionIndex) => ({
        _id: `6500a1b2c3d4e5f61${String(index).padStart(2, "0")}${String(optionIndex).padStart(4, "0")}`,
        text,
        numVotes: 0,
        percentage: 0,
      })),
    })),
  };
}

export function isDummyTrialId(id?: string | null) {
  return id === DUMMY_IDS.rhodeIslandTrial || id === DUMMY_IDS.terranovaTrial;
}
