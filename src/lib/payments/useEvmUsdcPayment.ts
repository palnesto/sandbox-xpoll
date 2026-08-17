import { useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { createPublicClient, http, parseAbi } from "viem";
import type { EvmPaymentIntentResponse } from "./core";
import {
  BILLING_MODE,
  createHandledPaymentFailedError,
  createHandledPaymentPendingError,
  createHandledReviewRecoveryError,
  createHandledUserRejectedError,
  createHandledWalletRecoveryError,
  createHandledWalletConnectionCanceledError,
  isPaymentFlowHandledError,
  updatePaymentIntentClientState,
  waitForPaymentIntentTerminalState,
} from "./core";
import { waitForWalletAddress } from "./wallet";
import {
  getDefaultEvmPaymentChain,
  getEvmPaymentChainById,
  getRecurringEvmPaymentChain,
  getRpcUrlForEvmChain,
} from "./evm-network";
import { SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC } from "./subscription-allowance";

// This shared wallet flow now covers both one-time crypto payments and
// recurring campaign subscription payments. For recurring recovery attempts,
// client-side aborts must be reported so the server can release the renewal
// lock cleanly.

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const paymentProcessorAbi = parseAbi([
  "function processPayment(string paymentIntentId, uint256 amount, string tokenSymbol)",
]);

const recurringPaymentProcessorAbi = parseAbi([
  "function subscribe(uint256 planId, address token, uint256 amount)",
]);

type PaymentState = {
  isPending: boolean;
  statusText: string | null;
  error: string | null;
  txHash: string | null;
};

const IDLE_STATE: PaymentState = {
  isPending: false,
  statusText: null,
  error: null,
  txHash: null,
};

// The shared USDC flow keeps approval bounded to a reusable but limited amount
// instead of granting an effectively infinite allowance to the payment contract.
function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { shortMessage?: unknown }).shortMessage === "string"
  ) {
    const message = normalizeErrorMessage(
      (error as { shortMessage: string }).shortMessage,
    );
    if (message) return message;
  }
  if (error instanceof Error && error.message) {
    const message = normalizeErrorMessage(error.message);
    if (message) return message;
  }
  return fallback;
}

function normalizeErrorMessage(message: string) {
  const trimmed = String(message ?? "").trim();
  if (!trimmed) return "";

  const markers = [
    "Request Arguments:",
    "Contract Call:",
    "Docs:",
    "Details:",
    "Version:",
  ];

  let normalized = trimmed;
  for (const marker of markers) {
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex > 0) {
      normalized = normalized.slice(0, markerIndex).trim();
    }
  }

  return normalized;
}

function getErrorParts(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];

  const candidate = error as {
    shortMessage?: unknown;
    message?: unknown;
    details?: unknown;
    cause?: { message?: unknown; shortMessage?: unknown } | null;
  };

  return [
    candidate.shortMessage,
    candidate.message,
    candidate.details,
    candidate.cause?.shortMessage,
    candidate.cause?.message,
  ].flatMap((part) =>
    typeof part === "string" && part.trim().length > 0 ? [part.trim()] : [],
  );
}

function isUserRejectedError(error: unknown) {
  return getErrorParts(error).some((part) =>
    /user rejected|user denied|request rejected|rejected the request/i.test(
      part,
    ),
  );
}

function getWalletPublicClient(chainId: number) {
  const chain = getEvmPaymentChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported payment chain: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(getRpcUrlForEvmChain(chainId)),
  });
}

