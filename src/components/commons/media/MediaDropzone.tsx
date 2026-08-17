import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MediaDropzoneProps = {
  /** Slot index when used as slot target; undefined when used as parent container. */
  slotIndex?: number;
  /** MIME types for accept, e.g. "image/jpeg,image/png,image/webp,image/gif" */
  accept?: string;
  disabled?: boolean;
  /** Called with files and target slot (slotIndex when slot mode, null when container mode). */
  onFiles: (files: File[], targetSlotIndex: number | null) => void;
  /** Optional click handler to open file picker. */
  onPickClick?: () => void;
  className?: string;
  children: React.ReactNode;
};

/**
 * Reusable media dropzone with drag/drop and optional click-to-pick.
 * - Slot mode (slotIndex set): drop targets that specific slot.
 * - Container mode (slotIndex undefined): drop fills empty slots sequentially.
 */
export function MediaDropzone({
  slotIndex,
  accept = "image/*",
  disabled = false,
  onFiles,
  onPickClick,
  className,
  children,
}: MediaDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      onFiles(files, slotIndex ?? null);
    },
    [onFiles, slotIndex],
  );

  const preventDefault = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      preventDefault(e);
      if (disabled) return;
      dragCounterRef.current += 1;
      if (e.dataTransfer?.types?.includes("Files")) {
        setIsDragActive(true);
      }
    },
    [disabled, preventDefault],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      preventDefault(e);
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragActive(false);
      }
    },
    [preventDefault],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      preventDefault(e);
      if (disabled) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled, preventDefault],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      preventDefault(e);
      setIsDragActive(false);
      dragCounterRef.current = 0;
      if (disabled) return;
      processFiles(e.dataTransfer?.files ?? null);
    },
    [disabled, preventDefault, processFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPickClick?.();
        }
      }}
      onClick={onPickClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative transition-all",
        isDragActive && "ring-2 ring-primary ring-dashed ring-offset-2",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {children}
      {isDragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/20 backdrop-blur-[2px]">
          <div className="rounded-lg border-2 border-dashed border-white bg-black/40 px-4 py-2 text-sm font-medium text-white">
            Drop to upload
          </div>
        </div>
      )}
    </div>
  );
}
