import { useMemo, useState } from "react";
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
import { useIsMobile } from "./AllTransactions";
import { dateTimeFormat, userZone, utcToUser } from "@/utils/time";
import { ArrowUpRight } from "lucide-react";
import { getTxExplorerUrl } from "@/utils/txExplorer";

/* ----------------------------- helpers ----------------------------- */

type Txn = {
  id: string;
  date: string;
  amount: string;
  status: "Pending" | "Completed" | "Rejected";
  walletId?: string;
  txHash?: string;
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
  if (["APPROVE", "APPROVED", "SUCCESS", "COMPLETED"].includes(s))
    return "Completed";
  if (["REJECT", "REJECTED", "FAILED", "FAIL"].includes(s)) return "Rejected";
  return "Pending";
}

function normalizeLegType(v: any) {
  return String(v ?? "").toLowerCase();
}

function toTxn(item: any): Txn | null {
  if (!item) return null;

  const mainLeg = (item.legs ?? []).find(
    (l: any) =>
      String(l?.assetId) === ASSETS.X_HIGH &&
      // accept both old + new names safely
      (normalizeLegType(l?.legType) ===
        normalizeLegType(LEG_TYPES.INTENT_AMOUNT) ||
        normalizeLegType(l?.legType) === "strain-sell-amount")
  );

  if (!mainLeg) return null;

  const amountStr = unwrapString(
    amount({
      op: "toParent",
      assetId: ASSETS.X_HIGH,
      value: mainLeg.amount ?? 0,
      output: "string",
      trim: true,
      group: false,
    })
  );

  const feeLeg = (item.legs ?? []).find(
    (l: any) =>
      String(l?.assetId) === ASSETS.X_POLL &&
      ["fee", "fees"].includes(normalizeLegType(l?.legType))
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
        })
      )
    : undefined;

  const rawCreatedDate = utcToUser(item.createdAt, userZone);
  const createdDate = rawCreatedDate.isValid()
    ? rawCreatedDate.format(dateTimeFormat)
    : new Date(item.createdAt ?? Date.now()).toLocaleString();

  return {
    id: String(item._id),
    date: createdDate,
    amount: amountStr,
    status: mapStatus(item?.metadata?.status),
    walletId: mask(item?.metadata?.walletAddress),
    txHash: item?.metadata?.txHash ?? item?.metadata?.txnHash,
    xpollBurned: xpollBurnedStr,
    coinBurned: amountStr,
  };
}

type Props = {
  assetType: AssetType;
  symbol?: string;
};

