import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Unplug,
  Wallet,
} from "lucide-react";

import {
  AnimatedDotsText,
  AssetMetric,
  CheckoutSection,
  FooterButton,
  NoticePanel,
  SummaryRows,
} from "@/components/payment/checkout-ui";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import { shortenWalletAddress } from "@/lib/payments/wallet";
import type {
  WalletAction,
  WalletStepNotice,
} from "@/components/payment/checkout-core";
import type { AssetMarketCard } from "./types";

type WalletStepProps = {
  walletReady: boolean;
  chainMatches: boolean;
  paymentChainName: string;
  address?: string;
  usdcTotalMinor: number | null;
  walletAction: WalletAction;
  walletNotice?: WalletStepNotice | null;
  selectedAsset: AssetMarketCard | null;
  quantity: number | null;
  onBack: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onSwitchNetwork: () => void;
  onContinue: () => void;
};

export function WalletStep(props: WalletStepProps) {
  const walletStatusTitle = !props.walletReady
    ? "Connect a wallet"
    : !props.chainMatches
      ? "Switch network"
      : "Wallet ready";

  const walletStatusDescription = !props.walletReady
    ? "Connect your wallet to continue with crypto payment."
    : !props.chainMatches
      ? `Switch to ${props.paymentChainName} to continue.`
      : "Your wallet is connected and ready. Continue to review your payment.";

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
      <CheckoutSection
        title="Wallet readiness"
        caption="Make sure your wallet is connected before you continue."
      >
        <NoticePanel
          tone={
            !props.walletReady || !props.chainMatches ? "warning" : "success"
          }
          title={walletStatusTitle}
          description={walletStatusDescription}
        />

        <div className="mt-5 grid gap-3">
          <AssetMetric
            label="Wallet"
            value={
              props.walletReady && props.address ? (
                <span className="inline-flex items-center gap-2">
                  <span>{shortenWalletAddress(props.address)}</span>
                  <CopyIconButton
                    value={props.address}
                    srLabel="Copy wallet address"
                    className="text-black/45 hover:text-[#132238]"
                  />
                </span>
              ) : (
                props.walletReady
                  ? "Connected"
                  : shortenWalletAddress(props.address)
              )
            }
            caption={props.walletReady ? "Connected" : "Not connected"}
          />
          <AssetMetric
            label="Network"
            value={props.chainMatches ? props.paymentChainName : "Needs switch"}
            caption="Required for this payment"
          />
          <AssetMetric
            label="Order total"
            value={
              props.usdcTotalMinor != null
                ? `${formatTokenAmountFromMinor(
                    props.usdcTotalMinor,
                    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                  )} USDC`
                : "Unavailable"
            }
            caption="Amount due"
          />
        </div>

        {props.walletNotice ? (
          <div className="mt-5">
            <NoticePanel
              tone={props.walletNotice.tone}
              title={props.walletNotice.title}
              description={props.walletNotice.description}
            />
          </div>
        ) : null}
      </CheckoutSection>

      <CheckoutSection
        title="Before you continue"
        caption="Review the basic details before moving to payment."
      >
        <SummaryRows
          rows={[
            {
              label: "Asset",
              value: props.selectedAsset?.parentLabel ?? "--",
            },
            {
              label: "Quantity",
              value:
                props.quantity != null
                  ? `${props.quantity.toLocaleString()} tokens`
                  : "--",
            },
            {
              label: "Amount due",
              value:
                props.usdcTotalMinor != null
                  ? `${formatTokenAmountFromMinor(
                      props.usdcTotalMinor,
                      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                    )} USDC`
                  : "Unavailable",
            },
          ]}
        />

        <div className="mt-6 flex flex-col gap-3">
          <FooterButton type="button" variant="outline" onClick={props.onBack}>
            Back to checkout
          </FooterButton>

          {props.walletReady ? (
            <FooterButton
              type="button"
              className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
              disabled={props.walletAction !== null}
              onClick={props.onDisconnectWallet}
            >
              {props.walletAction === "disconnect" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Disconnecting wallet
                </>
              ) : (
                <>
                  <Unplug className="h-4 w-4" />
                  Disconnect wallet
                </>
              )}
            </FooterButton>
          ) : null}

          {!props.walletReady ? (
            <FooterButton
              type="button"
              className="bg-[#0f766e] text-white hover:bg-[#115e59]"
              disabled={props.walletAction !== null}
              onClick={props.onConnectWallet}
            >
              {props.walletAction === "connect" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting wallet
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Connect wallet
                </>
              )}
            </FooterButton>
          ) : !props.chainMatches ? (
            <FooterButton
              type="button"
              className="bg-[#132238] text-white hover:bg-[#0f172a]"
              disabled={props.walletAction !== null}
              onClick={props.onSwitchNetwork}
            >
              {props.walletAction === "switch" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Switching network
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Switch to {props.paymentChainName}
                </>
              )}
            </FooterButton>
          ) : (
            <FooterButton
              type="button"
              className="bg-[#132238] text-white hover:bg-[#0f172a]"
              disabled={props.walletAction !== null}
              onClick={props.onContinue}
            >
              {props.walletAction === "quote" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing payment
                </>
              ) : props.walletAction === "connect" ? (
                <AnimatedDotsText text="Connecting wallet" />
              ) : (
                <>
                  Continue to review
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </FooterButton>
          )}
        </div>
      </CheckoutSection>
    </div>
  );
}
