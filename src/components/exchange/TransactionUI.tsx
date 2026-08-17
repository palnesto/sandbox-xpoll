import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/commons/back-button";
import { AssetType, ASSETS } from "@/utils/currency-assets/asset";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ResponsiveModal } from "../commons/responsiveModal";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import SuiConnect, { SUI_LS_KEY } from "../walletconnect/suiconnect";
import { truncateWallet } from "@/utils/formatter";
import XamanConnect, { XAMAN_LS_KEY } from "../walletconnect/xamanconnect";
import AptosConnect, { APTOS_ADDR_KEY } from "../walletconnect/aptosconnect";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { Button } from "../ui/button";

export type Props = {
  assetType: AssetType;
  symbolFrom: string;
  gradient: string;
};

export const Chip = ({
  label,
  value,
  tone = "neutral",
  sign = "none",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "pos" | "neg";
  sign?: "plus" | "minus" | "none";
}) => {
  const toneMap = {
    neutral: "bg-white",
    pos: "bg-green-50 ring-1 ring-green-300 text-green-800",
    neg: "bg-rose-50 ring-1 ring-rose-300",
  } as const;

  return (
    <div
      className={`w-[96px] h-[92px] text-xs font-medium p-2 rounded-xl grid place-items-center ${toneMap[tone]}`}
    >
      <span className="text-[10px] tracking-widest font-bold text-black/60">
        {label}
      </span>
      <span>{sign === "plus" ? "+" : sign === "minus" ? "−" : ""}</span>
      <span>{value}</span>
    </div>
  );
};

