import { appToast } from "@/utils/toast";
import { prepareImageForUpload } from "@/utils/media/prepareImageForUpload";
import { prepareGifForUpload } from "@/utils/media/prepareGifForUpload";
import { VIDEO_UPLOAD_PREPROCESSING_ENABLED } from "@/utils/media/video-upload.constants";
import {
  createVideoUploadDebugSession,
  type VideoUploadDebugSession,
} from "@/utils/media/video-upload.debug";
import { useState } from "react";
import {
  beginAssetUploadTask,
  completeAssetUploadTask,
  failAssetUploadTask,
  updateAssetUploadTask,
  type AssetUploadKind,
  type AssetUploadPhase,
} from "@/stores/asset-upload-progress.store";

type PresignedPostResponse = {
  signedUrl: string;
  fields: Record<string, string>;
  fileName?: string;
  publicUrl?: string; // ✅ backend might return this
};

type UploadAssetInput =
  | File
  | ((ctx: { onProgress: (progress: number) => void }) => Promise<File>);

type UploadAssetProgressOptions = {
  kind: AssetUploadKind;
  sourceFile?: File;
  operationLabel?: string;
  preparePhase?: AssetUploadPhase;
  debugSession?: VideoUploadDebugSession;
};

/**
 * SANDBOX: there is no backend to hand out a presigned POST, so this returns a
 * fake one instantly instead of calling `${VITE_BACKEND_URL}/utils/signed-url`
 * (which 404s with no backend configured). `uploadFileUsingPost` below matches
 * this by skipping the XHR and resolving to a local object URL for the file.
 */
async function fetchPresignedPostData(
  fileName: string,
  _fileType: string,
  _shouldSameUrl: boolean = false
): Promise<PresignedPostResponse> {
  return {
    signedUrl: "sandbox://local-upload",
    fields: { key: `sandbox/${Date.now()}-${fileName}` },
    fileName,
  };
}

/**
 * SANDBOX: no Spaces bucket to upload to. Fakes the progress events an XHR
 * would have emitted, then hands back a local `URL.createObjectURL(file)` —
 * the picked file previews and plays exactly like a real hosted asset for the
 * rest of the session, with nothing actually leaving the browser.
 */
async function uploadFileUsingPost(
  _signedUrl: string,
  _fields: Record<string, string>,
  file: File,
  onProgress?: (progress: { loaded: number; total?: number }) => void
): Promise<string> {
  const total = file.size;
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 80));
    onProgress?.({ loaded: Math.round((total * i) / steps), total });
  }
  return URL.createObjectURL(file);
}

export function extractKey(url: string): string {
  const parts = url.split(".com/");
  if (parts.length < 2) throw new Error("Cannot extract key from URL");
  return decodeURIComponent(parts[1].split("?")[0]).replace(/^\/+/, "");
}

function useAssetUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadAsset(
    fileInput: UploadAssetInput,
    _assetConfig: object,
    progressOptions?: UploadAssetProgressOptions,
  ) {
    setLoading(true);
    setError(null);
    const debugSession = progressOptions?.debugSession;
    const sourceFile =
      progressOptions?.sourceFile ??
      (fileInput instanceof File ? fileInput : undefined);
    const taskId = sourceFile
      ? beginAssetUploadTask({
          file: sourceFile,
          kind: progressOptions?.kind,
          operationLabel: progressOptions?.operationLabel,
          phase:
            fileInput instanceof File
              ? "presigning"
              : progressOptions?.preparePhase ?? "preparing",
        })
      : null;
    let activeTaskId = taskId;
    let lastDebugStep = "start";

    try {
      if (typeof fileInput === "function") {
        lastDebugStep = progressOptions?.preparePhase ?? "preparing";
        debugSession?.log("task:phase", { phase: lastDebugStep });
      }

      const file =
        typeof fileInput === "function"
          ? await fileInput({
              onProgress: (progress) => {
                if (!taskId) return;
                updateAssetUploadTask(taskId, {
                  phase: progressOptions?.preparePhase ?? "preparing",
                  phaseProgress: progress,
                });
              },
            })
          : fileInput;

      debugSession?.clearStall();
      debugSession?.log(
        typeof fileInput === "function" ? "prepare:complete" : "prepare:skipped",
        {
          preparedFileName: file.name,
          preparedFileType: file.type,
          preparedBytes: file.size,
        },
      );

      activeTaskId =
        activeTaskId ??
        beginAssetUploadTask({
          file,
          kind: progressOptions?.kind,
          operationLabel: progressOptions?.operationLabel,
          phase: "presigning",
        });

      lastDebugStep = "presigning";
      updateAssetUploadTask(activeTaskId, {
        fileName: file.name,
        preparedBytes: file.size,
        phase: "presigning",
        phaseProgress: 0,
      });
      debugSession?.log("task:phase", { phase: "presigning" });
      debugSession?.log("presign:start", {
        fileName: file.name,
        fileType: file.type,
      });
      debugSession?.armStall("presign", 0, 10_000);

      const { signedUrl, fields, publicUrl } = await fetchPresignedPostData(
        file.name,
        file.type
      );
      debugSession?.clearStall();
      debugSession?.log("presign:success", {
        signedUrl,
        key: fields.key,
        publicUrl,
      });

      lastDebugStep = "uploading";
      updateAssetUploadTask(activeTaskId, {
        phase: "uploading",
        phaseProgress: 0,
        uploadedBytes: 0,
        uploadTotalBytes: undefined,
      });
      debugSession?.log("task:phase", { phase: "uploading" });
      debugSession?.log("upload:start", {
        targetKey: fields.key,
      });
      debugSession?.armStall("uploading", 0, 15_000);

      const finalFileUrl = await uploadFileUsingPost(
        signedUrl,
        fields,
        file,
        ({ loaded, total }) => {
          const percent = total ? (loaded / total) * 100 : 0;
          updateAssetUploadTask(activeTaskId, {
            phase: "uploading",
            uploadedBytes: loaded,
            uploadTotalBytes: total,
            phaseProgress: total ? percent : 95,
          });
          debugSession?.armStall("uploading", percent, 15_000);
          debugSession?.logProgress("upload:progress", percent, {
            loadedBytes: loaded,
            totalBytes: total,
          });
        },
      );
      debugSession?.clearStall();
      debugSession?.log("upload:success", {
        finalFileUrl,
      });

      // SANDBOX: production makes the uploaded object public with a second
      // fetch to `${VITE_BACKEND_URL}/utils/make-public`. The local blob URL
      // from uploadFileUsingPost is already usable as-is, so that call (and
      // the extractKey() it depended on) is skipped entirely.
      lastDebugStep = "publishing";
      updateAssetUploadTask(activeTaskId, {
        phase: "publishing",
        phaseProgress: 30,
      });
      debugSession?.log("task:phase", { phase: "publishing" });
      debugSession?.log("publish:success", {
        finalFileUrl,
      });

      completeAssetUploadTask(activeTaskId, {
        uploadedBytes: file.size,
        uploadTotalBytes: file.size,
        preparedBytes: file.size,
      });
      debugSession?.log("upload:complete", {
        finalUrl: publicUrl ?? finalFileUrl,
      });

      // ✅ IMPORTANT: return something real
      return publicUrl ?? finalFileUrl;
    } catch (err: any) {
      debugSession?.clearStall();
      debugSession?.log("upload:failed", {
        step: lastDebugStep,
        error: err?.message || "Upload failed",
      });
      if (activeTaskId) failAssetUploadTask(activeTaskId, err);
      setError(err?.message || "Upload failed");
      throw err;
    } finally {
      debugSession?.dispose();
      setLoading(false);
    }
  }

  return { loading, error, uploadAsset };
}

