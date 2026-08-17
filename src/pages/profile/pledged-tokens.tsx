import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { cn } from "@/lib/utils";
import { dateTimeFormat, userZone, utcToUser } from "@/utils/time";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";

const API_BASE = import.meta.env.VITE_CLIENT_URL;

type LedgerItem = {
  _id: string;
  action: string;
  createdAt: string;
  metadata?: {
    campaignId?: string;
    trialId?: string;
    pollId?: string;
  };
  legs: {
    _id: string;
    assetId: string;
    amount: string;
    legType: string;
    legName: string;
  }[];
};

const ACTION_STYLES: Record<
  string,
  { label: string; bg: string; border: string }
> = {
  "user-campaign-trial-creation": {
    label: "Campaign Trial Creation",
    bg: "bg-[#F6EFEA]",
    border: "border-[#D6BFAE]",
  },
  "user-campaign-donation": {
    label: "Campaign Donation",
    bg: "bg-[#F8ECEE]",
    border: "border-[#E2B8C0]",
  },
  "asset-purchase": {
    label: "Asset Purchase",
    bg: "bg-[#EEF4F1]",
    border: "border-[#9FB7AA]",
  },
  "poll-reward": {
    label: "Poll Reward",
    bg: "bg-[#F1F0FA]",
    border: "border-[#C8C5E6]",
  },
  "trial-reward": {
    label: "Trial Reward",
    bg: "bg-[#F1F0FA]",
    border: "border-[#C8C5E6]",
  },
  "user-poll-creation": {
    label: "Poll Creation",
    bg: "bg-[#E6FFFA]",
    border: "border-[#14B8A6]",
  },

  "user-standalone-trial-creation": {
    label: "Standalone Trial Creation",
    bg: "bg-[#FFF0F6]",
    border: "border-[#DB2777]",
  },

  "user-campaign-share-reward-pledge": {
    label: "Campaign Share Reward Pledge",
    bg: "bg-[#F5F3FF]",
    border: "border-[#6366F1]",
  },

  "top-up": {
    label: "Top Up",
    bg: "bg-[#ECFDF5]",
    border: "border-[#059669]",
  },
};

function safeArr<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function safeObj<T extends object = any>(v: any): T {
  return v && typeof v === "object" ? (v as T) : ({} as T);
}

function convertAmountToParent(assetIdRaw: any, rawAmount: any) {
  const assetId = (assetIdRaw ?? "") as AssetType;
  if (!assetId) return { value: "0", symbol: "" };
  const raw = rawAmount == null ? "0" : String(rawAmount);
  const value = unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: raw,
      output: "string",
      trim: true,
      group: false,
    }),
    "0",
  );
  const symbol = assetSpecs?.[assetId]?.parent ?? "";
  return { value, symbol };
}

export default function PledgedTokens() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { data, isLoading, isError } = useApiQuery(
    `${endpoints.assets.getLedgers}?page=${page}&pageSize=${pageSize}`,
  );
  const { items, totalPages } = useMemo(() => {
    const root = safeObj<any>(data?.data?.data);
    return {
      items: safeArr<LedgerItem>(root.items),
      totalPages: Number(root.totalPages ?? 1) || 1,
    };
  }, [data]);

  const pagesToShow = useMemo(() => {
    const arr: number[] = [];
    if (page > 1) arr.push(page - 1);
    arr.push(page);
    if (page < totalPages) arr.push(page + 1);
    return arr;
  }, [page, totalPages]);
  const showEmpty = !isLoading && !isError && items.length === 0;

  return (
    <main className="px-2 py-7 md:p-6 max-w-4xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-2 border-white border-r-2 border-l-2 rounded-xl bg-[#dbdcdf30]"
          aria-label="Back"
        >
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-semibold">Asset Ledger</h1>
      </header>
      {isLoading ? (
        <div className="text-sm text-black/60">Loading ledger…</div>
      ) : isError ? (
        <div className="text-sm text-black/60">Failed to load ledger.</div>
      ) : (
        <AnimatePresence mode="wait">
          {showEmpty ? (
            <EmptyStateCard key="empty" />
          ) : (
            <motion.div
              key={`list-${page}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {items.map((item) => (
                <LedgerCard key={item._id} item={item} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      {!showEmpty && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 text-sm rounded border disabled:opacity-40"
          >
            Prev
          </button>
          {pagesToShow.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "px-3 py-1 text-sm rounded border",
                p === page
                  ? "bg-black text-white"
                  : "bg-white hover:bg-black/5",
              )}
            >
              {p}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 text-sm rounded border disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

function LedgerCard({ item }: { item: LedgerItem }) {
  const ui = ACTION_STYLES[item.action] ?? {
    label: String(item.action ?? "").replaceAll("-", " "),
    bg: "bg-[#F1F2F6]",
    border: "border-[#B8BCC6]",
  };

  const { campaignId, trialId, pollId } = item.metadata ?? {};

  return (
    <section
      className={cn("rounded-xl border-l-4 p-4 shadow-lg", ui.bg, ui.border)}
    >
      <div className="flex justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {ui.label}
        </span>
        <span className="text-[11px] text-black/40 mb-3">
          {utcToUser(item.createdAt, userZone).format(dateTimeFormat)}
        </span>
      </div>

      <section className="divide-y rounded-lg bg-white/60">
        {safeArr(item.legs)?.map((leg) => {
          const { value, symbol } = convertAmountToParent(
            leg.assetId,
            leg.amount,
          );
          const fallbackSymbol = symbol || leg.assetId;
          return (
            <div
              key={leg._id}
              className="flex items-center justify-between px-3 py-2 text-xs md:text-sm"
            >
              <p className="font-medium text-black/60">{leg.legName}</p>

              <p className="text-right font-semibold">
                {value} <span className="text-black/60">{fallbackSymbol}</span>
              </p>
            </div>
          );
        })}
      </section>
      <div className="flex flex-wrap gap-4 mt-3 text-sm">
        {campaignId ? (
          <ContextLink
            label="View Campaign"
            href={`${API_BASE}/campaigns/all-campaigns/${campaignId}`}
          />
        ) : null}
        {trialId ? (
          <ContextLink
            label="View Trial"
            href={`${API_BASE}/trial/${trialId}`}
          />
        ) : null}
        {pollId ? (
          <ContextLink
            label="View Poll"
            href={`${API_BASE}/feed/polls/${pollId}`}
          />
        ) : null}
      </div>
    </section>
  );
}

function ContextLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-black/70 hover:text-black"
    >
      <span className="underline underline-offset-4">{label}</span>
      <ExternalLink className="h-3 w-3 opacity-70" />
    </a>
  );
}

function EmptyStateCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[#19C6C3]/25 blur-2xl"
        animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[#111]/10 blur-2xl"
        animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-12 w-12 rounded-2xl bg-[#19C6C3]/15 border border-[#19C6C3]/30 flex items-center justify-center"
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="h-6 w-6 rounded-full bg-[#19C6C3]"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <div>
            <div className="text-xs font-semibold text-black/50 uppercase tracking-wide">
              Nothing here yet
            </div>
            <div className="text-xl font-semibold text-[#111]">
              No records available
            </div>
          </div>
        </div>
        <motion.p
          className="mt-3 text-sm text-black/55 max-w-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Once you start earning, donating, or receiving rewards, your ledger
          entries will appear here.
        </motion.p>
        <motion.div
          aria-hidden="true"
          className="mt-5 h-[2px] w-full rounded-full bg-black/5 overflow-hidden"
        >
          <motion.div
            className="h-full w-1/3 bg-black/10"
            animate={{ x: ["-120%", "320%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
