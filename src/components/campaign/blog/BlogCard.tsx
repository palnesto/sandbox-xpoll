import { Play } from "lucide-react";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { campaignBlogPlainTextExcerpt } from "@/lib/campaign-blog-description";
import {
  CampaignBlogInkDAgentAttribution,
  type GeneratedByInkDAgent,
} from "@/components/campaign/blog/CampaignBlogInkDAgentAttribution";

export type ApiBlogEntry = {
  _id: string;
  belongsToCampaignId: string;
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  title: string;
  description: string;
  publishDate: string | null;
  status: "draft" | "live" | string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  generatedByInkDAgent?: GeneratedByInkDAgent;
};

type Cover =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "youtube"; ytId: string }
  | null;

function pickCover(entry: ApiBlogEntry): Cover {
  const img = entry.uploadedImageLinks?.[0];
  if (img) return { kind: "image", url: String(img) };

  const vid = entry.uploadedVideoLinks?.[0];
  if (vid) return { kind: "video", url: String(vid) };

  const yt = entry.ytVideoLinks?.[0];
  if (yt) return { kind: "youtube", ytId: String(yt) };

  return null;
}

function BlogMediaPlaceholder({ hasVideo }: { hasVideo?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-200">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
        {hasVideo ? <Play className="h-4 w-4" /> : null}
        <span>{hasVideo ? "Video post" : "No cover media"}</span>
      </div>
    </div>
  );
}

function BlogCover({ entry }: { entry: ApiBlogEntry }) {
  const cover = pickCover(entry);

  return (
    <div className="relative w-full overflow-hidden bg-zinc-200 rounded-view rounded-xl">
      <div className="h-[200px] w-full">
        {cover?.kind === "image" ? (
          <img
            src={cover.url}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : cover?.kind === "video" ? (
          <div className="h-full w-full">
            <VideoThumbnail
              videoUrl={cover.url}
              alt="Video thumbnail"
              imgClassName="h-full w-full object-cover"
              objectFit="cover"
              containerClassName="h-full w-full"
            />
          </div>
        ) : cover?.kind === "youtube" ? (
          <img
            src={`https://img.youtube.com/vi/${cover.ytId}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <BlogMediaPlaceholder hasVideo={false} />
        )}
      </div>

      {(cover?.kind === "video" || cover?.kind === "youtube") && (
        <div className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-zinc-900 backdrop-blur">
          <Play className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

export function BlogCard({
  entry,
  onView,
}: {
  entry: ApiBlogEntry;
  onView: (id: string) => void;
}) {
  const teaser = campaignBlogPlainTextExcerpt(entry.description, 200);

  return (
    <button
      type="button"
      onClick={() => onView(entry._id)}
      className="group flex w-full flex-col items-start text-left border shadow-xl p-2 md:p-4 overflow-hidden rounded-xl bg-white"
    >
      <BlogCover entry={entry} />

      <h3 className="mt-4 text-[28px] font-medium tracking-tight text-zinc-900">
        <span className="line-clamp-2">{entry.title || "Untitled"}</span>
      </h3>

      <CampaignBlogInkDAgentAttribution
        agent={entry.generatedByInkDAgent}
        className="mt-3"
      />

      <p className="mt-2 text-[12px] leading-6 text-zinc-500 tracking-wider [overflow-wrap:anywhere]">
        <span className="line-clamp-4 block">{teaser || "No description yet."}</span>
      </p>

      <span className="text-[12px] text-zinc-800 underline underline-offset-4 group-hover:text-zinc-600 pt-4 font-bold">
        View Post
      </span>
    </button>
  );
}
