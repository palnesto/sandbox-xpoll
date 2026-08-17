import { base, baseSepolia } from "wagmi/chains";
import type { Chain } from "viem";

// Local/dev/prod payment network selection is centralized here so one-time and
// recurring wallet flows read the same environment-driven chain choice.

const FALLBACK_CHAIN =
  import.meta.env.VITE_MODE === "production" ? base : baseSepolia;

const SUPPORTED_PAYMENT_CHAINS = [base, baseSepolia] as const;

type LocalPaymentNetwork = "mainnet" | "testnet";

function readEnvString(name: string) {
  const value = String((import.meta.env as Record<string, unknown>)[name] ?? "").trim();
  if (!value || value === "__FILL_LATER__") return null;
  return value;
}

function readEnvChainId(name: string) {
  const raw = readEnvString(name);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function readConfiguredPaymentNetwork(): LocalPaymentNetwork | null {
  const raw = readEnvString("VITE_PAYMENT_NETWORK")?.toLowerCase();
  if (raw === "mainnet") return "mainnet";
  if (raw === "testnet") return "testnet";
  return null;
}

function readConfiguredChainId() {
  return readEnvChainId("VITE_CHAIN_ID");
}

function readConfiguredRecurringChainId() {
  return readEnvChainId("VITE_EVM_RECURRING_CHAIN_ID");
}

function readLocalOneTimeChainId() {
  const selected = readConfiguredPaymentNetwork();
  if (!selected) return null;
  return readEnvChainId(
    selected === "mainnet"
      ? "VITE_EVM_ONE_TIME_MAINNET_CHAIN_ID"
      : "VITE_EVM_ONE_TIME_TESTNET_CHAIN_ID",
  );
}

function readLocalOneTimeRpcUrl() {
  const selected = readConfiguredPaymentNetwork();
  if (!selected) return null;
  return readEnvString(
    selected === "mainnet"
      ? "VITE_EVM_ONE_TIME_MAINNET_RPC_URL"
      : "VITE_EVM_ONE_TIME_TESTNET_RPC_URL",
  );
}

function readLocalRecurringChainId() {
  const selected = readConfiguredPaymentNetwork();
  if (!selected) return null;
  return readEnvChainId(
    selected === "mainnet"
      ? "VITE_EVM_RECURRING_MAINNET_CHAIN_ID"
      : "VITE_EVM_RECURRING_TESTNET_CHAIN_ID",
  );
}

function readLocalRecurringRpcUrl() {
  const selected = readConfiguredPaymentNetwork();
  if (!selected) return null;
  return readEnvString(
    selected === "mainnet"
      ? "VITE_EVM_RECURRING_MAINNET_RPC_URL"
      : "VITE_EVM_RECURRING_TESTNET_RPC_URL",
  );
}

export function getConfiguredEvmPaymentChainId() {
  return readLocalOneTimeChainId() ?? readConfiguredChainId() ?? FALLBACK_CHAIN.id;
}

export function getConfiguredRecurringEvmPaymentChainId() {
  return (
    readLocalRecurringChainId() ??
    readConfiguredRecurringChainId() ??
    getConfiguredEvmPaymentChainId()
  );
}

export function getEvmPaymentChainById(chainId: number): Chain | null {
  return SUPPORTED_PAYMENT_CHAINS.find((chain) => chain.id === chainId) ?? null;
}

export function getDefaultEvmPaymentChain() {
  return getEvmPaymentChainById(getConfiguredEvmPaymentChainId()) ?? FALLBACK_CHAIN;
}

export function getRecurringEvmPaymentChain() {
  return (
    getEvmPaymentChainById(getConfiguredRecurringEvmPaymentChainId()) ??
    getDefaultEvmPaymentChain()
  );
}

export function getConfiguredEvmPaymentRpcUrl() {
  return readLocalOneTimeRpcUrl() ?? readEnvString("VITE_RPC_URL");
}

export function getConfiguredRecurringEvmPaymentRpcUrl() {
  return readLocalRecurringRpcUrl() ?? readEnvString("VITE_EVM_RECURRING_RPC_URL");
}

export function getRpcUrlForEvmChain(chainId: number) {
  const recurringChainId = getConfiguredRecurringEvmPaymentChainId();
  const recurringRpcUrl = getConfiguredRecurringEvmPaymentRpcUrl();
  if (recurringChainId === chainId && recurringRpcUrl) {
    return recurringRpcUrl;
  }

  const defaultRpcUrl = getConfiguredEvmPaymentRpcUrl();
  if (!defaultRpcUrl) {
    throw new Error("Missing configured EVM payment RPC URL");
  }

  return defaultRpcUrl;
}

export function getSupportedEvmPaymentChains() {
  return [...SUPPORTED_PAYMENT_CHAINS];
}

export function formatEvmNetworkName(input?: string | null) {
  const value = String(input ?? "").trim();
  if (!value) return getDefaultEvmPaymentChain().name;
  if (value.toLowerCase() === "base-sepolia") return "Base Sepolia";
  if (value.toLowerCase() === "base") return "Base";
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
