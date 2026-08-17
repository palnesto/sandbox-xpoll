import { create } from "zustand";

export type AssetUploadKind = "image" | "gif" | "video" | "pdf" | "file";

export type AssetUploadPhase =
  | "queued"
  | "preparing"
  | "converting"
  | "compressing"
  | "presigning"
  | "uploading"
  | "publishing"
  | "done"
  | "failed";

export type AssetUploadTaskStatus = "queued" | "running" | "done" | "failed";

export type AssetUploadTask = {
  id: string;
  kind: AssetUploadKind;
  fileName: string;
  inputBytes: number;
  preparedBytes?: number;
  phase: AssetUploadPhase;
  phaseProgress: number;
  uploadedBytes?: number;
  uploadTotalBytes?: number;
  status: AssetUploadTaskStatus;
  error?: string;
};

type AssetUploadProgressState = {
  active: boolean;
  operationLabel: string;
  tasks: AssetUploadTask[];
  completedCount: number;
  overallPercent: number;
  failedTask?: AssetUploadTask;
};

type AssetUploadProgressActions = {
  setActiveOperation: (label?: string) => void;
  upsertTask: (task: AssetUploadTask) => void;
  patchTask: (id: string, patch: Partial<AssetUploadTask>) => void;
  hideOperation: () => void;
};

const DEFAULT_OPERATION_LABEL = "Compressing Media";
const AUTO_CLOSE_DELAY_MS = 700;
const ERROR_CLOSE_DELAY_MS = 1_500;

const fileTaskIds = new WeakMap<File, string>();
let batchDepth = 0;
let finishTimer: ReturnType<typeof setTimeout> | null = null;

const phaseWeights: Record<
  AssetUploadKind,
  { prepare: number; upload: number; publish: number }
> = {
  image: { prepare: 0.45, upload: 0.5, publish: 0.05 },
  gif: { prepare: 0.55, upload: 0.4, publish: 0.05 },
  video: { prepare: 0.7, upload: 0.25, publish: 0.05 },
  pdf: { prepare: 0, upload: 0.95, publish: 0.05 },
  file: { prepare: 0, upload: 0.95, publish: 0.05 },
};

