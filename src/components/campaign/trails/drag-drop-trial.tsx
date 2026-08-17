import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export type SortableTrialItem = {
  id: string;
  title: string;
  thumb?: string | null; 
  thumbMediaType?: "image" | "youtube" | "video";
  /** optional right-side action (trash etc.) */
  right?: React.ReactNode;
};

export default function SortableTrialList({
  items,
  onChange,
  className,
  itemClassName,
  dragEnabled = true,
}: {
  items: SortableTrialItem[];
  onChange: (next: SortableTrialItem[]) => void;
  className?: string;
  itemClassName?: string;
  dragEnabled?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const idxOf = (id: string) => items.findIndex((t) => t.id === id);

  const list = useMemo(() => items ?? [], [items]);

  const onDropReorder = (overId: string) => {
    if (!dragEnabled) return;
    if (!dragId || dragId === overId) return;

    const from = idxOf(dragId);
    const to = idxOf(overId);
    if (from < 0 || to < 0) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      {list?.map((t) => {
        const thumb = t.thumb ?? null;
        const thumbType = t.thumbMediaType ?? "image";

        return (
          <div
            key={t.id}
            draggable={!!dragEnabled}
            onDragStart={() => {
              if (!dragEnabled) return;
              setDragId(t.id);
            }}
            onDragEnd={() => {
              if (!dragEnabled) return;
              setDragId(null);
            }}
            onDragOver={(e) => {
              if (!dragEnabled) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={() => onDropReorder(t.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-black/10 bg-[#F3F3F3] px-3 py-2",
              "transition-transform",
              dragEnabled && dragId === t.id
                ? "opacity-70 scale-[0.995]"
                : "opacity-100",
              itemClassName,
            )}
          >
            <div
              className={cn(
                "text-[#8A8A8A]",
                dragEnabled
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-not-allowed opacity-60",
              )}
              title={dragEnabled ? "Drag to reorder" : "Reorder disabled"}
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="h-9 w-14 rounded-md overflow-hidden bg-[#EDEDED] flex-shrink-0">
              {thumb ? (
                thumbType === "video" ? (
                  <video
                    src={thumb}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-500">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-[#2B2B2B] truncate">
                {t.title}
              </div>
            </div>

            {t.right ? <div className="flex-shrink-0">{t.right}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
