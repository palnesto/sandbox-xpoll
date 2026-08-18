/**
 * Sandbox stub for `@reown/appkit/react`.
 *
 * The wallet-connect modal cannot exist without a real AppKit project, and the
 * stubbed wagmi hooks already report a connected wallet, so `open()` is a no-op.
 */

export function useAppKit() {
  return {
    open: async () => {
      if (import.meta.env.DEV) {
        console.info("[sandbox] wallet modal suppressed — demo wallet is always connected");
      }
    },
    close: async () => {},
  };
}

export function useAppKitAccount() {
  return {
    address: "0x7E2c4A91Bd3F5C8a06De71b4839Ac25F0e6B1d34",
    isConnected: true,
    status: "connected" as const,
  };
}

export function useAppKitNetwork() {
  return {
    caipNetwork: undefined,
    chainId: 8453,
    switchNetwork: async () => {},
  };
}

export function createAppKit() {
  return {
    open: async () => {},
    close: async () => {},
  };
}
