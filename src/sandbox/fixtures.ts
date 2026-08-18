/**
 * Static fixtures for the sandbox prototype.
 *
 * Everything the UI displays comes from here. Shapes intentionally mirror the
 * real API responses so no page or component had to be rewritten.
 */

import { ASSETS } from "@/utils/currency-assets/asset";
import { LEG_TYPES } from "@/utils/currency-assets/leg-type";

const LEG_REWARD = LEG_TYPES.REWARD;

import banner from "@/assets/banner.webp";
import banner1 from "@/assets/banner1.webp";
import banner2 from "@/assets/banner2.webp";
import banner3 from "@/assets/banner3.webp";
import banner4 from "@/assets/banner4.webp";
import banner5 from "@/assets/banner5.webp";
import banner6 from "@/assets/banner6.webp";
import banner8 from "@/assets/banner8.webp";
import avatarImg from "@/assets/avatar.webp";

// Editorial imagery reused from the INKD feed so blog covers look native there.
import inkdFirst from "@/assets/inkd/first.webp";
import inkdSecond from "@/assets/inkd/sec.webp";
import inkdThird from "@/assets/inkd/third.webp";
import inkdFourth from "@/assets/inkd/fourth.webp";
import inkdFifth from "@/assets/inkd/fifth.webp";
import inkdSix from "@/assets/inkd/six.webp";

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
    // Several campaign-tab reads (add-info, co-owners, events, blogs, petitions)
    // key off a lowercase `id`, distinct from `_id`. Same value, different casing.
    id: IDS.user,
    externalAccountId: IDS.user,
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
  /** Draft/paused unlock the edit forms; live/ended/archived exercise lifecycle actions. */
  status: "draft" | "live" | "paused" | "ended" | "archived";
  /** Only meaningful when `mine` — drives the Subscription Management tab. */
  billingMode: "one_time" | "subscription" | null;
};

const CAMPAIGN_SEEDS: CampaignSeed[] = [
  {
    // Live + subscription billing: demo Pause/End/Archive/Delete and the
    // Subscription Management tab against a fully "in production" campaign.
    name: "XSHELLY — Policy with Proof",
    description:
      "Build policy from verified community signal instead of noise. Weekly trails surface what constituents actually prioritise.",
    owner: "Avestix",
    mine: true,
    tier: "paid",
    status: "live",
    billingMode: "subscription",
  },
  {
    // Draft: the one campaign where Add Info / Trails / Petitions / Blogs are
    // all still editable and the LAUNCH button is reachable.
    name: "XAMY — Native Signal Coin",
    description:
      "A behavioural-research campaign measuring how framing changes intent across a 12-week cycle.",
    owner: "Avestix",
    mine: true,
    tier: "paid",
    status: "draft",
    billingMode: "one_time",
  },
  {
    /**
     * Deliberately "paid": a user may only hold one Basic campaign at a time, so
     * owning a Basic one here would block the free create-campaign path and
     * force every walkthrough through checkout. Paused so RESUME is visible.
     */
    name: "XTERRANOVA — Farming the Future",
    description:
      "Regenerative agriculture pilots validated by the people who farm the land. Signal drives grant allocation.",
    owner: "Frontier",
    mine: true,
    tier: "paid",
    status: "paused",
    billingMode: "one_time",
  },
  {
    name: "XBUBBLE — University Coin",
    description:
      "Campus-scale demand testing for student services. Every vote is tied to a verified enrolment cohort.",
    owner: "Meridian Labs",
    mine: false,
    tier: "paid",
    status: "live",
    billingMode: "one_time",
  },
  {
    name: "XMETA4 — Archetypes & Deep Tech",
    description:
      "Symbolic framing research for the agentic age. Which narratives move technical audiences to act?",
    owner: "Northwind Collective",
    mine: false,
    tier: "paid",
    status: "live",
    billingMode: "one_time",
  },
  {
    name: "XMARK — Unity & Shared Purpose",
    description:
      "A coalition campaign measuring cooperative intent across eleven partner organisations.",
    owner: "Cooperative Union",
    mine: false,
    tier: "basic",
    status: "live",
    billingMode: null,
  },
  {
    name: "Harbourline Transit Renewal",
    description:
      "Should the harbour corridor prioritise light rail or dedicated bus? Residents decide the study scope.",
    owner: "Harbour City Forum",
    mine: false,
    tier: "paid",
    status: "live",
    billingMode: "one_time",
  },
  {
    name: "Studio Kettle — Product Discovery",
    description:
      "Pre-launch validation for a small-batch hardware line. Pricing, packaging and positioning tested in public.",
    owner: "Studio Kettle",
    mine: false,
    tier: "basic",
    status: "live",
    billingMode: null,
  },
];

/** Every co-owner/blog/social/add-info permission group, all granted. */
const FULL_CAMPAIGN_PERMISSIONS = {
  campaign: {
    edit: true,
    pause: true,
    live: true,
    end: true,
    archive: true,
    delete: true,
    shareReward: true,
    toggleDonation: true,
  },
  campaignTrial: {
    create: true,
    edit: true,
    delete: true,
    topUp: true,
    draftCreate: true,
    draftEdit: true,
    draftDelete: true,
  },
  campaignPetition: { toggleGlobalEnable: true, create: true, edit: true, delete: true },
  campaignQr: { create: true, edit: true, delete: true },
  campaignBlog: { create: true, edit: true, draft: true, live: true, delete: true },
};

/** A connected, healthy social platform snapshot — used by add-info, blogs, social. */
function connectedPlatform(username: string) {
  return {
    connected: true,
    enabled: true,
    username,
    displayName: username,
    avatarUrl: avatarImg,
  };
}
function disconnectedPlatform() {
  return { connected: false, enabled: false, username: null, displayName: null, avatarUrl: null };
}

/** Inlined onto campaigns as `latestPetition`; the full list lives further down. */
const PETITION_STUBS = [
  {
    _id: IDS.petitions[0],
    title: "Protect the harbour greenway",
    goal: 5000,
    signatureCount: 3420,
    totalVotes: 3420,
    endsAt: daysFromNow(30),
    hasSigned: false,
  },
  {
    _id: IDS.petitions[1],
    title: "Extend late-night campus transport",
    goal: 2500,
    signatureCount: 1980,
    totalVotes: 1980,
    endsAt: daysFromNow(21),
    hasSigned: false,
  },
  {
    _id: IDS.petitions[2],
    title: "Publish the allocation criteria",
    goal: 1200,
    signatureCount: 1144,
    totalVotes: 1144,
    endsAt: daysFromNow(14),
    hasSigned: true,
  },
];

