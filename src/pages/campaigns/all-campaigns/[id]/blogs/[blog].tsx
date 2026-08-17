import { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Play, Link, Send, CopyCheck } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { RichTextPreview } from "@/components/commons/editor/preview";
import BackButton from "@/components/commons/back-button";
import { CampaignBlogDescriptionPreview } from "@/components/campaign/blog/CampaignBlogDescriptionPreview";
import {
  CampaignBlogInkDAgentAttribution,
  type GeneratedByInkDAgent,
} from "@/components/campaign/blog/CampaignBlogInkDAgentAttribution";

function safeOpen(url?: string | null) {
  const u = String(url ?? "").trim();
  if (!u) return;
  if (u.toLowerCase().startsWith("mailto:")) {
    window.location.assign(u);
    return;
  }
  window.open(u, "_blank", "noreferrer");
}

function formatShortDate(dateLike?: string | null) {
  const d = dateLike ? new Date(dateLike) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function hostLabel(u: string) {
  try {
    const url = new URL(u);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

function getYouTubeId(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  if (/^[a-zA-Z0-9_-]{6,15}$/.test(s) && !s.includes("http")) return s;

  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
  } catch {
    const m =
      s.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1] ??
      s.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ??
      s.match(/\/embed\/([a-zA-Z0-9_-]+)/)?.[1] ??
      null;
    return m;
  }

  return null;
}

function getYouTubeThumb(id: string) {
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

type ResourceAsset = { type: "image" | "video" | string; value: string };

type LinkedTrial = {
  _id: string;
  title: string;
  description?: string | null;
  resourceAssets?: ResourceAsset[];
  archivedAt?: string | null;
  createdAt?: string;
  canPreview?: boolean;
};

type ApiBlogEntry = {
  _id: string;
  belongsToCampaignId: string;
  externalAuthor: string | null;
  internalAuthor: string | null;
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  title: string;
  description: string;
  externalLinks: string[];
  publishDate: string | null;
  status: "draft" | "live" | string;
  linkedTrials: LinkedTrial[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  generatedByInkDAgent?: GeneratedByInkDAgent;
};

function pickHeroImage(entry: ApiBlogEntry | null) {
  if (!entry) return null;

  const direct = entry.uploadedImageLinks?.[0] ?? null;
  if (direct) return direct;

  const trialImg =
    entry.linkedTrials
      ?.flatMap((t) => t.resourceAssets ?? [])
      .find((a) => a.type === "image")?.value ?? null;

  return trialImg;
}

type HeroKind = "image" | "video" | "youtube" | "none";

function getHeroKind(entry: ApiBlogEntry | null): HeroKind {
  if (!entry) return "none";
  if (entry.uploadedImageLinks?.[0]) return "image";
  if (entry.uploadedVideoLinks?.[0]) return "video";
  if (entry.ytVideoLinks?.[0]) return "youtube";
  return "none";
}

function BlogHeroMedia({
  kind,
  coverImage,
  videoUrl,
  ytId,
  onShare,
  copied,
}: {
  kind: HeroKind;
  coverImage: string | null;
  videoUrl: string | null;
  ytId: string | null;
  onShare: () => void;
  copied: boolean;
}) {
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-zinc-200">
      <button
        type="button"
        onClick={onShare}
        className="absolute right-2 top-2 z-20 inline-flex items-center md:gap-2 rounded-full bg-black/25 border-t border-b px-2 py-1 md:px-7 md:py-3 font-semibold text-xs md:text-base text-white shadow-sm backdrop-blur hover:bg-neutral-600"
        aria-label="Share blog"
        title="Copy link"
      >
        {copied ? (
          <CopyCheck className="h-3 md:h-5 md:w-5" />
        ) : (
          <Send className="h-3 md:h-5 md:w-5" />
        )}
        {copied ? "Copied" : "Share"}
      </button>

      <div className="relative w-full pb-[38%] h-40">
        {kind === "image" ? (
          coverImage ? (
            <img
              src={coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-zinc-700">
              No cover image
            </div>
          )
        ) : null}

        {kind === "video" ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={videoUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        ) : null}

        {kind === "youtube" ? (
          <>
            {!isYouTubePlaying ? (
              <>
                <img
                  src={ytId ? getYouTubeThumb(ytId) : undefined}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => setIsYouTubePlaying(true)}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label="Play YouTube video"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-zinc-900 backdrop-blur hover:bg-white/80">
                    <Play className="h-4 w-4" />
                    Play
                  </span>
                </button>
              </>
            ) : (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={
                  ytId
                    ? `https://www.youtube.com/embed/${encodeURIComponent(
                        ytId,
                      )}?autoplay=1&rel=0`
                    : undefined
                }
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </>
        ) : null}

        {/* ✅ NONE */}
        {kind === "none" ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-zinc-700">
            No cover
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LinkedTrialsBlock({
  trials,
  onOpenTrial,
}: {
  trials: LinkedTrial[];
  onOpenTrial: (trialId: string) => void;
}) {
  const list = Array.isArray(trials) ? trials.filter((t) => t.canPreview) : [];
  if (!list.length) return null;

  return (
    <div className="mt-12 border-t border-zinc-200 pt-8">
      <div className="text-sm font-semibold text-zinc-900">Linked Trails</div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list?.map((t) => {
          const thumb =
            (t.resourceAssets ?? []).find((a) => a.type === "image")?.value ??
            null;

          return (
            <button
              key={t._id}
              type="button"
              onClick={() => onOpenTrial(t._id)}
              className="group flex flex-col w-full gap-4 rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300"
            >
              <div className="h-32 w-full flex-shrink-0 overflow-hidden rounded-md bg-zinc-100">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-500">
                    Trial
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="line-clamp-1 text-sm font-medium text-zinc-900 group-hover:underline">
                  {t.title || "Untitled trial"}
                </div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">
                  <RichTextPreview content={t.description || ""} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CampaignBlogPage() {
  const navigate = useNavigate();
  const { id: routeId, blog: blogIdParam } = useParams();
  const campaignId = routeId ?? "";
  const blogId = blogIdParam ?? "";

  const blogRoute =
    endpoints?.campaigns?.getBlogById?.(blogId) ??
    `/external/campaign-blog/${encodeURIComponent(blogId)}?enforceUserView=true`;

  const {
    data: blogResp,
    isLoading,
    isError,
  } = useApiQuery(blogRoute, {
    enabled: Boolean(blogId),
  } as any);

  const entry: ApiBlogEntry | null = useMemo(() => {
    const root = blogResp?.data?.data ?? null;
    if (!root || typeof root !== "object") return null;
    return root as ApiBlogEntry;
  }, [blogResp]);

  const heroKind = useMemo(() => getHeroKind(entry), [entry]);
  const coverImage = useMemo(() => pickHeroImage(entry), [entry]);

  const uploadedVideoUrl = entry?.uploadedVideoLinks?.[0] ?? null;
  const ytRaw = entry?.ytVideoLinks?.[0] ?? null;
  const ytId = useMemo(() => getYouTubeId(ytRaw), [ytRaw]);

  const dateLabel = entry?.publishDate
    ? formatShortDate(entry.publishDate)
    : formatShortDate(entry?.createdAt ?? null);

  const onOpenTrial = (trialId: string) => {
    navigate(`/trial/${encodeURIComponent(trialId)}`);
  };

  // ✅ Share URL + copy
  const shareUrl = useMemo(() => {
    const base = String(import.meta.env.VITE_CLIENT_URL || "").replace(
      /\/+$/,
      "",
    );
    if (!base || !campaignId || !blogId) return "";
    return `${base}/campaigns/all-campaigns/${encodeURIComponent(
      campaignId,
    )}/blogs/${encodeURIComponent(blogId)}`;
  }, [campaignId, blogId]);

  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  }, [shareUrl]);

  return (
    <main className="flex h-full max-h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3 px-4 md:px-7 xl:px-12 py-4 max-w-4xl mx-auto">
          <BackButton
            to={`/campaigns/all-campaigns/${encodeURIComponent(campaignId)}`}
          />
          <div className="text-[17px] font-semibold text-zinc-900">
            Campaigns : Blogs
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-7 md:py-12">
        {isLoading ? (
          <div className="text-sm text-zinc-500">Loading blog...</div>
        ) : null}

        {!isLoading && isError ? (
          <div className="text-sm text-zinc-500">Failed to load blog.</div>
        ) : null}

        {!isLoading && !isError && !entry ? (
          <div className="text-sm text-zinc-500">Blog not found.</div>
        ) : null}

        {!isLoading && !isError && entry ? (
          <div className="mx-auto w-full max-w-[800px] space-y-7">
            {heroKind !== "none" && (
              <BlogHeroMedia
                kind={heroKind}
                coverImage={coverImage}
                videoUrl={uploadedVideoUrl}
                ytId={ytId}
                onShare={handleShare}
                copied={copied}
              />
            )}

            <div className="flex items-start gap-4">
              <section className="min-w-0">
                <h1 className="text-[34px] font-medium tracking-tight text-zinc-900">
                  {entry.title || "Untitled"}
                </h1>

                <CampaignBlogInkDAgentAttribution
                  agent={entry.generatedByInkDAgent}
                  className="mt-4"
                />

                <div className="text-[12px] lg:text-base text-zinc-600 mt-4">
                  <CampaignBlogDescriptionPreview
                    content={entry.description || ""}
                    className="text-zinc-700"
                  />
                </div>
              </section>
            </div>

            <LinkedTrialsBlock
              trials={entry.linkedTrials || []}
              onOpenTrial={onOpenTrial}
            />

            {/* Sources */}
            {entry.externalLinks?.length ? (
              <div className="mt-10 max-w-[860px]">
                <div className="font-semibold text-zinc-900">Sources</div>
                <div className="mt-3 flex flex-col gap-2">
                  {entry.externalLinks.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => safeOpen(u)}
                      className="inline-flex items-center gap-2 text-left text-[15px] text-zinc-700 hover:text-zinc-900"
                    >
                      <Link className="h-4 w-4 text-zinc-700" />
                      <span className="underline underline-offset-4">
                        {hostLabel(u)}
                      </span>
                    </button>
                  ))}
                </div>

                {dateLabel ? (
                  <div className="mt-8 text-[11px] text-zinc-400">
                    Published {dateLabel}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
