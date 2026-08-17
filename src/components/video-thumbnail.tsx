import { ImageOff, Loader2, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

interface VideoThumbnailProps {
  videoUrl: string;
  alt: string;

  /** Apply sizing/aspect/borders here (this is the FRAME) */
  containerClassName?: string;

  /** Apply image-specific classes here */
  imgClassName?: string;

  /**
   * How the thumbnail fits inside the frame.
   * - "cover": fills frame (cropping if needed)
   * - "contain": fits fully (letterbox)
   */
  objectFit?: "cover" | "contain";

  /** Frame capture time in seconds */
  seekTo?: number;

  /** Show play overlay icon */
  showPlayIcon?: boolean;

  /** Overlay classes */
  overlayClassName?: string;

  /** Enable group-hover behavior for overlay (wrap parent with `group`) */
  hoverOverlay?: boolean;

  [x: string]: any;
}

export function VideoThumbnail({
  videoUrl,
  alt,
  containerClassName,
  imgClassName,
  objectFit = "cover",
  seekTo = 1,
  showPlayIcon = true,
  overlayClassName,
  hoverOverlay = true,
  ...props
}: VideoThumbnailProps) {
  const reqIdRef = useRef(0);

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const objectFitClass = useMemo(
    () => (objectFit === "contain" ? "object-contain" : "object-cover"),
    [objectFit],
  );

  useEffect(() => {
    if (!videoUrl) {
      setThumbnail(null);
      setError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const thisReq = ++reqIdRef.current;

    setLoading(true);
    setError(false);
    setThumbnail(null);

    const video = document.createElement("video");
    video.muted = true;
    (video as any).playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}
    };

    const bail = () => {
      if (cancelled || reqIdRef.current !== thisReq) return;
      setError(true);
      setLoading(false);
      cleanup();
    };

    const captureFrame = () => {
      try {
        if (cancelled || reqIdRef.current !== thisReq) return;

        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return bail();

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) return bail();

        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");

        if (cancelled || reqIdRef.current !== thisReq) return;
        setThumbnail(dataUrl);
        setLoading(false);
        cleanup();
      } catch {
        bail();
      }
    };

    const onLoadedMetadata = () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const safeSeek =
          duration > 0
            ? Math.min(Math.max(seekTo, 0), Math.max(duration - 0.05, 0))
            : seekTo;

        video.currentTime = safeSeek;
      } catch {
        bail();
      }
    };

    const onSeeked = () => {
      requestAnimationFrame(captureFrame);
    };

    const onError = () => bail();

    try {
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);

      video.src = videoUrl;
      video.load();
    } catch {
      bail();
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      cleanup();
    };
  }, [videoUrl, seekTo]);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted",
          containerClassName,
        )}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <span className="text-sm">Failed to load thumbnail</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden",
          containerClassName,
        )}
        {...props}
      >
        <Skeleton className="absolute inset-0" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-black",
        hoverOverlay ? "group" : "",
        containerClassName,
      )}
      {...props}
    >
      <img
        src={thumbnail || ""}
        alt={alt}
        className={cn("h-full w-full", objectFitClass, imgClassName)}
        loading="lazy"
      />

      {showPlayIcon && (
        <div
          className={cn(
            "absolute inset-0 grid place-items-center transition-opacity",
            // keep your contain behavior untouched; this is just overlay
            "bg-black/20",
            hoverOverlay ? "opacity-70 group-hover:opacity-100" : "opacity-70",
            overlayClassName,
          )}
        >
          <PlayCircle className="h-12 w-12 text-white drop-shadow" />
        </div>
      )}
    </div>
  );
}
