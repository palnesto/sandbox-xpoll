import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useWallets,
  useConnectWallet,
  useDisconnectWallet,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import CommonButton from "../commons/CommonButton";

/** ========= Types ========= */
type ConnState = {
  connecting: boolean;
  connected: boolean;
  address?: string;
  error?: string;
};

interface SuiConnectProps {
  className?: string;
  connectedWallet: string | null;
  setConnectedWallet: React.Dispatch<React.SetStateAction<null | string>>;
}

/** ========= LocalStorage helpers ========= */
export const SUI_LS_KEY = "SuiConnect";
type SuiStorageShape = { address?: string | null };

function lsGet(): SuiStorageShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SUI_LS_KEY);
    return raw ? (JSON.parse(raw) as SuiStorageShape) : null;
  } catch {
    return null;
  }
}
function lsSet(payload: SuiStorageShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUI_LS_KEY, JSON.stringify(payload));
  } catch {}
}
function lsClear() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SUI_LS_KEY);
  } catch {}
}

/** ========= UI Utils ========= */
const INITIAL: ConnState = { connecting: false, connected: false };

function truncateAddress(addr?: string, start = 6, end = 4) {
  if (!addr) return "";
  if (addr.length <= start + end) return addr;
  return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

/** ---- Mini component (re-usable) ---- */
export function ConnectedWalletCard({ address }: { address: string }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-orange-100 text-orange-700">
          🦊
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">
            Wallet connected successfully
          </div>
          <div className="text-[12px] text-black/60">
            Wallet ID: {truncateAddress(address)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ========= Main ========= */
export default function SuiConnect({
  className = "",
  connectedWallet,
  setConnectedWallet,
}: SuiConnectProps) {
  const currentSui = useCurrentAccount();
  const wallets = useWallets();
  const { mutateAsync: connectWallet } = useConnectWallet();
  const { mutateAsync: disconnectWallet } = useDisconnectWallet();

  const [local, setLocal] = useState<ConnState>(INITIAL);
  const suppressReseedRef = useRef(false);

  // Only used for "Connecting…" UI; do NOT drive top-level UI with SDK state
  const sdkState = useMemo<ConnState>(
    () => ({
      ...local,
      connected: !!currentSui,
      address: currentSui?.address,
    }),
    [local, currentSui]
  );

  /** 1) Hydrate from LS on mount (don’t fake SDK connection) */
  useEffect(() => {
    const saved = lsGet();
    if (saved?.address && saved.address !== "__PENDING__") {
      setConnectedWallet(saved.address);
    }
  }, [setConnectedWallet]);

  /**
   * 2) SDK → App sync ONLY when we have saved intent in LS.
   * Prevents auto-reconnect on reload from flipping UI if user had disconnected.
   */
  useEffect(() => {
    const addr = currentSui?.address ?? null;
    if (!addr) return;

    const saved = lsGet();
    if (!saved?.address) return; // no persisted consent
    if (suppressReseedRef.current) return;

    // If we had a pending marker, replace it with real address
    if (saved.address === "__PENDING__" || saved.address !== addr) {
      lsSet({ address: addr });
    }
    setConnectedWallet(addr);
  }, [currentSui?.address, setConnectedWallet]);

  /** Connect */
  const connectSui = useCallback(async () => {
    setLocal((s) => ({ ...s, connecting: true, error: undefined }));
    try {
      const slush =
        wallets.find((w) => /slush/i.test(String(w?.name ?? w?.id ?? ""))) ??
        wallets[0];
      if (!slush) throw new Error("No Sui wallets available");

      // Mark user intent so SDK->App effect is allowed to seed when address appears
      lsSet({ address: "__PENDING__" });

      await connectWallet({ wallet: slush });

      setLocal({ connecting: false, connected: true, error: undefined });
    } catch (e: any) {
      setLocal({
        connecting: false,
        connected: false,
        error: String(e?.message ?? e),
      });
      // clear pending marker on failure
      const saved = lsGet();
      if (saved?.address === "__PENDING__") lsClear();
    }
  }, [wallets, connectWallet]);

  /** Disconnect */
  const disconnectSui = useCallback(async () => {
    suppressReseedRef.current = true; // block re-seed from any stale SDK state
    try {
      // Only ask the SDK to disconnect if it *thinks* we’re connected
      if (currentSui?.address) {
        await disconnectWallet();
      }
    } catch (e: any) {
      // Swallow the SDK's "not connected" error; surface anything else
      if (e?.name !== "WalletNotConnectedError") {
        console.error("Sui disconnect error:", e);
      }
    } finally {
      // Always clear our app/UI + storage
      setLocal(INITIAL);
      lsClear();
      setConnectedWallet(null);
      // lift suppression after a tick
      setTimeout(() => {
        suppressReseedRef.current = false;
      }, 0);
    }
  }, [currentSui?.address, disconnectWallet, setConnectedWallet]);

  return (
    <section className={`rounded-xl p-4 ${className}`}>
      {/* Status */}
      <div className="mb-3 min-h-6 text-sm text-black/70">
        {connectedWallet ? (
          <div className="flex items-center">
            <ConnectedWalletCard address={connectedWallet} />
          </div>
        ) : local.error ? (
          <span className="text-red-600">{local.error}</span>
        ) : (
          <span>{/* Not connected */}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!connectedWallet ? (
          <CommonButton
            text={sdkState.connecting ? "Connecting…" : "Connect"}
            className="w-full disabled:cursor-not-allowed disabled:opacity-50"
            onClick={connectSui}
            disabled={sdkState.connecting}
          />
        ) : (
          <CommonButton
            text="Disconnect"
            className="w-full bg-red-500 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={disconnectSui}
          />
        )}
      </div>
    </section>
  );
}
