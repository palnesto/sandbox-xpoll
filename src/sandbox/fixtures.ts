/**
 * Static fixtures for the sandbox prototype.
 *
 * Everything the UI displays comes from here. Shapes intentionally mirror the
 * real API responses so no page or component had to be rewritten.
 */

import { ASSETS } from "@/utils/currency-assets/asset";

import banner from "@/assets/banner.webp";
import banner1 from "@/assets/banner1.webp";
import banner2 from "@/assets/banner2.webp";
import banner3 from "@/assets/banner3.webp";
import banner4 from "@/assets/banner4.webp";
import banner5 from "@/assets/banner5.webp";
import banner6 from "@/assets/banner6.webp";
import banner8 from "@/assets/banner8.webp";
import camp from "@/assets/camp.webp";
import campaign from "@/assets/campaign.webp";
import avatarImg from "@/assets/avatar.webp";

/* ------------------------------------------------------------------ ids --- */
/* Mongo-style 24-hex ids, because several routes validate that shape. */

export const IDS = {
  user: "6500a1b2c3d4e5f600000001",
  campaigns: [
    "6500a1b2c3d4e5f610000001",
    "6500a1b2c3d4e5f610000002",
    "6500a1b2c3d4e5f610000003",
    "6500a1b2c3d4e5f610000004",
    "6500a1b2c3d4e5f610000005",
    "6500a1b2c3d4e5f610000006",
    "6500a1b2c3d4e5f610000007",
    "6500a1b2c3d4e5f610000008",
  ],
  trials: [
    "6500a1b2c3d4e5f620000001",
    "6500a1b2c3d4e5f620000002",
    "6500a1b2c3d4e5f620000003",
    "6500a1b2c3d4e5f620000004",
    "6500a1b2c3d4e5f620000005",
    "6500a1b2c3d4e5f620000006",
  ],
  polls: [
    "6500a1b2c3d4e5f630000001",
    "6500a1b2c3d4e5f630000002",
    "6500a1b2c3d4e5f630000003",
    "6500a1b2c3d4e5f630000004",
    "6500a1b2c3d4e5f630000005",
    "6500a1b2c3d4e5f630000006",
    "6500a1b2c3d4e5f630000007",
    "6500a1b2c3d4e5f630000008",
  ],
  blogs: [
    "6500a1b2c3d4e5f640000001",
    "6500a1b2c3d4e5f640000002",
    "6500a1b2c3d4e5f640000003",
    "6500a1b2c3d4e5f640000004",
    "6500a1b2c3d4e5f640000005",
    "6500a1b2c3d4e5f640000006",
  ],
  events: [
    "6500a1b2c3d4e5f650000001",
    "6500a1b2c3d4e5f650000002",
    "6500a1b2c3d4e5f650000003",
    "6500a1b2c3d4e5f650000004",
  ],
  petitions: [
    "6500a1b2c3d4e5f660000001",
    "6500a1b2c3d4e5f660000002",
    "6500a1b2c3d4e5f660000003",
  ],
} as const;

/* ------------------------------------------------------------- helpers --- */

const DAY = 86_400_000;

/** Fixed "now" offsets keep the demo stable without freezing countdowns. */
export const daysFromNow = (n: number) =>
  new Date(Date.now() + n * DAY).toISOString();
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const CAMPAIGN_IMAGES = [
  banner4,
  banner5,
  banner6,
  banner8,
  banner1,
  banner2,
  banner3,
  banner,
];

/* ---------------------------------------------------------------- user --- */

