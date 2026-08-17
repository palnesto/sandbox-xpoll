import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useDisconnect, useWriteContract } from "wagmi";
import { parseAbi } from "viem";
import { useAppKit } from "@reown/appkit/react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { appToast } from "@/utils/toast";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { ASSETS } from "@/utils/currency-assets/asset";
import { endpoints } from "@/api/endpoints";
import BackButton from "@/components/commons/back-button";
import { Chip } from "@/components/exchange/TransactionUI";
import { CoinDetailSkeleton } from "@/components/commons/FullScreenLoader";
import { Headset } from "lucide-react";
import { TransactionsBlock } from "@/components/exchange/CoinDetail";
import { useNavigate } from "react-router";
import { isMobile } from "react-device-detect";

const RELAYER = import.meta.env.VITE_RELAYER_CONTRACT_ADDRESS as `0x${string}`;

const relayerAbi = parseAbi([
  "function claim(address to, uint256 amount, uint256 nonce, uint256 deadline, bytes signature)",
]);

type ApiWrap<T> = { statusCode?: number; data?: T; message?: string } & any;

export type Txn = {
  id: string;
  date: string;
  amount: string;
  status: "Pending" | "Completed" | "Rejected";
};

type ClaimStateDto = {
  externalAccountId: string;
  status: "idle" | "processing" | string;
  balanceHigh: string;
  pendingHigh: string;
  fixedRedeemHigh: string;
  lastNonce: string;
  lastWallet: string;
  processingDeadlineSec: string;
  processingStartedAt: string | null;
  processingExpiresAt: string | null;
  intentActionId: string;
  lastTxHash: string;
  isSellStrainActive: boolean;
};

type PrepareClaimDto = {
  to: `0x${string}`;
  amount: string;
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
};

function getApiData<T>(res: ApiWrap<T> | T): T {
  return (res as any)?.data?.data ?? (res as any)?.data ?? (res as any);
}

const TOKEN_ADDRESS = import.meta.env.VITE_STRAIN_TOKEN_ADDRESS as
  | `0x${string}`
  | undefined;

async function addTokenToWallet() {
  if (!TOKEN_ADDRESS) {
    appToast.info("TOKEN_ADDRESS is not defined");
    return;
  }
  if (!window.ethereum) {
    alert("Wallet not found!");
    return;
  }
  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: TOKEN_ADDRESS,
          symbol: "STR",
          decimals: 18,
          image: "",
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
}

