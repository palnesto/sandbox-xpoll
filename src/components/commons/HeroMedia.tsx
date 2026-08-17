import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroMediaSource =
  | { kind: "image"; url: string }
  | { kind: "youtube"; url: string }
  | { kind: "video"; url: string }
  | null;

function normalizeUrl(raw?: string | null) {
  const u = String(raw ?? "").trim();
  if (!u) return null;

  // if no scheme, add https:// so URL() works
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
}

function getYouTubeId(raw?: string | null) {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);

    // youtu.be/<id>
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id || null;
    }

    // youtube.com/watch?v=<id>
    const v = url.searchParams.get("v");
    if (v) return v;

    // youtube.com/shorts/<id> or /embed/<id>
    const parts = url.pathname.split("/").filter(Boolean);

    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx !== -1 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];

    const embedIdx = parts.indexOf("embed");
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];

    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumb(ytUrl?: string | null) {
  const id = getYouTubeId(ytUrl);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export default function HeroMedia({
  source,
  className,
  aspectClassName = "pb-[38%]",
  roundedClassName = "rounded-[2px]",
  showPlayButton = true,
  playLabel = "Play",
  fallbackLabel = "No media",
}: {
  source: HeroMediaSource;
  className?: string;
  aspectClassName?: string;
  roundedClassName?: string;
  showPlayButton?: boolean;
  playLabel?: string;
  fallbackLabel?: string;
}) {
  const [playing, setPlaying] = useState(false);

  const coverImage = useMemo(() => {
    if (!source) return null;
    if (source.kind === "image") return source.url;
    if (source.kind === "youtube") return getYouTubeThumb(source.url);
    return null; // video has no thumb by default
  }, [source]);

  const isPlayable = source?.kind === "youtube" || source?.kind === "video";

  if (!source) return null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-zinc-200",
        roundedClassName,
        className,
      )}
    >
      <div className={cn("relative w-full", aspectClassName)}>
        {/* PLAYER */}
        {playing && isPlayable ? (
          <div className="absolute inset-0">
            {source.kind === "youtube" ? (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${getYouTubeId(
                  source.url,
                )}?autoplay=1&rel=0`}
                title="YouTube video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                className="h-full w-full object-cover"
                src={source.url}
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
        ) : coverImage ? (
          /* COVER */
          <img
            src={coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          /* FALLBACK */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              {isPlayable ? <Play className="h-4 w-4" /> : null}
              <span>{fallbackLabel}</span>
            </div>
          </div>
        )}

        {/* PLAY */}
        {isPlayable && showPlayButton && !playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-zinc-900 backdrop-blur hover:bg-white/80"
          >
            <Play className="h-4 w-4" />
            {playLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