/** Balances are in minor units; decimals per asset: xPoll 0, xSUI 9, xAptos 8, xXRP 6, xStrain 6. */
export function makeUser(username: string) {
  return {
    _id: IDS.user,
    email: `${username.toLowerCase()}@xpoll.io`,
    isEmailVerified: true,
    createdAt: daysAgo(214),
    profile: {
      _id: "6500a1b2c3d4e5f600000002",
      level: 7,
      civicScore: 742,
      totalVotes: 1284,
      totalPollsCreated: 18,
      totalCampaigns: 3,
      meta: {
        country: { _id: "US", name: "United States" },
        state: { _id: "US-CT", name: "Connecticut", countryId: "US" },
        city: { _id: "US-CT-HFD", name: "Hartford" },
        dob: "1992-04-18T00:00:00.000Z",
        gender: "prefer-not-to-say",
      },
      apps: {
        xpoll: {
          username,
          gender: "prefer-not-to-say",
          dob: "1992-04-18T00:00:00.000Z",
          avatar: {
            _id: "6500a1b2c3d4e5f600000003",
            imageUrl: avatarImg,
            country: "US",
          },
          // DefaultLayout gates /home behind these onboarding flags. The demo
          // account is fully onboarded so the walkthrough starts at home.
          meta: {
            isDisclaimerAccepted: true,
            isPreferenceSubmitted: true,
            isCertificateGiven: true,
          },
        },
      },
    },
    soulbound: {
      isActive: true,
      status: "active",
      activatedAt: daysAgo(96),
      renewsAt: daysFromNow(24),
    },
    assetMappings: {
      [ASSETS.X_POLL]: { assetType: ASSETS.X_POLL, amount: 48_250 },
      [ASSETS.X_MYST]: { assetType: ASSETS.X_MYST, amount: 1_250_000_000_000 },
      [ASSETS.X_OCTA]: { assetType: ASSETS.X_OCTA, amount: 86_000_000_000 },
      [ASSETS.X_DROP]: { assetType: ASSETS.X_DROP, amount: 3_400_000_000 },
      [ASSETS.X_HIGH]: { assetType: ASSETS.X_HIGH, amount: 92_500_000_000 },
    },
  };
}

/* ----------------------------------------------------------- campaigns --- */

type CampaignSeed = {
  name: string;
  description: string;
  owner: string;
  mine: boolean;
  tier: "basic" | "paid";
};

const CAMPAIGN_SEEDS: CampaignSeed[] = [
  {
    name: "XSHELLY — Policy with Proof",
    description:
      "Build policy from verified community signal instead of noise. Weekly trails surface what constituents actually prioritise.",
    owner: "Avestix",
    mine: true,
    tier: "paid",
  },
  {
    name: "XAMY — Native Signal Coin",
    description:
      "A behavioural-research campaign measuring how framing changes intent across a 12-week cycle.",
    owner: "Avestix",
    mine: true,
    tier: "paid",
  },
  {
    name: "XTERRANOVA — Farming the Future",
    description:
      "Regenerative agriculture pilots validated by the people who farm the land. Signal drives grant allocation.",
    owner: "Frontier",
    mine: true,
    tier: "basic",
  },
  {
    name: "XBUBBLE — University Coin",
    description:
      "Campus-scale demand testing for student services. Every vote is tied to a verified enrolment cohort.",
    owner: "Meridian Labs",
    mine: false,
    tier: "paid",
  },
  {
    name: "XMETA4 — Archetypes & Deep Tech",
    description:
      "Symbolic framing research for the agentic age. Which narratives move technical audiences to act?",
    owner: "Northwind Collective",
    mine: false,
    tier: "paid",
  },
  {
    name: "XMARK — Unity & Shared Purpose",
    description:
      "A coalition campaign measuring cooperative intent across eleven partner organisations.",
    owner: "Cooperative Union",
    mine: false,
    tier: "basic",
  },
  {
    name: "Harbourline Transit Renewal",
    description:
      "Should the harbour corridor prioritise light rail or dedicated bus? Residents decide the study scope.",
    owner: "Harbour City Forum",
    mine: false,
    tier: "paid",
  },
  {
    name: "Studio Kettle — Product Discovery",
    description:
      "Pre-launch validation for a small-batch hardware line. Pricing, packaging and positioning tested in public.",
    owner: "Studio Kettle",
    mine: false,
    tier: "basic",
  },
];

