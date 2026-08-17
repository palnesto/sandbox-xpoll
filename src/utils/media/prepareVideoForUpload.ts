import { fetchFile } from "@ffmpeg/util";

import {
  getFfmpeg,
  getFfmpegAssetUrls,
  resetFfmpeg,
} from "@/utils/media/ffmpeg-loader";
import { type VideoUploadDebugSession } from "@/utils/media/video-upload.debug";
import {
  VIDEO_UPLOAD_COMPRESSION_STAGES,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
  VIDEO_UPLOAD_STAGE_TIMEOUT_MS,
  VIDEO_UPLOAD_TARGET_MAX_BYTES,
  VIDEO_UPLOAD_TARGET_MAX_MB,
  VIDEO_UPLOAD_TOTAL_TIMEOUT_MS,
  getVideoUploadFileExtension,
  isAcceptedVideoUploadFile,
  type VideoCompressionStage,
} from "@/utils/media/video-upload.constants";

type PreparedVideoUpload = {
  file: File;
  wasOptimized: boolean;
};

type PrepareVideoForUploadOptions = {
  onProgress?: (progress: number) => void;
  debugSession?: VideoUploadDebugSession;
};

type VideoMetadata = {
  durationSeconds: number;
  width?: number;
  height?: number;
};

let videoOptimizationQueue = Promise.resolve();

function queueVideoOptimization<T>(
  job: () => Promise<T>,
  debugSession?: VideoUploadDebugSession,
): Promise<T> {
  const queuedAt = Date.now();
  debugSession?.log("queue:start");
  debugSession?.armStall("queue:wait", 0, 10_000);

  const wrappedJob = async () => {
    debugSession?.clearStall();
    debugSession?.log("queue:enter", {
      waitMs: Date.now() - queuedAt,
    });
    return job();
  };

  const nextJob = videoOptimizationQueue.then(wrappedJob, wrappedJob);
  videoOptimizationQueue = nextJob.then(
    () => undefined,
    () => undefined,
  );

  return nextJob.finally(() => {
    debugSession?.clearStall();
    debugSession?.log("queue:leave");
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function getInputFileName(file: File): string {
  const extension = getVideoUploadFileExtension(file.name);
  const safeExtension = extension || "video";
  return `input.${safeExtension}`;
}

function getOutputFileName(stageIndex: number): string {
  return `output-${stageIndex}.mp4`;
}

function getBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "video";
}

function createMp4File(data: Uint8Array, originalName: string): File {
  return new File([data], `${getBaseName(originalName)}.mp4`, {
    type: "video/mp4",
    lastModified: Date.now(),
  });
}

function resolveStageValue(
  value: number | ((durationSeconds: number) => number),
  durationSeconds: number,
) {
  return typeof value === "function" ? value(durationSeconds) : value;
}

function getScaleFilter(maxWidth: number, maxFps?: number) {
  const filters = [
    `scale='min(${maxWidth},iw)':-2:force_original_aspect_ratio=decrease`,
    "pad=ceil(iw/2)*2:ceil(ih/2)*2",
  ];

  if (maxFps) {
    filters.push(`fps=${maxFps}`);
  }

  return filters.join(",");
}

function getBudgetVideoKbps(durationSeconds: number, audioKbps: number) {
  const targetBits = VIDEO_UPLOAD_TARGET_MAX_BYTES * 8 * 0.96;
  const totalKbps = Math.floor(targetBits / Math.max(durationSeconds, 1) / 1000);
  return Math.max(totalKbps - audioKbps, 120);
}

function readBrowserVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const timeoutId = window.setTimeout(() => {
      settle(() => reject(new Error("Browser video metadata read timed out.")));
    }, 10_000);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      window.clearTimeout(timeoutId);
      const durationSeconds = Number(video.duration);

      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        settle(() => reject(new Error("Video duration could not be detected.")));
        return;
      }

      settle(() => resolve({
        durationSeconds,
        width: Number(video.videoWidth) || undefined,
        height: Number(video.videoHeight) || undefined,
      }));
    };

    video.onerror = () => {
      window.clearTimeout(timeoutId);
      settle(() => reject(new Error("Browser could not read video metadata.")));
    };

    video.src = objectUrl;
  });
}

function buildStageArgs(
  inputName: string,
  outputName: string,
  stage: VideoCompressionStage,
  metadata: VideoMetadata,
) {
  if (stage.kind === "crf") {
    return [
      "-i",
      inputName,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-map_metadata",
      "-1",
      "-vf",
      getScaleFilter(stage.maxWidth),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      String(stage.crf),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      `${stage.audioKbps}k`,
      outputName,
    ];
  }

  const audioKbps = resolveStageValue(stage.audioKbps, metadata.durationSeconds);
  const maxWidth = resolveStageValue(stage.maxWidth, metadata.durationSeconds);
  const videoKbps = getBudgetVideoKbps(metadata.durationSeconds, audioKbps);

  return [
    "-i",
    inputName,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-map_metadata",
    "-1",
    "-vf",
    getScaleFilter(maxWidth, stage.maxFps),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    `${videoKbps}k`,
    "-maxrate",
    `${videoKbps}k`,
    "-bufsize",
    `${videoKbps * 2}k`,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    `${audioKbps}k`,
    outputName,
  ];
}

