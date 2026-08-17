import type { EIP1193Provider } from "viem";

export function getInjectedEvmProvider() {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: EIP1193Provider }).ethereum ?? null;
}

export async function waitForWalletAddress(options?: {
  attempts?: number;
  intervalMs?: number;
}) {
  const ethereum = getInjectedEvmProvider();
  if (!ethereum?.request) return null;

  const attempts = options?.attempts ?? 40;
  const intervalMs = options?.intervalMs ?? 300;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const accounts = (await ethereum.request({
      method: "eth_accounts",
    })) as unknown;

    if (Array.isArray(accounts) && typeof accounts[0] === "string") {
      return accounts[0] as `0x${string}`;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}

export function shortenWalletAddress(value?: string | null) {
  const address = String(value ?? "").trim();
  if (address.length < 12) return address || "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