export const CAMPAIGNS = CAMPAIGN_SEEDS.map((seed, i) => ({
  _id: IDS.campaigns[i],
  name: seed.name,
  title: seed.name,
  description: seed.description,
  status: "live",
  tier: seed.tier,
  imageLinks: [CAMPAIGN_IMAGES[i]],
  resourceAssets: [{ type: "image", value: CAMPAIGN_IMAGES[i] }],
  ownership: { type: seed.mine ? "main-owner" : "viewer" },
  isMine: seed.mine,
  externalAuthor: { _id: `author-${i}`, username: seed.owner },
  ownerUsername: seed.owner,
  createdAt: daysAgo(60 - i * 5),
  startsAt: daysAgo(50 - i * 5),
  endsAt: daysFromNow(40 + i * 3),
  petitionEnabled: i % 2 === 0,
  totalViews: 4820 - i * 310,
  totalVotes: 1960 - i * 140,
  totalParticipants: 880 - i * 60,
  donationTotal: 12_400 - i * 900,
  isBookmarked: i === 0 || i === 4,
  counts: {
    trials: 3,
    polls: 5,
    blogs: 2,
    events: 2,
    petitions: 1,
  },
}));

export const MY_CAMPAIGNS = CAMPAIGNS.filter((c) => c.isMine);

/* -------------------------------------------------------------- trials --- */

const TRIAL_SEEDS = [
  {
    title: "Christmas Signal Drop — Day 12",
    description:
      "Show up daily, earn XSTRAIN, and help calibrate the seasonal demand index.",
    owner: "Avestix",
  },
  {
    title: "Which transit option earns your commute?",
    description:
      "Four corridor designs, one budget. Rank them and tell us what you would actually ride.",
    owner: "Harbour City Forum",
  },
  {
    title: "Packaging that survives the shelf",
    description:
      "Six label treatments tested for recall and trust. Two minutes, five questions.",
    owner: "Studio Kettle",
  },
  {
    title: "Campus services: what is missing?",
    description:
      "Students rank twelve proposed services. Results set the pilot budget for next term.",
    owner: "Meridian Labs",
  },
  {
    title: "Narrative framing A/B — deep tech",
    description:
      "Does 'agentic' or 'autonomous' land better with technical buyers? Help settle it.",
    owner: "Northwind Collective",
  },
  {
    title: "Regenerative plots — grant priorities",
    description:
      "Growers weigh soil, water and seed funding priorities for the next allocation round.",
    owner: "Frontier",
  },
];

export const TRIALS = TRIAL_SEEDS.map((seed, i) => ({
  _id: IDS.trials[i],
  title: seed.title,
  description: seed.description,
  resourceAssets: [{ type: "image", value: CAMPAIGN_IMAGES[(i + 2) % CAMPAIGN_IMAGES.length] }],
  rewards: [
    {
      assetId: ASSETS.X_POLL,
      amount: 120 + i * 15,
      rewardType: "max",
      rewardAmountCap: 40_000,
      currentDistribution: 12_400 + i * 800,
      computedReward: String(120 + i * 15),
    },
  ],
  expireRewardAt: daysFromNow(3 + i * 2),
  createdAt: daysAgo(20 - i * 2),
  belongsToCampaignId: IDS.campaigns[i % IDS.campaigns.length],
  externalAuthor: i % 2 === 0 ? { _id: `author-${i}`, username: seed.owner } : null,
  ownerUsername: seed.owner,
  totalViews: 3120 - i * 210,
  totalVotes: 1180 - i * 90,
  pollCount: 5,
}));

/* --------------------------------------------------------------- polls --- */

const POLL_SEEDS = [
  "Which corridor design should the study prioritise?",
  "How often would you use a late-night service?",
  "Which label treatment feels most trustworthy?",
  "What price feels fair for a small-batch kettle?",
  "Which campus service would you use weekly?",
  "Does 'agentic' clarify or confuse the pitch?",
  "Where should grant funding land first?",
  "Would you recommend this pilot to a neighbour?",
];

