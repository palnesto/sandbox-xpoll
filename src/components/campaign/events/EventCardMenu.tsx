import { useEffect, useRef } from "react";
import { EllipsisVertical, Pencil, Rocket, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventCardMenuStore } from "@/stores/event-card-menu.store";

type Props = {
  eventId: string;
  onEdit?: () => void;
  onPublish?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
};

export function EventCardMenu({
  eventId,
  onEdit,
  onPublish,
  onDelete,
  disabled,
}: Props) {
  const openEventId = useEventCardMenuStore((s) => s.openEventId);
  const toggle = useEventCardMenuStore((s) => s.toggle);
  const close = useEventCardMenuStore((s) => s.close);

  const isOpen = openEventId === eventId;
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, close]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          toggle(eventId);
        }}
        className={cn(
          "rounded-full p-1.5 hover:bg-black/5 transition",
          disabled && "opacity-40 cursor-not-allowed",
        )}
        aria-label="Event actions"
      >
        <EllipsisVertical className="w-4 h-4 text-black/70" />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-black/10 bg-white shadow-lg py-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit ? (
            <MenuItem
              icon={<Pencil className="w-3.5 h-3.5" />}
              label="Edit"
              onClick={() => {
                close();
                onEdit();
              }}
            />
          ) : null}
          {onPublish ? (
            <MenuItem
              icon={<Rocket className="w-3.5 h-3.5" />}
              label="Publish"
              onClick={() => {
                close();
                onPublish();
              }}
            />
          ) : null}
          {onDelete ? (
            <>
              {onEdit || onPublish ? <div className="my-1 h-px bg-black/5" /> : null}
              <MenuItem
                icon={<Trash2 className="w-3.5 h-3.5" />}
                label="Delete"
                tone="danger"
                onClick={() => {
                  close();
                  onDelete();
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition",
        tone === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-[#222] hover:bg-black/5",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