export function useEvmUsdcPayment() {
  const { open } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<PaymentState>(IDLE_STATE);

  const reset = () => setState(IDLE_STATE);

  const pay = async (paymentIntent: EvmPaymentIntentResponse) => {
    let submittedTxHash: `0x${string}` | null = null;
    let hasConfirmedOnChain = false;
    let phase:
      | "connect"
      | "switch"
      | "balance"
      | "approval"
      | "payment"
      | "confirm" = "connect";

    async function reportClientState(input: {
      status: "canceled" | "failed";
      reason: string;
      txHash?: string | null;
    }) {
      try {
        await updatePaymentIntentClientState({
          paymentId: paymentIntent.paymentId,
          status: input.status,
          reason: input.reason,
          txHash: input.txHash ?? null,
        });
      } catch {
        // Client-state sync should not block the wallet UX.
      }
    }

    try {
      const quote = paymentIntent.quote.payload;
      const amountAtomic = BigInt(quote.expectedAmountAtomic);
      const isRecurringPayment =
        paymentIntent.billingMode === BILLING_MODE.SUBSCRIPTION;
      const recurringContractPlanId = String(
        paymentIntent.subscription?.contractPlanId ?? "",
      ).trim();
      if (isRecurringPayment && !recurringContractPlanId) {
        await reportClientState({
          status: "failed",
          reason: "MISSING_RECURRING_CONTRACT_METADATA",
        });
        throw createHandledReviewRecoveryError(
          "Recurring payment is missing contract metadata.",
        );
      }
      const configuredChain = isRecurringPayment
        ? getRecurringEvmPaymentChain()
        : getDefaultEvmPaymentChain();
      if (configuredChain.id !== quote.chainId) {
        const quotedChain = getEvmPaymentChainById(quote.chainId);
        const quotedChainLabel = quotedChain?.name ?? `chain ${quote.chainId}`;
        await reportClientState({
          status: "failed",
          reason: "NETWORK_MISMATCH",
        });
        throw createHandledReviewRecoveryError(
          `Payment network mismatch. Configure the active payment network settings for ${quotedChainLabel}.`,
        );
      }

      const publicClient = getWalletPublicClient(quote.chainId);
      let payerAddress = address as `0x${string}` | undefined;

      setState({
        isPending: true,
        statusText: "Checking wallet connection...",
        error: null,
        txHash: null,
      });

      if (!isConnected || !payerAddress) {
        await open();
        payerAddress =
          (await waitForWalletAddress({
            attempts: 40,
            intervalMs: 300,
          })) ?? undefined;
      }

      if (!payerAddress) {
        await reportClientState({
          status: "canceled",
          reason: "WALLET_CONNECTION_CANCELED",
        });
        setState({
          isPending: false,
          statusText: "Wallet connection canceled.",
          error: null,
          txHash: null,
        });
        throw createHandledWalletConnectionCanceledError();
      }

      const activeChainId = Number(chainId ?? 0);
      if (activeChainId !== quote.chainId) {
        phase = "switch";
        setState((prev) => ({
          ...prev,
          statusText: "Switching wallet network...",
        }));
        await switchChainAsync({ chainId: quote.chainId });
      }

      setState((prev) => ({
        ...prev,
        statusText: "Checking USDC balance...",
      }));
      phase = "balance";
      const balance = (await publicClient.readContract({
        address: quote.tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [payerAddress],
      })) as bigint;

      // Stop before the approval step when the wallet does not hold enough
      // USDC for the quoted payment amount.
      if (balance < amountAtomic) {
        await reportClientState({
          status: "failed",
          reason: "INSUFFICIENT_BALANCE",
        });
        throw createHandledReviewRecoveryError(
          "You do not have enough USDC in this wallet to complete the payment.",
        );
      }

      if (amountAtomic > SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC) {
        await reportClientState({
          status: "failed",
          reason: "AMOUNT_ABOVE_APPROVAL_LIMIT",
        });
        throw createHandledReviewRecoveryError(
          "This payment amount is above the current wallet approval limit.",
        );
      }

      setState((prev) => ({
        ...prev,
        statusText: "Checking USDC allowance...",
      }));

      const allowance = (await publicClient.readContract({
        address: quote.tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [payerAddress, quote.paymentContractAddress],
      })) as bigint;

      if (allowance < amountAtomic) {
        phase = "approval";
        setState((prev) => ({
          ...prev,
          statusText: "Approving USDC spend...",
        }));

        const approveHash = await writeContractAsync({
          address: quote.tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [quote.paymentContractAddress, SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setState((prev) => ({
        ...prev,
        statusText: "Sending payment transaction...",
      }));
      phase = "payment";

      const txHash = await writeContractAsync({
        address: quote.paymentContractAddress,
        abi: isRecurringPayment
          ? recurringPaymentProcessorAbi
          : paymentProcessorAbi,
        functionName: isRecurringPayment ? "subscribe" : "processPayment",
        args: isRecurringPayment
          ? [
              BigInt(recurringContractPlanId),
              quote.tokenAddress,
              amountAtomic,
            ]
          : [paymentIntent.paymentId, amountAtomic, quote.tokenSymbol],
      });
      submittedTxHash = txHash;

      setState((prev) => ({
        ...prev,
        txHash,
        statusText: "Waiting for on-chain confirmation...",
      }));

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      hasConfirmedOnChain = true;

      setState((prev) => ({
        ...prev,
        statusText: "Waiting for backend confirmation...",
      }));
      phase = "confirm";

      const payment = await waitForPaymentIntentTerminalState(
        paymentIntent.paymentId,
      );
      if (payment.status !== "succeeded") {
        const failureReason = String(
          payment?.context?.failure?.reason ?? payment.status,
        ).trim();
        throw new Error(`Payment failed: ${failureReason}`);
      }

      setState({
        isPending: false,
        statusText: "USDC payment completed.",
        error: null,
        txHash,
      });

      return { txHash, payment };
    } catch (error) {
      if (isPaymentFlowHandledError(error)) {
        if (
          error.recoveryStage === "wallet" ||
          error.recoveryStage === "review"
        ) {
          setState((prev) => ({
            ...prev,
            isPending: false,
            statusText: null,
            error: null,
            txHash: submittedTxHash ?? prev.txHash,
          }));
        }
        throw error;
      }

      if (
        submittedTxHash &&
        error instanceof Error &&
        error.message === "Payment confirmation timed out on the server."
      ) {
        setState((prev) => ({
          ...prev,
          isPending: false,
          statusText: "Payment submitted. Verification is still pending.",
          error: null,
          txHash: submittedTxHash ?? prev.txHash,
        }));
        throw createHandledPaymentPendingError(
          "Payment submitted. Verification is still pending.",
        );
      }

      if (
        hasConfirmedOnChain &&
        !(error instanceof Error && error.message.startsWith("Payment failed:"))
      ) {
        setState((prev) => ({
          ...prev,
          isPending: false,
          statusText: "Payment submitted. Verification is still pending.",
          error: null,
          txHash: submittedTxHash ?? prev.txHash,
        }));
        throw createHandledPaymentPendingError(
          "Payment submitted. Verification is still pending.",
        );
      }

      if (isUserRejectedError(error)) {
        if (phase === "switch") {
          await reportClientState({
            status: "canceled",
            reason: "WALLET_SWITCH_REJECTED",
          });
          setState({
            isPending: false,
            statusText: null,
            error: null,
            txHash: null,
          });
          throw createHandledWalletRecoveryError(
            "Switch to the required network to continue with this payment.",
          );
        }

        if (phase === "approval") {
          await reportClientState({
            status: "canceled",
            reason: "APPROVAL_CANCELED",
          });
          setState((prev) => ({
            ...prev,
            isPending: false,
            statusText: null,
            error: null,
          }));
          throw createHandledReviewRecoveryError(
            "USDC approval was canceled in your wallet.",
          );
        }

        if (phase === "payment" && !submittedTxHash) {
          await reportClientState({
            status: "canceled",
            reason: "PAYMENT_CANCELED",
          });
          setState((prev) => ({
            ...prev,
            isPending: false,
            statusText: null,
            error: null,
          }));
          throw createHandledReviewRecoveryError(
            "Payment was canceled in your wallet.",
          );
        }

        await reportClientState({
          status: "canceled",
          reason: "USER_REJECTED",
          txHash: submittedTxHash,
        });
        setState({
          isPending: false,
          statusText: "Transaction canceled.",
          error: null,
          txHash: submittedTxHash,
        });
        throw createHandledUserRejectedError();
      }

      const message = getErrorMessage(error, "USDC payment failed.");

      if (
        phase !== "confirm" &&
        !submittedTxHash &&
        !(error instanceof Error && error.message.startsWith("Payment failed:"))
      ) {
        await reportClientState({
          status: "failed",
          reason: "PAYMENT_FLOW_FAILED",
        });
        setState((prev) => ({
          ...prev,
          isPending: false,
          statusText: null,
          error: null,
          txHash: submittedTxHash ?? prev.txHash,
        }));
        throw createHandledReviewRecoveryError(message);
      }

      await reportClientState({
        status: "failed",
        reason: submittedTxHash ? "PAYMENT_TX_FAILED" : "PAYMENT_FLOW_FAILED",
        txHash: submittedTxHash,
      });

      setState((prev) => ({
        ...prev,
        isPending: false,
        statusText: null,
        error: message,
        txHash: submittedTxHash ?? prev.txHash,
      }));
      throw createHandledPaymentFailedError(message);
    }
  };

  return {
    ...state,
    pay,
    reset,
  };
}
