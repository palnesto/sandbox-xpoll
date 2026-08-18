/**
 * In-memory overlay for the sandbox.
 *
 * Fixtures are static, but a few actions have to *look* like they worked for a
 * walkthrough to make sense — pausing a campaign should flip its status pill,
 * deleting a trail should remove the row, and so on.
 *
 * This module holds those deltas in plain module scope: they survive client-side
 * navigation but reset on a full page reload. Nothing is written to
 * localStorage, sessionStorage, or any server.
 *
 * Read routes in ./mock-api.ts apply these overlays on top of ./fixtures.ts.
 */

/* ------------------------------------------------- campaign lifecycle --- */

export type CampaignStatusOverride =
  | "draft"
  | "live"
  | "paused"
  | "ended"
  | "archived";

const campaignStatus = new Map<string, CampaignStatusOverride>();

/** Campaigns removed via the delete action; filtered out of every listing. */
const deletedCampaigns = new Set<string>();

export function setCampaignStatus(id: string, status: CampaignStatusOverride) {
  if (!id) return;
  campaignStatus.set(String(id), status);
}

export function getCampaignStatus(id: string): CampaignStatusOverride | null {
  return campaignStatus.get(String(id)) ?? null;
}

export function markCampaignDeleted(id: string) {
  if (!id) return;
  deletedCampaigns.add(String(id));
}

export function isCampaignDeleted(id: string) {
  return deletedCampaigns.has(String(id));
}

/* ---------------------------------------------------- generic removals --- */

/**
 * Ids removed during this session, bucketed by entity type so a deleted trail
 * cannot collide with a deleted blog that happens to share an id.
 */
const removed: Record<string, Set<string>> = {};

export function markRemoved(kind: string, id: string) {
  if (!id) return;
  (removed[kind] ??= new Set()).add(String(id));
}

export function isRemoved(kind: string, id: string) {
  return removed[kind]?.has(String(id)) ?? false;
}

/** Drop any entity removed this session from a fixture list. */
export function withoutRemoved<T extends { _id?: string }>(
  kind: string,
  rows: T[],
): T[] {
  const gone = removed[kind];
  if (!gone?.size) return rows;
  return rows.filter((r) => !gone.has(String(r?._id)));
}

/* ------------------------------------------------------ toggle switches --- */

/** Boolean feature toggles flipped from the UI (petition enable, auto-publish…). */
const toggles = new Map<string, boolean>();

export function setToggle(key: string, value: boolean) {
  toggles.set(key, value);
}

export function getToggle(key: string, fallback: boolean) {
  return toggles.get(key) ?? fallback;
}

/* ------------------------------------------------------------- helpers --- */

/** Apply campaign-level overlays to a single fixture campaign object. */
export function applyCampaignOverlay<T extends { _id?: string; status?: string }>(
  campaign: T,
): T {
  const id = String(campaign?._id ?? "");
  const status = getCampaignStatus(id);
  if (!status) return campaign;
  return { ...campaign, status };
}

/** Apply overlays to a list, dropping anything deleted this session. */
export function applyCampaignListOverlay<
  T extends { _id?: string; status?: string },
>(campaigns: T[]): T[] {
  return campaigns
    .filter((c) => !isCampaignDeleted(String(c?._id ?? "")))
    .map(applyCampaignOverlay);
}
