import imageCompression from "browser-image-compression";

import {
  IMAGE_UPLOAD_COMPRESSION_INITIAL_QUALITY,
  IMAGE_UPLOAD_COMPRESSION_MAX_LONG_EDGE_PX,
  IMAGE_UPLOAD_COMPRESSION_OUTPUT_MIME_TYPE,
  IMAGE_UPLOAD_COMPRESSION_TARGET_MAX_SIZE_MB,
} from "./image-upload.constants";

export type PreparedImageUpload = {
  file: File;
  usedOriginalFallback: boolean;
  wasCompressed: boolean;
};

type PrepareImageForUploadOptions = {
  compress?: boolean;
  onProgress?: (progress: number) => void;
};

function getFileExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

function replaceFileExtension(fileName: string, nextExtension: string) {
  const normalizedExtension = nextExtension.replace(/^\./, "");
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return `${fileName}.${normalizedExtension}`;
  }

  return `${fileName.slice(0, lastDotIndex)}.${normalizedExtension}`;
}

function ensurePreparedFile(
  blob: Blob | File,
  originalName: string,
  mimeType: string,
) {
  const nextName = replaceFileExtension(
    originalName,
    getFileExtensionForMimeType(mimeType),
  );

  if (blob instanceof File && blob.name === nextName && blob.type === mimeType) {
    return blob;
  }

  return new File([blob], nextName, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export async function prepareImageForUpload(
  file: File,
  options: PrepareImageForUploadOptions = {},
): Promise<PreparedImageUpload> {
  if (options.compress === false || file.type === "image/gif") {
    options.onProgress?.(100);
    return {
      file,
      usedOriginalFallback: false,
      wasCompressed: false,
    };
  }

  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: IMAGE_UPLOAD_COMPRESSION_TARGET_MAX_SIZE_MB,
      maxWidthOrHeight: IMAGE_UPLOAD_COMPRESSION_MAX_LONG_EDGE_PX,
      useWebWorker: true,
      fileType: IMAGE_UPLOAD_COMPRESSION_OUTPUT_MIME_TYPE,
      initialQuality: IMAGE_UPLOAD_COMPRESSION_INITIAL_QUALITY,
      preserveExif: false,
      onProgress: options.onProgress,
    });

    const optimizedFile = ensurePreparedFile(
      compressedBlob,
      file.name,
      compressedBlob.type || IMAGE_UPLOAD_COMPRESSION_OUTPUT_MIME_TYPE,
    );

    options.onProgress?.(100);

    return {
      file: optimizedFile,
      usedOriginalFallback: false,
      wasCompressed: true,
    };
  } catch {
    options.onProgress?.(100);
    return {
      file,
      usedOriginalFallback: true,
      wasCompressed: false,
    };
  }
}
