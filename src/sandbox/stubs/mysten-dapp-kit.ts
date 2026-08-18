/**
 * Stub for `@mysten/dapp-kit` (aliased in vite.config.ts).
 *
 * There is no Sui network here. The connect widget reports a connected wallet so
 * the exchange flow reads correctly instead of dead-ending on "connect wallet".
 *
 * Only the four hooks imported by components/walletconnect/suiconnect.tsx are
 * implemented.
 */

export const DEMO_SUI_ADDRESS =
  "0x9f3b2c7d15ae48069b4c1f7a2e0d63859ca47b1e8d02f5a6c398471bde20f5c84" as const;

const DEMO_WALLET = {
  name: "Sui Wallet",
  icon: "",
  accounts: [{ address: DEMO_SUI_ADDRESS }],
  features: {},
};

export function useWallets() {
  return [DEMO_WALLET];
}

export function useCurrentAccount() {
  return { address: DEMO_SUI_ADDRESS, publicKey: null, chains: ["sui:mainnet"] };
}

export function useConnectWallet() {
  return {
    mutate: (_vars: unknown, opts?: { onSuccess?: (d: unknown) => void }) => {
      opts?.onSuccess?.({ accounts: DEMO_WALLET.accounts });
    },
    mutateAsync: async () => ({ accounts: DEMO_WALLET.accounts }),
    isPending: false,
    error: null,
  };
}

export function useDisconnectWallet() {
  return {
    mutate: (_vars?: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    },
    mutateAsync: async () => {},
    isPending: false,
    error: null,
  };
}
