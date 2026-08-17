import { FFmpeg } from "@ffmpeg/ffmpeg";

import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

export function getFfmpegAssetUrls() {
  return {
    coreURL,
    wasmURL,
    workerStrategy: import.meta.env.DEV
      ? "explicit-dev-worker-url"
      : "default-bundled-worker",
  };
}

export async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const loadConfig: {
      coreURL: string;
      wasmURL: string;
      classWorkerURL?: string;
    } = {
      coreURL,
      wasmURL,
    };

    if (import.meta.env.DEV) {
      const { default: classWorkerURL } = await import("@ffmpeg/ffmpeg/worker?url");
      loadConfig.classWorkerURL = classWorkerURL;
    }

    await ffmpeg.load(loadConfig);
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (error) {
    ffmpegInstance = null;
    ffmpegLoadPromise = null;
    throw error;
  }
}

export function resetFfmpeg() {
  if (ffmpegInstance?.loaded) {
    ffmpegInstance.terminate();
  }
  ffmpegInstance = null;
  ffmpegLoadPromise = null;
}
