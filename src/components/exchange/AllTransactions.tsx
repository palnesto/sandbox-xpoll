import { useMemo, useState, useEffect } from "react";
import BackButton from "@/components/commons/back-button";
import { AssetType, ASSETS, assetSpecs } from "@/utils/currency-assets/asset";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { amount, unwrapString } from "@/utils/currency-assets/base";

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
import { Button } from "../ui/button";
import { LEG_TYPES } from "@/utils/currency-assets/leg-type";
import { heightBottomBarStyles } from "@/styles";

/* ----------------------------- helpers ----------------------------- */

type Txn = {
  id: string;
  date: string;
  amount: string;
  status: "Pending" | "Completed" | "Rejected";
  walletId?: string;
  txnHash?: string;
  xpollBurned?: string;
  coinBurned?: string;
};

const pill = (s: Txn["status"]) =>
  s === "Completed"
    ? "bg-emerald-100 text-emerald-800"
    : s === "Rejected"
      ? "bg-rose-100 text-rose-800"
      : "bg-amber-100 text-amber-800";

const mask = (v?: string) =>
  v && v.length > 10 ? `${v.slice(0, 6)}....${v.slice(-6)}` : v || "";

/** Normalize API status to UI status */
function mapStatus(raw?: string): Txn["status"] {
  const s = String(raw ?? "PENDING").toUpperCase();
  if (
    s === "APPROVE" ||
    s === "APPROVED" ||
    s === "SUCCESS" ||
    s === "COMPLETED"
  )
    return "Completed";
  if (s === "REJECT" || s === "REJECTED" || s === "FAILED" || s === "FAIL")
    return "Rejected";
  return "Pending";
}

/** Map API item -> UI Txn using LEG_TYPES.INTENT_AMOUNT and assetType */
function toTxn(item: any, assetType: AssetType): Txn | null {
  if (!item) return null;

  const mainLeg = (item.legs ?? []).find(
    (l: any) =>
      String(l?.assetId) === assetType &&
      String(l?.legType ?? "").toLowerCase() === LEG_TYPES.INTENT_AMOUNT,
  );
  if (!mainLeg) return null;

  const amountStr = unwrapString(
    amount({
      op: "toParent",
      assetId: assetType,
      value: mainLeg.amount ?? 0,
      output: "string",
      trim: true,
      group: false,
    }),
  );

  const feeLeg = (item.legs ?? []).find(
    (l: any) =>
      String(l?.assetId) === ASSETS.X_POLL &&
      ["fee", "fees"].includes(String(l?.legType ?? "").toLowerCase()),
  );

  const xpollBurnedStr = feeLeg
    ? unwrapString(
        amount({
          op: "toParent",
          assetId: ASSETS.X_POLL,
          value: feeLeg.amount ?? 0,
          output: "string",
          trim: true,
          group: false,
        }),
      )
    : undefined;

  const status = mapStatus(item?.metadata?.status);

  const date = new Date(item.createdAt ?? Date.now()).toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    // hour: "2-digit",
    // minute: "2-digit",
  });

  return {
    id: String(item._id),
    date,
    amount: amountStr,
    status,
    walletId: mask(
      item?.metadata?.walletAddress ?? item?.metadata?.userExternalAccountId,
    ),
    xpollBurned: xpollBurnedStr,
    coinBurned: amountStr,
    txnHash: item?.metadata?.txnHash,
  };
}

/* ----------------------------- hooks ----------------------------- */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

/* ----------------------------- component ----------------------------- */

type Props = {
  assetType: AssetType;
  gradient?: string;
  symbol?: string;
};