export const POLLS = POLL_SEEDS.map((title, i) => {
  const options = [
    { _id: `${IDS.polls[i]}-a`, title: "Strongly prefer", votes: 420 - i * 20 },
    { _id: `${IDS.polls[i]}-b`, title: "Somewhat prefer", votes: 310 - i * 15 },
    { _id: `${IDS.polls[i]}-c`, title: "Neutral", votes: 180 - i * 10 },
    { _id: `${IDS.polls[i]}-d`, title: "Would not choose", votes: 90 - i * 5 },
  ];
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  return {
    _id: IDS.polls[i],
    title,
    description:
      "Static demo poll. Votes update on screen for the walkthrough but are not stored anywhere.",
    type: "single-choice",
    options,
    answers: options,
    resourceAssets: [
      { type: "image", value: CAMPAIGN_IMAGES[(i + 4) % CAMPAIGN_IMAGES.length] },
    ],
    rewards: [
      {
        assetId: ASSETS.X_POLL,
        amount: 60 + i * 10,
        rewardType: "flat",
        rewardAmountCap: 20_000,
        currentDistribution: 6_200 + i * 400,
        computedReward: String(60 + i * 10),
      },
    ],
    expireRewardAt: daysFromNow(5 + i),
    createdAt: daysAgo(18 - i),
    archivedAt: null,
    belongsToTrialId: IDS.trials[i % IDS.trials.length],
    belongsToCampaignId: IDS.campaigns[i % IDS.campaigns.length],
    totalViews: 2480 - i * 160,
    totalVotes,
    hasVoted: false,
    isSeen: false,
  };
});

export const MY_POLLS = POLLS.slice(0, 5);

/* --------------------------------------------------------------- blogs --- */

const BLOG_SEEDS = [
  {
    title: "What 1,284 votes told us about transit trust",
    excerpt:
      "Residents did not split along the lines we expected. Here is where the real consensus sat.",
  },
  {
    title: "Signal beats survey: a field note",
    excerpt:
      "Why repeated small interactions outperform one long questionnaire for demand discovery.",
  },
  {
    title: "Pricing a small-batch product in public",
    excerpt:
      "We published the pricing question and let 900 people answer. The band was tighter than forecast.",
  },
  {
    title: "Designing rewards that do not distort",
    excerpt:
      "Reward caps, flat rates and the quiet maths that keeps participation honest.",
  },
  {
    title: "Coalition campaigns: eleven partners, one signal",
    excerpt:
      "Coordinating shared measurement without flattening what makes each partner distinct.",
  },
  {
    title: "The archetype experiment, six weeks in",
    excerpt:
      "Symbolic framing moved technical audiences more than feature lists did. By a lot.",
  },
];

export const BLOGS = BLOG_SEEDS.map((seed, i) => ({
  _id: IDS.blogs[i],
  title: seed.title,
  slug: `demo-post-${i + 1}`,
  excerpt: seed.excerpt,
  summary: seed.excerpt,
  description: seed.excerpt,
  content: `<h2>${seed.title}</h2><p>${seed.excerpt}</p><p>This is placeholder copy for the sandbox prototype. In the live product this body is authored in the admin app and delivered through the content API.</p><ul><li>Static demo content</li><li>No backend involved</li><li>Layout and typography are production-accurate</li></ul>`,
  body: seed.excerpt,
  imageUrl: CAMPAIGN_IMAGES[i % CAMPAIGN_IMAGES.length],
  coverImage: CAMPAIGN_IMAGES[i % CAMPAIGN_IMAGES.length],
  resourceAssets: [
    { type: "image", value: CAMPAIGN_IMAGES[i % CAMPAIGN_IMAGES.length] },
  ],
  status: "live",
  readTimeMinutes: 4 + (i % 3),
  publishedAt: daysAgo(4 + i * 3),
  createdAt: daysAgo(5 + i * 3),
  author: { username: i % 2 === 0 ? "Avestix" : "Northwind Collective" },
  industry: { _id: `ind-${i}`, name: ["Civic", "Research", "Retail", "Education", "Policy", "Deep Tech"][i] },
  totalViews: 1840 - i * 120,
  belongsToCampaignId: IDS.campaigns[i % IDS.campaigns.length],
}));

/* -------------------------------------------------------------- events --- */