async function readJsonFile(path: string) {
  const ffmpeg = await getFfmpeg();
  const data = await ffmpeg.readFile(path, "utf8");
  return JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data));
}

async function probeVideo(inputName: string): Promise<VideoMetadata> {
  const ffmpeg = await getFfmpeg();
  const outputName = "probe.json";
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  const exitCode = await ffmpeg.ffprobe(
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "format=duration:stream=width,height",
      "-of",
      "json",
      inputName,
      "-o",
      outputName,
    ],
    VIDEO_UPLOAD_STAGE_TIMEOUT_MS,
  );

  if (exitCode !== 0) {
    throw new Error("Could not read video metadata before optimization.");
  }

  const parsed = await readJsonFile(outputName);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  const durationSeconds = Number(parsed?.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Video duration could not be detected.");
  }

  const stream = Array.isArray(parsed?.streams) ? parsed.streams[0] : undefined;
  return {
    durationSeconds,
    width: Number(stream?.width) || undefined,
    height: Number(stream?.height) || undefined,
  };
}

async function runStage(
  inputName: string,
  outputName: string,
  stage: VideoCompressionStage,
  metadata: VideoMetadata,
  timeoutMs: number,
  onProgress?: (progress: number) => void,
  debugSession?: VideoUploadDebugSession,
) {
  const ffmpeg = await getFfmpeg();
  await ffmpeg.deleteFile(outputName).catch(() => undefined);
  debugSession?.log(`stage:${stage.label}:start`, {
    timeoutMs,
  });
  debugSession?.armStall(`stage:${stage.label}`, 0, 15_000);

  const handleProgress = ({ progress }: { progress: number }) => {
    const stageProgress = Math.min(99, Math.max(0, progress * 100));
    onProgress?.(stageProgress);
    debugSession?.armStall(`stage:${stage.label}`, stageProgress, 15_000);
    debugSession?.logProgress(`stage:${stage.label}:progress`, stageProgress);
  };

  ffmpeg.on("progress", handleProgress);

  let exitCode: number;
  try {
    exitCode = await ffmpeg.exec(
      buildStageArgs(inputName, outputName, stage, metadata),
      timeoutMs,
    );
  } finally {
    ffmpeg.off("progress", handleProgress);
  }

  if (exitCode !== 0) {
    debugSession?.clearStall();
    debugSession?.log(`stage:${stage.label}:fail`, {
      exitCode,
    });
    throw new Error(`Video optimization stage "${stage.label}" failed.`);
  }

  const data = await ffmpeg.readFile(outputName);
  if (typeof data === "string") {
    debugSession?.clearStall();
    debugSession?.log(`stage:${stage.label}:fail`, {
      reason: "invalid-output",
    });
    throw new Error(`Video optimization stage "${stage.label}" produced invalid output.`);
  }

  debugSession?.clearStall();
  debugSession?.log(`stage:${stage.label}:success`, {
    outputBytes: data.byteLength,
  });

  return data;
}

