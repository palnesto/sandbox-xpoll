import type { PaymentIntentRecord } from "@/lib/payments/core";

export type CheckoutRail = "fiat" | "crypto";
export type CheckoutStage =
  | "configure"
  | "wallet"
  | "review"
  | "stripe"
  | "result";

export type CheckoutRetryStage = Exclude<CheckoutStage, "result" | "stripe">;
export type WalletAction = "connect" | "disconnect" | "switch" | "quote" | null;

export type CheckoutResult = {
  kind: "success" | "pending" | "failed" | "canceled";
  title: string;
  description: string;
  payment: PaymentIntentRecord | null;
  paymentId: string | null;
  txHash: string | null;
  retryStage: CheckoutRetryStage | null;
  retryLabel?: string;
};

export type CheckoutStepState = "upcoming" | "active" | "complete";

export type CheckoutStep = {
  label: string;
  state: CheckoutStepState;
};

export type WalletStepNotice = {
  source: "connect" | "disconnect" | "switch" | "quote";
  tone: "warning" | "danger";
  title: string;
  description: string;
};