const EVENT_SEEDS = [
  {
    title: "Harbour corridor open house",
    location: "Harbour City Hall, Room 2",
    owner: "Harbour City Forum",
  },
  {
    title: "Studio Kettle launch preview",
    location: "The Maker Yard, Unit 7",
    owner: "Studio Kettle",
  },
  {
    title: "Campus services town hall",
    location: "Meridian Union Building",
    owner: "Meridian Labs",
  },
  {
    title: "Growers' allocation roundtable",
    location: "Frontier Field Station",
    owner: "Frontier",
  },
];

export const EVENTS = EVENT_SEEDS.map((seed, i) => ({
  _id: IDS.events[i],
  title: seed.title,
  name: seed.title,
  description:
    "Demo event for the prototype walkthrough. Ticketing UI is present but nothing is charged or stored.",
  status: "published",
  location: seed.location,
  venue: seed.location,
  startsAt: daysFromNow(6 + i * 5),
  endsAt: daysFromNow(6 + i * 5),
  createdAt: daysAgo(12 - i),
  imageUrl: CAMPAIGN_IMAGES[(i + 1) % CAMPAIGN_IMAGES.length],
  resourceAssets: [
    { type: "image", value: CAMPAIGN_IMAGES[(i + 1) % CAMPAIGN_IMAGES.length] },
  ],
  belongsToCampaignId: IDS.campaigns[i % IDS.campaigns.length],
  ownerUsername: seed.owner,
  externalAuthor: { _id: `author-e${i}`, username: seed.owner },
  capacity: 200,
  attendeeCount: 128 - i * 18,
  ticketPrice: { currency: "USD", amountInMinor: (i + 1) * 1500 },
  isFree: i === 0,
}));

/* ----------------------------------------------------------- petitions --- */

export const PETITIONS = [
  {
    _id: IDS.petitions[0],
    title: "Protect the harbour greenway",
    description:
      "Ask the council to preserve the greenway corridor through the transit redesign.",
    goal: 5000,
    signatureCount: 3420,
    totalVotes: 3420,
    createdAt: daysAgo(22),
    endsAt: daysFromNow(30),
    belongsToCampaignId: IDS.campaigns[0],
    hasSigned: false,
  },
  {
    _id: IDS.petitions[1],
    title: "Extend late-night campus transport",
    description: "Students petition for a extended service window during exam periods.",
    goal: 2500,
    signatureCount: 1980,
    totalVotes: 1980,
    createdAt: daysAgo(15),
    endsAt: daysFromNow(21),
    belongsToCampaignId: IDS.campaigns[3],
    hasSigned: false,
  },
  {
    _id: IDS.petitions[2],
    title: "Publish the allocation criteria",
    description: "Growers request that grant scoring criteria be published before review.",
    goal: 1200,
    signatureCount: 1144,
    totalVotes: 1144,
    createdAt: daysAgo(9),
    endsAt: daysFromNow(14),
    belongsToCampaignId: IDS.campaigns[2],
    hasSigned: true,
  },
];

/* ------------------------------------------------------------- ledgers --- */

/**
 * Note: "signup-bonus" is deliberately absent. Its presence puts the UI into
 * first-time-signup mode, which hides every coin except XPOLL and pops the
 * bonus modal. The demo account is an established user.
 */
const LEDGER_ACTIONS = [
  "poll-vote-reward",
  "trial-vote-reward",
  "referral-reward",
  "exchange-debit",
  "campaign-donation",
  "petition-sign-reward",
  "level-up-bonus",
];

export const LEDGERS = Array.from({ length: 24 }, (_, i) => {
  const action = LEDGER_ACTIONS[i % LEDGER_ACTIONS.length];
  const isDebit = action === "exchange-debit" || action === "campaign-donation";
  return {
    _id: `6500a1b2c3d4e5f67000${String(i).padStart(4, "0")}`,
    action,
    assetId: ASSETS.X_POLL,
    assetType: ASSETS.X_POLL,
    amount: (isDebit ? -1 : 1) * (150 + i * 35),
    direction: isDebit ? "debit" : "credit",
    status: "settled",
    createdAt: daysAgo(i * 2 + 1),
    note: action.replace(/-/g, " "),
  };
});