export function AllStrainTransactions({ assetType }: Props) {
  const [filter] = useState<"All" | "Pending" | "Completed" | "Rejected">(
    "All"
  );

  const [selected, setSelected] = useState<Txn | null>(null);
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const displaySymbol = assetSpecs[assetType]?.parent ?? "";

  const ledgerStatus =
    filter === "Completed"
      ? "APPROVE"
      : filter === "Rejected"
      ? "REJECT"
      : filter === "Pending"
      ? "PENDING"
      : undefined;

  const ledgerUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    if (ledgerStatus) qs.set("status", ledgerStatus);
    return `${endpoints.assets.getStrainSellIntentLedgers}?${qs.toString()}`;
  }, [page, pageSize, ledgerStatus]);

  const {
    data: rawData,
    isLoading,
    isError,
  } = useApiQuery(ledgerUrl, {
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const items: any[] = useMemo(() => {
    const root = rawData?.data?.data ?? rawData?.data ?? {};
    return Array.isArray((root as any)?.items) ? (root as any).items : [];
  }, [rawData]);

  const hasPrev = page > 1;
  const hasNext = items.length === pageSize;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => p + 1);

  const DetailContent = selected && (
    <>
      <div className="flex items-center justify-between pb-2">
        <div className="text-xs text-black/70">{selected.date}</div>
        <span
          className={`rounded-md px-2 py-[2px] text-[11px] font-medium ${pill(
            selected.status
          )}`}
        >
          {selected.status}
        </span>
      </div>

      <div className="space-y-2 border-t border-black/10 pt-6 text-[13px]">
        <p className="flex justify-between">
          Order ID : <span>{selected.id}</span>
        </p>

        {selected.walletId && (
          <p className="flex justify-between">
            Wallet ID : <span>{selected.walletId}</span>
          </p>
        )}

        {selected.txHash && (
          <p className="flex justify-between">
            Txn Hash :
            <a
              href={getTxExplorerUrl(selected.txHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {mask(selected.txHash)}

              <ArrowUpRight className="h-4 w-4" />
            </a>
          </p>
        )}

        {selected.xpollBurned && (
          <p className="flex justify-between">
            Xpoll Burned : <span>{selected.xpollBurned}</span>
          </p>
        )}

        <p className="flex justify-between">
          {displaySymbol} Burned : <span>{selected.coinBurned}</span>
        </p>
      </div>
    </>
  );

  /* ---------------- render ---------------- */
  return (
    <main
      style={heightBottomBarStyles}
      className="bg-[#F2F3F5] px-2 py-7 space-y-7"
    >
      {/* Header */}
      <header className="flex items-center gap-5">
        <BackButton to={"/exchange"} />
        <h1 className="text-xl font-semibold">Transactions</h1>

        {/* If you want the filter UI, uncomment and keep the pagination reset */}
        {/* <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
          className="rounded-lg border w-fit py-1 text-sm ml-auto"
        >
          <option>All</option>
          <option>Pending</option>
          <option>Completed</option>
          <option>Rejected</option>
        </select> */}
      </header>

      {/* List */}
      <section className="px-4 space-y-3">
        {isLoading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-black/5"
              />
            ))}
          </>
        )}

        {!isLoading && isError && (
          <p className="text-center text-sm text-black/50">
            Failed to load transactions.
          </p>
        )}

        {!isLoading &&
          !isError &&
          items.map((t: any) => {
            // This is the SAFE mapping for STRAIN response:
            // amountHigh is base units of HIGH, so convert using ASSETS.X_HIGH
            const displayAmount = unwrapString(
              amount({
                op: "toParent",
                assetId: ASSETS.X_HIGH,
                value: t?.metadata?.amountHigh ?? 0,
                output: "string",
                trim: true,
                group: false,
              })
            );

            const rawCreatedDate = utcToUser(t.createdAt, userZone);
            const createdDate = rawCreatedDate.isValid()
              ? rawCreatedDate.format(dateTimeFormat)
              : null;

            const statusUi = mapStatus(t?.metadata?.status);

            return (
              <article
                key={String(t?._id ?? Math.random())}
                onClick={() => {
                  const mapped = toTxn(t);
                  if (mapped) setSelected(mapped);
                }}
                className="cursor-pointer rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex justify-between text-xs">
                  <section className="flex flex-col gap-2">
                    <p className="font-medium">{createdDate ?? "—"}</p>
                    {t?.metadata?.txHash && (
                      <span>{mask(t.metadata.txHash)}</span>
                    )}
                  </section>
                  <div className="text-right flex flex-col gap-2">
                    <h3 className="font-semibold">
                      {displayAmount} {displaySymbol}
                    </h3>
                    <span
                      className={`rounded-md px-2 py-[2px] text-[11px] font-medium ${pill(
                        statusUi
                      )}`}
                    >
                      {t?.metadata?.status}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}

        {!isLoading && !isError && items.length === 0 && (
          <p className="text-center text-sm text-black/50">
            No transactions found.
          </p>
        )}
      </section>

      {/* Pagination buttons (bottom) */}
      {!isLoading && !isError && (
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={!hasPrev}
            onClick={goPrev}
            className="w-28"
          >
            Prev
          </Button>

          <div className="text-xs text-black/60">Page {page}</div>

          <Button
            variant="outline"
            disabled={!hasNext}
            onClick={goNext}
            className="w-28"
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail modal */}
      {selected &&
        (isMobile ? (
          <Drawer open onOpenChange={() => setSelected(null)}>
            <DrawerContent className="rounded-t-2xl rounded-b-3xl mx-1">
              <Button
                variant="outline"
                className="absolute -top-14 left-1/2 -translate-x-1/2 rounded-3xl px-6"
                onClick={() => setSelected(null)}
              >
                X
              </Button>
              <DrawerHeader>
                <DrawerTitle>Order {selected.status}</DrawerTitle>
                <DrawerDescription>
                  +{selected.amount} {displaySymbol}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-4">{DetailContent}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Order {selected.status}</DialogTitle>
                <DialogDescription>
                  +{selected.amount} {displaySymbol}
                </DialogDescription>
              </DialogHeader>
              {DetailContent}
            </DialogContent>
          </Dialog>
        ))}
    </main>
  );
}
