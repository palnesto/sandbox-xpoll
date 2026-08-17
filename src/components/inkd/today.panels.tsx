import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Eye,
  Flame,
  Search,
  Split,
  TrendingUp,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  type InkDBlogEntry,
  getFirstMarkdownBlock,
  getIndustryLabel,
  getPulseLabel,
  formatTimeAgo,
  markdownToPlain,
  MarkdownBlockPreview,
  MediaPreview,
} from "./today.shared";

export function SearchTrigger({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 20))}
        placeholder="Search articles..."
        className="h-[58px] w-full rounded-[14px] border-2 border-[#e5e7eb] bg-white pr-[56px] pl-4 text-[15px] font-bold text-[#364153] shadow-[0_1px_3px_rgba(0,0,0,0.1)] outline-none placeholder:text-[#99a1af]"
      />
      <div className="absolute right-[9px] top-[9px] flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#2d68f6] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        <Search className="h-5 w-5" />
      </div>
    </div>
  );
}

export function SearchResultCard({
  blog,
  onClick,
}: {
  blog: InkDBlogEntry;
  onClick: () => void;
}) {
  const industry = getIndustryLabel(blog);
  const timeAgo = formatTimeAgo(blog.createdAt);
  const trialsCount = blog.trialSequence?.length ?? 0;
  const descriptionPreview = getFirstMarkdownBlock(blog.description);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[16px] border border-[#d9e0eb] bg-white p-4 text-left shadow-[0_10px_28px_rgba(10,20,50,0.06)] transition hover:bg-[#f8fafc]"
    >
      <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
        <div className="h-[140px] overflow-hidden rounded-[12px] sm:h-[120px]">
          <MediaPreview blog={blog} />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {industry ? (
              <span className="inline-flex items-center rounded-full bg-[#2d68f6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.02em] text-white">
                {industry}
              </span>
            ) : null}
            {timeAgo ? (
              <span className="text-[12px] font-bold text-[#62748e]">{timeAgo}</span>
            ) : null}
          </div>

          <h4 className="line-clamp-2 font-serif text-[20px] font-bold leading-[1.1] text-[#0a0a0a]">
            {blog.title}
          </h4>

          <MarkdownBlockPreview
            content={descriptionPreview}
            className="text-[13px] font-medium leading-[1.6] text-[#45556c] line-clamp-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] font-bold text-[#45556c]">
            <p className="text-[#62748e]">by {blog.inkdInternalAgentName || "Editorial Board"}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{blog.lifetimeStats?.seenTotal ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{blog.lifetimeStats?.participationTotal ?? 0}</span>
              </div>
              <span className="text-[#2d68f6]">{trialsCount} trails</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export function CommunityPulseCard({ blogs }: { blogs: InkDBlogEntry[] }) {
  const navigate = useNavigate();
  const pulseBlogs = useMemo(() => blogs.slice(0, 3), [blogs]);
  const pulseSlots = useMemo(
    () => [
      { key: "slot-1", Icon: Flame, labelClass: "text-[#f54900]" },
      { key: "slot-2", Icon: TrendingUp, labelClass: "text-[#2d68f6]" },
      { key: "slot-3", Icon: Split, labelClass: "text-[#9810fa]" },
    ],
    [],
  );

  return (
    <div
      className="w-full rounded-[18px] border border-[#2D68F633] p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(45, 104, 246, 0.27) 0%, #FFFFFF 50%, rgba(45, 104, 246, 0.27) 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#5f6fff]" />
          <h3 className="font-serif text-[18px] italic text-[#1d2435]">Popular</h3>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {pulseSlots.map((slot, idx) => {
          const blog = pulseBlogs[idx] ?? null;
          const title = blog?.title ? markdownToPlain(blog.title) : "";
          const trialsCount = blog?.trialSequence?.length ?? 0;
          const industryLabel = getPulseLabel(blog);

          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => blog?._id && navigate(`/inkd/inkd-blog/${blog._id}`)}
              className="w-full rounded-[10px] border border-[#e7ebf4] bg-white p-4 text-left transition hover:bg-[#f8fafc]"
            >
              {industryLabel ? (
                <div className="flex items-center gap-1.5">
                  <slot.Icon className={`h-3.5 w-3.5 ${slot.labelClass}`} />
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.1em] ${slot.labelClass}`}
                  >
                    {industryLabel}
                  </span>
                </div>
              ) : null}

              <p
                className={`font-serif text-[12px] font-bold text-[#1e2939] lg:text-[14px] ${
                  industryLabel ? "mt-2" : ""
                }`}
              >
                {title || "—"}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-[#f3f4f6] pt-2">
                <div className="flex items-center gap-4 text-[#6a7282]">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span className="font-mono text-[9px]">{blog?.lifetimeStats?.seenTotal ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="font-mono text-[9px]">
                      {blog?.lifetimeStats?.participationTotal ?? 0}
                    </span>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-[#2d68f6]">{trialsCount} trails</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchArticlesDialog({
  open,
  query,
  isLoading,
  results,
  onOpenChange,
  onQueryChange,
}: {
  open: boolean;
  query: string;
  isLoading: boolean;
  results: InkDBlogEntry[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (value: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] max-w-[900px] overflow-hidden rounded-[24px] p-0">
        <DialogHeader className="border-b border-[#e8edf5] px-6 py-5">
          <DialogTitle className="font-serif text-[26px] font-bold text-[#0a0a0a]">
            Search Articles
          </DialogTitle>
          <div className="mt-4">
            <SearchTrigger value={query} onChange={onQueryChange} />
            <p className="mt-2 text-[11px] text-[#7a8498]">{query.length}/20 characters</p>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto bg-[#f7f9fc] px-6 py-5">
          {isLoading && query.trim() ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[180px] animate-pulse rounded-[16px] bg-[#e2e8f3]"
                />
              ))}
            </div>
          ) : results.length ? (
            <div className="space-y-4">
              {results.map((blog) => (
                <SearchResultCard
                  key={blog._id}
                  blog={blog}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/inkd/inkd-blog/${blog._id}`);
                  }}
                />
              ))}
            </div>
          ) : query.trim() ? (
            <div className="rounded-[16px] border border-[#dde4ef] bg-white px-5 py-8 text-center text-[14px] text-[#6a7282]">
              No articles found for "{query}".
            </div>
          ) : (
            <div className="rounded-[16px] border border-[#dde4ef] bg-white px-5 py-8 text-center text-[14px] text-[#6a7282]">
              Start typing to search InkD articles.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
