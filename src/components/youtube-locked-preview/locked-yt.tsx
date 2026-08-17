import { useEffect, useRef, useState } from "react";
import type YT from "youtube";
import { loadYouTubeIframeAPI } from "./loadYouTubeApi";
import { cn } from "@/lib/utils";

type LockedYouTubeProps = {
  videoId: string; // must be a pure YouTube ID, not a URL
  className?: string;
  onReady?: (player: YT.Player) => void;
  fallback?: React.ReactNode;
};

export default function LockedYouTube({
  videoId,
  className,
  onReady,
  fallback = (
    <div className="grid h-full w-full place-items-center text-sm font-medium text-white bg-black/30">
      Loading video…
    </div>
  ),
}: LockedYouTubeProps) {
  const containerIdRef = useRef(
    `yt-${videoId}-${Math.random().toString(36).slice(2)}`
  );
  const playerRef = useRef<YT.Player | null>(null);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled) return;

      playerRef.current = new YT.Player(containerIdRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: (e) => {
            try {
              e.target.mute();
              e.target.playVideo();
            } catch {}
            setLoading(false);
            onReady?.(e.target);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
  }, [videoId, onReady]);

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) p.unMute();
    else p.mute();
    setMuted((m) => !m);
  };

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-xl", className)}
    >
      {/* The player mount point (fills the wrapper) */}
      <div className="absolute inset-0 pointer-events-none">
        <div id={containerIdRef.current} className="h-full w-full" />
      </div>

      {/* Loading fallback */}
      {loading && <div className="absolute inset-0 z-10">{fallback}</div>}

      {/* Mute toggle */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-2 right-2 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white"
      >
        {muted ? "Unmute" : "Mute"}
      </button>

      {/* Spacer to maintain aspect ratio */}
      <div className="invisible aspect-video w-full" />
    </div>
  );
}
