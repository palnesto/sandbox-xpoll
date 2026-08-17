import fallbackImage from "@/assets/inkd/eight.webp";
import { extractYouTubeId } from "@/types/petition";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import ReactMarkdown from "react-markdown";

export type LinkedIndustry = {
  _id: string;
  name: string;
  description?: string | null;
};

export type ComputedByAssetItem = {
  assetId: string;
  total: string;
};

export type RewardSums = {
  activeTrials?: {
    computedByAsset?: ComputedByAssetItem[];
  };
};

export type InkDBlogEntry = {
  _id: string;
  title: string;
  description: string;
  uploadedImageLinks?: string[];
  uploadedVideoLinks?: string[];
  ytVideoLinks?: string[];
  trialSequence?: string[];
  inkdInternalAgentName?: string;
  linkedIndustries?: LinkedIndustry[];
  createdAt?: string | null;
  rewardSums?: RewardSums;
  lifetimeStats?: {
    seenTotal?: number;
    participationTotal?: number;
  };
};

export type IndustryEntry = {
  _id: string;
  name: string;
  description?: string | null;
};

export function markdownToPlain(md: string) {
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

export function getFirstMarkdownBlock(text: string) {
  const source = String(text || "").trim();
  if (!source) return "";

  const parts = source
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[0] || "";
}

export function getMediaSource(blog?: InkDBlogEntry | null) {
  if (blog?.uploadedImageLinks?.[0]) {
    return { kind: "image" as const, src: blog.uploadedImageLinks[0] };
  }

  if (blog?.uploadedVideoLinks?.[0]) {
    return { kind: "video" as const, src: blog.uploadedVideoLinks[0] };
  }

  if (blog?.ytVideoLinks?.[0]) {
    const youtubeId = extractYouTubeId(blog.ytVideoLinks[0]);
    if (youtubeId) {
      return {
        kind: "youtube" as const,
        src: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      };
    }
  }

  return { kind: "fallback" as const, src: fallbackImage };
}

export function MediaPreview({ blog }: { blog?: InkDBlogEntry | null }) {
  const media = getMediaSource(blog);

  if (media.kind === "video") {
    return (
      <video
        src={media.src}
        className="h-full w-full object-cover"
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
      alt={blog?.title ?? ""}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );
}

export function MarkdownBlockPreview({
  content,
  className,
}: {
  content: string;
  className: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export function getIndustryLabel(blog?: InkDBlogEntry | null) {
  const name = blog?.linkedIndustries?.[0]?.name;
  if (!name) return null;
  return String(name).replace(/[-_]+/g, " ").toUpperCase();
}

export function getPulseLabel(blog?: InkDBlogEntry | null) {
  return getIndustryLabel(blog);
}

export function formatTimeAgo(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} m ago`;
  if (diffHours < 24) return `${diffHours} h ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function formatComputedToParent(item: ComputedByAssetItem): string | null {
  const spec = assetSpecs[item.assetId as AssetType];
  if (!spec) return null;

  const parentStr = unwrapString(
    amount({
      op: "toParent",
      assetId: item.assetId as AssetType,
      value: item.total ?? "0",
      output: "string",
      trim: true,
      group: false,
    }),
  );

  return `${parentStr} ${spec.parentSymbol}`;
}

export function ComputedByAssetBadges({ blog }: { blog: InkDBlogEntry }) {
  const items = blog?.rewardSums?.activeTrials?.computedByAsset ?? [];
  if (!items.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item, index) => {
        const label = formatComputedToParent(item);
        const spec = assetSpecs[item.assetId as AssetType];
        if (!label || !spec) return null;

        return (
          <div
            key={`${item.assetId}-${index}`}
            className="inline-flex h-[24px] items-center gap-1.5 rounded-[8px] border border-[#dbe2ee] bg-[#eef2f8] px-2.5 text-[10px] font-semibold text-[#23314f]"
          >
            <img src={spec.img} alt="" className="h-3.5 w-3.5" />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function mapInkDBlogEntries(entries: any[]): InkDBlogEntry[] {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry: any) => ({
    _id: String(entry._id ?? ""),
    title: String(entry.title ?? ""),
    description: String(entry.description ?? ""),
    uploadedImageLinks: Array.isArray(entry.uploadedImageLinks) ? entry.uploadedImageLinks : [],
    uploadedVideoLinks: Array.isArray(entry.uploadedVideoLinks) ? entry.uploadedVideoLinks : [],
    ytVideoLinks: Array.isArray(entry.ytVideoLinks) ? entry.ytVideoLinks : [],
    trialSequence: Array.isArray(entry.trialSequence) ? entry.trialSequence : [],
    inkdInternalAgentName: String(entry.inkdInternalAgentName ?? ""),
    linkedIndustries: Array.isArray(entry.linkedIndustries) ? entry.linkedIndustries : [],
    createdAt: entry.createdAt ?? null,
    rewardSums: entry.rewardSums ?? undefined,
    lifetimeStats: entry.lifetimeStats ?? undefined,
  }));
}

export function mapIndustryEntries(entries: any[]): IndustryEntry[] {
  if (!Array.isArray(entries)) return [];

  return entries.map((item: any) => ({
    _id: String(item._id ?? ""),
    name: String(item.name ?? ""),
    description: item.description ?? null,
  }));
}