export const CAMPAIGNS = CAMPAIGN_SEEDS.map((seed, i) => {
  const isPaid = seed.tier === "paid";
  const socialConnected = seed.mine && i % 2 === 0;

  return {
    _id: IDS.campaigns[i],
    name: seed.name,
    title: seed.name,
    goal: `Validate demand and build a funded case for ${seed.name.split("—")[0].trim()}.`,
    description: seed.description,
    status: seed.status,
    tier: seed.tier,
    isPolitical: false,
    imageLinks: [CAMPAIGN_IMAGES[i], CAMPAIGN_IMAGES[(i + 1) % CAMPAIGN_IMAGES.length], CAMPAIGN_IMAGES[(i + 2) % CAMPAIGN_IMAGES.length]],
    uploadedVideoLinks: [] as string[],
    videoLink: null as string | null,
    resourceAssets: [{ type: "image", value: CAMPAIGN_IMAGES[i] }],
    // main-owner grants every permission by default; only co-owners need the
    // explicit permissions object, and this demo account never appears as one.
    ownership: {
      type: (seed.mine ? "main-owner" : "viewer") as "main-owner" | "viewer",
      permissions: FULL_CAMPAIGN_PERMISSIONS,
      mainOwner: null,
    },
    // Owner-side gating: "full" access, no outstanding payment.
    ownerAccessState: "full" as const,
    dataAccessState: "full" as const,
    visibility: "listed" as const,
    billing: {
      mode: seed.billingMode,
      paymentSubscriptionId: seed.billingMode === "subscription" ? `subsc-${IDS.campaigns[i]}` : null,
    },
    isMine: seed.mine,
    // Card avatars read externalAuthor.avatar.imageUrl. For owned campaigns the
    // author id matches the signed-in user so the Co-Owners "owner-only" gate opens.
    externalAuthor: {
      _id: seed.mine ? IDS.user : `author-${i}`,
      externalAccountId: seed.mine ? IDS.user : `author-${i}`,
      username: seed.owner,
      avatar: { name: seed.owner, imageUrl: avatarImg },
    },
    ownerUsername: seed.owner,
    createdAt: daysAgo(60 - i * 5),
    startsAt: daysAgo(50 - i * 5),
    endsAt: daysFromNow(40 + i * 3),
    // The detail page reads plan/social/petition data off these exact keys.
    currentPlan: {
      _id: seed.tier === "basic" ? "plan-basic" : "plan-growth",
      name: seed.tier === "basic" ? "Basic" : "Growth",
      tier: seed.tier,
      startsAt: daysAgo(50 - i * 5),
      endsAt: daysFromNow(40 + i * 3),
      donation: {
        supported: true,
        enabled: i % 2 === 0,
        startAt: daysAgo(10),
        endAt: daysFromNow(40 + i * 3),
      },
    },
    isDonationSupported: true,
    websiteLink: "https://xpoll.io",
    twitterLink: "https://x.com/xpollplatform",
    instagramLink: "https://www.instagram.com/xpollplatform/",
    telegramLink: "https://t.me/xpollplatform",
    emailLink: "hello@xpoll.io",
    isPetitionEnabled: true,
    latestPetition: i % 2 === 0 ? PETITION_STUBS[i % PETITION_STUBS.length] : null,
    petitionEnabled: true,
    // add-info target geo — one populated country/state/city so the Target Geo
    // control shows a real label instead of "Selected city".
    targetGeo: {
      countries: [{ _id: "US", id: "US", name: "United States" }],
      states: isPaid ? [{ _id: "US-CT", id: "US-CT", name: "Connecticut" }] : [],
      cities: isPaid ? [{ _id: "US-CT-HFD", id: "US-CT-HFD", name: "Hartford" }] : [],
    },
    linkedIndustries: [
      { _id: "ind-civic", name: "Civic & Policy" },
      { _id: "ind-research", name: "Research" },
    ],
    shareFeatureField: {
      isEnabled: true,
      referral_levels: [
        {
          totalUniqueVisitsRequired: 5,
          rewards: [{ assetId: ASSETS.X_POLL, amount: "50", payoutCap: "5000" }],
        },
      ],
    },
    // Social — connected for owned campaigns so the tabs have something to show.
    uploadPostProfile: {
      x: socialConnected ? connectedPlatform(`@${seed.owner.replace(/\s+/g, "")}`) : disconnectedPlatform(),
      instagram: socialConnected ? connectedPlatform(seed.owner.replace(/\s+/g, "").toLowerCase()) : disconnectedPlatform(),
      facebook: disconnectedPlatform(),
    },
    inkdAutoSocialPublish: { enable: false, imageUrl: null, updatedByExternalAccountId: null, updatedAt: null, consentedAt: null },
    totalViews: 4820 - i * 310,
    totalVotes: 1960 - i * 140,
    totalParticipants: 880 - i * 60,
    usersContributed: 880 - i * 60,
    coinsContributed: 48_200 - i * 3100,
    // Stat tiles on the My Campaigns list read these exact keys.
    totalActiveTrials: 3 + (i % 3),
    totalParticipation: 880 - i * 60,
    shares: { total: 214 - i * 17 },
    donationTotal: 12_400 - i * 900,
    isBookmarked: i === 0 || i === 4,
    counts: {
      trials: 3,
      polls: 5,
      blogs: 2,
      events: 2,
      petitions: 1,
    },
    // CampaignLayout header reward chips.
    rewardSums: {
      activeTrials: {
        computedByAsset: [{ assetId: ASSETS.X_POLL, total: String(4200 + i * 300) }],
      },
    },
  };
});

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
      // Different surfaces read different keys for the same figure.
      computedReward: String(120 + i * 15),
      computedAmount: String(120 + i * 15),
    },
  ],
  expireRewardAt: daysFromNow(3 + i * 2),
  createdAt: daysAgo(20 - i * 2),
  archivedAt: null as string | null,
  alreadyCasted: false,
  belongsToCampaignId: IDS.campaigns[i % IDS.campaigns.length],
  externalAuthor: i % 2 === 0 ? { _id: `author-${i}`, username: seed.owner } : null,
  ownerUsername: seed.owner,
  totalViews: 3120 - i * 210,
  totalVotes: 1180 - i * 90,
  pollCount: 5,
}));

