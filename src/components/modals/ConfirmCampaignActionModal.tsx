import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type ConfirmTone = "primary" | "secondary" | "danger";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;

  loading?: boolean;
  error?: string | null;

  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function CampaignActionConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  error = null,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  const confirmBtn =
    tone === "danger"
      ? "bg-[#E11D48] hover:bg-[#BE123C] text-white"
      : tone === "secondary"
      ? "bg-[#E8FBFB] hover:bg-[#DDF7F7] text-[#24B3B3] border border-[#24B3B3]"
      : "bg-[#0EA5A5] hover:bg-[#0C9A9A] text-white";

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (loading) return;
          onClose();
        }}
        aria-label="Close overlay"
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-black/10">
        <div className="flex items-start justify-between p-5 border-b border-black/10">
          <div className="pr-8">
            <div className="text-lg font-semibold text-[#111]">{title}</div>
            {description ? (
              <div className="mt-2 text-sm text-[#6B6B6B] leading-5">
                {description}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              if (loading) return;
              onClose();
            }}
            className="rounded-full p-2 hover:bg-black/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="px-5 pt-4">
            <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-4 py-3 text-sm text-[#9F1239]">
              {error}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 p-5">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (loading) return;
              onClose();
            }}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold",
              "border border-black/10 hover:bg-black/5",
              loading ? "opacity-70 cursor-not-allowed" : ""
            )}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (loading) return;
              onConfirm();
            }}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-semibold",
              confirmBtn,
              loading ? "opacity-70 cursor-not-allowed" : ""
            )}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
