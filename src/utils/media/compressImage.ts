/**
 * Compress an image file while preserving format.
 * GIF: returns original (canvas would destroy animation).
 * JPEG/JPG: compress to jpeg.
 * PNG/WEBP: convert to webp for smaller size (or keep same mime).
 */

export const COMPRESS_QUALITY = 0.95;
export const COMPRESS_MAX_WIDTH = 1920;
export const COMPRESS_MAX_HEIGHT = 1080;

/** @deprecated Use COMPRESS_MAX_WIDTH/COMPRESS_MAX_HEIGHT */
export const MAX_WIDTH = COMPRESS_MAX_WIDTH;
export const MAX_HEIGHT = COMPRESS_MAX_HEIGHT;

function extFromMime(mime: string): string {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  if (/gif/i.test(mime)) return "gif";
  return "jpg";
}

export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") {
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    let { width, height } = img;
    if (width > COMPRESS_MAX_WIDTH || height > COMPRESS_MAX_HEIGHT) {
      const ratio = Math.min(COMPRESS_MAX_WIDTH / width, COMPRESS_MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    const mime =
      file.type === "image/png"
        ? "image/png"
        : file.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";
    const ext = extFromMime(mime);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";

    const blob = await new Promise<Blob | null>((res) => {
      canvas.toBlob((b) => res(b), mime, COMPRESS_QUALITY);
    });

    if (!blob) return file;
    return new File([blob], `${baseName}.${ext}`, { type: mime });
  } finally {
    URL.revokeObjectURL(url);
  }
}