/* -------------------------------------------------------- transactions --- */

const CHAIN_LABELS = ["sui", "strain", "xrp", "aptos"] as const;

export const TRANSACTIONS = CHAIN_LABELS.flatMap((chain, ci) =>
  Array.from({ length: 6 }, (_, i) => ({
    _id: `6500a1b2c3d4e5f68${ci}0000${String(i).padStart(3, "0")}`,
    chain,
    status: i === 0 ? "pending" : i === 1 ? "processing" : "completed",
    assetId: ASSETS.X_POLL,
    fromAmount: 1_000 + i * 250,
    toAmount: 980 + i * 240,
    feeInXpoll: 100,
    txHash: `0x${(ci + 1).toString(16).repeat(2)}${"a3f9c1d2e4b6".repeat(4)}${i}`,
    walletAddress: `0x${"7e2c".repeat(8)}${ci}${i}`,
    createdAt: daysAgo(i * 3 + ci),
    settledAt: i > 1 ? daysAgo(i * 3 + ci - 1) : null,
  })),
);

/* ------------------------------------------------------------ donations --- */

export const DONATIONS = Array.from({ length: 8 }, (_, i) => ({
  _id: `6500a1b2c3d4e5f69000${String(i).padStart(4, "0")}`,
  campaignId: IDS.campaigns[i % IDS.campaigns.length],
  campaignName: CAMPAIGNS[i % CAMPAIGNS.length].name,
  donorUsername: ["Avestix", "Frontier", "M. Okafor", "R. Lindqvist"][i % 4],
  amount: { currency: "USD", amountInMinor: (i + 2) * 2500 },
  amountInXpoll: (i + 2) * 250,
  status: "settled",
  createdAt: daysAgo(i * 4 + 2),
  message: i % 3 === 0 ? "Keep the corridor study independent." : "",
}));

/* --------------------------------------------------------------- plans --- */

export const CAMPAIGN_PLANS = [
  {
    _id: "plan-basic",
    name: "Basic",
    tier: "basic",
    description: "One live campaign, community trails and polls.",
    features: [
      "1 live campaign",
      "Unlimited polls",
      "3 trails per month",
      "Community analytics",
    ],
    buyConfig: {
      fiat: [{ currency: "USD", amountInMinor: 0, enabled: true }],
      crypto: [],
    },
  },
  {
    _id: "plan-growth",
    name: "Growth",
    tier: "paid",
    description: "For campaigns that need reach, blogs and event ticketing.",
    features: [
      "5 live campaigns",
      "Blogs + events + petitions",
      "QR distribution",
      "Priority signal reports",
    ],
    buyConfig: {
      fiat: [{ currency: "USD", amountInMinor: 4900, enabled: true }],
      crypto: [
        { tokenKey: "usdc", amountInMinor: 4_900_000, decimals: 6, enabled: true },
      ],
    },
  },
  {
    _id: "plan-scale",
    name: "Scale",
    tier: "paid",
    description: "Full platform with INKD agents and co-owner workflows.",
    features: [
      "Unlimited campaigns",
      "INKD agent automation",
      "Co-owner permissions",
      "Dedicated support",
    ],
    buyConfig: {
      fiat: [{ currency: "USD", amountInMinor: 14900, enabled: true }],
      crypto: [
        { tokenKey: "usdc", amountInMinor: 14_900_000, decimals: 6, enabled: true },
      ],
    },
  },
];

/* ----------------------------------------------------------- INKD data --- */

export const INKD_AGENTS = [
  {
    _id: "6500a1b2c3d4e5f6a0000001",
    name: "Trail Composer",
    role: "trail-generator",
    status: "active",
    description:
      "Drafts trail and poll sets from a campaign brief, then queues them for review.",
    createdAt: daysAgo(30),
    lastRunAt: daysAgo(1),
    tasksCompleted: 42,
  },
  {
    _id: "6500a1b2c3d4e5f6a0000002",
    name: "Signal Digest",
    role: "insights",
    status: "paused",
    description: "Summarises weekly voting patterns into a shareable digest.",
    createdAt: daysAgo(24),
    lastRunAt: daysAgo(6),
    tasksCompleted: 17,
  },
];

