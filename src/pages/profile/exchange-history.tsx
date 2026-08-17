import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  assetSpecs,
  type AssetType,
  ASSETS,
} from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { LEG_TYPES, LegType } from "@/utils/currency-assets/leg-type";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTxExplorerUrl } from "@/utils/txExplorer";
import { ArrowUpRight } from "lucide-react";

/** ────────────────────────── types ────────────────────────── */
type LedgerLeg = {
  _id: string;
  actionId: string;
  assetId: AssetType;
  from: string;
  to: string;
  amount: string;
  legType: LegType | "strain-sell-amount";
  legName?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LedgerItem = {
  _id: string;
  action: string;
  metadata?: {
    status?: string;
    chain?: string;
    walletAddress?: string;
    userExternalAccountId?: string;
    assetId?: AssetType;
    amount?: string;
    amountHigh?: string;
    fee?: string;
    feeXpoll?: string;
    feeXpollSettled?: number;
    txnHash?: string;
    txHash?: string;
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

type TxnStatus = "Pending" | "Completed" | "Rejected";

/** ────────────────────────── utils ────────────────────────── */
const statusChipClasses: Record<TxnStatus, string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

function prettyStatus(action: string, s?: string): TxnStatus {
  if (action === "sell-intent-reject") return "Rejected";
  const up = String(s ?? "PENDING").toUpperCase();
  if (up === "COMPLETED" || up === "APPROVE" || up === "APPROVED")
    return "Completed";
  if (up === "REJECT" || up === "REJECTED" || up === "FAILED")
    return "Rejected";
  return "Pending";
}

function formatDate(d: string | number | Date) {
  try {
    return new Date(d).toLocaleDateString([], {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function toHumanAmountBase(
  valueBase: string,
  assetId: AssetType,
  fixed = 3
): string {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: valueBase,
      output: "string",
      fixed,
    }),
    "—"
  );
}

export function mask(v?: string) {
  return v && v.length > 10 ? `${v.slice(0, 6)}....${v.slice(-6)}` : v || "";
}

/** ───────────── unified resolvers (IMPORTANT FIX) ───────────── */

function getIntentLeg(item: LedgerItem) {
  return (item.legs ?? []).find(
    (l) =>
      l.legType === LEG_TYPES.INTENT_AMOUNT ||
      l.legType === "strain-sell-amount"
  );
}

function getIntentAmount(item: LedgerItem): {
  amount: string;
  assetId: AssetType;
} | null {
  const leg = getIntentLeg(item);
  if (leg) {
    return { amount: leg.amount, assetId: leg.assetId };
  }

  if (
    item.action === "strain-sell-intent" &&
    item.metadata?.amountHigh &&
    item.metadata?.assetId
  ) {
    return {
      amount: item.metadata.amountHigh,
      assetId: item.metadata.assetId,
    };
  }

  return null;
}

function getXpollFee(item: LedgerItem): string {
  const feeLeg = (item.legs ?? []).find((l) => l.legType === LEG_TYPES.FEES);
  if (feeLeg) return feeLeg.amount;

  return (
    String(
      item.metadata?.feeXpollSettled ??
        item.metadata?.feeXpoll ??
        item.metadata?.fee ??
        "0"
    ) ?? "0"
  );
}

function getTxnHash(item: LedgerItem) {
  return item.metadata?.txnHash ?? item.metadata?.txHash ?? "";
}

/** ────────────────────────── component ────────────────────────── */
export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<TxnStatus | "All">("All");
  const [selected, setSelected] = useState<LedgerItem | null>(null);

  const actionsParam = [
    "sell-intent",
    "sell-intent-reject",
    "strain-sell-intent",
  ].join(",");

  const url = `${
    endpoints.assets.getLedgers
  }?page=${page}&pageSize=${pageSize}&action=${encodeURIComponent(
    actionsParam
  )}`;

  const { data, isLoading, isError } = useApiQuery(url, { enabled: true });

  const paged: Paged<LedgerItem> | null = useMemo(() => {
    const root = (data as any)?.data?.data ?? (data as any)?.data ?? data;
    if (root && Array.isArray(root.items)) {
      return {
        page: root.page,
        pageSize: root.pageSize,
        total: root.total,
        totalPages: root.totalPages ?? 1,
        items: root.items,
      };
    }
    return null;
  }, [data]);

  const rows = useMemo(() => {
    const out =
      paged?.items
        .map((it) => {
          const intent = getIntentAmount(it);
          if (!intent) return null;

          return {
            id: it._id,
            date: formatDate(it.createdAt ?? Date.now()),
            amountStr: toHumanAmountBase(intent.amount, intent.assetId),
            unitPretty:
              assetSpecs[intent.assetId]?.parentSymbol ?? intent.assetId,
            status: prettyStatus(it.action, it.metadata?.status),
            raw: it,
            txnHash: getTxnHash(it),
          };
        })
        .filter(Boolean) ?? [];

    return statusFilter === "All"
      ? out
      : out.filter((r) => r!.status === statusFilter);
  }, [paged, statusFilter]);

  /** ───────────── detail renderer ───────────── */
  const renderDetail = (item: LedgerItem) => {
    const intent = getIntentAmount(item);
    const xpollFee = getXpollFee(item);
    const status = prettyStatus(item.action, item.metadata?.status);

    return (
      <div>
        <div className="flex justify-between mb-2">
          <div className="text-sm text-black/70">
            {formatDate(item.createdAt ?? Date.now())}
          </div>
          <span
            className={[
              "rounded-full border px-2 py-[2px] text-[11px]",
              statusChipClasses[status],
            ].join(" ")}
          >
            {status}
          </span>
        </div>

        <div className="space-y-2 text-sm mt-4">
          <p className="flex justify-between">
            Order ID : <span>{mask(item._id)}</span>
          </p>

          {item?.metadata?.txHash && (
            <p className="flex justify-between">
              Txn Hash :{" "}
              <a
                href={getTxExplorerUrl(item?.metadata?.txHash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {mask(item?.metadata?.txHash)}
                <ArrowUpRight className="w-4 " />
              </a>
            </p>
          )}
          {item?.metadata?.txnHash && (
            <p className="flex justify-between">
              Txn Hash : <p>{mask(item?.metadata?.txnHash)}</p>
            </p>
          )}
          {item.metadata?.walletAddress && (
            <p className="flex justify-between">
              Wallet : <span>{mask(item.metadata.walletAddress)}</span>
            </p>
          )}

          <p className="flex justify-between">
            XPOLL Burned :
            <span>{toHumanAmountBase(xpollFee, ASSETS.X_POLL)}</span>
          </p>

          {intent && (
            <p className="flex justify-between">
              {assetSpecs[intent.assetId]?.parentSymbol} Burned :
              <span>{toHumanAmountBase(intent.amount, intent.assetId)}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F3F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#F2F3F5]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-3 py-3">
          <button
            className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center"
            onClick={() => navigate("/profile")}
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          <h1 className="text-[17px] font-semibold">Order History</h1>

          {/* Filters */}
          <div className="relative">
            <details className="group">
              <summary className="list-none">
                <button
                  className="rounded-full bg-white px-3 py-1.5 text-sm shadow inline-flex items-center gap-1"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    (
                      e.currentTarget.parentElement as HTMLDetailsElement
                    )?.click();
                  }}
                >
                  Filters
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </summary>

              <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/5">
                {(["All", "Pending", "Completed", "Rejected"] as const).map(
                  (opt) => (
                    <button
                      key={opt}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-gray-50 ${
                        statusFilter === opt ? "font-semibold" : ""
                      }`}
                      onClick={() => {
                        setStatusFilter(opt);
                        (
                          document.activeElement?.parentElement
                            ?.parentElement as HTMLDetailsElement
                        )?.removeAttribute("open");
                      }}
                    >
                      {opt}
                    </button>
                  )
                )}
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* List */}
      <main className="max-w-lg mx-auto px-3 pb-10">
        {isLoading && (
          <ul className="space-y-3 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && isError && (
          <div className="text-center text-sm text-black/60 py-10">
            Failed to load orders.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <ul className="space-y-3 mt-2">
              {rows?.map((row) => (
                <li
                  key={row?.id}
                  onClick={() => setSelected(row?.raw)}
                  className="cursor-pointer rounded-xl bg-white p-4 shadow-sm border border-black/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[15px] font-semibold">
                        {row?.date}
                      </div>
                      <div className="text-[11px] text-black/60 mt-1">
                        txn hash : {row?.txnHash ? mask(row?.txnHash) : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-semibold">
                        {row?.amountStr} {row?.unitPretty}
                      </div>
                      <span
                        className={[
                          "inline-flex mt-1 items-center rounded-full border px-2 py-[2px] text-[11px] font-medium",
                          statusChipClasses[row?.status],
                        ].join(" ")}
                      >
                        {row?.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="rounded-xl bg-white p-8 text-center text-sm text-black/50">
                  No orders found.
                </li>
              )}
            </ul>

            {paged && page && (
              <div className="pt-5 flex justify-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow hover:bg-gray-50"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal/Drawer */}
      {selected &&
        (isMobile ? (
          <Drawer open={!!selected} onOpenChange={() => setSelected(null)}>
            <DrawerContent className="rounded-t-2xl mx-1 pb-4">
              <Button
                variant={"outline"}
                className="absolute -top-14 left-1/2 -translate-x-1/2 rounded-3xl px-6"
                onClick={() => setSelected(null)}
              >
                X
              </Button>
              <DrawerHeader className="flex items-center justify-between">
                <DrawerTitle>
                  {prettyStatus(selected.action, selected.metadata?.status) ===
                  "Completed"
                    ? "Order Success"
                    : prettyStatus(
                        selected.action,
                        selected.metadata?.status
                      ) === "Rejected"
                    ? "Order Rejected"
                    : "Order Initiated"}
                </DrawerTitle>
                <DrawerDescription>
                  {selected.legs
                    ?.filter((l) => l.legType === LEG_TYPES.INTENT_AMOUNT)
                    .map((l) => (
                      <div key={l._id}>
                        +{toHumanAmountBase(l.amount, l.assetId)}{" "}
                        {assetSpecs[l.assetId]?.parentSymbol}
                      </div>
                    ))}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4">{renderDetail(selected)}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-md xl:max-w-lg rounded-2xl p-7">
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle className="text-2xl font-semibold">
                  {prettyStatus(selected.action, selected.metadata?.status) ===
                  "Completed"
                    ? "Order Success"
                    : prettyStatus(
                        selected.action,
                        selected.metadata?.status
                      ) === "Rejected"
                    ? "Order Rejected"
                    : "Order Initiated"}
                </DialogTitle>
                <DialogDescription>
                  {selected.legs
                    ?.filter((l) => l.legType === LEG_TYPES.INTENT_AMOUNT)
                    .map((l) => (
                      <div key={l._id}>
                        +{toHumanAmountBase(l.amount, l.assetId)}{" "}
                        {assetSpecs[l.assetId]?.parentSymbol}
                      </div>
                    ))}
                </DialogDescription>
              </DialogHeader>
              {renderDetail(selected)}
            </DialogContent>
          </Dialog>
        ))}
    </div>
  );
}