function createTaskId() {
  return `asset-task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function taskPercent(task: AssetUploadTask) {
  if (task.status === "done" || task.phase === "done") return 100;

  const weights = phaseWeights[task.kind] ?? phaseWeights.file;
  const phaseProgress = clampPercent(task.phaseProgress) / 100;
  const preparePercent = weights.prepare * 100;
  const uploadPercent = weights.upload * 100;

  if (
    task.phase === "preparing" ||
    task.phase === "converting" ||
    task.phase === "compressing"
  ) {
    return preparePercent * phaseProgress;
  }

  if (task.phase === "presigning") {
    return preparePercent;
  }

  if (task.phase === "uploading") {
    return preparePercent + uploadPercent * phaseProgress;
  }

  if (task.phase === "publishing") {
    return (
      preparePercent +
      uploadPercent +
      weights.publish * 100 * phaseProgress
    );
  }

  if (task.phase === "failed") {
    return preparePercent + uploadPercent * phaseProgress;
  }

  return 0;
}

function recalculate(tasks: AssetUploadTask[]) {
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const failedTask = tasks.find((task) => task.status === "failed");
  const totalWeight = tasks.reduce(
    (sum, task) => sum + Math.max(task.inputBytes || task.preparedBytes || 1, 1),
    0,
  );
  const weightedProgress = tasks.reduce((sum, task) => {
    const weight = Math.max(task.inputBytes || task.preparedBytes || 1, 1);
    return sum + weight * taskPercent(task);
  }, 0);

  return {
    completedCount,
    failedTask,
    overallPercent: totalWeight > 0 ? clampPercent(weightedProgress / totalWeight) : 0,
  };
}

function inferAssetUploadKind(file: File): AssetUploadKind {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "file";
}

function clearFinishTimer() {
  if (!finishTimer) return;
  clearTimeout(finishTimer);
  finishTimer = null;
}

function scheduleFinish(delayMs = AUTO_CLOSE_DELAY_MS) {
  if (batchDepth > 0) return;

  const state = useAssetUploadProgressStore.getState();
  const hasActiveTasks = state.tasks.some(
    (task) => task.status === "running",
  );

  if (hasActiveTasks) return;

  clearFinishTimer();
  finishTimer = setTimeout(() => {
    useAssetUploadProgressStore.getState().hideOperation();
  }, delayMs);
}

export const useAssetUploadProgressStore = create<
  AssetUploadProgressState & AssetUploadProgressActions
>((set) => ({
  active: false,
  operationLabel: DEFAULT_OPERATION_LABEL,
  tasks: [],
  completedCount: 0,
  overallPercent: 0,
  failedTask: undefined,

  setActiveOperation: (label) => {
    clearFinishTimer();
    set((state) => {
      const shouldReset = !state.active;
      const tasks = shouldReset ? [] : state.tasks;
      return {
        active: true,
        operationLabel: label || state.operationLabel || DEFAULT_OPERATION_LABEL,
        tasks,
        ...recalculate(tasks),
      };
    });
  },

  upsertTask: (task) => {
    clearFinishTimer();
    set((state) => {
      const exists = state.tasks.some((item) => item.id === task.id);
      const tasks = exists
        ? state.tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item))
        : [...state.tasks, task];
      return {
        active: true,
        tasks,
        ...recalculate(tasks),
      };
    });
  },

  patchTask: (id, patch) => {
    clearFinishTimer();
    set((state) => {
      const tasks = state.tasks.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      );
      return {
        tasks,
        ...recalculate(tasks),
      };
    });
  },

  hideOperation: () => {
    clearFinishTimer();
    set({ active: false });
  },
}));

export function preRegisterAssetUploadTask(file: File, kind = inferAssetUploadKind(file)) {
  const existingId = fileTaskIds.get(file);
  if (existingId) return existingId;

  const id = createTaskId();
  fileTaskIds.set(file, id);
  useAssetUploadProgressStore.getState().upsertTask({
    id,
    kind,
    fileName: file.name,
    inputBytes: file.size,
    phase: "queued",
    phaseProgress: 0,
    status: "queued",
  });
  return id;
}

export function beginAssetUploadTask({
  file,
  kind = inferAssetUploadKind(file),
  operationLabel,
  phase = "preparing",
}: {
  file: File;
  kind?: AssetUploadKind;
  operationLabel?: string;
  phase?: AssetUploadPhase;
}) {
  const store = useAssetUploadProgressStore.getState();
  store.setActiveOperation(operationLabel);

  const existingId = fileTaskIds.get(file);
  const queuedTask = existingId
    ? undefined
    : store.tasks.find(
        (task) => task.kind === kind && task.status === "queued",
      );
  const id = existingId || queuedTask?.id || createTaskId();
  fileTaskIds.set(file, id);

  store.upsertTask({
    id,
    kind,
    fileName: file.name,
    inputBytes: file.size,
    phase,
    phaseProgress: 0,
    status: "running",
  });

  return id;
}

export function updateAssetUploadTask(
  id: string,
  patch: Partial<AssetUploadTask>,
) {
  useAssetUploadProgressStore.getState().patchTask(id, patch);
}

export function completeAssetUploadTask(
  id: string,
  patch: Partial<AssetUploadTask> = {},
) {
  useAssetUploadProgressStore.getState().patchTask(id, {
    ...patch,
    phase: "done",
    phaseProgress: 100,
    status: "done",
  });
  scheduleFinish();
}

export function failAssetUploadTask(id: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Asset upload failed";
  useAssetUploadProgressStore.getState().patchTask(id, {
    phase: "failed",
    status: "failed",
    error: message,
  });
  scheduleFinish(ERROR_CLOSE_DELAY_MS);
}

export async function withAssetUploadProgressBatch<T>(
  {
    label,
    files,
  }: {
    label: string;
    files?: Array<File | null | undefined>;
  },
  job: () => Promise<T>,
): Promise<T> {
  const store = useAssetUploadProgressStore.getState();
  store.setActiveOperation(label);
  batchDepth += 1;

  for (const file of files ?? []) {
    if (file instanceof File) {
      preRegisterAssetUploadTask(file);
    }
  }

  try {
    return await job();
  } finally {
    batchDepth = Math.max(0, batchDepth - 1);
    scheduleFinish();
  }
}

export function formatAssetUploadBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}