const TransactionStrain = () => {
  const navigate = useNavigate();
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const qc = useQueryClient();

  const { data: coinsRaw, isLoading: loadingCoin } = useApiQuery(
    endpoints.assets.getAssetsInfo
  );

  const coins = coinsRaw?.data?.data ?? [];
  const xHighCoin = coins.find((c: any) => c._id === "xHigh");

  const burnAmount = xHighCoin?.canSell?.standardOrderAmount ?? "0";
  const xpollUse = xHighCoin?.canSell?.conversionFeesInXpoll ?? "0";

  const burnAmountStr = unwrapString(
    amount({
      op: "toParent",
      assetId: ASSETS.X_HIGH,
      value: burnAmount,
      output: "string",
      trim: true,
      group: false,
    })
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
        })
      ),
    [xpollUse]
  );

  /* ---------------- Data Fetching (Claim State) ---------------- */
  const stateRoute = endpoints.strain.getClaimState;

  const stateQ = useApiQuery(stateRoute, {
    enabled: true,
    refetchInterval: (q) => {
      const d = q?.state?.data?.data?.data;
      return d?.status === "processing" ? 2000 : 20000;
    },
    refetchOnWindowFocus: false,
  });

  const stateLoading = stateQ.isLoading;

  const state = useMemo(
    () => (stateQ.data ? getApiData<ClaimStateDto>(stateQ.data) : null),
    [stateQ.data]
  );

  const balanceHighBI = useMemo(
    () => BigInt(state?.balanceHigh || "0"),
    [state?.balanceHigh]
  );

  const fixedHighBI = useMemo(
    () => BigInt(state?.fixedRedeemHigh || "0"),
    [state?.fixedRedeemHigh]
  );

  /* ---------------- Redirect if isSellStrainActive is false ---------------- */
  useEffect(() => {
    if (!stateLoading && state && state.isSellStrainActive === false) {
      navigate("/exchange/exchange-strain", { replace: true });
    }
  }, [stateLoading, state, navigate]);

  /* ---------------- Mutations ---------------- */
  const prepareM = useApiMutation<
    { walletAddress: string },
    ApiWrap<PrepareClaimDto>
  >({
    route: "/external/actions/strain/claim/prepare",
    method: "POST",
    onSuccess: async () => qc.invalidateQueries({ queryKey: [stateRoute] }),
  });

  const unlockM = useApiMutation<{ reason?: string }, ApiWrap<{ ok: true }>>({
    route: "/external/actions/strain/claim/unlock",
    method: "POST",
    onSuccess: async () => qc.invalidateQueries({ queryKey: [stateRoute] }),
  });

  /* ---------------- Actions ---------------- */
  async function onClaim() {
    if (!isConnected || !address) return;

    try {
      const prepRes = await prepareM.mutateAsync({ walletAddress: address });
      const prep = getApiData<PrepareClaimDto>(prepRes);

      await writeContractAsync({
        address: RELAYER,
        abi: relayerAbi,
        functionName: "claim",
        args: [
          prep.to,
          BigInt(prep.amount),
          BigInt(prep.nonce),
          BigInt(prep.deadline),
          prep.signature,
        ],
      });

      await qc.invalidateQueries({ queryKey: [stateRoute] });
      appToast.info("Strain claim successful");
    } catch {
      await unlockM.mutateAsync({ reason: "USER_CANCEL" }).catch(() => {});
      appToast.info("User canceled transaction");
    }
  }

  const busy = prepareM.isPending || unlockM.isPending;

  const canClaim =
    !!state &&
    state.status !== "processing" &&
    isConnected &&
    balanceHighBI >= fixedHighBI &&
    fixedHighBI > 0n &&
    !busy;

  if (loadingCoin || stateLoading || state?.isSellStrainActive === false) {
    return <CoinDetailSkeleton />;
  }
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
          <div className="flex items-center justify-between">
            <BackButton to={"/exchange/exchange-strain"} />
            <h1 className="mx-auto text-xl font-extrabold tracking-[0.2em]">
              XSTRAIN
            </h1>
            <a
              href="https://t.me/cryptogeek_ivan"
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-white/50 rounded-full border"
            >
              <Headset />
            </a>
          </div>

          <div className="mt-14 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 shadow-sm flex items-baseline justify-between">
            <div className="text-lg font-extrabold tracking-widest">
              XSTRAIN
            </div>
            <div className="text-2xl font-semibold text-rose-600">
              -{burnAmountStr}
            </div>
          </div>

          <p className="mt-2 text-center text-[12px] text-black/70">
            You will burn {burnAmountStr} XSTRAIN
          </p>
        </div>

        <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-black/20 bg-white text-sm shadow">
            ↕
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md px-4 py-6">
        <p className="mt-2 text-center text-[12px] text-black/60">
          You will receive {burnAmountStr} XSTRAIN
        </p>

        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold tracking-widest">STRAIN</div>
            <div className="text-2xl font-semibold text-emerald-700">
              +{burnAmountStr}
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

      {!isMobile && (
        <div className="w-full flex justify-center my-5">
          <button
            onClick={addTokenToWallet}
            className="text-white w-fit rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-semibold hover:bg-neutral-900"
          >
            Add Strain token to wallet
          </button>
        </div>
      )}

      {state?.isSellStrainActive ? (
        <>
          <p className="text-center text-sm text-zinc-500">
            Minimum BASE ETH balance required to claim STR.
          </p>
          <div className="text-center text-sm text-zinc-500">
            Wallet Address :{" "}
            {isConnected
              ? `${address?.slice(0, 6)}...${address?.slice(-3)}`
              : "Disconnected"}
          </div>

          <footer className="mx-auto max-w-md px-4 pt-4 w-full">
            <div className="space-y-3">
              {isConnected ? (
                <button
                  onClick={() => disconnect()}
                  className="w-full rounded-full bg-red-700 py-3 text-sm font-semibold text-white"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => open()}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  Connect Wallet
                </button>
              )}

              {isConnected && (
                <button
                  disabled={!canClaim}
                  onClick={onClaim}
                  className="w-full rounded-full bg-blue py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Claim
                </button>
              )}
            </div>
          </footer>
        </>
      ) : (
        <div className="w-full flex justify-center">
          <p className="bg-neutral-300 text-black w-fit py-2 px-3 rounded-lg">
            Strain Claim Unavailable
          </p>
        </div>
      )}

      <TransactionsBlock
        assetType="xHigh"
        label="XSTRAIN"
        onViewAll={() => navigate("/exchange/all-strain-transaction")}
        page={1}
        pageSize={4}
      />
    </main>
  );
};

export default TransactionStrain;
