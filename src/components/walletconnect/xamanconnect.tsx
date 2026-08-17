import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { ConnectedWalletCard } from "./suiconnect";
import CommonButton from "../commons/CommonButton";

/** ========= Types ========= */
type ConnState = {
  connecting: boolean;
  connected: boolean;
  address?: string;
  error?: string;
};

interface XamanConnectProps {
  className?: string;
  connectedWallet: string | null;
  setConnectedWallet: React.Dispatch<React.SetStateAction<null | string>>;
}

const INITIAL: ConnState = { connecting: false, connected: false };

/** ========= LocalStorage helpers ========= */
export const XAMAN_LS_KEY = "XamanConnect";

type XamanStorageShape = {
  address?: string | null;
};

function lsGet(): XamanStorageShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(XAMAN_LS_KEY);
    return raw ? (JSON.parse(raw) as XamanStorageShape) : null;
  } catch {
    return null;
  }
}

function lsSet(payload: XamanStorageShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(XAMAN_LS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota/serialization errors */
  }
}

function lsClear() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(XAMAN_LS_KEY);
  } catch {
    /* noop */
  }
}

/** ========= API helpers ========= */
async function createXamanPayload() {
  const res = await api.post(endpoints.web3.createXamanPayload, {});
  const env = res?.data;
  if (env?.success === false) throw new Error(env?.message || "Create failed");

  const data = env?.data ?? env;
  const { uuid, next, refs, websocketStatus } = data || {};
  if (!uuid) throw new Error("Missing uuid from backend");

  const qrPng = refs?.qr_png || refs?.qrPng || refs?.qr_png_64 || null;
  return { uuid, next, qrPng, websocketStatus } as {
    uuid: string;
    next?: any;
    qrPng: string | null;
    websocketStatus?: string;
  };
}

async function getXamanPayload(uuid: string) {
  const route = endpoints.web3.getXamanPayload(uuid);
  const res = await api.get(route);
  const env = res?.data;
  return env?.data ?? env;
}

async function waitForXamanAccount(
  uuid: string,
  opts?: {
    initialDelayMs?: number;
    maxAttempts?: number;
    factor?: number;
    jitter?: number; // 0..1
    signal?: AbortSignal;
  }
) {
  const initialDelayMs = opts?.initialDelayMs ?? 1200;
  const maxAttempts = opts?.maxAttempts ?? 6;
  const factor = opts?.factor ?? 1.6;
  const jitter = Math.max(0, Math.min(1, opts?.jitter ?? 0.25));
  const signal = opts?.signal;

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      const onAbort = () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });

  await sleep(initialDelayMs);

  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const payload = await getXamanPayload(uuid);
    const d = payload?.data ?? payload;

    const account =
      d?.response?.account ??
      d?.account ??
      d?.payload?.response?.account ??
      d?.signer?.account ??
      null;

    if (account) return account as string;

    if (d?.response?.signed === false || d?.meta?.signed === false)
      throw new Error("User rejected in Xaman");
    if (d?.meta?.expired || d?.expired)
      throw new Error("Xaman request expired");

    if (attempt < maxAttempts) {
      const rand = 1 + (Math.random() * 2 - 1) * jitter;
      delay = Math.round(delay * factor * rand);
      await sleep(delay);
    }
  }
  throw new Error("Timed out waiting for XRPL address");
}