/** Draft trials — not yet launched. 24-hex ids: the edit route regex-validates them. */
const DRAFT_TRIAL_IDS = [
  "6500a1b2c3d4e5f621000001",
  "6500a1b2c3d4e5f621000002",
];

export const DRAFT_TRIALS = DRAFT_TRIAL_IDS.map((id, i) => ({
  _id: id,
  title: i === 0 ? "Pricing sensitivity — draft" : "Feature priority — draft",
  description: "Drafted but not yet launched. Continue editing or discard.",
  resourceAssets: [{ type: "image", value: CAMPAIGN_IMAGES[(i + 5) % CAMPAIGN_IMAGES.length] }],
  rewards: [
    {
      assetId: ASSETS.X_POLL,
      amount: "100",
      rewardAmountCap: "10000",
      rewardType: "max" as const,
    },
  ],
  expireRewardAt: null,
  targetGeo: { countries: [], states: [], cities: [] },
  polls: [
    {
      trialId: id,
      title: "Draft poll question",
      description: "Placeholder question — finish editing before launch.",
      options: ["Option A", "Option B"],
      resourceAssets: [],
      rewards: [],
    },
  ],
  // Points at XAMY (status "draft"), the one campaign whose Trails tab
  // actually allows editing — that's where a walkthrough would look for drafts.
  belongsToCampaignId: IDS.campaigns[1],
  updatedAt: daysAgo(2 + i),
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

/** Per-poll answer sets, so the deck does not read as the same four buttons. */
const POLL_OPTION_SETS = [
  ["Light rail", "Dedicated bus lane", "Both, phased", "Neither — repair first"],
  ["Most weeknights", "Once or twice a week", "Weekends only", "I wouldn't"],
  ["Uncoated kraft", "Matte white", "Gloss full-colour", "Minimal label"],
  ["Under $29", "$29 – $49", "$49 – $79", "Above $79"],
  ["Late-night study space", "Subsidised transport", "Mental health drop-in", "Equipment lending"],
  ["Clarifies it", "Confuses it", "Neutral either way", "Depends on audience"],
  ["Soil health", "Water access", "Seed stock", "Training & advice"],
  ["Definitely", "Probably", "Unlikely", "No"],
];

export const POLLS = POLL_SEEDS.map((title, i) => {
  const labels = POLL_OPTION_SETS[i % POLL_OPTION_SETS.length];
  const voteCounts = [420 - i * 20, 310 - i * 15, 180 - i * 10, 90 - i * 5];

  const optionsTotal = voteCounts.reduce((a, b) => a + b, 0);

  /**
   * Surfaces disagree on the option text key: the feed deck reads `value`, the
   * trial deck maps `text`, and other views use `label`/`title`. All are set to
   * the same string so every screen renders identically.
   */
  const options = labels.map((label, k) => ({
    _id: `${IDS.polls[i]}-${"abcd"[k]}`,
    value: label,
    label,
    text: label,
    title: label,
    votes: voteCounts[k],
    numVotes: voteCounts[k],
    percentage: Math.round((voteCounts[k] / optionsTotal) * 100),
  }));

  const totalVotes = optionsTotal;

  return {
    _id: IDS.polls[i],
    title,
    description:
      "Pick the option closest to your view. Results update live as the community votes.",
    type: "single-choice",
    options,
    answers: options,
    // Result bars read details.optionStats keyed by `_id` with `numVotes`.
    details: {
      optionStats: options.map((o) => ({
        _id: o._id,
        numVotes: o.votes,
      })),
    },
    myVote: null,
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
        computedAmount: String(60 + i * 10),
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
    body: [
      "We expected the harbour corridor question to split along the usual lines — drivers against riders, inner suburbs against outer. It did not.",
      "Across 1,284 votes, the strongest agreement was procedural rather than technical: 71% wanted the study scope published before any design was chosen. Preference between light rail and dedicated bus was almost evenly divided, and both camps ranked reliability above speed.",
      "That reframed the brief. The contested question was never which vehicle to buy; it was who gets to define success before the money is committed.",
      "Three findings carried into the next round of trails, each phrased so the answer changes what the working group actually does.",
    ],
  },
  {
    title: "Signal beats survey: a field note",
    excerpt:
      "Why repeated small interactions outperform one long questionnaire for demand discovery.",
    body: [
      "A twenty-minute questionnaire gets you one reading from the people patient enough to finish it. Six two-minute trails get you six readings from a far wider group, including the ones who would have abandoned the long form.",
      "The difference is not just completion rate. Repeated contact lets you watch preferences move. A single survey cannot distinguish a firmly held view from one formed in the moment of being asked.",
      "In practice the shorter cadence surfaced two reversals we would otherwise have recorded as stable opinion, both after participants saw how their earlier answers compared with the group.",
    ],
  },
  {
    title: "Pricing a small-batch product in public",
    excerpt:
      "We published the pricing question and let 900 people answer. The band was tighter than forecast.",
    body: [
      "Pricing in private means arguing from assumption. We put three anchors in front of 900 participants in randomised order and let the distribution speak.",
      "The workable band came back narrower than the internal forecast, and the midpoint sat below where the team had been arguing. More useful still: the drop-off between anchors was not linear, which told us where the real resistance point was.",
      "Publishing the question cost nothing and removed a month of internal debate.",
    ],
  },
  {
    title: "Designing rewards that do not distort",
    excerpt:
      "Reward caps, flat rates and the quiet maths that keeps participation honest.",
    body: [
      "Any reward attached to a vote creates pressure to vote regardless of view. The design problem is paying for attention without paying for a particular answer.",
      "Flat per-response rates with a total cap work better than escalating bonuses. Escalation rewards volume, and volume is where low-quality responses concentrate.",
      "Caps also make budgets legible to participants, which matters more than it sounds: people are measurably more willing to engage when the total pool is visible.",
    ],
  },
  {
    title: "Coalition campaigns: eleven partners, one signal",
    excerpt:
      "Coordinating shared measurement without flattening what makes each partner distinct.",
    body: [
      "Eleven organisations agreed to measure the same four questions while keeping their own framing for everything else.",
      "The shared core made results comparable across very different audiences. The local framing kept response rates from collapsing in the places where the coalition's house style would have read as foreign.",
      "The compromise was administrative, not editorial, and it is the only reason the aggregate numbers mean anything.",
    ],
  },
  {
    title: "The archetype experiment, six weeks in",
    excerpt:
      "Symbolic framing moved technical audiences more than feature lists did. By a lot.",
    body: [
      "We ran the same proposition two ways for six weeks: once as a capability list, once through a symbolic frame with no feature claims at all.",
      "The technical audience — the group we assumed would want specifications — responded more strongly to the symbolic frame. Recall after 24 hours was the clearest gap.",
      "The uncomfortable reading is that feature lists confirm interest rather than create it. They are closing material, not opening material.",
    ],
  },
];

/** INKD editorial imagery, so blog covers match the look of the /inkd feed. */
const INKD_IMAGES = [
  inkdFirst,
  inkdSecond,
  inkdThird,
  inkdFourth,
  inkdFifth,
  inkdSix,
];

const BLOG_INDUSTRY_NAMES = [
  "Civic & Policy",
  "Research",
  "Retail & Consumer",
  "Education",
  "Deep Tech",
  "Agriculture",
];

export const BLOGS = BLOG_SEEDS.map((seed, i) => {
  const cover = INKD_IMAGES[i % INKD_IMAGES.length];
  return {
    _id: IDS.blogs[i],
    title: seed.title,
    slug: seed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    excerpt: seed.excerpt,
    summary: seed.excerpt,
    // Plain text: the INKD reader splits this on blank lines itself and would
    // print raw markup verbatim. `content` keeps the HTML for editor surfaces.
    description: seed.body.join("\n\n"),
    content: seed.body.map((p) => `<p>${p}</p>`).join(""),
    body: seed.body.join("\n\n"),
    imageUrl: cover,
    coverImage: cover,
    coverImageUrl: cover,
    resourceAssets: [{ type: "image", value: cover }],
    // BlogCard picks its cover from these three arrays, in this order.
    uploadedImageLinks: [cover],
    uploadedVideoLinks: [],
    ytVideoLinks: [],
    status: "live",
    readTimeMinutes: 4 + (i % 3),
    publishDate: daysAgo(4 + i * 3),
    publishedAt: daysAgo(4 + i * 3),
    updatedAt: daysAgo(4 + i * 3),
    archivedAt: null,
    createdAt: daysAgo(5 + i * 3),
    author: { username: i % 2 === 0 ? "Avestix" : "Northwind Collective" },
    industry: { _id: `ind-${i}`, name: BLOG_INDUSTRY_NAMES[i] },
    totalViews: 1840 - i * 120,
    // The INKD reader shows view count from lifetimeStats.seenTotal.
    lifetimeStats: {
      seenTotal: 1840 - i * 120,
      shareTotal: 96 - i * 8,
    },
    belongsToCampaignId: IDS.campaigns[i % IDS.campaigns.length],
  };
});

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

export const EVENTS = EVENT_SEEDS.map((seed, i) => {
  // First two are the campaign-owner's own drafts/live events; the rest are
  // read-only published events on other people's campaigns.
  const isOwnerDemo = i < 2;
  const status = isOwnerDemo && i === 0 ? "draft" : "published";
  const ticketsSold = 128 - i * 18;

  return {
    _id: IDS.events[i],
    title: seed.title,
    name: seed.title,
    description:
      "An open session for participants to review findings, ask questions, and help shape what the campaign measures next.",
    status: status as "draft" | "published",
    visibility: "public" as const,
    locationType: "in_person" as const,
    location: seed.location,
    venue: {
      addressLine1: seed.location,
      addressLine2: "",
      city: "Hartford",
      state: "Connecticut",
      country: "United States",
      postalCode: "06103",
    },
    virtualMeeting: null as { provider: string; url: string; notes?: string } | null,
    startsAt: daysFromNow(6 + i * 5),
    // +2h so the card shows a real time range rather than "6:52 AM–6:52 AM".
    endsAt: new Date(Date.now() + (6 + i * 5) * DAY + 2 * 3_600_000).toISOString(),
    timezone: "America/New_York",
    createdAt: daysAgo(12 - i),
    imageUrl: CAMPAIGN_IMAGES[(i + 1) % CAMPAIGN_IMAGES.length],
    coverImageUrl: CAMPAIGN_IMAGES[(i + 1) % CAMPAIGN_IMAGES.length],
    resourceAssets: [
      { type: "image", value: CAMPAIGN_IMAGES[(i + 1) % CAMPAIGN_IMAGES.length] },
    ],
    belongsToCampaignId: IDS.campaigns[isOwnerDemo ? 0 : i % IDS.campaigns.length],
    ownerUsername: seed.owner,
    externalAuthor: { _id: `author-e${i}`, username: seed.owner },
    capacity: { maxTickets: 200, ticketsSold },
    attendeeCount: ticketsSold,
    pricing:
      i === 0
        ? { mode: "free" as const, coins: [] as { assetId: string; amount: string }[] }
        : {
            mode: "paid" as const,
            coins: [{ assetId: ASSETS.X_POLL, amount: String((i + 1) * 250) }],
          },
    allowlist: { emails: [] as string[] },
    ticketPrice: { currency: "USD", amountInMinor: (i + 1) * 1500 },
    isFree: i === 0,
  };
});

/** Attendee rosters for published events, keyed by event id. */
export const EVENT_ATTENDEES = Object.fromEntries(
  EVENTS.filter((e) => e.status === "published").map((e) => [
    e._id,
    Array.from({ length: Math.min(6, e.capacity.ticketsSold) }, (_, i) => ({
      ticketId: `${e._id}-t${i}`,
      email: `attendee${i + 1}@example.com`,
      name: `Attendee ${i + 1}`,
      paidCoins: e.pricing.mode === "paid" ? e.pricing.coins.map((c) => ({ ...c })) : [],
      issuedAt: daysAgo(i + 1),
    })),
  ]),
);

/**
 * `/external/events/discover` returns each event wrapped with the viewer's
 * relationship to it, so the public campaign page can badge invites/tickets.
 */
export const DISCOVER_EVENTS = EVENTS.filter((e) => e.status === "published").map(
  (event, i) => ({
    event,
    viewerContext: {
      isInvited: i === 0,
      hasTicket: event.pricing.mode === "free",
    },
  }),
);

/* ----------------------------------------------------------- petitions --- */

const PETITION_SEEDS = [
  {
    _id: IDS.petitions[0],
    title: "Protect the harbour greenway",
    description:
      "Ask the council to preserve the greenway corridor through the transit redesign.",
    goal: 5000,
    signatureCount: 3420,
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
    createdAt: daysAgo(15),
    endsAt: daysFromNow(21),
    belongsToCampaignId: IDS.campaigns[1],
    hasSigned: false,
  },
  {
    _id: IDS.petitions[2],
    title: "Publish the allocation criteria",
    description: "Growers request that grant scoring criteria be published before review.",
    goal: 1200,
    signatureCount: 1144,
    createdAt: daysAgo(9),
    endsAt: daysFromNow(14),
    belongsToCampaignId: IDS.campaigns[2],
    hasSigned: true,
  },
];

/**
 * One object serves both the public campaign page (title/goal/signatureCount)
 * and the campaign-owner petition manage view (name/uploadedImageLinks/
 * voteCountCache), since both are read from the same fixture array.
 */
export const PETITIONS = PETITION_SEEDS.map((p, i) => ({
  ...p,
  name: p.title,
  totalVotes: p.signatureCount,
  isEnabled: true,
  uploadedImageLinks: [CAMPAIGN_IMAGES[i % CAMPAIGN_IMAGES.length]],
  uploadedVideoLinks: [] as string[],
  ytVideoLinks: [] as string[],
  externalLinks: ["https://xpoll.io"],
  targetGeo: { countries: ["US"] },
  voteCountCache: { yes: p.signatureCount, no: Math.round(p.signatureCount * 0.08) },
  updatedAt: p.createdAt,
}));

/* ------------------------------------------------------------- ledgers --- */

/**
 * Asset-ledger entries.
 *
 * Action names must match the exact vocabulary the history screens filter on
 * (see components/profile/LedgerHistoryList.tsx). Amounts live inside `legs`,
 * selected by `legType` — reward rows are only shown when they carry a
 * `reward` leg, so a flat `amount` field would render nothing.
 *
 * "signup-bonus" is deliberately excluded: its presence puts the app into
 * first-time-signup mode, which hides every coin except XPOLL and pops the
 * bonus modal. The demo account is an established user.
 */
const LEDGER_ACTIONS = [
  { action: "poll-reward", legType: LEG_REWARD },
  { action: "trial-reward", legType: LEG_REWARD },
  { action: "share-reward", legType: LEG_REWARD },
  { action: "asset-purchase", legType: "purchase-asset" },
  { action: "user-campaign-donation", legType: "default" },
  { action: "campaign-closure-settlement", legType: "default" },
] as const;

export const LEDGERS = Array.from({ length: 24 }, (_, i) => {
  const { action, legType } = LEDGER_ACTIONS[i % LEDGER_ACTIONS.length];
  const amount = 150 + i * 35;
  const campaignId = IDS.campaigns[i % IDS.campaigns.length];

  /** Each action renders its own metadata row, so only populate what it reads. */
  let metadata: Record<string, unknown> = {};
  if (action === "campaign-closure-settlement") {
    metadata = { campaignId };
  } else if (action === "share-reward") {
    metadata = { kind: i % 2 === 0 ? "Poll" : "Trail" };
  } else if (action === "asset-purchase") {
    metadata = { paymentId: `pay_${String(i).padStart(6, "0")}` };
  } else if (action === "user-campaign-donation") {
    metadata = { campaignId };
  }

  return {
    _id: `6500a1b2c3d4e5f67000${String(i).padStart(4, "0")}`,
    action,
    status: "settled",
    createdAt: daysAgo(i * 2 + 1),
    metadata,
    legs: [
      {
        assetId: ASSETS.X_POLL,
        legType,
        amount: String(amount),
      },
    ],
  };
});

/* -------------------------------------------------------- transactions --- */

/**
 * Sell-intent ledger entries.
 *
 * The exchange screens read the traded amount out of `legs` (matching on
 * assetId + legType) and the state out of `metadata.status`, so the fixture has
 * to carry that structure rather than a flat amount.
 */
const SELLABLE_ASSETS = [
  { assetId: ASSETS.X_MYST, minor: 9 },
  { assetId: ASSETS.X_OCTA, minor: 8 },
  { assetId: ASSETS.X_DROP, minor: 6 },
  { assetId: ASSETS.X_HIGH, minor: 6 },
] as const;

const LEDGER_STATUSES = ["APPROVE", "PENDING", "REJECT"] as const;

export const TRANSACTIONS = SELLABLE_ASSETS.flatMap(({ assetId, minor }, ci) =>
  Array.from({ length: 6 }, (_, i) => {
    const status = LEDGER_STATUSES[i % LEDGER_STATUSES.length];
    // 100 parent units per order, expressed in the asset's minor units.
    const baseAmount = String(100 * 10 ** minor * (i + 1));
    const isStrain = assetId === ASSETS.X_HIGH;

    return {
      _id: `6500a1b2c3d4e5f68${ci}0000${String(i).padStart(3, "0")}`,
      assetId,
      createdAt: daysAgo(i * 3 + ci),
      metadata: {
        status,
        amountHigh: isStrain ? baseAmount : undefined,
        standardOrderAmountAtPrepare: baseAmount,
        walletAddress: `0x${"7e2c".repeat(8)}${ci}${i}`,
        txHash: `0x${(ci + 1).toString(16).repeat(2)}${"a3f9c1d2e4b6".repeat(4)}${i}`,
      },
      legs: [
        {
          assetId,
          legType: isStrain ? "strain-sell-amount" : "intent-amount",
          amount: baseAmount,
        },
        {
          assetId: ASSETS.X_POLL,
          legType: "fees",
          amount: "100",
        },
      ],
    };
  }),
);

/**
 * Sell-intent totals per asset, keyed by assetId. Amounts are base (minor)
 * units; the exchange summary converts them to parent units for display.
 * Approved totals equal the sum of the APPROVE-status ledger rows above.
 */
export const SELL_INTENT_STATS = Object.fromEntries(
  SELLABLE_ASSETS.map(({ assetId, minor }) => {
    const approvedParent = TRANSACTIONS.filter(
      (t) => t.assetId === assetId && t.metadata.status === "APPROVE",
    ).reduce((sum, t) => sum + Number(t.legs[0].amount) / 10 ** minor, 0);

    return [
      assetId,
      {
        approved: String(Math.round(approvedParent * 10 ** minor)),
        pending: String(100 * 10 ** minor),
        rejected: String(100 * 10 ** minor),
      },
    ];
  }),
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

/**
 * Marketplace / profile payment history — `PaymentItem` in
 * components/profile/payments-list-section.tsx. Distinct from DONATIONS: this
 * feeds "Payment history" on /marketplace, keyed off `purpose` + `display.rail`
 * (fiat vs crypto), not campaign donations.
 */
const PAYMENT_SEEDS = [
  { purpose: "purchase-asset-token" as const, rail: "fiat" as const, tokenSymbol: "XOT", status: "succeeded" as const },
  { purpose: "purchase-asset-token" as const, rail: "crypto" as const, tokenSymbol: "XMT", status: "succeeded" as const },
  { purpose: "purchase-campaign-plan" as const, rail: "fiat" as const, tokenSymbol: null, status: "succeeded" as const },
  { purpose: "purchase-asset-token" as const, rail: "fiat" as const, tokenSymbol: "XDP", status: "processing" as const },
  { purpose: "purchase-asset-token" as const, rail: "crypto" as const, tokenSymbol: "XHG", status: "failed" as const },
  { purpose: "purchase-campaign-plan" as const, rail: "fiat" as const, tokenSymbol: null, status: "succeeded" as const },
];

export const PAYMENTS = PAYMENT_SEEDS.map((seed, i) => {
  const amountMinor = (i + 1) * 6420;
  const isFiat = seed.rail === "fiat";
  return {
    _id: `pay_history_${String(i).padStart(4, "0")}`,
    purpose: seed.purpose,
    status: seed.status,
    amount: amountMinor,
    currency: "USD",
    invoiceUrl: null,
    createdAt: daysAgo(i * 3 + 1),
    context:
      seed.purpose === "purchase-asset-token"
        ? { assetType: seed.tokenSymbol, tokensToBuy: String(10 * (i + 1)) }
        : { campaignId: IDS.campaigns[i % IDS.campaigns.length], planId: "plan-growth" },
    display: {
      rail: seed.rail,
      fiat: isFiat ? { currency: "USD", amountMinor } : null,
      crypto: !isFiat
        ? {
            currency: seed.tokenSymbol,
            amountAtomic: String(amountMinor * 10_000),
            tokenSymbol: seed.tokenSymbol,
            tokenDecimals: 6,
            txHash: `0x${"a3f9c1d2e4b6".repeat(4)}${i}`,
            chainId: 8453,
            tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            payerAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
            receiverAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
            amountMinorEquivalent: amountMinor,
          }
        : null,
    },
    provider: { code: isFiat ? "stripe" : "evm", family: isFiat ? "fiat" : "crypto" },
  };
});

/* --------------------------------------------------------------- plans --- */

/**
 * Shape matches `CampaignPlan` plus the nested `buyConfig` that
 * lib/payments/buy-config.ts normalizes (enable flags + pricing keyed by
 * upper-cased currency / token symbol, amounts in minor units).
 *
 * Plans are duplicated across the political / non-political and data-access
 * axes because the create page filters on `isPolitical` and
 * `donationSupported` before rendering anything.
 */
function makeBuyConfig(fiatMinor: number, withSubscription = false) {
  if (fiatMinor === 0) return null;
  return {
    enable: true,
    fiat: {
      enable: true,
      pricing: {
        USD: { enable: true, rateInMinor: fiatMinor, currency: "USD", decimals: 2 },
      },
    },
    crypto: {
      enable: true,
      pricing: {
        USDC: {
          enable: true,
          rateInMinor: fiatMinor * 10_000,
          currency: "USDC",
          decimals: 6,
        },
      },
    },
    subscription: withSubscription
      ? {
          enable: true,
          cadence: { intervalUnit: "month" as const, intervalCount: 1 },
          fiat: {
            enable: true,
            pricing: {
              USD: { enable: true, rateInMinor: fiatMinor, currency: "USD", decimals: 2 },
            },
          },
          crypto: {
            enable: true,
            pricing: {
              USDC: {
                enable: true,
                rateInMinor: fiatMinor * 10_000,
                currency: "USDC",
                decimals: 6,
              },
            },
          },
        }
      : { enable: false, cadence: null },
  };
}

const PLAN_TEMPLATES = [
  {
    code: "basic",
    name: "Basic",
    tier: "basic" as const,
    durationDays: 30,
    fiatMinor: 0,
    subscription: false,
    features: {
      liveCampaigns: 1,
      polls: "unlimited",
      trailsPerMonth: 3,
      analytics: "community",
    },
  },
  {
    code: "growth",
    name: "Growth",
    tier: "paid" as const,
    durationDays: 90,
    fiatMinor: 4_900,
    subscription: true,
    features: {
      liveCampaigns: 5,
      blogs: true,
      events: true,
      petitions: true,
      qr: true,
    },
  },
  {
    code: "scale",
    name: "Scale",
    tier: "paid" as const,
    durationDays: 365,
    fiatMinor: 14_900,
    subscription: true,
    features: {
      liveCampaigns: "unlimited",
      inkdAgents: true,
      coOwners: true,
      support: "dedicated",
    },
  },
];

export const CAMPAIGN_PLANS = [false, true].flatMap((isPolitical) =>
  [false, true].flatMap((donationSupported) =>
    PLAN_TEMPLATES.map((tpl) => ({
      _id: `plan-${tpl.code}-${isPolitical ? "pol" : "npol"}-${
        donationSupported ? "data" : "nodata"
      }`,
      code: tpl.code,
      name: tpl.name,
      tier: tpl.tier,
      visibility: "public" as const,
      isPolitical,
      donationSupported,
      durationDays: tpl.durationDays,
      isActive: true,
      archivedAt: null,
      features: tpl.features,
      buyConfig: makeBuyConfig(tpl.fiatMinor, tpl.subscription),
    })),
  ),
);

/* ----------------------------------------------------------- INKD data --- */

/** Shape mirrors `CampaignInkDAgent` in components/campaign/inkd-agents/model.ts. */
function makeInkDAgent(
  i: number,
  creatorType: "admin" | "campaign_user",
  campaignId: string,
  name: string,
  status: "active" | "idle" = "active",
) {
  return {
    _id: `6500a1b2c3d4e5f6a00000${String(i).padStart(2, "0")}`,
    internalAgentId: `6500a1b2c3d4e5f6c00000${String(i).padStart(2, "0")}`,
    name,
    displayName: name,
    status,
    creatorType,
    createdByExternalAccountId: creatorType === "campaign_user" ? IDS.user : null,
    userOwnedCampaignId: creatorType === "campaign_user" ? campaignId : null,
    foundationalInformation:
      "Writes in a measured, evidence-first voice. Cites participation numbers where available.",
    brandLanguage: "Plain, specific, no hype. British spelling.",
    maxBlogDescriptionLength: 1200,
    generationMode: "inkd_and_campaign" as const,
    campaignTargets: [
      {
        _id: campaignId,
        name: CAMPAIGNS.find((c) => c._id === campaignId)?.name ?? "Campaign",
        status: "live",
        archivedAt: null,
        imageLinks: [CAMPAIGN_IMAGES[i % CAMPAIGN_IMAGES.length]],
      },
    ],
    prioritySources: ["community-votes", "trail-results"],
    scheduleRules: [
      {
        _id: `sched-${i}`,
        weekdays: ["mon", "wed", "fri"],
        timeUtc: "09:00",
      },
    ],
    nextSchedule: daysFromNow(1),
    createdAt: daysAgo(30 - i),
    updatedAt: daysAgo(2),
  };
}

/** Listing envelope returned by `/external/campaigns/:id/inkd-agents`. */
export function makeInkDAgentListing(campaignId: string) {
  const userOwnedAgent = makeInkDAgent(
    1,
    "campaign_user",
    campaignId,
    "Trail Composer",
    "active",
  );
  const adminConnectedAgents = [
    makeInkDAgent(2, "admin", campaignId, "Signal Digest", "active"),
    makeInkDAgent(3, "admin", campaignId, "Weekly Roundup", "idle"),
  ];

  return {
    campaignId,
    ownershipType: "main-owner" as const,
    ownerAccessState: "full" as const,
    manageReason: "eligible" as const,
    tier: "paid" as const,
    inkdAutoSocialPublish: { enable: false, platforms: [] },
    canManageUserOwnedAgent: true,
    counts: {
      userOwned: 1,
      adminConnected: adminConnectedAgents.length,
      total: 1 + adminConnectedAgents.length,
    },
    userOwnedAgent,
    adminConnectedAgents,
  };
}

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

/**
 * CitySelect dereferences `item.state.name` / `item.country.name` with no
 * optional chaining — nested objects are required, not just id references.
 */
export const CITIES = [
  {
    _id: "US-CT-HFD",
    name: "Hartford",
    stateId: "US-CT",
    state: { _id: "US-CT", name: "Connecticut" },
    country: { _id: "US", name: "United States" },
  },
  {
    _id: "US-NY-NYC",
    name: "New York City",
    stateId: "US-NY",
    state: { _id: "US-NY", name: "New York" },
    country: { _id: "US", name: "United States" },
  },
  {
    _id: "GB-LDN-LDN",
    name: "London",
    stateId: "GB-LDN",
    state: { _id: "GB-LDN", name: "London" },
    country: { _id: "GB", name: "United Kingdom" },
  },
  {
    _id: "IN-MH-MUM",
    name: "Mumbai",
    stateId: "IN-MH",
    state: { _id: "IN-MH", name: "Maharashtra" },
    country: { _id: "IN", name: "India" },
  },
];

/* --------------------------------------------------------- QR library --- */

/**
 * Two demo codes per campaign, with globally unique ids (the detail route
 * `/external/campaigns/qr/:qrId` carries no campaign id, so ids must be
 * disambiguating on their own — a shared id across campaigns would make the
 * detail page unable to tell which campaign's QR was clicked).
 */
export function makeQrCodesForCampaign(campaignId: string) {
  const suffix = campaignId.slice(-4);
  return [
    {
      _id: `6500a1b2c3d4e5f671${suffix}01`,
      name: "Flyer QR",
      description: "Printed on the corridor study flyers.",
      isActive: true,
      allVisitorCounts: 420,
      belongsToCampaignId: campaignId,
    },
    {
      _id: `6500a1b2c3d4e5f671${suffix}02`,
      name: "Booth QR",
      description: "Displayed at the booth stand.",
      isActive: true,
      allVisitorCounts: 340,
      belongsToCampaignId: campaignId,
    },
  ];
}

/** Per-QR scan stats, keyed by level id "1".."10" as the real API does. */
export function makeQrStats(qrId: string) {
  const levelWise: Record<string, { allVisitorCounts: number; uniqueVisitorCounts: number }> = {};
  for (let lvl = 1; lvl <= 10; lvl++) {
    levelWise[String(lvl)] = {
      allVisitorCounts: Math.max(0, 60 - lvl * 5),
      uniqueVisitorCounts: Math.max(0, 40 - lvl * 3),
    };
  }
  return [
    {
      [qrId]: {
        allVisitorCounts: 420,
        uniqueVisitorCounts: 310,
        levelWise,
      },
    },
  ];
}

/* ---------------------------------------------------- social status --- */

/** `ApiCampaignSocialStatus` — derived from the campaign's own social profile. */
export function makeSocialStatus(campaign: (typeof CAMPAIGNS)[number]) {
  const connectedHealth = (p: { connected: boolean }) => ({
    state: (p.connected ? "connected" : "disconnected") as
      | "connected"
      | "disconnected"
      | "reauth_required"
      | "unknown",
    lastEventAt: p.connected ? daysAgo(1) : null,
    lastEventType: p.connected ? "post_published" : null,
  });

  return {
    campaignId: campaign._id,
    tier: campaign.tier,
    billingMode: campaign.billing.mode,
    ownershipType: campaign.ownership.type === "main-owner" ? "main-owner" as const : "co-owner" as const,
    manageState: "eligible" as const,
    manageReason: "eligible" as const,
    uploadPostProfile: campaign.uploadPostProfile,
    platformHealth: {
      x: connectedHealth(campaign.uploadPostProfile.x),
      instagram: connectedHealth(campaign.uploadPostProfile.instagram),
      facebook: connectedHealth(campaign.uploadPostProfile.facebook),
    },
    profileStatus: "ready" as const,
    lastLinkedAt: daysAgo(30),
    lastSyncedAt: daysAgo(1),
    detachedAt: null,
    lastWebhookEventAt: daysAgo(1),
    publishRateLimits: {
      resetAt: daysFromNow(1),
      user: { limit: 20, used: 4, remaining: 16, exhausted: false },
      campaign: { limit: 10, used: 2, remaining: 8, exhausted: false },
      blogRule: { limit: 5, window: "day" as const, resetTimezone: "UTC" as const },
    },
  };
}

/* -------------------------------------------------------- co-owners --- */

/** No co-owners in the demo — the tab's empty state, reached via list length 0. */
export function makeCoOwnerListing(campaignId: string) {
  return { campaignId, total: 0, maxAllowed: 3, coOwners: [] as unknown[] };
}

/* ------------------------------------------------- campaign subscription --- */

export function makeSubscriptionRecord(campaignId: string) {
  return {
    _id: `subsc-${campaignId}`,
    externalAccountId: IDS.user,
    purpose: "campaign-subscription",
    status: "active" as const,
    autoRenew: true,
    pauseReason: null,
    currency: "USD",
    // formatCryptoMinor expects atomic units (USDC has 6 decimals) — $49.00.
    amount: 49_000_000,
    provider: { family: "crypto", code: "evm", refs: null, state: null },
    authorization: {
      kind: "crypto" as const,
      crypto: {
        walletAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
        chainId: 8453,
        recurringContractAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
        tokenSymbol: "USDC",
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        tokenDecimals: 6,
        allowance: { amountAtomic: "5000000000", lastSyncedAt: daysAgo(1) },
      },
    },
    cadence: { intervalUnit: "month" as const, intervalCount: 1 },
    period: {
      currentStartAt: daysAgo(3),
      currentEndAt: daysFromNow(27),
      nextChargeAt: daysFromNow(27),
    },
    nextBillingDateUtc: daysFromNow(27),
    autoAttemptWindowStartDateUtc: null,
    lastAttemptDateUtc: daysAgo(3),
    manualContinueRequired: false,
    target: { entityType: "campaign", entityId: campaignId },
    offer: null,
    lastPaymentIntentId: "pay_subsc_0001",
    attemptLock: { locked: false, paymentIntentId: null, lockedAt: null, trigger: null, cycleKey: null, attemptKey: null },
    context: {},
    metadata: {},
    createdAt: daysAgo(93),
    updatedAt: daysAgo(3),
  };
}

export function makeSubscriptionPayments(campaignId: string) {
  return Array.from({ length: 3 }, (_, i) => ({
    _id: `pay_subsc_${campaignId.slice(-4)}_${i}`,
    status: "succeeded" as const,
    amount: 49_000_000,
    currency: "USD",
    billingMode: "subscription" as const,
    subscription: {
      chargePhase: i === 0 ? "initial" as const : "renewal" as const,
      trigger: "scheduled" as const,
    },
    display: { crypto: { txHash: `0x${"c4f1".repeat(8)}${i}` } },
    context: {},
    createdAt: daysAgo(93 - i * 30),
    updatedAt: daysAgo(93 - i * 30),
  }));
}

/* ------------------------------------------------------------- avatars --- */

export const AVATARS = Array.from({ length: 6 }, (_, i) => ({
  _id: `avatar-${i + 1}`,
  imageUrl: avatarImg,
  name: `Avatar ${i + 1}`,
}));

/* ------------------------------------------------------ bookmarks / misc --- */

export const BOOKMARKS = CAMPAIGNS.filter((c) => c.isBookmarked);

/**
 * `/common/assets/coins` — keyed by `_id`, sell limits under `canSell`.
 *
 * `standardOrderAmount` is in MINOR units: the exchange screen runs it through
 * `amount({op:"toParent"})` before display. A flat 100 would render as
 * 0.0000001, so each entry is 100 parent units scaled by its own decimals.
 * `conversionFeesInXpoll` is already xPoll, which has 0 decimals.
 */
const STANDARD_ORDER_PARENT = 100;
const CONVERSION_FEE_XPOLL = 100;

/**
 * Marketplace buy config. `normalizeAssetBuyConfig` requires an integer
 * `minParentTokensPerOrder` on top of the standard purchasable shape, otherwise
 * the coin is dropped and the marketplace shows nothing to buy.
 */
const assetBuyConfig = (usdPerToken: number) => ({
  enable: true,
  minParentTokensPerOrder: 10,
  fiat: {
    enable: true,
    pricing: {
      USD: {
        enable: true,
        rateInMinor: Math.round(usdPerToken * 100),
        currency: "USD",
        decimals: 2,
      },
    },
  },
  crypto: {
    enable: true,
    pricing: {
      USDC: {
        enable: true,
        rateInMinor: Math.round(usdPerToken * 1_000_000),
        currency: "USDC",
        decimals: 6,
      },
    },
  },
  subscription: { enable: false, cadence: null },
});

const coinEntry = (
  assetId: (typeof ASSETS)[keyof typeof ASSETS],
  name: string,
  symbol: string,
  decimal: number,
  usdPerToken: number,
) => ({
  _id: assetId,
  name,
  symbol,
  decimal,
  canSell: {
    standardOrderAmount: STANDARD_ORDER_PARENT * 10 ** decimal,
    conversionFeesInXpoll: CONVERSION_FEE_XPOLL,
  },
  buyConfig: assetBuyConfig(usdPerToken),
});

export const ASSET_COINS = [
  { _id: ASSETS.X_POLL, name: "XPOLL", symbol: "XPL", decimal: 0, canSell: null },
  coinEntry(ASSETS.X_MYST, "XMYST", "XMT", 9, 1.18),
  coinEntry(ASSETS.X_OCTA, "XOCTA", "XOT", 8, 6.42),
  coinEntry(ASSETS.X_DROP, "XDROP", "XDP", 6, 0.58),
  coinEntry(ASSETS.X_HIGH, "XHIGH", "XHG", 6, 0.05),
];