export default function TransactionUI({
  assetType,
  symbolFrom,
  gradient,
}: Props) {
  const { pathname } = useLocation();
  const [connectedWallet, setConnectedWallet] = useState<null | string>(null);
  const symbolTo = useMemo(() => symbolFrom.replace(/^X/, ""), [symbolFrom]);
  const navigate = useNavigate();
  /** ───────── state ───────── */
  const [showInitModal, setShowInitModal] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);

  const { data: coinsRaw } = useApiQuery(endpoints.assets.getAssetsInfo);
  const coins: any[] = useMemo(
    () =>
      Array.isArray(coinsRaw?.data?.data)
        ? coinsRaw.data.data
        : Array.isArray(coinsRaw?.data)
          ? coinsRaw.data
          : [],
    [coinsRaw],
  );

  const coinMeta = useMemo(() => {
    const found = coins.find((c) => c._id === assetType);
    if (!found || !found.canSell) return { burnAmount: 0, xpollFee: 0 };
    return {
      burnAmount: found.canSell.standardOrderAmount ?? 0,
      xpollFee: found.canSell.conversionFeesInXpoll ?? 0,
    };
  }, [coins, assetType]);

  const burnAmount = coinMeta.burnAmount;
  const xpollUse = coinMeta.xpollFee;

  const burnAmountStr = useMemo(
    () =>
      unwrapString(
        amount({
          op: "toParent",
          assetId: assetType,
          value: burnAmount,
          output: "string",
          trim: true,
          group: false,
        }),
      ),
    [assetType, burnAmount],
  );

  const xpollUseStr = useMemo(
    () =>
      unwrapString(
        amount({
          op: "toParent",
          assetId: ASSETS.X_POLL,
          value: xpollUse,
          output: "string",
          trim: true,
          group: false,
        }),
      ),
    [xpollUse],
  );

  const { mutate: sellIntentMutation, isPending: selling } = useApiMutation<
    { assetId: string; walletAddress: string },
    { actionId: string; legIds: string[] }
  >({
    route: endpoints.assets.sellIntent,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowInitModal(false);
      setShowFinalModal(true);
    },
  });

  useEffect(() => {
    let addr: string | null = null;
    try {
      if (assetType === "xMYST") {
        const raw = localStorage.getItem(SUI_LS_KEY);
        addr = raw ? (JSON.parse(raw)?.address ?? null) : null;
      } else if (assetType === "xDrop") {
        const raw = localStorage.getItem(XAMAN_LS_KEY);
        addr = raw ? (JSON.parse(raw)?.address ?? null) : null;
      } else if (assetType === "xOcta") {
        addr =
          sessionStorage.getItem(APTOS_ADDR_KEY) ||
          localStorage.getItem(APTOS_ADDR_KEY);
      }
    } catch {
      // ignore JSON/storage errors
    }
    setConnectedWallet(addr ?? null);
  }, [assetType, setConnectedWallet]);

  const backTo = useMemo(() => {
    if (pathname === "/exchange/transaction-sui") {
      return "/exchange/exchange-sui";
    } else if (pathname === "/exchange/transaction-xrp") {
      return "/exchange/exchange-xrp";
    } else if (pathname === "/exchange/transaction-aptos") {
      return "/exchange/exchange-aptos";
    }
    return undefined;
  }, [pathname]);
  return (
    <main className="bg-[#F2F3F5] flex flex-col pb-5">
      {/* Header */}
      <header
        style={{ background: gradient }}
        className="relative rounded-b-3xl "
      >
        <span className="absolute left-1/2 -bottom-52 -translate-x-1/2 -translate-y-1/2 h-52 w-64 rounded-full bg-white/15 " />
        <span className="absolute left-1/2 -bottom-40 -translate-x-1/2 -translate-y-1/2 h-40 w-52 rounded-full bg-white/25" />

        <div className="relative mx-auto max-w-md px-4 pt-7 pb-6">
          <div className="flex items-center">
            <BackButton to={backTo} />
            <h1 className="mx-auto text-xl font-extrabold tracking-[0.2em]">
              {symbolFrom}
            </h1>
          </div>

          <div className="mt-14 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 shadow-sm flex items-baseline justify-between">
            <div className="text-lg font-extrabold tracking-widest">
              {symbolFrom}
            </div>
            <div className="text-2xl font-semibold text-rose-600">
              -{burnAmountStr}
            </div>
          </div>

          <p className="mt-2 text-center text-[12px] text-black/70">
            You will burn {burnAmountStr} {symbolFrom}
          </p>
        </div>

        <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-black/20 bg-white text-sm shadow">
            ↕
          </div>
        </div>
      </header>

      {/* Body */}
      <section className="mx-auto w-full max-w-md px-4 pt-6 pb-4">
        <p className="mt-2 text-center text-[12px] text-black/60">
          You will receive {burnAmountStr} {symbolTo}
        </p>

        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold tracking-widest">
              {symbolTo}
            </div>
            <div className="text-2xl font-semibold text-emerald-700">
              +{burnAmountStr}
            </div>
          </div>
        </div>

        <p className="text-center text-[12px] text-black/50 pt-10">
          Exchange rate 1 {symbolFrom} = 1 {symbolTo}
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Chip
            label={symbolFrom}
            value={burnAmountStr}
            tone="neg"
            sign="minus"
          />
          <Chip label="XPOLL" value={xpollUseStr} tone="neutral" sign="minus" />
          <Chip label={symbolTo} value={burnAmountStr} tone="pos" sign="plus" />
        </div>
      </section>

      {/* Bottom CTA */}
      <footer className="mx-auto max-w-md mx px-4 pb-4 w-full">
        {assetType === "xMYST" && (
          <SuiConnect
            setConnectedWallet={setConnectedWallet}
            connectedWallet={connectedWallet}
          />
        )}
        {assetType === "xDrop" && (
          <XamanConnect
            setConnectedWallet={setConnectedWallet}
            connectedWallet={connectedWallet}
          />
        )}
        {assetType === "xOcta" && (
          <AptosConnect
            setConnectedWallet={setConnectedWallet}
            connectedWallet={connectedWallet}
          />
        )}
        {connectedWallet && (
          <button
            type="button"
            onClick={() => setShowInitModal(true)}
            className="w-full rounded-full bg-teal-600 py-3 text-white text-[15px] font-semibold shadow-md hover:bg-teal-700"
          >
            Create order
          </button>
        )}
      </footer>

      {/* Initiate Now Modal */}
      <ResponsiveModal
        title=""
        description=""
        open={showInitModal}
        onOpenChange={setShowInitModal}
        actionLabel={selling ? "Processing..." : "Proceed"}
        showBackButton={false}
        onAction={() => {
          if (connectedWallet) {
            sellIntentMutation({
              assetId: assetType,
              walletAddress: connectedWallet,
            });
          }
          setShowInitModal(false);
          setShowFinalModal(true);
        }}
        disabled={selling}
      >
        <Button
          variant={"outline"}
          className="absolute -top-14 left-1/2 -translate-x-1/2 rounded-3xl px-6"
          onClick={() => setShowInitModal(false)}
        >
          X
        </Button>
        <section className="flex justify-between pb-2 -mt-7">
          <h3 className="text-xl font-bold">Initiate Now</h3>
          {`+${burnAmountStr} ${symbolTo}`}
        </section>
        <div className="space-y-2 text-[13px] pt-6 border-t border-black/10">
          {/* <p className="flex justify-between">
            Order ID :<span>16546516518</span>
          </p> */}
          <p className="flex justify-between">
            Wallet ID : <span>{truncateWallet(connectedWallet)}</span>
          </p>
          <p className="flex justify-between">
            Xpoll Burned :<span> -{xpollUseStr}</span>
          </p>
          <p className="flex justify-between">
            {symbolFrom} Burned : <span>-{burnAmountStr}</span>
          </p>
        </div>
      </ResponsiveModal>

      {/* Order Initiated Modal */}
      <ResponsiveModal
        open={showFinalModal}
        onOpenChange={setShowFinalModal}
        title=""
        description=""
        showBackButton={false}
        actionLabel="View Transactions"
        onAction={() => {
          const route = `/exchange/all-${symbolTo.toLowerCase()}-transaction`;
          navigate(route);
        }}
        backTo={backTo}
      >
        <Button
          variant={"outline"}
          className="absolute -top-14 left-1/2 -translate-x-1/2 rounded-3xl px-6"
          onClick={() => setShowFinalModal(false)}
        >
          X
        </Button>
        <section className="flex justify-between pb-2 -mt-7">
          <h3 className="text-xl font-bold">Order Initiated</h3>
          {`+${burnAmountStr} ${symbolTo}`}
        </section>
        <div className="flex justify-between items-center pb-2">
          <div className="text-xs text-black/70">Sep 18, 2023</div>
          <span className="rounded-md bg-amber-100 px-2 py-[2px] text-[11px] font-medium text-amber-800">
            Pending
          </span>
        </div>

        <div className="space-y-2 text-[13px] pt-6 border-t border-black/10">
          <p className="flex justify-between">
            Wallet ID : <span>{truncateWallet(connectedWallet)}</span>
          </p>
          <p className="flex justify-between">
            Xpoll Burned :<span> -{xpollUseStr}</span>
          </p>
          <p className="flex justify-between">
            {symbolFrom} Burned : <span>-{burnAmountStr}</span>
          </p>
        </div>
      </ResponsiveModal>
    </main>
  );
}
