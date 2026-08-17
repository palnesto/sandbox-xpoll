import { useAppKit } from "@reown/appkit/react";
import { useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { createPublicClient, http, parseAbi } from "viem";
import {
  createHandledReviewRecoveryError,
  createHandledWalletConnectionCanceledError,
  createHandledWalletRecoveryError,
} from "./core";
import { getRpcUrlForEvmChain } from "./evm-network";
import { SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC } from "./subscription-allowance";
import { shortenWalletAddress, waitForWalletAddress } from "./wallet";

const erc20Abi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

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
  return createPublicClient({
    transport: http(getRpcUrlForEvmChain(chainId)),
  });
}

type RefillInput = {
  walletAddress: `0x${string}`;
  chainId: number;
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
};

type AllowanceRefillState = {
  isPending: boolean;
  statusText: string | null;
  error: string | null;
  txHash: string | null;
};

const IDLE_STATE: AllowanceRefillState = {
  isPending: false,
  statusText: null,
  error: null,
  txHash: null,
};

export function useSubscriptionAllowanceRefill() {
  const { open } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<AllowanceRefillState>(IDLE_STATE);

  const reset = () => setState(IDLE_STATE);

  const refillAllowance = async (input: RefillInput) => {
    let payerAddress = address as `0x${string}` | undefined;

    try {
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
        setState({
          isPending: false,
          statusText: "Wallet connection canceled.",
          error: null,
          txHash: null,
        });
        throw createHandledWalletConnectionCanceledError();
      }

      if (payerAddress.toLowerCase() !== input.walletAddress.toLowerCase()) {
        setState({
          isPending: false,
          statusText: null,
          error: `Connect ${shortenWalletAddress(input.walletAddress)} to refill this auto-renew allowance.`,
          txHash: null,
        });
        throw createHandledWalletRecoveryError(
          `Connect ${shortenWalletAddress(input.walletAddress)} to refill this auto-renew allowance.`,
        );
      }

      if (Number(chainId ?? 0) !== input.chainId) {
        setState({
          isPending: true,
          statusText: "Switching wallet network...",
          error: null,
          txHash: null,
        });
        try {
          await switchChainAsync({ chainId: input.chainId });
        } catch (error) {
          if (isUserRejectedError(error)) {
            setState({
              isPending: false,
              statusText: null,
              error: "Switch to the required network to refill this auto-renew allowance.",
              txHash: null,
            });
            throw createHandledWalletRecoveryError(
              "Switch to the required network to refill this auto-renew allowance.",
            );
          }
          throw error;
        }
      }

      const publicClient = getWalletPublicClient(input.chainId);
      setState({
        isPending: true,
        statusText: "Checking saved USDC allowance...",
        error: null,
        txHash: null,
      });
      const currentAllowance = (await publicClient.readContract({
        address: input.tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [input.walletAddress, input.spenderAddress],
      })) as bigint;

      if (currentAllowance >= SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC) {
        setState({
          isPending: false,
          statusText: "Saved USDC allowance is already ready.",
          error: null,
          txHash: null,
        });
        return {
          txHash: null,
          allowanceAtomic: currentAllowance.toString(),
        };
      }

      setState({
        isPending: true,
        statusText: "Approving USDC spend...",
        error: null,
        txHash: null,
      });
      const approvalHash = await writeContractAsync({
        address: input.tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [input.spenderAddress, SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC],
      });

      setState({
        isPending: true,
        statusText: "Waiting for wallet confirmation...",
        error: null,
        txHash: approvalHash,
      });
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });

      const refreshedAllowance = (await publicClient.readContract({
        address: input.tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [input.walletAddress, input.spenderAddress],
      })) as bigint;

      setState({
        isPending: false,
        statusText: "USDC allowance updated.",
        error: null,
        txHash: approvalHash,
      });
      return {
        txHash: approvalHash,
        allowanceAtomic: refreshedAllowance.toString(),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "handledInUi" in error &&
        (error as any).handledInUi
      ) {
        throw error;
      }

      if (isUserRejectedError(error)) {
        setState({
          isPending: false,
          statusText: null,
          error: "USDC allowance refill was canceled in your wallet.",
          txHash: null,
        });
        throw createHandledReviewRecoveryError(
          "USDC allowance refill was canceled in your wallet.",
        );
      }

      const message = getErrorMessage(
        error,
        "Failed to refill the saved USDC allowance.",
      );
      setState({
        isPending: false,
        statusText: null,
        error: message,
        txHash: null,
      });
      throw createHandledReviewRecoveryError(
        message,
      );
    }
  };

  return {
    ...state,
    refillAllowance,
    reset,
  };
}
