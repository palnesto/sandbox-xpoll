import { useCallback, useEffect, useMemo, useState } from "react";
import CommonButton from "../commons/CommonButton";
import { ConnectedWalletCard } from "./suiconnect";

/** ========= Types ========= */
type ConnState = {
  connected: boolean;
  address?: string;
  error?: string;
};

interface AptosConnectProps {
  className?: string;
  connectedWallet: string | null;
  setConnectedWallet: React.Dispatch<React.SetStateAction<null | string>>;
}

const INITIAL: ConnState = { connected: false };

/** ========= Storage helpers ========= */
export const APTOS_ADDR_KEY = "aptos_address";

function lsGetAddr(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem(APTOS_ADDR_KEY) ||
      window.localStorage.getItem(APTOS_ADDR_KEY)
    );
  } catch {
    return null;
  }
}

function lsSetAddr(addr: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(APTOS_ADDR_KEY, addr);
  } catch {}
  try {
    window.localStorage.setItem(APTOS_ADDR_KEY, addr);
  } catch {}
}

function lsClearAddr() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(APTOS_ADDR_KEY);
  } catch {}
  try {
    window.localStorage.removeItem(APTOS_ADDR_KEY);
  } catch {}
}

/** ========= URL helpers ========= */
function cleanCurrentUrl(removeKeys: string[]) {
  try {
    const u = new URL(window.location.href);
    for (const k of removeKeys) u.searchParams.delete(k);
    const clean =
      u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : "");
    window.history.replaceState({}, "", clean);
  } catch {
    /* noop */
  }
}

/** ========= Main ========= */
export default function AptosConnect({
  className = "",
  connectedWallet,
  setConnectedWallet,
}: AptosConnectProps) {
  const [state, setState] = useState<ConnState>(INITIAL);

  // Seed setConnectedWallet from storage on mount (without faking UI connection)
  useEffect(() => {
    const saved = lsGetAddr();
    if (saved) {
      setConnectedWallet(saved);
    }
  }, [setConnectedWallet]);

  // Parse aptos_address / aptos_disconnect from URL on mount
  useEffect(() => {
    try {
      const u = new URL(window.location.href);

      // Handle explicit disconnect trigger via query
      if (u.searchParams.has("aptos_disconnect")) {
        lsClearAddr();
        setState(INITIAL);

        const ret = u.searchParams.get("return");
        const shouldClose = u.searchParams.has("close");

        cleanCurrentUrl(["aptos_disconnect", "return", "close"]);

        if (ret) {
          window.location.href = ret;
          return;
        }
        if (shouldClose && window.opener) {
          window.close();
          return;
        }
      }

      // Handle connect callback address from query/hash
      const addr =
        u.searchParams.get("aptos_address") ||
        u.hash.match(/aptos_address=([^&]+)/)?.[1];

      if (addr) {
        lsSetAddr(addr);
        setConnectedWallet(addr);
        setState({ connected: true, address: addr });

        // Clean the address from URL
        cleanCurrentUrl(["aptos_address"]);
      }
    } catch {
      // ignore parse failures
    }
  }, [setConnectedWallet]);

  // Fallback restore if not connected yet
  useEffect(() => {
    if (state.connected) return;
    const addr = lsGetAddr();
    if (addr) {
      setState({ connected: true, address: addr });
    }
  }, [state.connected]);

  // External connector URL (env first, fallback second)
  const externalUrl = useMemo(() => {
    const fromEnv = (import.meta.env.VITE_APTOS_CONNECT_URL || "").trim();
    const base =
      fromEnv || "https://aptos-testing-ptbz.vercel.app/walletconnect";
    if (!base) return "";

    const ret = window.location.origin + window.location.pathname;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}return=${encodeURIComponent(ret)}`;
  }, []);

  const goExternal = useCallback(() => {
    if (!externalUrl) {
      setState({ ...INITIAL, error: "Missing VITE_APTOS_CONNECT_URL" });
      return;
    }
    window.location.href = externalUrl;
  }, [externalUrl]);

  const disconnect = useCallback(() => {
    // Local clear + UI
    lsClearAddr();
    setState(INITIAL);
    setConnectedWallet(null);
  }, [setConnectedWallet]);

  return (
    <section className={`rounded-xl p-4 ${className}`}>
      {/* Status */}
      <div className="mb-3 min-h-6 text-sm text-black/70">
        {state.error ? (
          <span className="text-red-600">{state.error}</span>
        ) : connectedWallet ? (
          <div className="flex items-center">
            <ConnectedWalletCard address={connectedWallet} />
          </div>
        ) : (
          <span>{/* Not connected */}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!connectedWallet ? (
          <CommonButton
            text="Connect"
            className="w-full disabled:cursor-not-allowed disabled:opacity-50"
            onClick={goExternal}
          />
        ) : (
          <CommonButton
            text="Disconnect"
            className="w-full bg-red-500 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={disconnect}
          />
        )}
      </div>
    </section>
  );
}