/** What the fake "XPoll AI" generator hands back. Prefilled, never computed. */
export const AI_PREFILLED_PROMPT =
  "Create a 3-trail sequence for this campaign that tests pricing sensitivity, feature priority, and messaging recall. Include 5 polls per trail with balanced options.";

export const AI_GENERATED_TRIALS = [
  {
    _id: "6500a1b2c3d4e5f6b0000001",
    title: "Pricing sensitivity — anchor test",
    description:
      "Three price anchors presented in randomised order to measure willingness to pay.",
    pollCount: 5,
    estimatedReward: 150,
  },
  {
    _id: "6500a1b2c3d4e5f6b0000002",
    title: "Feature priority — forced ranking",
    description:
      "Participants rank six candidate features under a fixed budget constraint.",
    pollCount: 5,
    estimatedReward: 150,
  },
  {
    _id: "6500a1b2c3d4e5f6b0000003",
    title: "Messaging recall — 24h follow-up",
    description:
      "Two framings tested for unaided recall, with a follow-up prompt the next day.",
    pollCount: 5,
    estimatedReward: 180,
  },
];

export const AI_GENERATED_POLLS = [
  "At $29, how likely are you to buy?",
  "At $49, how likely are you to buy?",
  "Which feature would you give up first?",
  "Which phrase describes the product best?",
  "Would you recommend this to a colleague?",
];

/* ------------------------------------------------------------ industries --- */

export const INDUSTRIES = [
  { _id: "ind-civic", name: "Civic & Policy", blogCount: 24 },
  { _id: "ind-research", name: "Research", blogCount: 18 },
  { _id: "ind-retail", name: "Retail & Consumer", blogCount: 15 },
  { _id: "ind-education", name: "Education", blogCount: 12 },
  { _id: "ind-deeptech", name: "Deep Tech", blogCount: 9 },
  { _id: "ind-agri", name: "Agriculture", blogCount: 7 },
];

/* ------------------------------------------------------------ locations --- */

export const COUNTRIES = [
  { _id: "US", name: "United States" },
  { _id: "GB", name: "United Kingdom" },
  { _id: "IN", name: "India" },
  { _id: "DE", name: "Germany" },
  { _id: "SG", name: "Singapore" },
];

export const STATES = [
  { _id: "US-CT", name: "Connecticut", countryId: "US" },
  { _id: "US-NY", name: "New York", countryId: "US" },
  { _id: "GB-LDN", name: "London", countryId: "GB" },
  { _id: "IN-MH", name: "Maharashtra", countryId: "IN" },
];

export const CITIES = [
  { _id: "US-CT-HFD", name: "Hartford", stateId: "US-CT" },
  { _id: "US-NY-NYC", name: "New York City", stateId: "US-NY" },
  { _id: "GB-LDN-LDN", name: "London", stateId: "GB-LDN" },
  { _id: "IN-MH-MUM", name: "Mumbai", stateId: "IN-MH" },
];

/* ------------------------------------------------------------- avatars --- */

export const AVATARS = Array.from({ length: 6 }, (_, i) => ({
  _id: `avatar-${i + 1}`,
  imageUrl: avatarImg,
  name: `Avatar ${i + 1}`,
}));

/* ------------------------------------------------------ bookmarks / misc --- */

export const BOOKMARKS = CAMPAIGNS.filter((c) => c.isBookmarked);

export const ASSET_COINS = [
  { assetId: ASSETS.X_POLL, name: "XPOLL", priceInUsd: 0.042 },
  { assetId: ASSETS.X_MYST, name: "XSUI", priceInUsd: 1.18 },
  { assetId: ASSETS.X_OCTA, name: "XAPTOS", priceInUsd: 6.42 },
  { assetId: ASSETS.X_DROP, name: "XXRP", priceInUsd: 0.58 },
  { assetId: ASSETS.X_HIGH, name: "XSTRAIN", priceInUsd: 0.0091 },
];

export { camp, campaign };
