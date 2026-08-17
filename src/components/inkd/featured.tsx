import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, Eye, Globe } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import highbg from "@/assets/inkd/ink.svg";
import { extractYouTubeId } from "@/types/petition";

type LinkedIndustry = {
  _id: string;
  name: string;
  description?: string;
};

type InkDBlogEntry = {
  _id: string;
  title: string;
  description: string;
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  linkedIndustries: LinkedIndustry[];
  createdAt: string | null;
  inkdInternalAgentName: string;
  trialSequence?: string[];
  lifetimeStats?: {
    seenTotal?: number;
    participationTotal?: number;
  };
};

function markdownToPlain(md: string): string {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/>\s?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstDescriptionLine(text: string): string {
  const source = String(text || "").trim();
  if (!source) return "";

  const firstLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "";

  const plainLine = markdownToPlain(firstLine);
  if (plainLine) return plainLine;

  return markdownToPlain(source).slice(0, 180).trim();
}

function estimateReadMinutes(text: string): number {
  const plain = markdownToPlain(text);
  const words = plain ? plain.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function getMediaSource(entry?: InkDBlogEntry | null) {
  if (entry?.uploadedImageLinks?.[0]) {
    return { kind: "image" as const, src: entry.uploadedImageLinks[0] };
  }

  if (entry?.uploadedVideoLinks?.[0]) {
    return { kind: "video" as const, src: entry.uploadedVideoLinks[0] };
  }

  if (entry?.ytVideoLinks?.[0]) {
    const youtubeId = extractYouTubeId(entry.ytVideoLinks[0]);
    if (youtubeId) {
      return {
        kind: "youtube" as const,
        src: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      };
    }
  }

  return { kind: "fallback" as const, src: highbg };
}

function FeaturedMedia({ entry }: { entry?: InkDBlogEntry | null }) {
  const media = getMediaSource(entry);

  if (media.kind === "video") {
    return (
      <video
        src={media.src}
        className="w-full object-contain"
        muted
        loop
        playsInline
        autoPlay
      />
    );
  }

  return (
    <img
      src={media.src}
      alt={entry?.title ?? ""}
      className={`h-full w-full ${media.kind === "fallback" ? "object-contain" : "object-cover"}`}
      loading="lazy"
    />
  );
}

function formatIndustry(name?: string) {
  if (!name) return "";
  return name.replace(/[-_]+/g, " ").toUpperCase();
}

function FeaturedStory() {
  const navigate = useNavigate();
  const rankedBlogsRoute = `${endpoints.inkd.getAllInkdBlogs}?rankByPopularity=true`;

  const { data, isLoading } = useApiQuery(rankedBlogsRoute, {
    enabled: true,
  } as any);

  const featuredBlog = useMemo<InkDBlogEntry | null>(() => {
    const entries = data?.data?.data?.entries ?? data?.data?.entries ?? [];
    if (!Array.isArray(entries) || !entries.length) return null;

    const first = entries[0];
    return {
      _id: String(first._id ?? ""),
      title: String(first.title ?? ""),
      description: String(first.description ?? ""),
      uploadedImageLinks: Array.isArray(first.uploadedImageLinks)
        ? first.uploadedImageLinks
        : [],
      uploadedVideoLinks: Array.isArray(first.uploadedVideoLinks)
        ? first.uploadedVideoLinks
        : [],
      ytVideoLinks: Array.isArray(first.ytVideoLinks) ? first.ytVideoLinks : [],
      linkedIndustries: Array.isArray(first.linkedIndustries)
        ? first.linkedIndustries
        : [],
      createdAt: first.createdAt ?? null,
      inkdInternalAgentName: String(
        first.inkdInternalAgentName ?? "Unknown Agent",
      ),
      trialSequence: Array.isArray(first.trialSequence)
        ? first.trialSequence
        : [],
      lifetimeStats: first.lifetimeStats ?? undefined,
    };
  }, [data]);

  const readMinutes = estimateReadMinutes(featuredBlog?.description ?? "");
  const oneSentence = getFirstDescriptionLine(featuredBlog?.description ?? "");
  const industryChip = featuredBlog?.linkedIndustries?.[0]?.name
    ? formatIndustry(featuredBlog.linkedIndustries[0].name)
    : "";

  if (isLoading && !featuredBlog) {
    return (
      <section className="bg-[#f3f4f6] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1128px] animate-pulse">
          <div className="h-6 w-40 rounded-full bg-[#dbe3f4]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_465px]">
            <div className="space-y-4">
              <div className="h-6 w-72 rounded bg-[#dde3ef]" />
              <div className="h-28 w-full max-w-[520px] rounded bg-[#dde3ef]" />
              <div className="h-24 w-full max-w-[540px] rounded bg-[#dde3ef]" />
            </div>
            <div className="h-[580px] rounded-[20px] bg-[#dde3ef]" />
          </div>
        </div>
      </section>
    );
  }

  if (!featuredBlog) return null;

  return (
    <section className="bg-[#f3f4f6] px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
      <div className="mx-auto max-w-[1128px]">
        {/* Top rail */}
        <div className="flex items-center gap-3">
          <div className="inline-flex h-[27px] items-center rounded-full bg-[#2d68f6] px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-white">
            Featured Story
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-[#cfd7e6] to-transparent" />
        </div>

        <div className="my-7 grid gap-8 lg:grid-cols-[558px_465px] lg:items-start lg:justify-between">
          {/* Left content */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              {industryChip ? (
                <div className="inline-flex h-[38px] items-center rounded-[8px] border border-[rgba(45,104,246,0.2)] bg-[rgba(45,104,246,0.08)] px-3 text-[11px] font-medium uppercase tracking-[0.11em] text-[#2d68f6]">
                  <Globe className="mr-2 h-3.5 w-3.5" />
                  {industryChip}
                </div>
              ) : null}

              <div className="flex items-center gap-5 text-[11px] text-[#6a7282] pt-2">
                <div className="inline-flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{readMinutes} min read</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{featuredBlog.lifetimeStats?.seenTotal ?? 0} Views</span>
                </div>
              </div>
            </div>

            <h2 className="mt-5 max-w-[550px] font-serif text-3xl font-black leading-[1.1] tracking-[-0.04em] text-[#0a0a0a] sm:text-[50px] lg:text-[56px]">
              {featuredBlog.title}
            </h2>

            <p className="mt-6 max-w-[540px] text-justify font-sans text-[18px] font-medium leading-[1.2] text-[#44546e] sm:text-[19px] lg:text-[20px] lg:leading-[1.7]">
              {oneSentence}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-[#2d68f6] to-[#1d58e6] text-sm font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,0.14)]">
                  {(featuredBlog.inkdInternalAgentName || "IA")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <p className="text-[16px] font-semibold text-[#0a0a0a]">
                  {featuredBlog.inkdInternalAgentName}
                </p>
              </div>

              <div className="h-10 w-px bg-[#e5e7eb]" />

              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#6a7282]">
                  Trending
                </p>
                <p className="text-[14px] font-semibold text-[#15803d]">
                  #1 Today
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/inkd/inkd-blog/${featuredBlog._id}`)}
                className="inline-flex h-[50px] w-full md:w-auto items-center justify-center rounded-[10px] border border-[#314158] bg-white px-12 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#566376] shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
              >
                Read Full Story
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstTrialId = featuredBlog.trialSequence?.[0];
                  if (firstTrialId) {
                    navigate(`/trial/${firstTrialId}`);
                  } else {
                    navigate(`/inkd/inkd-blog/${featuredBlog._id}`);
                  }
                }}
                className="inline-flex h-[50px] w-full md:w-auto items-center justify-center rounded-[10px] bg-[#2d68f6] px-16 text-[12px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
              >
                Enter Trail
              </button>
            </div>
          </div>

          {/* Right media */}
          <div className="relative">
            <div
              className="relative h-[300px] rounded-[20px] shadow-[0_10px_60px_rgba(10,20,50,0.15)] md:h-[400px] lg:h-[600px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(45, 104, 246, 0.27) 0%, #FFFFFF 50%, rgba(45, 104, 246, 0.27) 100%)",
              }}
            >
              <FeaturedMedia entry={featuredBlog} />
            </div>
            <div className="absolute left-[-12px] top-[-14px] rotate-[-4deg] rounded-[16px] bg-[#fbbf24] px-4 py-2 text-[11px] uppercase tracking-[0.05em] text-[#78350f] shadow-[0_10px_15px_rgba(0,0,0,0.12)]">
              Editor&apos;s Pick
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedStory;
