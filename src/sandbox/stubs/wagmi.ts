/**
 * Sandbox stub for `wagmi`.
 *
 * Aliased in vite.config.ts. The prototype has no wallet and no chain, but the
 * real payment/exchange components still call these hooks, so we return a
 * permanently "connected" demo wallet. That keeps the production checkout and
 * swap UI on its happy path instead of showing connect-wallet dead ends.
 */

/** Cosmetic address shown wherever the UI prints a wallet. */
export const DEMO_WALLET_ADDRESS =
  "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34" as const;

/** Matches VITE-configured Base mainnet so chain-guard checks pass. */
export const DEMO_CHAIN_ID = 8453;

export function useAccount() {
  return {
    address: DEMO_WALLET_ADDRESS,
    addresses: [DEMO_WALLET_ADDRESS],
    chainId: DEMO_CHAIN_ID,
    chain: { id: DEMO_CHAIN_ID, name: "Base" },
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    isReconnecting: false,
    status: "connected" as const,
    connector: { id: "sandbox", name: "Demo Wallet" },
  };
}

export function useConnect() {
  const result = {
    accounts: [DEMO_WALLET_ADDRESS],
    chainId: DEMO_CHAIN_ID,
  };
  return {
    connect: () => {},
    connectAsync: async () => result,
    connectors: [{ id: "sandbox", name: "Demo Wallet" }],
    isPending: false,
    error: null,
    reset: () => {},
  };
}

export function useDisconnect() {
  return {
    disconnect: () => {},
    disconnectAsync: async () => {},
    isPending: false,
    error: null,
  };
}

export function useSwitchChain() {
  return {
    switchChain: () => {},
    switchChainAsync: async ({ chainId }: { chainId?: number } = {}) => ({
      id: chainId ?? DEMO_CHAIN_ID,
      name: "Base",
    }),
    chains: [{ id: DEMO_CHAIN_ID, name: "Base" }],
    isPending: false,
    error: null,
  };
}

/**
 * Fake on-chain write. Resolves with a plausible tx hash after a short pause so
 * the UI's pending → success transition is visible. Nothing is broadcast.
 */
export function useWriteContract() {
  const writeContractAsync = async () => {
    await new Promise((r) => setTimeout(r, 1200));
    return `0x${"a3f9c1d2e4b67805".repeat(4)}` as `0x${string}`;
  };
  return {
    writeContract: () => {},
    writeContractAsync,
    data: undefined,
    isPending: false,
    isSuccess: false,
    error: null,
    reset: () => {},
  };
}