export function AllTransactions({ assetType, symbol }: Props) {
  const [filter, setFilter] = useState<
    "All" | "Pending" | "Completed" | "Rejected"
  >("All");
  const [selected, setSelected] = useState<Txn | null>(null);
  const isMobile = useIsMobile();

  const displaySymbol =
    symbol ?? assetSpecs[assetType]?.chain?.toUpperCase() ?? "";
  const assetIcon = assetSpecs[assetType]?.img;

  const url = useMemo(() => {
    const base = endpoints.assets.getSellIntentLedgers;
    return `${base}?page=1&pageSize=50&assetId=${assetType}`;
  }, [assetType]);

  const { data: rawData } = useApiQuery(url);
  const { data: statsData, isLoading: loadingStats } = useApiQuery(
    endpoints.assets.getSellIntentStats,
  );
  const filterStats =
    statsData?.data?.data ?? statsData?.data ?? statsData ?? null;

  const approvedDisplay = useMemo(() => {
    const suiApprovedBase = filterStats?.[ASSETS.X_MYST]?.approved ?? 0;
    const xrpApprovedBase = filterStats?.[ASSETS.X_DROP]?.approved ?? 0;
    const aptosApprovedBase = filterStats?.[ASSETS.X_OCTA]?.approved ?? 0;
    const suiApprovedDisplay = unwrapString(
      amount({
        op: "toParent",
        assetId: ASSETS.X_MYST,
        value: suiApprovedBase,
        output: "string",
        trim: true,
        group: false,
      }),
    );
    const xrpApprovedDisplay = unwrapString(
      amount({
        op: "toParent",
        assetId: ASSETS.X_DROP,
        value: xrpApprovedBase,
        output: "string",
        trim: true,
        group: false,
      }),
    );
    const aptosApprovedDisplay = unwrapString(
      amount({
        op: "toParent",
        assetId: ASSETS.X_OCTA,
        value: aptosApprovedBase,
        output: "string",
        trim: true,
        group: false,
      }),
    );

    if (assetType === ASSETS.X_MYST) {
      return suiApprovedDisplay;
    } else if (assetType === ASSETS.X_DROP) {
      return xrpApprovedDisplay;
    } else if (assetType === ASSETS.X_OCTA) {
      return aptosApprovedDisplay;
    } else {
      return "-";
    }
  }, [filterStats, assetType]);

  const txns: Txn[] = useMemo(() => {
    const items: any[] = Array.isArray(rawData?.data?.data?.items)
      ? rawData!.data!.data!.items
      : [];

    return items
      .filter((it) =>
        (it?.legs ?? []).some(
          (l: any) =>
            String(l?.assetId) === assetType &&
            String(l?.legType ?? "").toLowerCase() === LEG_TYPES.INTENT_AMOUNT,
        ),
      )
      .map((it) => toTxn(it, assetType))
      .filter(Boolean) as Txn[];
  }, [rawData, assetType]);

  const filtered = useMemo(() => {
    if (filter === "All") return txns;
    return txns.filter((t) => t.status === filter);
  }, [txns, filter]);
  const DetailContent = selected && (
    <>
      <div className="flex items-center justify-between pb-2">
        <div className="text-xs text-black/70">{selected.date}</div>
        <span
          className={`rounded-md px-2 py-[2px] text-[11px] font-medium ${pill(
            selected.status,
          )}`}
        >
          {selected.status}
        </span>
      </div>

      <div className="space-y-2 border-t border-black/10 pt-6 text-[13px]">
        {selected.walletId && (
          <p className="flex justify-between">
            Order ID : <span>{selected.id}</span>
          </p>
        )}
        {selected.walletId && (
          <p className="flex justify-between">
            Wallet ID : <span>{selected.walletId}</span>
          </p>
        )}
        {selected.txnHash && (
          <p className="flex justify-between">
            Txn Hash : <span>{mask(selected.txnHash)}</span>
          </p>
        )}
        {selected.xpollBurned && (
          <p className="flex justify-between">
            Xpoll Burned : <span>{selected.xpollBurned}</span>
          </p>
        )}
        {selected.coinBurned && (
          <p className="flex justify-between">
            {displaySymbol} Burned : <span>{selected.coinBurned}</span>
          </p>
        )}
        <div className="flex justify-between">
          <span>Support :</span>
          <button
            onClick={() => {
              window.open(
                "https://t.me/cryptogeek_ivan",
                "_blank",
                "noopener,noreferrer",
              );
            }}
            className="rounded-full bg-[#0DACAD] px-3 py-1 text-xs font-medium text-white hover:bg-[#0dacadcc]"
          >
            Contact now
          </button>
        </div>
      </div>
    </>
  );

  return (
    <main
      style={heightBottomBarStyles}
      className="bg-[#F2F3F5] px-2 py-7 space-y-7"
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <BackButton to={"/exchange"} />
        <h1 className="text-xl font-semibold">Transactions</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-lg border w-fit py-1 text-sm"
        >
          <option>All</option>
          <option>Pending</option>
          <option>Completed</option>
          <option>Rejected</option>
        </select>
      </header>

      {/* Earned summary */}
      <section className="text-center">
        <div className="text-sm text-black/70">
          You have successfully earned
        </div>
        <h2 className="mt-1 flex items-center justify-center gap-2 text-3xl font-semibold">
          {assetIcon && (
            <img
              src={assetIcon}
              alt={displaySymbol}
              className="h-7 w-7 rounded-full object-contain"
            />
          )}

          {loadingStats
            ? "…"
            : `${approvedDisplay} ${assetSpecs[assetType]?.chain}`}
        </h2>
        <p className="mt-2 text-xs text-black/50">
          The reward is now under processing and will be transferred to your
          wallet within 24–48 hours
        </p>
      </section>

      {/* List */}
      <section className="px-4 space-y-3">
        {filtered.map((t) => (
          <article
            key={t.id}
            onClick={() => setSelected(t)}
            className="cursor-pointer rounded-xl bg-white p-4 shadow-sm"
          >
            <section className="flex justify-between text-xs ">
              <section>
                <p className="font-medium">{t.date}</p>
              </section>
              <section className="text-right">
                <h3 className="font-semibold pb-1">
                  {t.amount} {displaySymbol}
                </h3>
                <span
                  className={`rounded-md px-2 py-[2px] text-[11px] font-medium ${pill(
                    t.status,
                  )}`}
                >
                  {t.status}
                </span>
              </section>
            </section>
          </article>
        ))}
      </section>

      {/* Detail modal */}
      {selected &&
        (isMobile ? (
          <Drawer open={!!selected} onOpenChange={() => setSelected(null)}>
            <DrawerContent className="rounded-t-2xl rounded-b-3xl mx-1">
              <Button
                variant={"outline"}
                className="absolute -top-14 left-1/2 -translate-x-1/2 rounded-3xl px-6"
                onClick={() => setSelected(null)}
              >
                X
              </Button>
              <DrawerHeader className="flex items-center justify-between">
                <DrawerTitle>
                  {selected.status === "Completed"
                    ? "Order Success"
                    : selected.status === "Rejected"
                      ? "Order Rejected"
                      : "Order Initiated"}
                </DrawerTitle>
                <DrawerDescription>
                  +{selected.amount} {displaySymbol}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-4">{DetailContent}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selected.status === "Completed"
                    ? "Order Success"
                    : "Order Initiated"}
                </DialogTitle>
                <DialogDescription>
                  +{selected.amount} {displaySymbol}
                </DialogDescription>
              </DialogHeader>
              <div>{DetailContent}</div>
            </DialogContent>
          </Dialog>
        ))}
    </main>
  );
}
