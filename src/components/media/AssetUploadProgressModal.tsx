import { useEffect, useMemo, useState } from "react";

import { Progress } from "@/components/ui/progress";
import {
  formatAssetUploadBytes,
  useAssetUploadProgressStore,
  type AssetUploadTask,
} from "@/stores/asset-upload-progress.store";

const MODAL_DELAY_MS = 250;

function getCurrentTask(tasks: AssetUploadTask[]) {
  return (
    tasks.find((task) => task.status === "failed") ||
    tasks.find((task) => task.status === "running") ||
    tasks.find((task) => task.status === "queued") ||
    tasks[tasks.length - 1]
  );
}

export default function AssetUploadProgressModal() {
  const {
    active,
    operationLabel,
    tasks,
    completedCount,
    overallPercent,
    failedTask,
  } = useAssetUploadProgressStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), MODAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  const currentTask = useMemo(() => getCurrentTask(tasks), [tasks]);

  if (!active || !visible || !currentTask) return null;

  const roundedPercent = Math.round(overallPercent);
  const totalTasks = Math.max(tasks.length, 1);
  const uploadTotal = currentTask.uploadTotalBytes;
  const showUploadBytes =
    currentTask.phase === "uploading" &&
    typeof currentTask.uploadedBytes === "number" &&
    typeof uploadTotal === "number" &&
    uploadTotal > 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="w-[520px] max-w-[94vw] rounded-2xl border border-black/10 bg-white shadow-2xl"
      >
        <div className="border-b border-black/10 p-5">
          <div className="text-lg font-semibold text-[#111]">
            {operationLabel || "Compressing Media"}
          </div>
          <div className="mt-1 text-sm text-[#6B6B6B]">
            Your file is being compressed for faster upload. Please keep this page open.
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-end gap-4">
            <div className="shrink-0 text-2xl font-semibold text-[#0EA5A5]">
              {roundedPercent}%
            </div>
          </div>

          <Progress
            value={roundedPercent}
            className="h-3 bg-[#E5F4F4]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B6B6B]">
            <span>
              {Math.min(completedCount, totalTasks)} of {totalTasks} media files complete
            </span>
            {showUploadBytes ? (
              <span>
                {formatAssetUploadBytes(currentTask.uploadedBytes)} /{" "}
                {formatAssetUploadBytes(uploadTotal)}
              </span>
            ) : null}
          </div>

          {failedTask ? (
            <div className="rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#9F1239]">
              {failedTask.error || "Media processing failed."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
