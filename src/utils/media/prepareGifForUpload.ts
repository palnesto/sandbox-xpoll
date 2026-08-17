import gifsicle from "gifsicle-wasm-browser";

import {
  GIF_COMPRESSION_COMMANDS,
  GIF_LARGE_FILE_COMPRESSION_COMMANDS,
  GIF_LARGE_FILE_THRESHOLD_BYTES,
  GIF_MAX_UPLOAD_BYTES,
  GIF_MIN_TARGET_BYTES,
  GIF_STAGE_TIMEOUT_MS,
  GIF_TOTAL_TIMEOUT_MS,
  GIF_WORKER_INPUT_NAME,
} from "@/utils/media/gif-upload.constants";

let gifOptimizationQueue = Promise.resolve();
let gifWorkerUrl: string | null = null;

type GifWorkerResult = {
  file: ArrayBufferLike;
  name: string;
};

type PrepareGifForUploadOptions = {
  onProgress?: (progress: number) => void;
};

function queueGifOptimization<T>(job: () => Promise<T>): Promise<T> {
  const nextJob = gifOptimizationQueue.then(job, job);
  gifOptimizationQueue = nextJob.then(
    () => undefined,
    () => undefined,
  );
  return nextJob;
}

function renameGif(file: File, originalName: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([file], `${baseName}.gif`, {
    type: "image/gif",
    lastModified: Date.now(),
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function getGifUploadLimitLabel(): string {
  return formatBytes(GIF_MAX_UPLOAD_BYTES);
}

function getGifTargetRangeLabel(): string {
  return `${formatBytes(GIF_MIN_TARGET_BYTES)}-${formatBytes(
    GIF_MAX_UPLOAD_BYTES,
  )}`;
}

function getGifCompressionCommands(fileSize: number): readonly string[] {
  if (fileSize > GIF_LARGE_FILE_THRESHOLD_BYTES) {
    return GIF_LARGE_FILE_COMPRESSION_COMMANDS;
  }

  return GIF_COMPRESSION_COMMANDS;
}

function getGifWorkerUrl(): string {
  if (!gifWorkerUrl) {
    gifWorkerUrl = URL.createObjectURL(
      new Blob([gifsicle.tool.workerLocalUrl], { type: "text/javascript" }),
    );
  }

  return gifWorkerUrl;
}

async function runGifCompressionCommand(
  file: File,
  sourceBuffer: ArrayBuffer,
  command: string,
  timeoutMs: number,
): Promise<File | null> {
  const worker = new Worker(getGifWorkerUrl());

  return await new Promise<File | null>((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      worker.terminate();
      callback();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => {
        reject(
          new Error(
            `GIF optimization timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`,
          ),
        );
      });
    }, timeoutMs);

    worker.onerror = (event) => {
      finish(() => {
        reject(new Error(event.message || "GIF optimization worker failed."));
      });
    };

    worker.onmessage = (event: MessageEvent<string | GifWorkerResult[] | null>) => {
      finish(() => {
        const output = event.data;
        if (!output) {
          reject(new Error("GIF optimization returned no output."));
          return;
        }

        if (typeof output === "string") {
          reject(new Error(output));
          return;
        }

        if (!output.length) {
          resolve(null);
          return;
        }

        const first = output[0];
        const optimizedFile = new File([first.file], first.name || file.name, {
          type: "image/gif",
          lastModified: Date.now(),
        });
        resolve(renameGif(optimizedFile, file.name));
      });
    };

    worker.postMessage({
      data: [{ file: sourceBuffer, name: GIF_WORKER_INPUT_NAME }],
      command: [command],
      folder: [],
      isStrict: true,
    });
  });
}

async function optimizeGif(
  file: File,
  options: PrepareGifForUploadOptions = {},
): Promise<File> {
  if (file.size <= GIF_MAX_UPLOAD_BYTES) {
    options.onProgress?.(100);
    return file;
  }

  const commands = getGifCompressionCommands(file.size);
  const sourceBuffer = await file.arrayBuffer();
  let smallestFile = file;
  let bestUnderLimitFile: File | null = null;
  let lastError: Error | null = null;
  const deadline = Date.now() + GIF_TOTAL_TIMEOUT_MS;

  options.onProgress?.(0);

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;

    try {
      const candidate = await runGifCompressionCommand(
        file,
        sourceBuffer,
        command,
        Math.min(GIF_STAGE_TIMEOUT_MS, remainingMs),
      );
      if (!candidate) continue;

      if (candidate.size < smallestFile.size) {
        smallestFile = candidate;
      }

      if (candidate.size >= file.size) {
        continue;
      }

      if (
        candidate.size >= GIF_MIN_TARGET_BYTES &&
        candidate.size <= GIF_MAX_UPLOAD_BYTES
      ) {
        options.onProgress?.(100);
        return candidate;
      }

      if (
        candidate.size <= GIF_MAX_UPLOAD_BYTES &&
        (!bestUnderLimitFile || candidate.size > bestUnderLimitFile.size)
      ) {
        bestUnderLimitFile = candidate;
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("GIF optimization failed");
    } finally {
      options.onProgress?.(((index + 1) / commands.length) * 100);
    }
  }

  if (bestUnderLimitFile) {
    options.onProgress?.(100);
    return bestUnderLimitFile;
  }

  if (smallestFile.size <= GIF_MAX_UPLOAD_BYTES && smallestFile.size < file.size) {
    options.onProgress?.(100);
    return smallestFile;
  }

  if (lastError && smallestFile === file) {
    throw lastError;
  }

  throw new Error(
    `GIF should compress into ${getGifTargetRangeLabel()} when possible. Best result was ${formatBytes(
      smallestFile.size,
    )}.`,
  );
}

export async function prepareGifForUpload(
  file: File,
  options: PrepareGifForUploadOptions = {},
): Promise<File> {
  if (file.type !== "image/gif") {
    options.onProgress?.(100);
    return file;
  }

  return queueGifOptimization(() => optimizeGif(file, options));
}