/** Accepts image/* including image/gif; video uploads are normalized separately. */
export function useImageUpload() {
  const { loading, error, uploadAsset } = useAssetUpload();
  async function uploadImage(
    file: File,
    cropParams?: { x: number; y: number; width: number; height: number },
    compress: boolean = true
  ) {
    if (file.type === "image/gif") {
      return await uploadAsset(
        ({ onProgress }) => prepareGifForUpload(file, { onProgress }),
        {
          imageProps: { cropParams, compress },
        },
        {
          kind: "gif",
          sourceFile: file,
          operationLabel: "Compressing Media",
          preparePhase: "compressing",
        },
      );
    }

    return await uploadAsset(
      async ({ onProgress }) => {
        const prepared = await prepareImageForUpload(file, {
          compress,
          onProgress,
        });

        if (prepared.usedOriginalFallback) {
          appToast.info("Image optimization fell back to the original file before upload.");
        }

        return prepared.file;
      },
      {
        imageProps: { cropParams, compress },
      },
      {
        kind: "image",
        sourceFile: file,
        operationLabel: "Compressing Media",
        preparePhase: "converting",
      },
    );
  }
  return { loading, error, uploadImage };
}

export function useVideoUpload() {
  const { loading, error, uploadAsset } = useAssetUpload();
  async function uploadVideo(
    file: File,
    trimParams?: { start: number; end: number },
    cropParams?: { x: number; y: number; width: number; height: number },
    compression: boolean = true
  ) {
    const shouldPreprocess =
      VIDEO_UPLOAD_PREPROCESSING_ENABLED && compression !== false;
    const debugSession = createVideoUploadDebugSession(file);
    debugSession.log("upload:init", {
      shouldPreprocess,
      compression,
      fileType: file.type,
    });

    return await uploadAsset(
      shouldPreprocess
        ? async ({ onProgress }) => {
            debugSession.log("prepare-module:load:start");
            const { prepareVideoForUpload } = await import(
              "@/utils/media/prepareVideoForUpload"
            )
              .then((module) => {
                debugSession.log("prepare-module:load:success");
                return module;
              })
              .catch((error) => {
                debugSession.log("prepare-module:load:fail", {
                  error: error instanceof Error ? error.message : "Unknown error",
                });
                throw error;
              });

            const result = await prepareVideoForUpload(file, {
              onProgress,
              debugSession,
            });
            if (!result.wasOptimized) {
              debugSession.log("prepare:kept-original-file", {
                outputFileName: result.file.name,
                outputFileType: result.file.type,
                outputBytes: result.file.size,
              });
            }
            return result.file;
          }
        : file,
      {
        videoProps: { trimParams, cropParams, compression: shouldPreprocess },
      },
      {
        kind: "video",
        sourceFile: file,
        operationLabel: "Compressing Media",
        debugSession,
      },
    );
  }
  return { loading, error, uploadVideo };
}

export function usePdfUpload() {
  const { loading, error, uploadAsset } = useAssetUpload();
  async function uploadPdf(file: File, compress: boolean = true) {
    return await uploadAsset(file, {
      pdfProps: { compress },
    }, {
      kind: "pdf",
      sourceFile: file,
      operationLabel: "Compressing Media",
    });
  }
  return { loading, error, uploadPdf };
}

export default useAssetUpload;
