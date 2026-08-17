import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import BackButton from "@/components/commons/back-button";
import { ASSETS, AssetType, assetSpecs } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { heightStyles } from "@/styles";
import { LEG_TYPES } from "@/utils/currency-assets/leg-type";

import { CoinDetailSkeleton } from "../commons/FullScreenLoader";
import { ViewAllButton } from "@/utils/view-all-button";

export type Txn = {
  id: string;
  date: string;
  amount: string;
  status: "Pending" | "Completed" | "Rejected";
  note?: string;
  txHash?: string;
  txnHash?: string;
};

const StatusChip = ({ s }: { s: Txn["status"] }) => {
  const m: Record<Txn["status"], string> = {
    Pending: "bg-amber-100 text-amber-800",
    Completed: "bg-emerald-100 text-emerald-800",
    Rejected: "bg-rose-100 text-rose-800",
  };
  return (
    <span
      className={`rounded-md px-2 py-[2px] text-[11px] font-medium ${m[s]}`}
    >
      {s}
    </span>
  );
};

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

function buildLedgerUrl(args: {
  assetType: AssetType;
  page: number;
  pageSize: number;
  status?: "APPROVE" | "PENDING" | "REJECT";
}) {
  const { assetType, page, pageSize, status } = args;

  const base =
    assetType === ASSETS.X_HIGH
      ? endpoints.assets.getStrainSellIntentLedgers
      : endpoints.assets.getSellIntentLedgers;
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  if (assetType !== ASSETS.X_HIGH) {
    qs.set("assetId", assetType);
  } else {
    if (status) qs.set("status", status);
  }
  return `${base}?${qs.toString()}`;
}

