import { useEffect, useMemo, useState } from "react";
import SortableTrialList, {
  SortableTrialItem,
} from "../campaign/trails/drag-drop-trial";

export default function ReorderTrailsModal({
  open,
  title = "Reorder Trails",
  items,
  saving,
  onClose,
  onSave,
  dragEnabled = true,
}: {
  open: boolean;
  title?: string;
  items: SortableTrialItem[];
  saving?: boolean;
  onClose: () => void;
  onSave: (trialIds: string[]) => void;
  dragEnabled?: boolean;
}) {
  const [draft, setDraft] = useState<SortableTrialItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(items);
  }, [open, items]);

  const ids = useMemo(() => draft.map((x) => x.id), [draft]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-black/10 shadow-lg p-4 font-poppins">
        <div className="text-sm font-semibold text-[#111]">{title}</div>

        <div className="mt-3 max-h-[60vh] overflow-auto pr-1">
          <SortableTrialList
            items={draft}
            onChange={setDraft}
            dragEnabled={dragEnabled}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[120px] rounded-full border border-black/10 bg-white px-5 py-2 text-xs font-semibold text-[#333] hover:bg-black/5"
            disabled={!!saving}
          >
            CANCEL
          </button>

          <button
            type="button"
            onClick={() => onSave(ids)}
            className="min-w-[140px] rounded-full bg-[#0EA5A5] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0C9A9A] disabled:opacity-70"
            disabled={!!saving || !dragEnabled}
            title={
              dragEnabled
                ? "Save sequence"
                : "Reorder disabled for this campaign status"
            }
          >
            {saving ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}
