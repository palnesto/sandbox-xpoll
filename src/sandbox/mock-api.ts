/**
 * Sandbox request router.
 *
 * Replaces the network entirely. Every GET is answered from ./fixtures and
 * every write resolves with a success envelope without mutating anything.
 *
 * Response envelope matches the real API: the axios adapter returns
 * `{ data: <payload> }`, so components reading `res.data.data` get `<payload>`.
 */

import { endpoints } from "@/api/endpoints";
import * as F from "./fixtures";
import { getSessionUsername } from "./session";

export type MockMethod = "get" | "post" | "put" | "patch" | "delete";

export class MockHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ----------------------------------------------------------- utilities --- */

function splitUrl(rawUrl: string) {
  const withoutOrigin = rawUrl.replace(/^https?:\/\/[^/]+/i, "");
  const [path, query = ""] = withoutOrigin.split("?");
  return { path: path.replace(/\/+$/, "") || "/", params: new URLSearchParams(query) };
}

/** Standard paginated envelope used across the real API. */
function paged<T>(all: T[], params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1) || 1;
  const pageSize = Number(params.get("pageSize") ?? 10) || 10;
  const start = (page - 1) * pageSize;
  const entries = all.slice(start, start + pageSize);
  return {
    entries,
    items: entries,
    results: entries,
    total: all.length,
    totalCount: all.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
    hasNextPage: start + pageSize < all.length,
  };
}

const ok = (message = "Done") => ({ success: true, message });

/** Pull a 24-hex id out of a path. */
function idFrom(path: string): string | null {
  const m = path.match(/[a-f0-9]{24}/i);
  return m ? m[0] : null;
}

/* ------------------------------------------------------------- handlers --- */

type Handler = (ctx: {
  path: string;
  params: URLSearchParams;
  method: MockMethod;
  body: any;
}) => unknown;

type Route = [test: RegExp, handler: Handler];

function currentUser() {
  const username = getSessionUsername();
  if (!username) {
    throw new MockHttpError(401, "Not authenticated");
  }
  return F.makeUser(username);
}

