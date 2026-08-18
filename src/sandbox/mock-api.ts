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
import * as S from "./state";

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

/**
 * Nested-`meta` envelope: `{entries, meta:{total,page,pageSize,totalPages}}`.
 * Used by the InfiniteSelect-driven pickers (cities/countries/industries),
 * which read `page.meta.total` — distinct from the flat shape `paged()` above
 * returns for list screens.
 */
function pagedMeta<T>(all: T[], params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1) || 1;
  const pageSize = Number(params.get("pageSize") ?? 50) || 50;
  const start = (page - 1) * pageSize;
  const entries = all.slice(start, start + pageSize);
  return {
    entries,
    meta: {
      total: all.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
    },
  };
}

/** Resolve one fixture campaign by id, with lifecycle overlays applied. */
function findCampaign(id: string | null) {
  const c = F.CAMPAIGNS.find((c) => c._id === id) ?? F.CAMPAIGNS[0];
  return S.applyCampaignOverlay(c);
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
    paged(S.applyCampaignListOverlay(F.MY_CAMPAIGNS), params)],
  [new RegExp(`^${endpoints.campaigns.all}$`), ({ params }) =>
    paged(S.applyCampaignListOverlay(F.CAMPAIGNS), params)],
  [new RegExp(`^${endpoints.campaigns.plans}$`), () => F.CAMPAIGN_PLANS],
  [new RegExp(`^${endpoints.campaigns.getBookmarks}$`), ({ params }) =>
    paged(F.BOOKMARKS, params)],
  [new RegExp(`^${endpoints.campaigns.allPayments}$`), ({ params }) =>
    paged(F.PAYMENTS, params)],
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
  [/^\/external\/campaigns\/([a-f0-9]{24})\/inkd-agents\/[a-f0-9]{24}$/, ({ path }) => {
    const campaignId = path.split("/")[3];
    return F.makeInkDAgentListing(campaignId).userOwnedAgent;
  }],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents$/, ({ path }) =>
    F.makeInkDAgentListing(path.split("/")[3])],
  // The campaign page reads `activeTrials`/`endedTrials`, not a paged envelope.
  [/^\/external\/campaigns\/[a-f0-9]{24}\/trials$/, ({ path }) => {
    const campaignId = idFrom(path);
    const mine = F.TRIALS.filter(
      (t) => String(t.belongsToCampaignId) === String(campaignId),
    );
    const rows = mine.length ? mine : F.TRIALS.slice(0, 3);
    return {
      activeTrials: rows,
      endedTrials: [],
      entries: rows,
      total: rows.length,
    };
  }],
  /* -------------------------------------------------------- QR library -- */
  [/^\/external\/campaigns\/qr\/advanced-listing/, ({ params }) => {
    const campaignIds = (params.get("belongsToCampaignIds") ?? "").split(",").filter(Boolean);
    const rows = campaignIds.flatMap((id) => F.makeQrCodesForCampaign(id));
    return paged(rows, params);
  }],
  [/^\/external\/campaigns\/qr\/stats/, ({ params }) => {
    const qrId = params.get("campaignQrIds") ?? "";
    return F.makeQrStats(qrId);
  }],
  // Detail must be registered after advanced-listing/stats so those literals
  // aren't captured as an id by this looser matcher.
  [/^\/external\/campaigns\/qr\/[a-zA-Z0-9]+$/, ({ path }) => {
    const qrId = path.split("/").pop() ?? "";
    const allQrRows = F.IDS.campaigns.flatMap((id) => F.makeQrCodesForCampaign(id));
    // The adapter already wraps this return value as response.data.data, so
    // the detail page's `resp?.data?.data` resolves straight to this object —
    // returning `{ data: row }` here would double-wrap and hide every field.
    return allQrRows.find((q) => q._id === qrId) ?? allQrRows[0];
  }],

  /* --------------------------------------------------------- co-owners -- */
  [/^\/external\/campaigns\/co-owner\/campaign\/[a-f0-9]{24}$/, ({ path }) =>
    F.makeCoOwnerListing(idFrom(path) ?? "")],
  [/^\/external\/campaigns\/co-owner\/[a-f0-9]{24}$/, () => null],

  /* --------------------------------------------------- subscription mgmt -- */
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/allowance$/, () => ({
    subscriptionId: "subsc-demo",
    walletAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
    spenderAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    tokenSymbol: "USDC",
    allowanceAtomic: "5000000000",
    lastSyncedAt: F.daysAgo(1),
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/payments/, ({ path, params }) =>
    paged(F.makeSubscriptionPayments(idFrom(path) ?? ""), params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription$/, ({ path }) =>
    F.makeSubscriptionRecord(idFrom(path) ?? "")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/social$/, ({ path }) =>
    F.makeSocialStatus(findCampaign(idFrom(path)))],

  /* -------------------------------------------------------------- events -- */
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events\/[a-f0-9]{24}\/attendees/, ({ path, params }) => {
    const eventId = path.split("/events/")[1]?.split("/")[0] ?? "";
    return paged((F.EVENT_ATTENDEES as Record<string, unknown[]>)[eventId] ?? [], params);
  }],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events\/[a-f0-9]{24}$/, ({ path }) =>
    F.EVENTS.find((e) => e._id === idFrom(path.split("/events/")[1])) ?? F.EVENTS[0]],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events/, ({ path, params }) => {
    const campaignId = idFrom(path);
    const status = params.get("status");
    const rows = F.EVENTS.filter(
      (e) =>
        String(e.belongsToCampaignId) === String(campaignId) &&
        (!status || e.status === status),
    );
    return paged(rows, params);
  }],

  [/^\/external\/campaigns\/trial\/[a-f0-9]{24}$/, ({ path }) => {
    const trial = F.TRIALS.find((t) => t._id === idFrom(path)) ?? F.TRIALS[0];
    // The Top-up modal AND the launched-trial edit page both expect the trial
    // nested under a `trial` key, alongside its polls.
    return { trial: { ...trial, polls: F.POLLS.filter((p) => p.belongsToTrialId === trial._id) } };
  }],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/(user|owner)$/, ({ path }) =>
    findCampaign(idFrom(path))],
  [/^\/public\/campaigns\/[a-f0-9]{24}$/, ({ path }) =>
    F.CAMPAIGNS.find((c) => c._id === idFrom(path)) ?? F.CAMPAIGNS[0]],

  /* ------------------------------------------------------------- blogs -- */
  [new RegExp(`^${endpoints.campaigns.blogsAdvancedListing}`), ({ params }) => {
    const campaignId = params.get("belongsToCampaignId");
    const rows = F.BLOGS.filter(
      (b) => !b.archivedAt && (!campaignId || String(b.belongsToCampaignId) === campaignId),
    );
    const page = paged(rows, params);
    // index.tsx reads a NESTED `meta` object, not the flat pagination fields.
    return { ...page, meta: { total: page.total, page: page.page, pageSize: page.pageSize, totalPages: page.totalPages } };
  }],
  [/^\/external\/campaign-blog\/[a-f0-9]{24}$/, ({ path }) =>
    F.BLOGS.find((b) => b._id === idFrom(path)) ?? F.BLOGS[0]],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/blogs\/[a-f0-9]{24}\/social-publications/, ({ params }) =>
    paged([], params)],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/blogs\/social-publication-rate-limits/, () => ({
    remaining: 5,
    limit: 5,
  })],

  /* --------------------------------------------------------- petitions -- */
  [new RegExp(`^${endpoints.campaigns.getPetitionsListings}`), ({ params }) => {
    const campaignId = params.get("belongsToCampaignId");
    const rows = F.PETITIONS.filter(
      (p) => !campaignId || String(p.belongsToCampaignId) === campaignId,
    );
    return paged(rows, params);
  }],
  [/^\/external\/petition\/[a-f0-9]{24}$/, ({ path }) =>
    F.PETITIONS.find((p) => p._id === idFrom(path)) ?? F.PETITIONS[0]],

  /* ------------------------------------------------------------ trials -- */
  [new RegExp(`^${endpoints.trial.topRecommendations}$`), () => F.TRIALS],
  // /trial reads `data.data` directly as an array.
  [new RegExp(`^${endpoints.trial.getAllTrials}$`), () => F.TRIALS],
  [new RegExp(`^${endpoints.trial.advancedListing}`), ({ params }) => paged(F.TRIALS, params)],
  [new RegExp(`^${endpoints.standaloneTrail.getStats}$`), () => ({
    totalTrials: F.TRIALS.length,
    activeTrials: 4,
    totalVotes: 6480,
    totalRewardsDistributed: 82_400,
  })],
  [new RegExp(`^${endpoints.standaloneTrail.getAll}$`), ({ params }) =>
    paged(F.TRIALS.slice(0, 4), params)],
  [/^\/external\/trial-draft\/advanced-listing/, ({ params }) => {
    const campaignId = params.get("belongsToCampaignId");
    const rows = F.DRAFT_TRIALS.filter(
      (d) => !campaignId || String(d.belongsToCampaignId) === campaignId,
    );
    return paged(rows, params);
  }],
  [/^\/external\/trial-draft\/[a-f0-9]{24}$/, ({ path }) =>
    F.DRAFT_TRIALS.find((t) => t._id === idFrom(path)) ?? F.DRAFT_TRIALS[0]],
  /**
   * The trial reader expects the trial wrapped alongside its polls and an
   * access flag — not the bare trial document.
   */
  [/^\/external\/trial\/[a-f0-9]{24}$/, ({ path }) => {
    const trial = F.TRIALS.find((t) => t._id === idFrom(path)) ?? F.TRIALS[0];
    return {
      accessible: true,
      seenAt: null,
      trial,
      polls: F.POLLS.filter((p) => p.belongsToTrialId === trial._id),
    };
  }],

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
  /**
   * History screens pass ?action=a,b,c to scope the ledger to their own rows
   * (rewards vs donations vs payments), so the filter has to be honoured.
   */
  [new RegExp(`^${endpoints.assets.getLedgers}`), ({ params }) => {
    const actionParam = params.get("action");
    if (!actionParam) return paged(F.LEDGERS, params);
    const allowed = new Set(actionParam.split(",").map((a) => a.trim()));
    return paged(
      F.LEDGERS.filter((l) => allowed.has(l.action)),
      params,
    );
  }],
  // Non-strain exchange screens scope the ledger by ?assetId=…
  [new RegExp(`^${endpoints.assets.getSellIntentLedgers}`), ({ params }) => {
    const assetId = params.get("assetId");
    const rows = assetId
      ? F.TRANSACTIONS.filter((t) => String(t.assetId) === assetId)
      : F.TRANSACTIONS;
    return paged(rows, params);
  }],
  // Strain uses its own route and filters by ?status=…
  [new RegExp(`^${endpoints.assets.getStrainSellIntentLedgers}`), ({ params }) => {
    const status = params.get("status");
    const rows = F.TRANSACTIONS.filter(
      (t) =>
        t.assetId === "xHigh" && (!status || t.metadata.status === status),
    );
    return paged(rows, params);
  }],
  /**
   * Keyed by assetId; `approved` is a base (minor) amount that the UI converts
   * to parent units for the "successfully earned" figure.
   */
  [new RegExp(`^${endpoints.assets.getSellIntentStats}`), () => F.SELL_INTENT_STATS],

  /* ----------------------------------------------------------- strain -- */
  [new RegExp(`^${endpoints.strain.getWeb2SellStatus}$`), () => ({
    isSellStrainActive: true,
  })],
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
    pagedMeta(F.INDUSTRIES, params)],

  /* -------------------------------------------------------------- INKD -- */
  [new RegExp(`^${endpoints.inkd.topIndustries}$`), () => F.INDUSTRIES],
  // The INKD reader reads `activeTrials`, not a paged envelope.
  [/^\/external\/inkd\/blogs\/[a-f0-9]{24}\/trials$/, () => ({
    activeTrials: F.TRIALS.slice(0, 3),
    endedTrials: [],
  })],
  [/^\/external\/inkd\/blogs\/[a-f0-9]{24}$/, ({ path }) =>
    F.BLOGS.find((b) => b._id === idFrom(path)) ?? F.BLOGS[0]],
  [new RegExp(`^${endpoints.inkd.getAllInkdBlogs}`), ({ params }) => paged(F.BLOGS, params)],

  /* ------------------------------------------------------------ events -- */
  [new RegExp(`^${endpoints.events.discover}`), ({ params }) => {
    // Optionally scoped to one campaign by the public campaign page.
    const campaignId = params.get("campaignId");
    const rows = campaignId
      ? F.DISCOVER_EVENTS.filter(
          (r) => String(r.event.belongsToCampaignId) === String(campaignId),
        )
      : F.DISCOVER_EVENTS;
    return paged(rows, params);
  }],
  [new RegExp(`^${endpoints.events.myTickets}$`), ({ params }) =>
    paged(
      F.EVENTS.filter((e) => e.status === "published").slice(0, 1).map((e) => ({
        ticketId: `${e._id}-mine`,
        event: e,
        issuedAt: F.daysAgo(2),
      })),
      params,
    )],
  [new RegExp(`^${endpoints.events.myPurchasedEvents}$`), ({ params }) =>
    paged(F.EVENTS.filter((e) => e.status === "published").slice(0, 1), params)],
  // Public viewer detail: {event, viewerContext} — not the bare event doc.
  [/^\/external\/events\/[a-f0-9]{24}$/, ({ path }) => {
    const event = F.EVENTS.find((e) => e._id === idFrom(path)) ?? F.EVENTS[0];
    const isFree = event.pricing.mode === "free";
    return {
      event,
      viewerContext: {
        isOwner: false,
        isInvited: false,
        hasTicket: isFree,
        canPurchase: !isFree,
        canViewLocationDetails: true,
      },
    };
  }],

  /* --------------------------------------------------------- locations -- */
  // InfiniteSelect (add-info's city/country pickers) expects {entries, meta}.
  [new RegExp(`^${endpoints.location.getAllCountries}`), ({ params }) =>
    pagedMeta(F.COUNTRIES, params)],
  [new RegExp(`^${endpoints.location.getAllStates}`), ({ params }) =>
    pagedMeta(F.STATES, params)],
  [new RegExp(`^${endpoints.location.getAllCities}`), ({ params }) =>
    pagedMeta(F.CITIES, params)],

  /* -------------------------------------------------------- misc reads -- */
  [new RegExp(`^${endpoints.externalUsers.all}`), ({ params }) => paged([], params)],
  [new RegExp(`^${endpoints.preference.getQuestions}$`), () => ({ entries: [] })],
  /**
   * Must be an object, not a bare array: EntityLinkings reads
   * `data.data.data.entries || []`, and on an array `.entries` resolves to
   * Array.prototype.entries (a function), which then fails `.map()`.
   */
  [/^\/external\/entity-link\/list-forward\//, () => ({ entries: [] })],
  [/^\/common\/app-config\//, () => ({ enabled: true })],
  [/^\/external\/grwb\/user-details/, () => ({ linked: false })],
  [/^\/external\/web3\/getxamanpayload/, () => ({ meta: { signed: false } })],
];

/** Writes never persist. They resolve so the UI can show its success state. */
const WRITE_ROUTES: Route[] = [
  [new RegExp(`^${endpoints.auth.logout}$`), () => ok("Signed out")],
  /**
   * Creating a Basic campaign navigates to the new campaign's edit page, so the
   * response has to carry an `_id`. It points at an existing fixture campaign —
   * nothing is persisted, so the edit screens need something real to load.
   */
  [new RegExp(`^${endpoints.campaigns.basic.create}$`), ({ body }) => ({
    ...F.CAMPAIGNS[0],
    name: (body as any)?.name ?? F.CAMPAIGNS[0].name,
    goal: (body as any)?.goal ?? "",
    status: "draft",
  })],
  [/^\/external\/poll\/cast$/, () => ok("Vote recorded")],
  [/^\/external\/trial\/cast$/, () => ok("Vote recorded")],

  /* ------------------------------------------------ campaign lifecycle -- */
  [/^\/external\/campaigns\/make-live$/, ({ body }) => {
    S.setCampaignStatus(String((body as any)?.campaignId ?? ""), "live");
    return ok("Campaign live");
  }],
  [/^\/external\/campaigns\/pause$/, ({ body }) => {
    S.setCampaignStatus(String((body as any)?.campaignId ?? ""), "paused");
    return ok("Campaign paused");
  }],
  [/^\/external\/campaigns\/end$/, ({ body }) => {
    S.setCampaignStatus(String((body as any)?.campaignId ?? ""), "ended");
    return ok("Campaign ended");
  }],
  [/^\/external\/campaigns\/archive$/, ({ body }) => {
    S.setCampaignStatus(String((body as any)?.campaignId ?? ""), "archived");
    return ok("Campaign archived");
  }],
  [/^\/external\/campaigns\/delete$/, ({ body }) => {
    S.markCampaignDeleted(String((body as any)?.campaignId ?? ""));
    return ok("Campaign deleted");
  }],
  // Add Info save. Response body is ignored by the caller — any 2xx works.
  [/^\/external\/campaigns\/[a-f0-9]{24}$/, () => ok("Campaign updated")],

  /* -------------------------------------------------------------- trails -- */
  [/^\/external\/campaigns\/trial\/sequence$/, () => ok("Order saved")],
  [/^\/external\/campaigns\/trial\/top-up$/, () => ok("Successfully topped up rewards")],
  [/^\/external\/campaigns\/trial\/[a-f0-9]{24}\/resource-assets$/, () => ok("Trail media updated")],
  [/^\/external\/campaigns\/poll\/[a-f0-9]{24}\/resource-assets$/, () => ok("Poll media updated")],
  [/^\/external\/campaigns\/trial\/[a-f0-9]{24}$/, () => ok("Trail deleted")],
  [/^\/external\/campaigns\/trial$/, () => ok("Trail created")],
  [/^\/external\/trial-draft\/[a-f0-9]{24}$/, () => ok("Draft saved")],
  [/^\/external\/trial-draft$/, () => ok("Draft saved")],

  /* ----------------------------------------------------------- petitions -- */
  [/^\/external\/petition\/[a-f0-9]{24}$/, () => ok("Petition updated")],
  [/^\/external\/petition$/, () => ok("Petition created")],

  /* --------------------------------------------------------------- blogs -- */
  [/^\/external\/campaign-blog\/draft$/, () => ok("Saved as draft")],
  [/^\/external\/campaign-blog\/live$/, () => ok("Blog published")],
  // Endpoint map has no leading slash for delete — match both forms.
  [/^\/?external\/campaign-blog$/, ({ method }) =>
    method === "delete" ? ok("Blog deleted") : ok("Blog created")],
  [/^\/external\/campaign-blog\/[a-f0-9]{24}$/, () => ok("Blog updated")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/blogs\/[a-f0-9]{24}\/social-publications\/reconcile-pending$/, () => ({
    checkedCount: 0,
    updatedCount: 0,
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/blogs\/[a-f0-9]{24}\/social-publications$/, () => ({
    publishRunCode: `run_${Date.now()}`,
    publications: [],
    publishablePlatforms: ["x", "instagram"],
  })],

  /* -------------------------------------------------------------- events -- */
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events\/[a-f0-9]{24}\/publish$/, () => ok("Event published")],
  [/^\/external\/events\/[a-f0-9]{24}\/buy$/, () => ok("Ticket purchased")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events\/[a-f0-9]{24}$/, ({ method }) =>
    method === "delete" ? ok("Draft event deleted") : ok("Event updated")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/events$/, () => ok("Event saved")],

  /* ---------------------------------------------------------- co-owners -- */
  [/^\/external\/campaigns\/co-owner$/, ({ method }) => {
    if (method === "delete") return { removedCount: 1 };
    if (method === "patch") return ok("Permissions updated");
    return { added: ["demo-user"], alreadyCoOwners: [], invalidOrIneligible: [], skippedAsMainOwner: [] };
  }],

  /* -------------------------------------------------------------- InkD -- */
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents\/[a-f0-9]{24}\/status$/, () => ok("Agent status updated")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents\/[a-f0-9]{24}$/, () => ok("InkD agent updated")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-agents$/, () => ok("Campaign-owned InkD agent created")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/inkd-auto-social-publish$/, () => ok("Auto-publish settings saved")],

  /* --------------------------------------------------------------- QR -- */
  [/^\/external\/campaigns\/qr\/[a-zA-Z0-9]+$/, () => ok("QR saved")],
  [/^\/external\/campaigns\/qr$/, () => ok("QR created")],

  /* ---------------------------------------------------- subscriptions -- */
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/pause$/, () => ok("Subscription paused")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/unpause$/, () => ok("Subscription resumed")],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/subscription\/continue-now$/, () => ({
    paymentId: "pay_continue_demo",
    paymentSubscriptionId: "subsc-demo",
    trigger: "recovery",
    status: "processing",
    txHash: null,
    dispatchedAt: F.daysAgo(0),
  })],

  /* ------------------------------------------------------------ social -- */
  [/^\/external\/campaigns\/[a-f0-9]{24}\/social\/connect-url$/, () => ({
    accessUrl: "https://xpoll.io",
    sessionId: "sess_demo",
    expiresAt: F.daysFromNow(1),
    returnToPath: "/campaigns",
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/social\/link\/finalize$/, ({ path }) => ({
    social: F.makeSocialStatus(findCampaign(idFrom(path))),
  })],
  [/^\/external\/campaigns\/[a-f0-9]{24}\/social\/platform-preference$/, ({ path }) => ({
    social: F.makeSocialStatus(findCampaign(idFrom(path))),
  })],
  [/^\/external\/petition\/cast-vote$/, () => ok("Signature recorded")],
  /**
   * `isStripePaymentIntentResponse` requires BOTH `paymentId` and a non-empty
   * `clientSecret`, otherwise the checkout reports "couldn't start card payment".
   */
  [/^\/external\/payment\/create-payment-intent$/, ({ body }) => {
    const providerCode = (body as any)?.providerCode;
    const base = {
      paymentId: "pay_sandbox_0001",
      status: "requires_confirmation",
      currency: "USD",
    };
    // EVM rail expects on-chain instructions instead of a Stripe secret.
    if (providerCode && String(providerCode).toLowerCase().includes("evm")) {
      return {
        ...base,
        chainId: 8453,
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        toAddress: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
        amountInMinor: 64_200_000,
        decimals: 6,
      };
    }
    return {
      ...base,
      clientSecret: "pi_sandbox_0001_secret_abcdef",
      amountInMinor: 6420,
    };
  }],
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
  return ok("Saved");
}