async function optimizeVideo(
  file: File,
  options: PrepareVideoForUploadOptions = {},
): Promise<PreparedVideoUpload> {
  const debugSession = options.debugSession;

  if (!isAcceptedVideoUploadFile(file)) {
    debugSession?.log("validation:unsupported-format", {
      fileType: file.type,
    });
    throw new Error(
      "Unsupported video format. Use MP4, MOV, WEBM, MKV, AVI, or M4V.",
    );
  }

  if (file.size > VIDEO_UPLOAD_MAX_INPUT_BYTES) {
    debugSession?.log("validation:too-large", {
      fileSize: file.size,
      maxBytes: VIDEO_UPLOAD_MAX_INPUT_BYTES,
    });
    throw new Error(
      `Video is ${formatBytes(file.size)}. Max allowed is ${VIDEO_UPLOAD_MAX_INPUT_MB} MB.`,
    );
  }

  debugSession?.log("metadata:browser:start");
  debugSession?.armStall("metadata:browser", 0, 10_000);
  const browserMetadata = await readBrowserVideoMetadata(file)
    .then((metadata) => {
      debugSession?.clearStall();
      debugSession?.log("metadata:browser:success", metadata);
      return metadata;
    })
    .catch((error) => {
      debugSession?.clearStall();
      debugSession?.log("metadata:browser:fail", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    });
  options.onProgress?.(2);
  const ffmpegAssetUrls = getFfmpegAssetUrls();
  debugSession?.log("ffmpeg:load:start", ffmpegAssetUrls);
  debugSession?.armStall("ffmpeg:load", 2, 10_000);
  const ffmpeg = await getFfmpeg()
    .then((instance) => {
      debugSession?.clearStall();
      debugSession?.log("ffmpeg:load:success", ffmpegAssetUrls);
      return instance;
    })
    .catch((error) => {
      debugSession?.clearStall();
      debugSession?.log("ffmpeg:load:fail", {
        ...ffmpegAssetUrls,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    });
  options.onProgress?.(5);
  const inputName = getInputFileName(file);
  debugSession?.log("input:write:start", {
    inputName,
  });
  debugSession?.armStall("input:write", 5, 10_000);
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  debugSession?.clearStall();
  debugSession?.log("input:write:success", {
    inputName,
  });
  options.onProgress?.(8);

  const deadline = Date.now() + VIDEO_UPLOAD_TOTAL_TIMEOUT_MS;
  let smallestFile: File | null = null;
  let lastError: Error | null = null;

  try {
    let metadata = browserMetadata;
    if (metadata) {
      debugSession?.log("metadata:ffprobe:skipped");
    } else {
      debugSession?.log("metadata:ffprobe:start");
      debugSession?.armStall("metadata:ffprobe", 8, 10_000);
      metadata = await probeVideo(inputName)
        .then((probedMetadata) => {
          debugSession?.clearStall();
          debugSession?.log("metadata:ffprobe:success", probedMetadata);
          return probedMetadata;
        })
        .catch((error) => {
          debugSession?.clearStall();
          debugSession?.log("metadata:ffprobe:fail", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          throw error;
        });
    }

    const resolvedMetadata = metadata;
    if (!resolvedMetadata) {
      throw new Error("Video metadata could not be resolved before optimization.");
    }

    for (let index = 0; index < VIDEO_UPLOAD_COMPRESSION_STAGES.length; index += 1) {
      const stage = VIDEO_UPLOAD_COMPRESSION_STAGES[index];
      const outputName = getOutputFileName(index + 1);
      const remainingMs = deadline - Date.now();

      if (remainingMs <= 0) {
        throw new Error("Video optimization timed out.");
      }

      try {
        const data = await runStage(
          inputName,
          outputName,
          stage,
          resolvedMetadata,
          Math.min(VIDEO_UPLOAD_STAGE_TIMEOUT_MS, remainingMs),
          (stageProgress) => {
            const base = (index / VIDEO_UPLOAD_COMPRESSION_STAGES.length) * 100;
            const span = 100 / VIDEO_UPLOAD_COMPRESSION_STAGES.length;
            options.onProgress?.(Math.min(99, base + (stageProgress / 100) * span));
          },
          debugSession,
        );
        const candidate = createMp4File(data, file.name);

        if (!smallestFile || candidate.size < smallestFile.size) {
          smallestFile = candidate;
        }

        if (
          index === 0 &&
          file.type === "video/mp4" &&
          file.size <= VIDEO_UPLOAD_TARGET_MAX_BYTES &&
          candidate.size > file.size
        ) {
          debugSession?.log("decision:keep-original-mp4", {
            originalBytes: file.size,
            candidateBytes: candidate.size,
          });
          options.onProgress?.(100);
          debugSession?.log("decision:terminal:keep-original-mp4", {
            outputBytes: file.size,
          });
          return { file, wasOptimized: false };
        }

        if (candidate.size <= VIDEO_UPLOAD_TARGET_MAX_BYTES) {
          debugSession?.log("decision:accept-stage-output", {
            stage: stage.label,
            candidateBytes: candidate.size,
          });
          options.onProgress?.(100);
          return { file: candidate, wasOptimized: true };
        }
      } catch (error) {
        debugSession?.log(`stage:${stage.label}:fail`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        lastError =
          error instanceof Error ? error : new Error("Video optimization failed.");
      } finally {
        await ffmpeg.deleteFile(outputName).catch(() => undefined);
      }
    }

    if (lastError && !smallestFile) {
      throw lastError;
    }

    debugSession?.log("decision:reject-quality-floor", {
      bestBytes: smallestFile?.size,
    });
    throw new Error(
      `Video could not be compressed below ${VIDEO_UPLOAD_TARGET_MAX_MB} MB without dropping below the quality floor. Best result was ${
        smallestFile ? formatBytes(smallestFile.size) : "unavailable"
      }.`,
    );
  } finally {
    debugSession?.log("cleanup:start", {
      inputName,
    });
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    debugSession?.log("cleanup:done", {
      inputName,
    });
  }
}

export async function prepareVideoForUpload(
  file: File,
  options: PrepareVideoForUploadOptions = {},
): Promise<PreparedVideoUpload> {
  try {
    const result = await queueVideoOptimization(
      () => optimizeVideo(file, options),
      options.debugSession,
    );
    options.debugSession?.log("prepare:success", {
      outputFileName: result.file.name,
      outputFileType: result.file.type,
      outputBytes: result.file.size,
      wasOptimized: result.wasOptimized,
    });
    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      /memory access out of bounds|abort|RuntimeError/i.test(error.message)
    ) {
      options.debugSession?.log("ffmpeg:reset", {
        reason: error.message,
      });
      resetFfmpeg();
    }
    options.debugSession?.log("prepare:fail", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
