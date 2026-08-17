import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  DollarSign,
  Hash,
  ReceiptText,
  Wallet,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import type {
  CheckoutRail,
  CheckoutResult,
} from "@/components/payment/checkout-core";
import { FooterButton } from "@/components/payment/checkout-ui";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import { type PaymentIntentRecord } from "@/lib/payments/core";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import { shortenWalletAddress } from "@/lib/payments/wallet";
import { cn } from "@/lib/utils";
import { getTxExplorerUrl } from "@/utils/txExplorer";
import type { AssetMarketCard } from "./types";
import { formatUsd } from "./utils";

type ResultStepProps = {
  result: CheckoutResult;
  selectedAsset: AssetMarketCard | null;
  quantity: number | null;
  selectedRail: CheckoutRail | null;
  resultPayment: PaymentIntentRecord | null;
  resultTxHash: string | null;
  usdTotalMinor: number | null;
  usdcTotalMinor: number | null;
  address?: string;
  onClose: () => void;
  onRetry: () => void;
  onViewPayment: () => void;
};

function getStatusPresentation(kind: CheckoutResult["kind"]) {
  if (kind === "success") {
    return {
      title: "Payment Successful",
      badge: "Success",
      // Stronger tint: visible green, still premium
      cardClassName:
        "border-emerald-300 bg-emerald-200/70 bg-gradient-to-b from-emerald-200 via-emerald-100 to-emerald-200",
      iconWrapClassName:
        "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
      glowClassName: "bg-emerald-400/25",
      icon: CheckCircle2,
      accentColor: "#059669",
      badgeClassName: "bg-emerald-200 text-emerald-900",
    };
  }

  if (kind === "pending") {
    return {
      title: "Payment Pending",
      badge: "Pending",
      cardClassName:
        "border-amber-300 bg-amber-200/70 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200",
      iconWrapClassName:
        "bg-amber-500 text-white shadow-lg shadow-amber-500/25",
      glowClassName: "bg-amber-400/25",
      icon: Clock3,
      accentColor: "#f59e0b",
      badgeClassName: "bg-amber-200 text-amber-900",
    };
  }

  return {
    title: "Payment Failed",
    badge: "Failed",
    cardClassName:
      "border-rose-300 bg-rose-200/70 bg-gradient-to-b from-rose-200 via-rose-100 to-rose-200",
    iconWrapClassName: "bg-rose-600 text-white shadow-lg shadow-rose-600/25",
    glowClassName: "bg-rose-400/25",
    icon: CircleAlert,
    accentColor: "#e11d48",
    badgeClassName: "bg-rose-200 text-rose-900",
  };
}

export function ResultStep(props: ResultStepProps) {
  const status = getStatusPresentation(props.result.kind);
  const StatusIcon = status.icon;

  const isCryptoPayment =
    props.selectedRail === "crypto" || Boolean(props.resultTxHash);

  const amountPaid = isCryptoPayment
    ? props.usdcTotalMinor != null
      ? `${formatTokenAmountFromMinor(
          props.usdcTotalMinor,
          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
        )} USDC`
      : "—"
    : (formatUsd(props.usdTotalMinor) ?? "—");

  const summaryRows = [
    {
      label: "Asset",
      value: props.selectedAsset?.parentLabel ?? "—",
      icon: ReceiptText,
      iconColor: "text-blue-500",
    },
    {
      label: "Quantity",
      value: `${props.quantity?.toLocaleString()} tokens`,
      icon: Hash,
      iconColor: "text-purple-500",
    },
    {
      label: "Amount Paid",
      value: amountPaid,
      icon: DollarSign,
      iconColor:
        props.result.kind === "success"
          ? "text-emerald-600"
          : props.result.kind === "pending"
            ? "text-amber-600"
            : "text-rose-600",
    },
    {
      label: isCryptoPayment ? "Wallet Address" : "Payment Method",
      value: isCryptoPayment
        ? shortenWalletAddress(props.address)
        : "Card Payment",
      icon: isCryptoPayment ? Wallet : CreditCard,
      iconColor: "text-orange-500",
      isWallet: isCryptoPayment,
    },
    {
      label: "Status",
      value: status.badge,
      icon: StatusIcon,
      iconColor: "text-slate-400",
      isStatus: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* 1. TRANSACTION SUMMARY */}
      <div className="flex-1 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Transaction Summary
        </h2>

        <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
          {summaryRows.map((row, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between px-6 py-5",
                idx !== summaryRows.length - 1 && "border-b border-slate-50",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50",
                    row.iconColor,
                  )}
                >
                  <row.icon className="h-5 w-5" />
                </div>

                <span className="text-sm font-medium text-slate-500">
                  {row.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {row.isStatus ? (
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                      status.badgeClassName,
                    )}
                  >
                    {row.value}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-[#132238]">
                    {row.value}
                  </span>
                )}

                {row.isWallet && (
                  <CopyIconButton
                    value={props.address}
                    srLabel="Copy wallet address"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0f766e]"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. STATUS CARD */}
      <div className="shrink-0 py-9 space-y-6 lg:w-[420px]">
        <div
          className={cn(
            "relative overflow-hidden rounded-[32px] border p-8 text-center shadow-sm transition-all",
            status.cardClassName,
          )}
        >
          {/* Decorative glow blob (status-tinted, NOT white) */}
          <div
            className={cn(
              "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl",
              status.glowClassName,
            )}
          />

          <div
            className={cn(
              "relative mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-500",
              status.iconWrapClassName,
            )}
          >
            <StatusIcon className="h-10 w-10" />
          </div>

          <h3 className="mt-6 font-serif text-2xl font-bold leading-tight text-[#132238]">
            {status.title}
          </h3>

          <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700">
            {props.result.kind === "success"
              ? `${props.quantity?.toLocaleString()} ${
                  props.selectedAsset?.displaySymbol ?? "tokens"
                } have been added to your wallet.`
              : props.result.description}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="grid gap-3">
          <FooterButton
            className="h-14 w-full rounded-2xl bg-[#0f766e] font-bold text-white shadow-lg shadow-[#0f766e]/20 hover:bg-[#0d6b63]"
            onClick={
              props.result.kind === "success"
                ? props.onViewPayment
                : props.onRetry
            }
          >
            {props.result.kind === "success"
              ? "View Payment History"
              : "Try Again"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </FooterButton>

          {props.resultTxHash && (
            <button
              onClick={() =>
                window.open(getTxExplorerUrl(props.resultTxHash!), "_blank")
              }
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
