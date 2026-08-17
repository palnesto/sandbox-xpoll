export const IMAGE_OPTIMIZATION_MAX_LONG_EDGE_PX = 1920;
export const IMAGE_OPTIMIZATION_TARGET_MAX_SIZE_MB = 0.3;
export const IMAGE_OPTIMIZATION_TARGET_MAX_SIZE_BYTES =
  IMAGE_OPTIMIZATION_TARGET_MAX_SIZE_MB * 1024 * 1024;
export const IMAGE_OPTIMIZATION_OUTPUT_MIME_TYPE = "image/webp";
export const IMAGE_OPTIMIZATION_OUTPUT_EXTENSION = "webp";
export const IMAGE_OPTIMIZATION_INITIAL_QUALITY = 0.82;
export const IMAGE_OPTIMIZATION_QUALITY_STEPS = [
  82,
  76,
  70,
  64,
  58,
  52,
  46,
] as const;

export const GIF_OPTIMIZATION_TARGET_MIN_BYTES = 500 * 1024;
export const GIF_OPTIMIZATION_TARGET_MAX_BYTES = 800 * 1024;
export const GIF_OPTIMIZATION_LARGE_FILE_THRESHOLD_BYTES = 2 * 1024 * 1024;
export const GIF_OPTIMIZATION_COMMANDS = [
  "-O1 --lossy=20 --colors 160 input.gif -o /out/out.gif",
  "-O1 --lossy=45 --colors 128 input.gif -o /out/out.gif",
  "-O1 --lossy=60 --colors 96 --resize-fit 500x500 input.gif -o /out/out.gif",
  "-O1 --lossy=150 --colors 64 --resize-fit 330x330 input.gif -o /out/out.gif",
  "-O1 --lossy=140 --colors 64 --resize-fit 300x300 input.gif -o /out/out.gif",
  "-O1 --lossy=150 --colors 64 --resize-fit 260x260 input.gif -o /out/out.gif",
] as const;
export const GIF_OPTIMIZATION_LARGE_FILE_COMMANDS = [
  "-O1 --lossy=60 --colors 96 --resize-fit 500x500 input.gif -o /out/out.gif",
  "-O1 --lossy=150 --colors 64 --resize-fit 330x330 input.gif -o /out/out.gif",
  "-O1 --lossy=140 --colors 64 --resize-fit 300x300 input.gif -o /out/out.gif",
  "-O1 --lossy=150 --colors 64 --resize-fit 260x260 input.gif -o /out/out.gif",
] as const;

export const VIDEO_OPTIMIZATION_MAX_INPUT_MB = 25;
export const VIDEO_OPTIMIZATION_TARGET_MAX_MB = 5;
export const VIDEO_OPTIMIZATION_MAX_INPUT_BYTES =
  VIDEO_OPTIMIZATION_MAX_INPUT_MB * 1024 * 1024;
export const VIDEO_OPTIMIZATION_TARGET_MAX_BYTES =
  VIDEO_OPTIMIZATION_TARGET_MAX_MB * 1024 * 1024;

export type VideoOptimizationStage =
  | {
      kind: "crf";
      label: string;
      maxWidth: number;
      crf: number;
      audioKbps: number;
    }
  | {
      kind: "budget";
      label: string;
      maxWidth: number | ((durationSeconds: number) => number);
      maxFps?: number;
      audioKbps: number | ((durationSeconds: number) => number);
    };

export const VIDEO_OPTIMIZATION_COMPRESSION_STAGES: VideoOptimizationStage[] = [
  {
    kind: "crf",
    label: "balanced",
    maxWidth: 1280,
    crf: 24,
    audioKbps: 96,
  },
  {
    kind: "budget",
    label: "duration-budget",
    maxWidth: (durationSeconds) => {
      if (durationSeconds > 120) return 640;
      if (durationSeconds > 45) return 854;
      return 1280;
    },
    audioKbps: (durationSeconds) => {
      if (durationSeconds > 120) return 48;
      if (durationSeconds > 45) return 64;
      return 96;
    },
  },
  {
    kind: "budget",
    label: "quality-floor-640p",
    maxWidth: 640,
    maxFps: 24,
    audioKbps: 48,
  },
  {
    kind: "budget",
    label: "quality-floor-480p",
    maxWidth: 480,
    maxFps: 20,
    audioKbps: 32,
  },
] as const;
