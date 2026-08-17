/**
 * Crop an image using canvas from a source URL and pixel crop rect.
 * Reusable for add-info, basic-info, etc.
 */
export type CropRect = { x: number; y: number; width: number; height: number };

function inferMimeFromSrc(src: string): string | null {
  if (src.startsWith("data:")) {
    const m = /^data:([^;]+);/i.exec(src);
    return m ? m[1] : null;
  }
  return null;
}

function extFromMime(mime: string): string {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  if (/gif/i.test(mime)) return "gif";
  return "jpg";
}

export async function cropImage(
  imageSrc: string,
  pixelCrop: CropRect,
  opts?: {
    mime?: string;
    quality?: number;
    fileName?: string;
  }
): Promise<{ file: File; url: string; blob: Blob }> {
  const quality = opts?.quality ?? 0.95;
  const hintedMime = opts?.mime ?? inferMimeFromSrc(imageSrc) ?? "image/jpeg";
  const fileName = (opts?.fileName ?? "crop") + "." + extFromMime(hintedMime);

  const image: HTMLImageElement = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => {
        if (b) return resolve(b);
        const dataUrl = canvas.toDataURL(hintedMime, quality);
        const base64 = dataUrl.split(",")[1];
        if (!base64) return resolve(new Blob([], { type: hintedMime }));
        const bin = atob(base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: hintedMime }));
      },
      hintedMime,
      quality
    );
  });

  const file = new File([blob], fileName, { type: blob.type || hintedMime });
  const url = URL.createObjectURL(blob);
  return { file, url, blob };
}