/** ========= Modal ========= */
function XamanQRModal({
  open,
  qrSrc,
  onClose,
}: {
  open: boolean;
  qrSrc?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="xaman-qr-title"
    >
      <section className="relative w-[92vw] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#0b1430] to-[#141b3a] p-5 text-white shadow-2xl md:p-6">
        {/* Glow / decoration */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-indigo-500 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-fuchsia-500 opacity-20 blur-3xl" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-4 text-center">
          <h4
            id="xaman-qr-title"
            className="text-xl font-semibold tracking-tight md:text-2xl"
          >
            Scan with Xaman
          </h4>
          <p className="mt-1 text-sm text-white/70 md:text-[13px]">
            Open the <span className="font-medium">Xaman</span> app on your
            phone and scan the QR to connect.
          </p>
        </div>

        {/* QR */}
        <div className="mx-auto max-w-xs rounded-2xl border border-black/5 bg-white p-3 shadow-lg md:p-4">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt="Xaman sign-in QR"
              className="mx-auto h-60 w-60 object-contain"
            />
          ) : (
            <div className="mx-auto h-60 w-60 animate-pulse rounded-lg bg-gray-200" />
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-center gap-3">
          {qrSrc && (
            <a
              href={qrSrc}
              download="xaman-qr.png"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-medium text-[#0F172A] shadow-sm transition hover:bg-gray-100 active:bg-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-[18px] w-[18px]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 16l4-5h-3V4h-2v7H8l4 5zm6 2H6v2h12v-2z" />
              </svg>
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white transition hover:bg-white/15 active:bg-white/20"
          >
            Close
          </button>
        </div>

        {/* Help */}
        <div className="mt-4 text-center text-xs text-white/60">
          Having trouble? Ensure your phone and computer are online, then
          refresh and try again.
        </div>
      </section>
    </div>
  );
}

/** ========= Main ========= */
export default function XamanConnect({
  className = "",
  connectedWallet,
  setConnectedWallet,
}: XamanConnectProps) {
  // We treat "connected" as a runtime session state; LS only seeds the app-level
  // `setConnectedWallet` on mount and mirrors address for future loads.
  const [xrp, setXrp] = useState<ConnState>(INITIAL);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | undefined>(undefined);

  const activeUuidRef = useRef<string | null>(null);
  const xummSocketRef = useRef<WebSocket | null>(null);

  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(
      typeof navigator === "undefined" ? "" : navigator.userAgent
    );

  // On mount: hydrate app state from LS (without faking UI connection)
  useEffect(() => {
    const saved = lsGet();
    if (saved?.address) {
      setConnectedWallet(saved.address);
    }
  }, [setConnectedWallet]);

  const cleanupSocket = useCallback(() => {
    if (xummSocketRef.current) {
      try {
        xummSocketRef.current.close();
      } catch {
        /* noop */
      }
      xummSocketRef.current = null;
    }
  }, []);

  const connectXaman = useCallback(async () => {
    try {
      setXrp((s) => ({ ...s, connecting: true, error: undefined }));

      const created = await createXamanPayload();
      if (!created) throw new Error("Failed to create Xaman payload");

      const { uuid, next, qrPng, websocketStatus } = created;
      activeUuidRef.current = uuid;

      // Desktop: show QR; Mobile: deep-link
      if (!isMobile) {
        setQrSrc(qrPng || undefined);
        setQrOpen(true);
      } else {
        const deep = next?.always || next?.return_url?.web;
        if (deep) window.location.href = deep;
      }

      // (Re)open websocket
      cleanupSocket();
      if (!websocketStatus) throw new Error("Missing websocket URL");
      xummSocketRef.current = new WebSocket(websocketStatus);

      xummSocketRef.current.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (activeUuidRef.current !== uuid) return;

          if (msg?.expired) {
            toast.error("Xaman request expired. Try again.");
            setXrp({
              connecting: false,
              connected: false,
              error: "Xaman request expired",
            });
            setQrOpen(false);
            cleanupSocket();
            return;
          }

          if (msg?.signed === false) {
            toast.error("Xaman request was rejected");
            setXrp({
              connecting: false,
              connected: false,
              error: "User rejected in Xaman",
            });
            setQrOpen(false);
            cleanupSocket();
            return;
          }

          if (msg?.signed === true) {
            const account = await waitForXamanAccount(uuid);
            if (activeUuidRef.current !== uuid) return;

            // Connected: reflect in UI + sync LS + app state
            setXrp({ connecting: false, connected: true, address: account });
            setConnectedWallet(account);
            lsSet({ address: account });

            if (!isMobile) setQrOpen(false);
            toast.success("Xaman wallet connected");
            cleanupSocket();
          }
        } catch (err: any) {
          console.error("WS handler error:", err);
          toast.error(err?.message || "Failed to complete Xaman connect");
          setXrp({
            connecting: false,
            connected: false,
            error: err?.message || "Xaman connect failed",
          });
          cleanupSocket();
        }
      };

      xummSocketRef.current.onerror = () =>
        toast.error("Xaman websocket error");
    } catch (e: any) {
      console.error("Xaman connect error:", e);
      toast.error(e?.message || "Xaman connect failed");
      setXrp({
        connecting: false,
        connected: false,
        error: e?.message || "Xaman connect failed",
      });
    }
  }, [cleanupSocket, isMobile, setConnectedWallet]);

  const disconnectXaman = useCallback(() => {
    setXrp(INITIAL);
    cleanupSocket();
    setConnectedWallet(null);
    lsClear();
  }, [cleanupSocket, setConnectedWallet]);

  return (
    <>
      <section className={`rounded-xl p-4 ${className}`}>
        {/* Status */}
        <div className="mb-3 min-h-6 text-sm text-black/70">
          {connectedWallet ? (
            <div className="flex items-center">
              <ConnectedWalletCard address={connectedWallet} />
            </div>
          ) : xrp.error ? (
            <span className="text-red-600">{xrp.error}</span>
          ) : (
            <span>{/* Not connected */}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!connectedWallet ? (
            <CommonButton
              text={xrp.connecting ? "Connecting…" : "Connect"}
              className="w-full disabled:cursor-not-allowed disabled:opacity-50"
              onClick={connectXaman}
              disabled={xrp.connecting}
            />
          ) : (
            <CommonButton
              text="Disconnect"
              className="w-full bg-red-500 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={disconnectXaman}
            />
          )}
        </div>
      </section>

      {/* Modal */}
      <XamanQRModal
        open={qrOpen}
        qrSrc={qrSrc}
        onClose={() => {
          setQrOpen(false);
          cleanupSocket();
        }}
      />
    </>
  );
}
