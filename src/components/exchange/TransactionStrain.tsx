import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { appToast } from "@/utils/toast";
import { Chip } from "./TransactionUI";
import BackButton from "../commons/back-button";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { ASSETS } from "@/utils/currency-assets/asset";
import { endpoints } from "@/api/endpoints";
import { getDefaultEvmPaymentChain } from "@/lib/payments/evm-network";

const RELAYER = import.meta.env.VITE_RELAYER_CONTRACT_ADDRESS as `0x${string}`;
const DECIMALS = Number(import.meta.env.VITE_TOKEN_DECIMALS || 6);

type ApiWrap<T> = {
  statusCode?: number;
  data?: T | { data?: T };
  message?: string;
} & Record<string, unknown>;

function getApiData<T>(res: ApiWrap<T> | T): T {
  if (typeof res !== "object" || res === null) return res as T;

  const payload = res as ApiWrap<T>;
  if (
    typeof payload.data === "object" &&
    payload.data !== null &&
    "data" in payload.data
  ) {
    const nested = payload.data as { data?: T };
    if (nested.data !== undefined) return nested.data;
  }

  if (payload.data !== undefined) return payload.data as T;
  return res as T;
}

type ClaimStateDto = {
  externalAccountId: string;
  status: "idle" | "processing" | string;
  balanceHigh: string; // HIGH units
  pendingHigh: string; // HIGH units
  fixedRedeemHigh: string; // HIGH units
  lastNonce: string;
  lastWallet: string;
  processingDeadlineSec: string;
  processingStartedAt: string | null;
  processingExpiresAt: string | null;
  intentActionId: string;
  lastTxHash: string;
};