const GET_ROUTES: Route[] = [
  /* ---------------------------------------------------------- identity -- */
  [/^\/health-check$/, () => ok("healthy")],
  [new RegExp(`^${endpoints.profile.me}$`), () => currentUser()],
  [/^\/external\/profile\/avatars/, () => F.AVATARS],
  [/^\/external\/profile\/username\/.*\/availability/, () => ({ available: true })],
  [/^\/external\/profile\/soulbound-subscription\/allowance$/, () => ({
    allowanceInMinor: 4900,
    currency: "USD",
    isSufficient: true,
  })],
  [/^\/external\/profile\/soulbound-subscription\/payments/, ({ params }) =>
    paged(F.DONATIONS, params)],
  [/^\/external\/profile\/soulbound-subscription$/, () => currentUser().soulbound],

  /* --------------------------------------------------------- campaigns -- */
  [new RegExp(`^${endpoints.campaigns.myCampaigns}$`), ({ params }) =>
    paged(F.MY_CAMPAIGNS, params)],
  [new RegExp(`^${endpoints.campaigns.all}$`), ({ params }) => paged(F.CAMPAIGNS, params)],
  [new RegExp(`^${endpoints.campaigns.plans}$`), () => F.CAMPAIGN_PLANS],
  [new RegExp(`^${endpoints.campaigns.getBookmarks}$`), ({ params }) =>
    paged(F.BOOKMARKS, params)],
  [new RegExp(`^${endpoints.campaigns.allPayments}$`), ({ params }) =>
    paged(F.DONATIONS, params)],
  [new RegExp(`^${endpoints.campaigns.myDonations}$`), ({ params }) =>
    paged(F.DONATIONS, params)],
  [/^\/external\/campaigns\/my-campaign-donations\//, ({ params }) =>
    paged(F.DONATIONS, params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/analytics$/, () => ({
    totalViews: 4820,
    totalVotes: 1960,
    totalParticipants: 880,
    conversionRate: 0.41,
    series: Array.from({ length: 14 }, (_, i) => ({
      date: F.daysAgo(13 - i).slice(0, 10),
      views: 220 + i * 18,
      votes: 90 + i * 11,
    })),
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents\/[a-f0-9]{24}\/task-logs/, ({ params }) =>
    paged([], params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents\/task-logs/, ({ params }) =>
    paged([], params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents\/[a-f0-9]{24}$/, () => F.INKD_AGENTS[0]],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents$/, () => ({
    entries: F.INKD_AGENTS,
    items: F.INKD_AGENTS,
    autoSocialPublish: false,
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/allowance$/, () => ({
    allowanceInMinor: 14900,
    currency: "USD",
    isSufficient: true,
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/payments/, ({ params }) =>
    paged(F.DONATIONS, params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription$/, () => ({
    _id: "sub-demo-1",
    status: "active",
    planName: "Growth",
    currentPeriodEnd: F.daysFromNow(24),
    amountInMinor: 4900,
    currency: "USD",
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/social$/, () => ({
    connections: [],
    platformPreference: null,
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events\/[a-f0-9]{24}\/attendees/, ({ params }) =>
    paged([], params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events\/[a-f0-9]{24}$/, ({ path }) =>
    F.EVENTS.find((e) => e._id === idFrom(path.split("/events/")[1])) ?? F.EVENTS[0]],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events/, ({ params }) => paged(F.EVENTS, params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/trials$/, ({ params }) => paged(F.TRIALS, params)],
  [/^\/external\/campaigns\/qr\/advanced-listing/, ({ params }) => paged([], params)],
  [/^\/external\/campaigns\/qr\/stats/, () => ({ totalScans: 0, uniqueScans: 0 })],
  [/^\/external\/campaigns\/co-owner\/campaign\//, ({ params }) => paged([], params)],
  [/^\/external\/campaigns\/trial\/[a-f0-9]{24}$/, ({ path }) =>
    F.TRIALS.find((t) => t._id === idFrom(path)) ?? F.TRIALS[0]],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/(user|owner)$/, ({ path }) => {
    const id = idFrom(path);
    return F.CAMPAIGNS.find((c) => c._id === id) ?? F.CAMPAIGNS[0];
  }],
  [/^\/public\/campaigns\/[a-f0-9]{24}$/, ({ path }) =>
    F.CAMPAIGNS.find((c) => c._id === idFrom(path)) ?? F.CAMPAIGNS[0]],

  /* ------------------------------------------------------------- blogs -- */
  [new RegExp(`^${endpoints.campaigns.blogsAdvancedListing}`), ({ params }) =>
    paged(F.BLOGS, params)],
  [/^\/external\/campaign-blog\/[a-f0-9]{24}$/, ({ path }) =>
    F.BLOGS.find((b) => b._id === idFrom(path)) ?? F.BLOGS[0]],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/blogs\/[a-f0-9]{24}\/social-publications/, ({ params }) =>
    paged([], params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/blogs\/social-publication-rate-limits/, () => ({
    remaining: 5,
    limit: 5,
  })],

  /* --------------------------------------------------------- petitions -- */
  [new RegExp(`^${endpoints.campaigns.getPetitionsListings}`), ({ params }) =>
    paged(F.PETITIONS, params)],
  [/^\/external\/petition\/[a-f0-9]{24}$/, ({ path }) =>
    F.PETITIONS.find((p) => p._id === idFrom(path)) ?? F.PETITIONS[0]],

  /* ------------------------------------------------------------ trials -- */
  [new RegExp(`^${endpoints.trial.topRecommendations}$`), () => F.TRIALS],
  [new RegExp(`^${endpoints.trial.getAllTrials}$`), ({ params }) => paged(F.TRIALS, params)],
  [new RegExp(`^${endpoints.trial.advancedListing}`), ({ params }) => paged(F.TRIALS, params)],
  [new RegExp(`^${endpoints.standaloneTrail.getStats}$`), () => ({
    totalTrials: F.TRIALS.length,
    activeTrials: 4,
    totalVotes: 6480,
    totalRewardsDistributed: 82_400,
  })],
  [new RegExp(`^${endpoints.standaloneTrail.getAll}$`), ({ params }) =>
    paged(F.TRIALS.slice(0, 4), params)],
  [/^\/external\/trial-draft\/advanced-listing/, ({ params }) =>
    paged(F.TRIALS.slice(4), params)],
  [/^\/external\/trial-draft\/[a-f0-9]{24}$/, ({ path }) =>
    F.TRIALS.find((t) => t._id === idFrom(path)) ?? F.TRIALS[0]],
  [/^\/external\/trial\/[a-f0-9]{24}$/, ({ path }) =>
    F.TRIALS.find((t) => t._id === idFrom(path)) ?? F.TRIALS[0]],

  /* ------------------------------------------------------------- polls -- */
  [new RegExp(`^${endpoints.poll.myPolls.getMyPollsStats}$`), () => ({
    totalPolls: F.MY_POLLS.length,
    activePolls: 4,
    totalVotes: 3820,
    totalViews: 11_240,
    totalRewardsDistributed: 46_200,
    entries: F.MY_POLLS,
  })],
  [new RegExp(`^${endpoints.poll.myPolls.getAllMyPolls}$`), ({ params }) =>
    paged(F.MY_POLLS, params)],
  [/^\/external\/poll\/my-polls\/[a-f0-9]{24}$/, ({ path }) =>
    F.POLLS.find((p) => p._id === idFrom(path)) ?? F.POLLS[0]],
  [/^\/external\/poll\/[a-f0-9]{24}$/, ({ path }) =>
    F.POLLS.find((p) => p._id === idFrom(path)) ?? F.POLLS[0]],
  [new RegExp(`^${endpoints.poll.getPolls}$`), ({ params }) => paged(F.POLLS, params)],

  /* ------------------------------------------------------------ assets -- */
  [new RegExp(`^${endpoints.assets.getAssetsInfo}$`), () => F.ASSET_COINS],
  [new RegExp(`^${endpoints.assets.getLedgers}`), ({ params }) => paged(F.LEDGERS, params)],
  [new RegExp(`^${endpoints.assets.getSellIntentLedgers}`), ({ params }) =>
    paged(F.TRANSACTIONS, params)],
  [new RegExp(`^${endpoints.assets.getStrainSellIntentLedgers}`), ({ params }) =>
    paged(F.TRANSACTIONS.filter((t) => t.chain === "strain"), params)],
  [new RegExp(`^${endpoints.assets.getSellIntentStats}`), () => ({
    pending: 1,
    processing: 1,
    completed: 4,
    totalVolume: 24_800,
  })],

  /* ----------------------------------------------------------- strain -- */
  [new RegExp(`^${endpoints.strain.getWeb2SellStatus}$`), () => ({ enabled: true })],
  [new RegExp(`^${endpoints.strain.getClaimState}$`), () => ({
    canClaim: true,
    claimableAmount: 1_250_000_000,
    lastClaimedAt: F.daysAgo(1),
    streakDays: 12,
  })],

  /* ---------------------------------------------------------- payments -- */
  [/^\/external\/payment\/subscriptions\/[^/]+\/allowance$/, () => ({
    allowanceInMinor: 4900,
    currency: "USD",
    isSufficient: true,
  })],
  [/^\/external\/payment\/subscriptions\/[^/]+$/, () => ({
    _id: "sub-demo-1",
    status: "active",
    planName: "Growth",
    currentPeriodEnd: F.daysFromNow(24),
  })],
  [/^\/external\/payment\/subscriptions$/, ({ params }) => paged([], params)],
  [/^\/external\/payment\/[^/]+$/, ({ path }) => ({
    _id: path.split("/").pop(),
    status: "succeeded",
    amountInMinor: 4900,
    currency: "USD",
    createdAt: F.daysAgo(1),
  })],
  [new RegExp(`^${endpoints.payment.offlineProducts}$`), () => []],

  /* --------------------------------------------------------------- ads -- */
  [new RegExp(`^${endpoints.ad.ad.advancedListing}`), ({ params }) => paged([], params)],

  /* -------------------------------------------------------- industries -- */
  [new RegExp(`^${endpoints.industries.advancedListing}`), ({ params }) =>
    paged(F.INDUSTRIES, params)],

  /* -------------------------------------------------------------- INKD -- */
  [new RegExp(`^${endpoints.inkd.topIndustries}$`), () => F.INDUSTRIES],
  [/^\/external\/inkd\/blogs\/[a-f0-9]{24}\/trials$/, ({ params }) =>
    paged(F.TRIALS.slice(0, 3), params)],
  [/^\/external\/inkd\/blogs\/[a-f0-9]{24}$/, ({ path }) =>
    F.BLOGS.find((b) => b._id === idFrom(path)) ?? F.BLOGS[0]],
  [new RegExp(`^${endpoints.inkd.getAllInkdBlogs}`), ({ params }) => paged(F.BLOGS, params)],

  /* ------------------------------------------------------------ events -- */
  [new RegExp(`^${endpoints.events.discover}`), ({ params }) => paged(F.EVENTS, params)],
  [new RegExp(`^${endpoints.events.myTickets}$`), ({ params }) => paged([], params)],
  [new RegExp(`^${endpoints.events.myPurchasedEvents}$`), ({ params }) =>
    paged(F.EVENTS.slice(0, 2), params)],
  [/^\/external\/events\/[a-f0-9]{24}$/, ({ path }) =>
    F.EVENTS.find((e) => e._id === idFrom(path)) ?? F.EVENTS[0]],

  /* --------------------------------------------------------- locations -- */
  [new RegExp(`^${endpoints.location.getAllCountries}`), () => F.COUNTRIES],
  [new RegExp(`^${endpoints.location.getAllStates}`), () => F.STATES],
  [new RegExp(`^${endpoints.location.getAllCities}`), () => F.CITIES],

  /* -------------------------------------------------------- misc reads -- */
  [new RegExp(`^${endpoints.externalUsers.all}`), ({ params }) => paged([], params)],
  [new RegExp(`^${endpoints.preference.getQuestions}$`), () => ({ entries: [] })],
  [/^\/external\/entity-link\/list-forward\//, () => []],
  [/^\/common\/app-config\//, () => ({ enabled: true })],
  [/^\/external\/grwb\/user-details/, () => ({ linked: false })],
  [/^\/external\/web3\/getxamanpayload/, () => ({ meta: { signed: false } })],
];

/** Writes never persist. They resolve so the UI can show its success state. */
const WRITE_ROUTES: Route[] = [
  [new RegExp(`^${endpoints.auth.logout}$`), () => ok("Signed out")],
  [/^\/external\/poll\/cast$/, () => ok("Vote recorded (demo only)")],
  [/^\/external\/trial\/cast$/, () => ok("Vote recorded (demo only)")],
  [/^\/external\/petition\/cast-vote$/, () => ok("Signature recorded (demo only)")],
  [/^\/external\/payment\/create-payment-intent$/, () => ({
    _id: "pi_demo_sandbox",
    clientSecret: "pi_demo_sandbox_secret",
    status: "requires_confirmation",
    amountInMinor: 4900,
    currency: "USD",
  })],
];

/* -------------------------------------------------------------- resolve --- */

function match(routes: Route[], ctx: Parameters<Handler>[0]) {
  for (const [test, handler] of routes) {
    if (test.test(ctx.path)) return { hit: true, value: handler(ctx) };
  }
  return { hit: false, value: undefined };
}

export function resolveMock(rawUrl: string, method: MockMethod, body: any) {
  const { path, params } = splitUrl(rawUrl ?? "");
  const ctx = { path, params, method, body };

  if (method === "get") {
    const res = match(GET_ROUTES, ctx);
    if (res.hit) return res.value;
    // Unmapped read: an empty page is the safest shape for list-driven UI.
    if (import.meta.env.DEV) {
      console.info(`[sandbox] unmapped GET ${path} — returning empty page`);
    }
    return paged([], params);
  }

  const res = match(WRITE_ROUTES, ctx);
  if (res.hit) return res.value;
  if (import.meta.env.DEV) {
    console.info(`[sandbox] unmapped ${method.toUpperCase()} ${path} — returning success`);
  }
  return ok("Saved (demo only — nothing was stored)");
}
