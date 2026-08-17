import { cn } from "@/lib/utils";
import { FileText, X } from "lucide-react";

export function ImageSlot({
  size,
  value,
  onPick,
  onRemove,
  error,
}: {
  size: "big" | "sm";
  value: string | null;
  onPick: () => void;
  onRemove: () => void;
  error?: string | null;
}) {
  const h = size === "big" ? "h-[240px]" : "h-[114px]";
  return (
    <div
      className={cn("relative rounded-xl bg-white border border-black/10", h)}
    >
      {value ? (
        <>
          <button
            type="button"
            onClick={onPick}
            className="absolute inset-0 rounded-xl overflow-hidden"
            aria-label="Replace image"
          >
            <img
              src={value}
              alt="Uploaded"
              className="h-full w-full object-cover"
            />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="h-full w-full flex items-center justify-center rounded-xl"
        >
          <div className="flex items-center gap-2 text-xs text-[#315326]">
            <FileText className="h-4 w-4 text-[#78BC61]" />
            <span>+ Add image</span>
          </div>
        </button>
      )}
      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