export function TransactionsBlock({
  assetType,
  label,
  onViewAll,
  page = 1,
  pageSize = 10,
  status,
}: {
  assetType: AssetType;
  label: string;
  onViewAll: () => void;
  page?: number;
  pageSize?: number;
  status?: "APPROVE" | "PENDING" | "REJECT";
}) {
  const ledgerUrl = useMemo(
    () => buildLedgerUrl({ assetType, page, pageSize, status }),
    [assetType, page, pageSize, status],
  );

  const {
    data: ledgerRaw,
    isLoading,
    isError,
  } = useApiQuery(ledgerUrl, {
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const ledgerItems: any[] = useMemo(() => {
    const root = ledgerRaw?.data?.data ?? ledgerRaw?.data ?? {};
    return Array.isArray((root as any)?.items) ? (root as any).items : [];
  }, [ledgerRaw]);

  const STRAIN_SELL_LEG_TYPE = "strain-sell-amount";

  function pickAmountBase(item: any, assetType: AssetType) {
    if (assetType === ASSETS.X_HIGH) {
      const legs = Array.isArray(item?.legs) ? item.legs : [];

      const leg =
        legs.find(
          (l: any) =>
            String(l?.assetId) === String(ASSETS.X_HIGH) &&
            normalizeLegType(l?.legType) ===
              normalizeLegType(STRAIN_SELL_LEG_TYPE),
        ) ??
        legs.find(
          (l: any) =>
            String(l?.assetId) === String(ASSETS.X_HIGH) &&
            normalizeLegType(l?.legType) ===
              normalizeLegType(LEG_TYPES.INTENT_AMOUNT),
        );

      const baseAmount =
        leg?.amount ??
        item?.metadata?.amountHigh ??
        item?.metadata?.standardOrderAmountAtPrepare ??
        0;

      return { baseAmount, leg };
    }

    const leg = (item?.legs ?? []).find(
      (l: any) =>
        String(l?.assetId) === String(assetType) &&
        normalizeLegType(l?.legType) ===
          normalizeLegType(LEG_TYPES.INTENT_AMOUNT),
    );

    return { baseAmount: leg?.amount ?? 0, leg };
  }
  const txns: Txn[] = useMemo(() => {
    return ledgerItems
      .map((item) => {
        const statusUi = mapStatus(item?.metadata?.status);

        const { baseAmount } = pickAmountBase(item, assetType);
        if (!baseAmount || String(baseAmount) === "0") return null;

        const amountStr = unwrapString(
          amount({
            op: "toParent",
            assetId: assetType,
            value: baseAmount,
            output: "string",
            trim: true,
            group: false,
          }),
        );

        const dateStr = new Date(item?.createdAt ?? Date.now()).toLocaleString(
          [],
          {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        );
        function resolveTxnHash(item: any, assetType: AssetType): string {
          if (assetType === ASSETS.X_HIGH) {
            return String(item?.metadata?.txHash ?? "");
          }
          return String(item?.metadata?.txnHash ?? "");
        }

        const rawHash = resolveTxnHash(item, assetType);

        const hardcodedId =
          statusUi === "Completed" && rawHash
            ? rawHash.slice(0, 6) + "..." + rawHash.slice(-6)
            : "";

        return {
          id: hardcodedId,
          date: dateStr,
          amount: amountStr,
          status: statusUi,
          txHash: rawHash,
          txnHash: item?.metadata?.txnHash,
        } as Txn;
      })
      .filter((t): t is Txn => !!t && Number(t.amount) > 0);
  }, [ledgerItems, assetType]);

  const displaySymbol =
    assetSpecs[assetType]?.parent ?? assetSpecs[assetType]?.symbol ?? label;

  return (
    <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
      <div className="pb-5 flex items-end justify-between">
        <h2 className="text-base font-semibold">Transactions</h2>
        <ViewAllButton onClick={onViewAll}>view all</ViewAllButton>
      </div>

      {isLoading && (
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-16 animate-pulse rounded-xl bg-black/5" />
          ))}
        </ul>
      )}

      {!isLoading && isError && (
        <div className="py-6 text-center text-sm text-black/60">
          Failed to load transactions.
        </div>
      )}

      {!isLoading && !isError && (
        <ul className="space-y-3">
          {txns.map((t, idx) => {
            const [i, f = "0"] = String(t.amount ?? "0").split(".");
            return (
              <li
                key={`${t.id || idx}-${t.date}`}
                className="rounded-xl bg-[#F7F7F8] py-3 flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <time className="text-[13px] font-semibold text-black/80">
                    {t.date}
                  </time>
                  {!!t.id && (
                    <p className="mt-1 text-[11px] text-black/60">
                      Txn: {t.id}
                    </p>
                  )}
                </div>

                {/* {t.note && (
                  <p className="mt-1 text-[11px] text-black/50">{t.note}</p>
                )} */}

                <section className="flex flex-col gap-1 items-end">
                  <div className="text-[13px] font-semibold">
                    {i}.{f} {displaySymbol}
                  </div>

                  <StatusChip s={t.status} />
                </section>
              </li>
            );
          })}

          {txns.length === 0 && (
            <li className="text-center py-6 text-sm text-black/50">
              No transactions yet.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export type CoinDetailProps = {
  assetType: AssetType;
  label: string;
  gradient: string;
  chestImgColor: string;
  coinImgColor: string;
  transactions?: Txn[];
  redirectTo?: string;
  explicitDisableText?: string;
  explicitDisable?: boolean;
  onAfterLoad?: () => void;
};

const ShineAnimationStyle = () => (
  <style>
    {`
      @keyframes shine-animation {
        0% { background-position: 200% center; }
        100% { background-position: -200% center; }
      }
      .animate-shine {
        background: linear-gradient(
          to right,
          rgba(0, 0, 0, 0.6) 45%,
          #ffffff 50%,
          rgba(0, 0, 0, 0.6) 55%
        );
        background-size: 200% auto;
        color: transparent;
        background-clip: text;
        -webkit-background-clip: text;
        animation: shine-animation 2s linear infinite;
      }
    `}
  </style>
);

function HeaderCoinBlock({
  chestImg,
  coinImg,
  grayscale,
  floating,
  dropRef,
  onVanish,
  isVanishing,
}: {
  chestImg: string;
  coinImg: string;
  grayscale: boolean;
  floating: boolean;
  dropRef: React.RefObject<HTMLDivElement>;
  onVanish: () => void;
  isVanishing: boolean;
}) {
  const coinRef = useRef<HTMLImageElement | null>(null);
  const [dragScale, setDragScale] = useState(1);

  const startBottomRef = useRef<number | null>(null);

  const handleDragStart = () => {
    const coinEl = coinRef.current;
    if (coinEl) {
      const coinRect = coinEl.getBoundingClientRect();
      startBottomRef.current = coinRect.bottom;
    } else {
      startBottomRef.current = null;
    }
  };

  const handleDrag = () => {
    if (!floating || grayscale) return;

    const coinEl = coinRef.current;
    if (!coinEl) return;

    // Current bottom while dragging
    const { bottom: currentBottom } = coinEl.getBoundingClientRect();

    // Baseline from drag start (already set in handleDragStart)
    const startBottom = startBottomRef.current ?? currentBottom;

    // How far the coin has moved downward
    const delta = Math.max(0, currentBottom - startBottom);

    // Tune this to control when it reaches min scale
    const MAX_DRAG_FOR_MIN_SCALE = 180; // px

    // 0 → 1
    const progress = Math.min(1, delta / MAX_DRAG_FOR_MIN_SCALE);

    // Scale from 1 → 0.6 (shrink 40%)
    const scale = 1 - progress * 1;

    setDragScale(scale);
  };

  const handleDragEnd = () => {
    const dropEl = dropRef.current;
    const coinEl = coinRef.current;
    if (!dropEl || !coinEl) {
      setDragScale(1);
      return;
    }

    const dropRect = dropEl.getBoundingClientRect();
    const coinRect = coinEl.getBoundingClientRect();

    const isOverlapping =
      coinRect.left < dropRect.right &&
      coinRect.right > dropRect.left &&
      coinRect.top < dropRect.bottom &&
      coinRect.bottom > dropRect.top;

    if (isOverlapping) {
      setDragScale(0);
      onVanish();
    } else {
      setDragScale(1);
    }
  };

  return (
    <figure className="relative h-32 ">
      {/* Background elements are pushed back with negative z-index */}
      <span className="absolute -z-10 left-1/2 -bottom-52 -translate-x-1/2 -translate-y-1/2 h-52 w-64 rounded-full bg-white/15 " />
      <span className="absolute -z-10 left-1/2 -bottom-40 -translate-x-1/2 -translate-y-1/2 h-40 w-52 rounded-full bg-white/25" />

      {!isVanishing && (
        <img
          src={chestImg}
          alt="chest"
          // Chest is positioned and given a z-index of 0
          className={`absolute z-0 -bottom-7 left-1/2 -translate-x-1/2 h-40 select-none ${
            grayscale ? "grayscale" : ""
          }`}
          draggable={false}
        />
      )}

      <motion.img
        ref={coinRef}
        src={coinImg}
        alt="coin"
        // ✨ [MODIFIED] Added `relative` to activate `z-10`, ensuring the coin is always on top.
        className={`relative z-10 mx-auto pt-16 h-48 cursor-grab ${
          grayscale ? "grayscale" : ""
        }`}
        animate={floating ? { y: [0, -8, 0] } : undefined}
        transition={
          floating
            ? { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
            : undefined
        }
        drag={floating && !grayscale ? "y" : false}
        dragConstraints={{ top: 0, bottom: 10 }}
        dragElastic={0.15}
        onDragStart={floating && !grayscale ? handleDragStart : undefined}
        onDrag={floating && !grayscale ? handleDrag : undefined}
        onDragEnd={floating && !grayscale ? handleDragEnd : undefined}
        style={{
          transformOrigin: "50% 50%",
          touchAction: "none",
          scale: dragScale,
        }}
      />
    </figure>
  );
}

const formatAnimatedNumber = (num: number) => {
  const cleanNumStr = String(Number(num.toFixed(6)));
  const [i, f = "0"] = cleanNumStr.split(".");
  return { i, f };
};

function niceStep(raw: number): number {
  if (!isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = raw / Math.pow(10, exp);
  let niceBase: number;
  if (base <= 1) niceBase = 1;
  else if (base <= 2) niceBase = 2;
  else if (base <= 5) niceBase = 5;
  else niceBase = 10;
  return Math.max(1, Math.floor(niceBase * Math.pow(10, exp)));
}

function buildThresholds(maxBase: number): number[] {
  if (!isFinite(maxBase) || maxBase <= 0) return [0, 0];
  if (maxBase <= 10) {
    const arr: number[] = [];
    for (let v = 0; v <= maxBase; v++) arr.push(v);
    if (arr[arr.length - 1] !== maxBase) arr.push(maxBase);
    return arr;
  }
  const targetTicks = 60;
  const step = Math.max(
    1,
    niceStep(Math.max(1, Math.floor(maxBase / targetTicks))),
  );
  const arr: number[] = [0];
  for (let v = step; v < maxBase; v += step) arr.push(v);
  if (arr[arr.length - 1] !== maxBase) arr.push(maxBase);
  return arr;
}

export default function CoinDetail({
  assetType,
  label,
  gradient,
  chestImgColor,
  coinImgColor,
  transactions = [],
  redirectTo = "/transactions",
  explicitDisable = false,
  explicitDisableText,
  onAfterLoad,
}: CoinDetailProps) {
  const navigate = useNavigate();

  const [isVanishing, setIsVanishing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();

  const [displayBase, setDisplayBase] = useState(0);
  const [topBalance, setTopBalance] = useState<number | null>(null);
  const lastIndexRef = useRef(-1);
  const thresholdsRef = useRef<number[]>([]);

  const dropTextRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if ((window as any).confetti) return;
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const allTxRoute = useMemo(() => {
    const map: Partial<Record<AssetType, string>> = {
      [ASSETS.X_MYST]: "/exchange/all-sui-transaction",
      [ASSETS.X_DROP]: "/exchange/all-xrp-transaction",
      [ASSETS.X_OCTA]: "/exchange/all-aptos-transaction",
      [ASSETS.X_HIGH]: "/exchange/all-strain-transaction",
    };
    if (map[assetType]) return map[assetType]!;
    const symbolTo = (label || "").replace(/^X/, "").toLowerCase();
    return `/exchange/all-${symbolTo}-transaction`;
  }, [assetType, label]);

  /** ============== Data ============== */
  const { data: meRaw, isLoading: loadingProfile } = useApiQuery(
    endpoints.profile.me,
  );
  const me = useMemo(() => meRaw?.data?.data ?? null, [meRaw]);
  const mappings: Record<AssetType, { assetType: AssetType; amount: number }> =
    me?.assetMappings ?? ({} as any);

  const { data: coinsRaw, isLoading: loadingCoins } = useApiQuery(
    endpoints.assets.getAssetsInfo,
  );
  const coins: any[] = useMemo(
    () =>
      Array.isArray(coinsRaw?.data?.data)
        ? coinsRaw.data.data
        : (coinsRaw?.data ?? []),
    [coinsRaw],
  );

  const coinMetaRaw = useMemo(() => {
    const meta: Record<
      Omit<AssetType, "xPoll">,
      { minLimitBase: string; feeBase: string }
    > = {
      [ASSETS.X_OCTA]: { minLimitBase: "0", feeBase: "0" },
      [ASSETS.X_MYST]: { minLimitBase: "0", feeBase: "0" },
      [ASSETS.X_DROP]: { minLimitBase: "0", feeBase: "0" },
    };
    for (const c of coins) {
      const id = c?._id as AssetType | undefined;
      if (!id) continue;
      const std = c?.canSell?.standardOrderAmount ?? 0;
      const fee = c?.canSell?.conversionFeesInXpoll ?? 0;
      meta[id] = {
        minLimitBase: String(std),
        feeBase: String(fee),
      };
    }
    return meta;
  }, [coins]);

  /** ============== Balances (formatter) ============== */
  const balanceStr = unwrapString(
    amount({
      op: "toParent",
      assetId: assetType,
      value: mappings?.[assetType]?.amount ?? 0,
      output: "string",
      trim: true,
      group: false,
    }),
  );
  const xpollBalStr = unwrapString(
    amount({
      op: "toParent",
      assetId: ASSETS.X_POLL,
      value: mappings?.[ASSETS.X_POLL]?.amount ?? 0,
      output: "string",
      trim: true,
      group: false,
    }),
  );

  const balanceNum = parseFloat(balanceStr || "0");
  const xpollBalNum = parseFloat(xpollBalStr || "0");
  const minLimitStr = unwrapString(
    amount({
      op: "toParent",
      assetId: assetType,
      value: coinMetaRaw[assetType]?.minLimitBase ?? 0,
      output: "string",
      trim: true,
      group: false,
    }),
  );
  const feeInXpollStr = unwrapString(
    amount({
      op: "toParent",
      assetId: ASSETS.X_POLL,
      value: coinMetaRaw[assetType]?.feeBase ?? 0,
      output: "string",
      trim: true,
      group: false,
    }),
  );

  const minLimitNum = parseFloat(minLimitStr || "0");
  const feeInXpollNum = parseFloat(feeInXpollStr || "0");
  const hasMin = balanceNum >= minLimitNum;
  const hasXpoll = xpollBalNum >= feeInXpollNum;
  const baseEligible = hasMin && hasXpoll;
  const eligible = !explicitDisable && baseEligible;

  const [balI, balF = "0"] = balanceStr.split(".");

  const stdBase = useMemo(
    () => Number(coinMetaRaw[assetType]?.minLimitBase ?? 0),
    [coinMetaRaw, assetType],
  );
  const stdParentNum = useMemo(
    () => parseFloat(minLimitStr || "0"),
    [minLimitStr],
  );

  const baseUnitSymbol = useMemo(() => {
    const p = assetSpecs[assetType]?.parentSymbol ?? label;
    return p.replace(/^X/, "");
  }, [assetType, label]);

  /** ============== Transactions ============== */
  const ledgerBase = endpoints.assets.getSellIntentLedgers;
  const ledgerUrl = `${ledgerBase}?page=1&pageSize=10&assetId=${assetType}`;

  const { data: ledgerRaw, isLoading: loadingTx } = useApiQuery(ledgerUrl, {
    refetchInterval: 5000,
  });

  const ledgerItems: any[] = useMemo(() => {
    const root = ledgerRaw?.data?.data ?? ledgerRaw?.data ?? {};
    return Array.isArray((root as any)?.items) ? (root as any).items : [];
  }, [ledgerRaw]);

  const apiTxns: Txn[] = useMemo(() => {
    return ledgerItems.map((item) => {
      const status = mapStatus(item?.metadata?.status);

      const leg = (item?.legs ?? []).find(
        (l: any) =>
          String(l?.assetId) === assetType &&
          String(l?.legType ?? "").toLowerCase() === LEG_TYPES.INTENT_AMOUNT,
      );

      const amountStr = unwrapString(
        amount({
          op: "toParent",
          assetId: assetType,
          value: leg?.amount ?? 0,
          output: "string",
          trim: true,
          group: false,
        }),
      );

      const hardcodedId =
        status === "Completed"
          ? `TXN-${
              String(item?._id ?? "")
                .slice(-6)
                .toUpperCase() || "ABC123"
            }`
          : "";

      const dateStr = new Date(item?.createdAt ?? Date.now()).toLocaleString(
        [],
        {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      return {
        id: hardcodedId,
        date: dateStr,
        amount: amountStr,
        status,
      } as Txn;
    });
  }, [ledgerItems, assetType]);

  const txns: Txn[] = (transactions?.length ?? 0) > 0 ? transactions! : apiTxns;

  /** ====== redirect after vanish ====== */
  const txRouteMap: Partial<Record<AssetType, string>> = {
    [ASSETS.X_OCTA]: "/exchange/transaction-aptos",
    [ASSETS.X_MYST]: "/exchange/transaction-sui",
    [ASSETS.X_DROP]: "/exchange/transaction-xrp",
    [ASSETS.X_HIGH]: "/exchange/transaction-strain",
  };

  const { i: animatedBalI, f: animatedBalF } = formatAnimatedNumber(
    topBalance ?? balanceNum,
  );

  const handleVanish = () => {
    onAfterLoad?.();

    if (typeof (window as any).confetti === "function") {
      (window as any).confetti({
        particleCount: 180,
        spread: 110,
        origin: { y: 0.3 },
      });
    }

    if (!audioRef.current) {
      audioRef.current = new Audio("/transaction.mp3");
      audioRef.current.loop = false;
      audioRef.current.volume = 1;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play();

    setIsVanishing(true);

    const duration = 2000;
    const route = txRouteMap[assetType] ?? (redirectTo || "/transactions");

    if (stdBase <= 0 || stdParentNum <= 0) {
      setTopBalance(balanceNum - stdParentNum);
      setDisplayBase(stdBase);
      requestAnimationFrame(() => navigate(route));
      return;
    }

    thresholdsRef.current = buildThresholds(stdBase);
    lastIndexRef.current = -1;

    let startTime: number | null = null;

    const step = (ts: number) => {
      if (startTime == null) startTime = ts;
      const rawT = Math.min((ts - startTime) / duration, 1);
      const p = rawT;

      setTopBalance(balanceNum - stdParentNum * p);

      const ticks = thresholdsRef.current.length;
      const idx = Math.min(ticks - 1, Math.floor(p * (ticks - 1)));

      if (idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        const currBase = thresholdsRef.current[idx];
        setDisplayBase(currBase);
      }

      if (rawT < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayBase(stdBase);
        setTopBalance(balanceNum - stdParentNum);
        requestAnimationFrame(() => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          navigate(route);
        });
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };
  const loading = loadingProfile || loadingCoins || loadingTx;

  if (loading) {
    return <CoinDetailSkeleton />;
  }
  return (
    <main
      style={heightStyles}
      className={`min-h-screen transition-colors duration-500 overflow-x-hidden overflow-y-auto ${
        isVanishing ? "bg-[#F2F3F5]" : "bg-[#F2F3F5]"
      }`}
    >
      <ShineAnimationStyle />
      <header
        style={{ background: gradient }}
        className="rounded-b-3xl relative max-w-md mx-auto"
      >
        <div className="mx-auto pt-3">
          <div className="flex items-center gap-2">
            {!isVanishing && (
              <BackButton
                className="w-10 absolute left-4 top-4"
                to="/exchange"
              />
            )}
            <div className="mx-auto text-center">
              <div className="text-xl font-bold tracking-[0.2em]">{label}</div>
              <div className="text-[10px] uppercase tracking-[0.24em] opacity-90 mt-2">
                Total Balance
              </div>
              <div className="text-3xl font-semibold leading-none tabular-nums">
                {isVanishing ? animatedBalI : balI}
                <span className="opacity-80 text-lg">
                  .{isVanishing ? animatedBalF : balF}
                </span>
              </div>
            </div>
          </div>
        </div>

        <HeaderCoinBlock
          chestImg={chestImgColor}
          coinImg={coinImgColor}
          grayscale={!eligible}
          floating={eligible}
          dropRef={dropTextRef}
          onVanish={handleVanish}
          isVanishing={isVanishing}
        />
      </header>

      {/* body content */}
      <section className="mx-auto max-w-md px-4 pb-10 pt-20">
        {isVanishing ? (
          <div className="text-center text-lg text-black/60 mb-2 animate-pulse">
            Burning {baseUnitSymbol} coins...
          </div>
        ) : (
          eligible && (
            <motion.div
              ref={dropTextRef}
              className="text-center text-sm mb-2"
              animate={{ y: [0, 0, 25, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.9, 0.95, 1],
              }}
            >
              <span className="animate-shine">Drag down to load coin</span>
            </motion.div>
          )
        )}

        {/* droppable area */}
        <div className="relative z-20 flex justify-between rounded-3xl bg-white p-4 shadow-sm">
          <label
            className="text-xl font-bold"
            aria-label={`${baseUnitSymbol} token`}
          >
            {baseUnitSymbol}
          </label>
          <span className="text-xl font-bold tabular-nums" aria-label="amount">
            {displayBase.toLocaleString()}
          </span>
        </div>

        {!isVanishing && (
          <>
            {/* banners */}
            <section className="mt-3 space-y-2" aria-live="polite">
              {/* {balanceStr < minLimitStr && ( */}
              {!explicitDisable ? (
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm w-fit mx-auto ${
                    baseEligible
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <span className="text-lg leading-none">
                    {baseEligible ? "▲" : "▾"}
                  </span>

                  <span>
                    Minimum amount required: {minLimitStr}{" "}
                    {assetSpecs[assetType]?.parentSymbol ?? label}
                  </span>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <p className="bg-neutral-300 text-black w-fit py-2 px-3 rounded-lg">
                    {explicitDisableText ?? "Claim Unavailable"}
                  </p>
                </div>
              )}
              {/* )} */}
              {xpollBalNum < feeInXpollNum && (
                <div className="rounded-full bg-rose-100 px-3 py-2 text-sm text-rose-700 w-fit mx-auto">
                  You need XPOLL coins to claim this: {feeInXpollStr}
                </div>
              )}
            </section>

            {/* transactions */}
            {!isVanishing && (
              <TransactionsBlock
                assetType={assetType}
                label={label}
                onViewAll={() => navigate(allTxRoute)}
                page={1}
                pageSize={4}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}
