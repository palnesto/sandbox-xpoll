import { useEffect, useRef, useState } from "react";
import { CheckCheck, Copy, Loader2, PartyPopper } from "lucide-react";
import person from "@/assets/campaigns/person.svg";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    confetti?: any;
  }
}
function ModalShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      {/* <div className="absolute inset-0 flex items-center justify-center"> */}
      <div
        className="max-w-[40vw] top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 rounded-2xl p-4 relative bg-[#F6F6F6] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      {/* </div> */}
    </div>
  );
}

function ConfettiCanvasBurst({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load canvas-confetti once (same CDN you used)
  useEffect(() => {
    if (window.confetti) return;

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // optional: keep it cached; do not remove to avoid reloading
    };
  }, []);

  useEffect(() => {
    if (!fire) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // wait until script is ready
    const tick = () => {
      if (!window.confetti) {
        requestAnimationFrame(tick);
        return;
      }

      // confetti bounded to THIS canvas (modal)
      const confetti = window.confetti.create(canvas, {
        resize: true,
        useWorker: true,
      });

      // burst sequence
      const shoot = (particleCount: number, spread: number, y: number) => {
        confetti({
          particleCount,
          spread,
          startVelocity: 45,
          gravity: 1.1,
          ticks: 220,
          origin: { x: 0.5, y }, // inside modal
        });
      };

      shoot(120, 80, 0.25);
      setTimeout(() => shoot(80, 110, 0.3), 140);
      setTimeout(() => shoot(60, 140, 0.35), 260);
    };

    tick();
  }, [fire]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export function LaunchConfirmModal({
  open,
  onClose,
  onConfirm,
  onSaveDraft,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSaveDraft: () => void;
  loading?: boolean;
  error?: string;
}) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="px-8 py-10 text-center">
        <figure>
          <img src={person} alt="" />
        </figure>

        <h2 className="text-3xl font-semibold text-[#1D1D1D]">
          Ready to Launch <br /> Campaign?
        </h2>

        <p className="mt-3 text-sm text-[#6C6C6C] max-w-[420px] mx-auto">
          Once you confirm, the campaign will be launched immediately and will
          begin running right away.
        </p>
        {!!error && (
          <div className="mt-5 mx-auto max-w-[420px] rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 text-left">
            {error}
          </div>
        )}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={!!loading}
            className={cn(
              "min-w-[170px] rounded-full border border-[#24B3B3] text-[#24B3B3] bg-[#E8FBFB] px-6 py-3 text-xs font-semibold tracking-wide",
              loading ? "opacity-70 cursor-not-allowed" : ""
            )}
          >
            SAVE DRAFT
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!!loading}
            className={cn(
              "min-w-[170px] rounded-full bg-[#0EA5A5] text-white px-6 py-3 text-xs font-semibold tracking-wide inline-flex items-center justify-center gap-2",
              loading ? "opacity-80 cursor-not-allowed" : ""
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                LAUNCHING...
              </>
            ) : (
              "CONFIRM"
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function LaunchSuccessModal({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const [justOpened, setJustOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setJustOpened(true);
    const t = setTimeout(() => setJustOpened(false), 400);
    return () => clearTimeout(t);
  }, [open]);

  const onCopy = async () => {
    try {
      const base = String(import.meta.env.VITE_CLIENT_URL || "").replace(
        /\/$/,
        ""
      );
      const url = `${base}/campaigns/all-campaigns/${encodeURIComponent(
        campaignId
      )}`;

      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="py-12 flex flex-col items-center gap-7 text-center relative">
        <ConfettiCanvasBurst fire={open} />
        <PartyPopper className="w-10 xl:w-20 h-10 xl:h-20 text-blue" />

        <h2
          className={cn(
            "text-4xl font-semibold text-[#1D1D1D] transition-transform duration-300",
            justOpened ? "scale-[1.01]" : "scale-100"
          )}
        >
          You have successfully <br /> launched a campaign
        </h2>

        <button
          type="button"
          onClick={onCopy}
          className="min-w-[360px] rounded-full bg-[#0EA5A5] text-white px-6 py-4 text-xs font-semibold tracking-wide flex items-center justify-center gap-3"
        >
          {copied ? (
            <CheckCheck className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "COPIED" : "COPY LINK"}
        </button>
      </div>
      {/* </div> */}
    </ModalShell>
  );
}

export function ResumeSuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />

      {/* modal */}
      <div className="relative w-[520px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-xl font-semibold text-[#111]">
          Campaign is Live
        </div>

        <div className="mt-2 text-sm text-[#6B6B6B]">
          Your paused campaign is now live again.
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#0EA5A5] px-6 py-2 text-white font-semibold hover:bg-[#0C9A9A]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
