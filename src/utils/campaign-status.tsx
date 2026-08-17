export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  LIVE: "live",
  PAUSED: "paused",
  ENDED: "ended",
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;

export const campaignStatuses = [
  CAMPAIGN_STATUS.DRAFT,
  CAMPAIGN_STATUS.LIVE,
  CAMPAIGN_STATUS.PAUSED,
  CAMPAIGN_STATUS.ENDED,
  CAMPAIGN_STATUS.ARCHIVED,
  CAMPAIGN_STATUS.DELETED,
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

// ---------------- Transitions (matches backend exactly) ----------------
export const CAMPAIGN_TRANSITION_MAP: Record<CampaignStatus, CampaignStatus[]> =
  {
    draft: ["live", "ended", "archived", "deleted"],
    live: ["paused", "ended", "archived", "deleted"],
    paused: ["live", "ended", "archived", "deleted"],
    ended: ["archived", "deleted"],
    archived: ["deleted"],
    deleted: [],
  };

export function buildReverseTransitionMap(
  forward: Record<CampaignStatus, CampaignStatus[]>
) {
  const reverse = {
    draft: [],
    live: [],
    paused: [],
    ended: [],
    archived: [],
    deleted: [],
  } as Record<CampaignStatus, CampaignStatus[]>;

  (Object.keys(forward) as CampaignStatus[]).forEach((from) => {
    forward[from].forEach((to) => {
      if (!reverse[to].includes(from)) reverse[to].push(from);
    });
  });

  return reverse;
}

export const CAMPAIGN_ALLOWED_FROM_MAP = buildReverseTransitionMap(
  CAMPAIGN_TRANSITION_MAP
);

export const canTransition = (from: CampaignStatus, to: CampaignStatus) =>
  CAMPAIGN_TRANSITION_MAP[from]?.includes(to);

// ---------------- UI helpers ----------------
export function campaignStatusLabel(s: CampaignStatus) {
  switch (s) {
    case CAMPAIGN_STATUS.DRAFT:
      return "Draft";
    case CAMPAIGN_STATUS.LIVE:
      return "Live";
    case CAMPAIGN_STATUS.PAUSED:
      return "Paused";
    case CAMPAIGN_STATUS.ENDED:
      return "Ended";
    case CAMPAIGN_STATUS.ARCHIVED:
      return "Archived";
    case CAMPAIGN_STATUS.DELETED:
      return "Deleted";
    default:
      return s;
  }
}

/**
 * ✅ Reusable Status Pill (different color per status)
 */
export function StatusPill({ status }: { status: CampaignStatus }) {
  switch (status) {
    case CAMPAIGN_STATUS.LIVE:
      return (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[9px] xl:text-xs font-semibold text-emerald-700 ring-1 ring-emerald-400">
          Active
        </span>
      );

    case CAMPAIGN_STATUS.PAUSED:
      return (
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[9px] xl:text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          Paused
        </span>
      );

    case CAMPAIGN_STATUS.ENDED:
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] xl:text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          Ended
        </span>
      );

    case CAMPAIGN_STATUS.DRAFT:
      return (
        <span className="rounded-full bg-sky-50 px-3 py-1 text-[9px] xl:text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
          Draft
        </span>
      );

    case CAMPAIGN_STATUS.ARCHIVED:
      return (
        <span className="rounded-full bg-violet-50 px-3 py-1 text-[9px] xl:text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
          Archived
        </span>
      );

    default:
      return (
        <span className="rounded-full bg-rose-50 px-3 py-1 text-[9px] xl:text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
          Deleted
        </span>
      );
  }
}

export type HeaderAction = "END" | "ARCHIVE" | "DELETE";

export function headerActionsForStatus(status: CampaignStatus): HeaderAction[] {
  switch (status) {
    case CAMPAIGN_STATUS.DRAFT:
    case CAMPAIGN_STATUS.LIVE:
    case CAMPAIGN_STATUS.PAUSED:
      return ["END", "ARCHIVE", "DELETE"];
    case CAMPAIGN_STATUS.ENDED:
      return ["ARCHIVE", "DELETE"];
    case CAMPAIGN_STATUS.ARCHIVED:
      return ["DELETE"];
    default:
      return [];
  }
}

export type FooterActionKey = "MAKE_LIVE" | "PAUSE";

export function footerActionsForStatus(status: CampaignStatus) {
  switch (status) {
    case CAMPAIGN_STATUS.DRAFT:
      return [{ key: "MAKE_LIVE" as const, label: "LAUNCH" }];
    case CAMPAIGN_STATUS.LIVE:
      return [{ key: "PAUSE" as const, label: "PAUSE" }];
    case CAMPAIGN_STATUS.PAUSED:
      return [{ key: "MAKE_LIVE" as const, label: "RESUME" }];
    default:
      return [];
  }
}

/** Campaign statuses that allow creating new blogs. */
export const CAMPAIGN_STATUSES_ALLOWING_BLOG_CREATION: CampaignStatus[] = [
  CAMPAIGN_STATUS.DRAFT,
  CAMPAIGN_STATUS.LIVE,
  CAMPAIGN_STATUS.PAUSED,
];

export function canCreateBlogByCampaignStatus(
  status: string | null | undefined
): boolean {
  const s = String(status ?? "").toLowerCase();
  return CAMPAIGN_STATUSES_ALLOWING_BLOG_CREATION.includes(s as CampaignStatus);
}
