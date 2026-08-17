import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  error?: string | null;

  // keep your existing behavior hooks
  onClose: () => void;

  // content
  children?: ReactNode;

  // footer actions (optional, so you can reuse for anything)
  footer?: ReactNode;

  // sizing
  widthClassName?: string; // default matches your confirm modal
};

export default function CustomModal({
  open,
  title,
  description,
  loading = false,
  error = null,
  onClose,
  children,
  footer,
  widthClassName = "w-[520px] max-w-[92vw]",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close overlay"
        onClick={() => {
          if (loading) return;
          onClose();
        }}
      />

      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          widthClassName,
          "rounded-2xl bg-white shadow-xl border border-black/10",
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 border-b border-black/10">
            <div className="pr-8">
              {title ? (
                <div className="text-lg font-semibold text-[#111]">{title}</div>
              ) : null}

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
              className={cn(
                "rounded-full p-2 hover:bg-black/5",
                loading ? "opacity-70 cursor-not-allowed" : "",
              )}
              aria-label="Close"
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error ? (
          <div className="px-5 pt-4">
            <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-4 py-3 text-sm text-[#9F1239]">
              {error}
            </div>
          </div>
        ) : null}

        {/* body */}
        <div className={cn("p-5", error ? "pt-4" : "")}>{children}</div>

        {/* footer */}
        {footer ? (
          <div className="border-t border-black/10 p-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
