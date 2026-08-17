type VideoUploadDebugDetails = Record<string, unknown>;

function createUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type VideoUploadDebugSession = {
  uploadId: string;
  fileName: string;
  fileSize: number;
  log: (step: string, details?: VideoUploadDebugDetails) => void;
  logProgress: (
    step: string,
    percent: number,
    details?: VideoUploadDebugDetails,
  ) => void;
  armStall: (step: string, percent: number, timeoutMs: number) => void;
  clearStall: () => void;
  dispose: () => void;
};

export function createVideoUploadDebugSession(file: File): VideoUploadDebugSession {
  const uploadId = createUploadId();
  const noop = (_step?: string, _details?: VideoUploadDebugDetails) => {};
  const noopProgress = (
    _step: string,
    _percent: number,
    _details?: VideoUploadDebugDetails,
  ) => {};
  const noopStall = (_step: string, _percent: number, _timeoutMs: number) => {};

  return {
    uploadId,
    fileName: file.name,
    fileSize: file.size,
    log: noop,
    logProgress: noopProgress,
    armStall: noopStall,
    clearStall: () => {},
    dispose: () => {},
  };
}