type PrepareClaimDto = {
  to: `0x${string}`;
  amount: string; // HIGH units (stringified bigint)
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
  intentActionId?: string;
};
const badge = (label: string) => (
  <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
    {label}
  </span>
);
const TransactionStrain = () => {
  const qc = useQueryClient();
  const targetChain = getDefaultEvmPaymentChain();

  const { address, isConnected, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const stateRoute = "/external/actions/strain/claim/state";

  const stateQ = useApiQuery(stateRoute, {
    enabled: true,
    refetchInterval: (q) => {
      const data = q?.state?.data?.data?.data;
      return data?.status === "processing" ? 2000 : false;
    },
    refetchOnWindowFocus: false,
  });

  const state = useMemo(() => {
    if (!stateQ.data) return null;
    return getApiData<ClaimStateDto>(stateQ.data);
  }, [stateQ.data]);

  const balanceHighBI = useMemo(() => {
    try {
      return BigInt(state?.balanceHigh || "0");
    } catch {
      return 0n;
    }
  }, [state?.balanceHigh]);
  const fixedHighBI = useMemo(() => {
    try {
      return BigInt(state?.fixedRedeemHigh || "0");
    } catch {
      return 0n;
    }
  }, [state?.fixedRedeemHigh]);

  const prettyFixed = useMemo(() => {
    try {
      return formatUnits(fixedHighBI, DECIMALS);
    } catch {
      return "0";
    }
  }, [fixedHighBI]);

  const prepareM = useApiMutation<
    { walletAddress: string },
    ApiWrap<PrepareClaimDto>
  >({
    route: "/external/actions/strain/claim/prepare",
    method: "POST",
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [stateRoute] });
    },
  });

  const unlockM = useApiMutation<{ reason?: string }, ApiWrap<{ ok: true }>>({
    route: "/external/actions/strain/claim/unlock",
    method: "POST",
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [stateRoute] });
    },
  });
  const { data: coinsRaw } = useApiQuery(endpoints.assets.getAssetsInfo);
  const coin = coinsRaw?.data?.data ?? [];

  const burnAmount = coin.burnAmount;
  const xpollUse = coin.xpollFee;

  const burnAmountStr = useMemo(
    () =>
      unwrapString(
        amount({
          op: "toParent",
          assetId: ASSETS.X_HIGH,
          value: burnAmount,
          output: "string",
          trim: true,
          group: false,
        }),
      ),
    [burnAmount],
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

  async function onConnectWallet() {
    await connectAsync({ connector: injected() });
    if (chainId !== targetChain.id) {
      try {
        await switchChainAsync({ chainId: targetChain.id });
      } catch {
        // ignore; UI will show chain badge
      }
    }
  }

  async function onClaim() {
    if (!isConnected || !address) return;
    if (!RELAYER || !RELAYER.startsWith("0x")) return;

    if (chainId !== targetChain.id) {
      try {
        await switchChainAsync({ chainId: targetChain.id });
      } catch {
        return;
      }
    }

    try {
      await qc.invalidateQueries({ queryKey: [stateRoute] });
      appToast.info("Strain claim successful");
    } catch (e) {
      await unlockM.mutateAsync({ reason: "USER_CANCEL" }).catch(() => {});
      appToast.info("User canceled transaction");
      throw e;
    }
  }

  const busy = prepareM.isPending || unlockM.isPending;

  const canClaim =
    !!state &&
    state.status !== "processing" &&
    isConnected &&
    !!address &&
    !busy &&
    balanceHighBI >= fixedHighBI &&
    fixedHighBI > 0n;
  const stateErrorMessage =
    stateQ.error instanceof Error ? stateQ.error.message : null;

  return (
    <main className="bg-[#F2F3F5] flex flex-col pb-5">
      <header
        style={{
          background: "linear-gradient(180deg,#31EA62 0%,#28db58 100%)",
        }}
        className="relative rounded-b-3xl "
      >
        <span className="absolute left-1/2 -bottom-52 -translate-x-1/2 -translate-y-1/2 h-52 w-64 rounded-full bg-white/15 " />
        <span className="absolute left-1/2 -bottom-40 -translate-x-1/2 -translate-y-1/2 h-40 w-52 rounded-full bg-white/25" />

        <div className="relative mx-auto max-w-md px-4 pt-7 pb-6">
          <div className="flex items-center">
            <BackButton to={"/exchange/transaction-strain"} />
            <h1 className="mx-auto text-xl font-extrabold tracking-[0.2em]">
              XSTRAIN
            </h1>
          </div>
          <div className="mt-14 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 shadow-sm flex items-baseline justify-between">
            <div className="text-lg font-extrabold tracking-widest">
              XSTRAIN
            </div>
            <div className="text-2xl font-semibold text-rose-600">
              -{prettyFixed}
            </div>
          </div>
          <p className="mt-2 text-center text-[12px] text-black/70">
            You will burn {prettyFixed} XSTRAIN
          </p>
        </div>
        <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-black/20 bg-white text-sm shadow">
            ↕
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pt-6 pb-4">
        <p className="mt-2 text-center text-[12px] text-black/60">
          You will receive {prettyFixed} XSTRAIN
        </p>
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold tracking-widest">
              XSTRAIN
            </div>
            <div className="text-2xl font-semibold text-emerald-700">
              +{prettyFixed}
            </div>
          </div>
        </div>
        <p className="text-center text-[12px] text-black/50 pt-10">
          Exchange rate 1 XSTRAIN = 1 STRAIN
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Chip label="XSTRAIN" value={burnAmountStr} tone="neg" sign="minus" />
          <Chip label="XPOLL" value={xpollUseStr} tone="neutral" sign="minus" />
          <Chip label="STRAIN" value={burnAmountStr} tone="pos" sign="plus" />
        </div>
      </section>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {badge(
          `Wallet: ${
            isConnected
              ? `${address?.slice(0, 6)}…${address?.slice(-4)}`
              : "disconnected"
          }`,
        )}
        {stateQ.isFetching ? badge("Syncing…") : null}
      </div>
      <footer className="mx-auto max-w-md mx px-4 pb-4 w-full">
        <div className="mt-4 flex flex-wrap gap-3">
          {!isConnected ? (
            <button
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 text-sm disabled:opacity-60"
              disabled={busy}
              onClick={onConnectWallet}
            >
              Connect MetaMask
            </button>
          ) : (
            <button
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 text-sm disabled:opacity-60"
              disabled={busy}
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          )}
        </div>
        <button
          className="h-11 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          disabled={!canClaim}
          onClick={() => onClaim().catch(() => {})}
        >
          Claim (Fixed)
        </button>
        <div className="mt-4 text-xs text-zinc-500">
          {busy
            ? "Working…"
            : state?.status === "processing"
              ? "Claim in progress. If your tx failed or you rejected it, hit Unlock."
              : "Ready. Claim will redeem exactly the fixed amount (no partial claims)."}
        </div>
        {stateErrorMessage && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {stateErrorMessage}
          </div>
        )}
      </footer>
    </main>
  );
};

export default TransactionStrain;
