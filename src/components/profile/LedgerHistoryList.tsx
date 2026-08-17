import { useMemo, useState } from "react";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { LEG_TYPES, type LegType } from "@/utils/currency-assets/leg-type";

type LedgerLeg = {
  _id: string;
  actionId: string;
  assetId: AssetType;
  from: string;
  to: string;
  amount: string; // base units
  legType: LegType;
  legName?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LedgerItem = {
  _id: string;
  action: string;
  metadata?: {
    status?: string;
    title?: string;
    trialTitle?: string;
    pollTitle?: string;
    kind?: string;
    entityId?: string;
    url?: string;
    paymentId?: string;
    username?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  legs?: LedgerLeg[];
};

type Paged<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

function formatDate(d?: string) {
  try {
    return new Date(d ?? Date.now()).toLocaleDateString([], {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function toHuman(valueBase: string, assetId: AssetType): string {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: valueBase,
      output: "string",
    }),
    "--",
  );
}

function defaultActionLabel(action: string) {
  if (action === "poll-reward") return "Poll Reward";
  if (action === "trial-reward") return "Trial Reward";
  if (action === "share-reward") return "Share Reward";
  if (action === "asset-purchase") return "Asset Purchase";
  if (action === "user-campaign-donation") return "Campaign Donation";
  if (action === "campaign-closure-settlement") return "Campaign Closure Settlement";
  if (action === "signup-bonus") return "Signup Bonus";
  return "Activity";
}

function legsForAction(item: LedgerItem): LedgerLeg[] {
  const legs = Array.isArray(item.legs) ? item.legs : [];

  // Reward-like actions
  if (
    item.action === "poll-reward" ||
    item.action === "trial-reward" ||
    item.action === "share-reward" 
  ) {
    return legs.filter((l) => l.legType === LEG_TYPES.REWARD);
  }

  // Marketplace
  if (item.action === "asset-purchase") {
    return legs.filter((l) => l.legType === ("purchase-asset" as LegType));
  }

  // Fallback: show all legs
  return legs;
}

const statusChipClasses =
  "bg-emerald-100 text-emerald-700 border border-emerald-200";

export function LedgerHistoryList(props: {
  actions: string[];
  pageSize?: number;
  emptyText?: string;
}) {
  const { actions, pageSize = 10, emptyText = "No activity yet." } = props;

  const [page, setPage] = useState(1);

  const base = endpoints.assets.getLedgers;
  const actionsParam = actions.join(",");
  const url = `${base}?page=${page}&pageSize=${pageSize}&action=${encodeURIComponent(
    actionsParam,
  )}`;

  const { data, isLoading, isError } = useApiQuery(url, { enabled: true });

  const paged: Paged<LedgerItem> | null = useMemo(() => {
    const root = (data as any)?.data?.data ?? (data as any)?.data ?? data;

    if (
      root &&
      typeof root.page === "number" &&
      typeof root.pageSize === "number" &&
      Array.isArray(root.items)
    ) {
      return {
        page: root.page,
        pageSize: root.pageSize,
        total: typeof root.total === "number" ? root.total : root.items.length,
        totalPages: typeof root.totalPages === "number" ? root.totalPages : 1,
        items: root.items as LedgerItem[],
      };
    }
    return null;
  }, [data]);

  const rows = useMemo(() => {
    const allowed = new Set(actions);
    const items = (paged?.items ?? []).filter((it) => allowed.has(it.action));

    return items
      .map((it) => {
        const showLegs = legsForAction(it);
        if (showLegs.length === 0) return null;

        const title =
          it.metadata?.title ||
          it.metadata?.trialTitle ||
          it.metadata?.pollTitle ||
          showLegs[0]?.legName ||
          "Activity";

        const legs = showLegs.map((l) => {
          const spec = assetSpecs[l.assetId];
          const icon = spec?.img;
          const amountStr = toHuman(String(l.amount ?? "0"), l.assetId);
          const symbol = spec?.parentSymbol || spec?.parent || l.assetId;

          return { id: l._id, icon, amountStr, symbol, legType: l.legType };
        });

        return {
          id: it._id,
          title,
          date: formatDate(it.createdAt),
          legs,
          action: it.action,
          metadata: it.metadata ?? {},
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      date: string;
      legs: Array<{
        id: string;
        icon?: string;
        amountStr: string;
        symbol: string;
        legType: LegType;
      }>;
      action: string;
      metadata: any;
    }>;
  }, [actions, paged]);

  const totalPages = paged?.totalPages ?? 1;

  return (
    <div>
      {/* Loading */}
      {isLoading && (
        <ul className="space-y-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="h-4 w-56 bg-gray-200 rounded mb-3" />
              <div className="h-14 w-full bg-gray-100 rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {/* Error */}
      {!isLoading && isError && (
        <div className="text-center text-sm text-black/60 py-10">
          Failed to load activity.
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && (
        <>
          <ul className="space-y-4 mt-2">
            {rows.map((row) => {
              const actionLabel = defaultActionLabel(row.action);

              return (
                <li key={row.id} className="rounded-2xl bg-white/60 p-3">
                  {/* Title + date */}
                  <section className="flex items-start justify-between px-1">
                    <h2 className="text-[13px] font-medium text-gray-800 leading-snug">
                      {row.title}
                    </h2>

                    <section className="text-[11px] text-black/50 ml-3 shrink-0 flex items-center gap-2">
                      <p className="text-[11px] text-teal-600 font-medium">
                        {actionLabel}
                      </p>
                      {row.date}
                    </section>
                  </section>

                  {/* Legs */}
                  <div className="relative mt-2 rounded-xl bg-white p-3 shadow-sm space-y-2">
                    {row?.legs?.map((leg) => {
                      const chipText =
                        row.action === "asset-purchase"
                          ? "Purchased"
                          : "Rewarded";

                      return (
                        <div
                          key={leg.id}
                          className="flex items-center justify-between rounded-xl bg-gray-50 px-2 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {leg.icon ? (
                              <img
                                src={leg.icon}
                                alt={leg.symbol}
                                className="h-5 w-5 rounded-full object-contain"
                              />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-gray-200" />
                            )}
                            <div className="text-[12px] font-semibold">
                              {leg.amountStr}
                            </div>
                            <div className="text-[10px] text-black/60">
                              {leg.symbol}
                            </div>
                          </div>

                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-[2px] text-[9px] font-medium",
                              statusChipClasses,
                            ].join(" ")}
                          >
                            {chipText}
                          </span>
                        </div>
                      );
                    })}
                  </div>

{row.action === "campaign-closure-settlement" && (
  <section className="flex items-center justify-between px-2 py-2">
    <div className="flex items-center gap-2">
      <div className="text-xs text-teal-600 font-medium">
        Campaign ID : {row?.metadata?.campaignId}
      </div>
    </div>
  </section>
)}
                  {/* Optional extra info for share-reward */}
                  {row.action === "share-reward" && (
                    <section className="flex items-center justify-between px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-teal-600 font-medium">
                          {row?.metadata?.kind} id
                        </div>
                        <div className="text-[10px] text-black/60">
                          {row?.metadata?.entityId}
                        </div>
                      </div>

                      {row?.metadata?.url ? (
                        <a
                          href={row.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-blue-600 underline"
                        >
                          Open Link
                        </a>
                      ) : null}
                    </section>
                  )}

                  {/* Optional extra info for asset-purchase */}
                  {row.action === "asset-purchase" &&
                  row?.metadata?.paymentId ? (
                    <section className="px-2 py-2 text-[11px] text-black/60">
                      Payment id: {row.metadata.paymentId}
                    </section>
                  ) : null}
                </li>
              );
            })}

            {rows.length === 0 && (
              <li className="rounded-xl bg-white p-8 text-center text-sm text-black/50">
                {emptyText}
              </li>
            )}
          </ul>

          {paged && totalPages > 1 && (
            <nav className="pt-5 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    page === 1
                      ? "text-gray-400 border-gray-100 cursor-not-allowed"
                      : "text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Prev
                </button>

                {(() => {
                  const items: (number | "dots")[] = [];

                  if (totalPages <= 7) {
                    for (let p = 1; p <= totalPages; p++) items.push(p);
                  } else if (page <= 4) {
                    items.push(1, 2, 3, 4, 5, 6, "dots", totalPages);
                  } else if (page >= totalPages - 3) {
                    items.push(
                      1,
                      "dots",
                      totalPages - 5,
                      totalPages - 4,
                      totalPages - 3,
                      totalPages - 2,
                      totalPages - 1,
                      totalPages,
                    );
                  } else {
                    items.push(
                      1,
                      "dots",
                      page - 2,
                      page - 1,
                      page,
                      page + 1,
                      page + 2,
                      "dots",
                      totalPages,
                    );
                  }

                  return items.map((item, idx) => {
                    if (item === "dots") {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="px-2 text-xs text-gray-500 select-none"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNumber = item;
                    const isActive = pageNumber === page;

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={[
                          "px-3 py-1 text-xs rounded-full border",
                          isActive
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {pageNumber}
                      </button>
                    );
                  });
                })()}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    page === totalPages
                      ? "text-gray-400 border-gray-100 cursor-not-allowed"
                      : "text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
