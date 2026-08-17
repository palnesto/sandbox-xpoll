import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Users } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  type IndustryEntry,
  type InkDBlogEntry,
  getFirstMarkdownBlock,
  getIndustryLabel,
  formatTimeAgo,
  mapInkDBlogEntries,
  mapIndustryEntries,
  MarkdownBlockPreview,
  MediaPreview,
  ComputedByAssetBadges,
} from "./today.shared";
import {
  CommunityPulseCard,
  SearchArticlesDialog,
  SearchTrigger,
} from "./today.panels";

function useDebouncedValue(value: string, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

function TodayEditionItem({ blog }: { blog: InkDBlogEntry }) {
  const navigate = useNavigate();
  const industry = getIndustryLabel(blog);
  const timeAgo = formatTimeAgo(blog.createdAt);
  const trialsCount = blog.trialSequence?.length ?? 0;
  const descriptionPreview = getFirstMarkdownBlock(blog.description);

  return (
    <button
      type="button"
      onClick={() => navigate(`/inkd/inkd-blog/${blog._id}`)}
      className="w-full rounded-lg border-b border-[#cad5e2] px-1 pb-6 pt-6 text-left transition-colors first:pt-0 hover:bg-[#f8fafc] -mx-1"
    >
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] 2xl:gap-7">
        <div className="w-full overflow-hidden rounded-xl md:h-[180px] md:w-[220px]">
          <MediaPreview blog={blog} />
        </div>

        <div className="min-w-0 space-y-3 2xl:space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {industry ? (
              <span className="inline-flex h-[19px] items-center bg-[#2d68f6] px-2 text-[10px] font-bold uppercase tracking-[0.02em] text-white">
                {industry}
              </span>
            ) : null}
            {timeAgo ? (
              <span className="text-[12px] font-bold text-[#62748e]">{timeAgo}</span>
            ) : null}
          </div>

          <h3 className="max-w-[600px] font-serif text-[24px] font-bold leading-[1.1] text-[#0a0a0a]">
            {blog.title}
          </h3>

          <MarkdownBlockPreview
            content={descriptionPreview}
            className="max-w-[700px] text-[14px] font-medium leading-[1.62] text-[#45556c] line-clamp-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] font-bold text-[#62748e]">
              by {blog.inkdInternalAgentName || "Editorial Board"}
            </p>

            <div className="flex items-center gap-4 text-[12px] font-bold text-[#45556c]">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{blog.lifetimeStats?.seenTotal ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{blog.lifetimeStats?.participationTotal ?? 0}</span>
              </div>
              <div className="text-[#2d68f6]">{trialsCount} trails</div>
            </div>
          </div>

          <ComputedByAssetBadges blog={blog} />
        </div>
      </div>
    </button>
  );
}

function PopularIndustriesPanel({ industries }: { industries: IndustryEntry[] }) {
  return (
    <div className="rounded-[20px] space-y-4 border border-[#e5e7eb] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] p-7 shadow-[0_4px_24px_rgba(10,20,50,0.06)]">
      <h3 className="text-[20px] font-black tracking-[-0.02em] text-[#0a0a0a] 2xl:text-[23px] font-bold font-serif">
        Popular Industries
      </h3>

      {industries.length ? (
        <div className="flex flex-wrap gap-2">
          {industries.map((industry) => (
            <span
              key={industry._id}
              className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-4 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#6a7282] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              title={industry.description?.trim() || industry.name}
            >
              {industry.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[13px] leading-6 text-[#6a7282]">
          No popular industries are configured yet.
        </p>
      )}
    </div>
  );
}

export default function TodaysEdition() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 400);

  const rankedBlogsRoute = `${endpoints.inkd.getAllInkdBlogs}?rankByPopularity=true&page=1&pageSize=7`;
  const searchBlogsRoute = debouncedSearchQuery
    ? `${endpoints.inkd.getAllInkdBlogs}?rankByPopularity=true&page=1&pageSize=20&q=${encodeURIComponent(
        debouncedSearchQuery,
      )}`
    : "";

  const { data: blogsResp, isLoading: blogsLoading } = useApiQuery(
    rankedBlogsRoute,
    { enabled: true } as any,
  );
  const { data: searchBlogsResp, isLoading: searchBlogsLoading } = useApiQuery(
    searchBlogsRoute,
    {
      enabled: !!searchBlogsRoute,
      queryKey: [searchBlogsRoute],
    } as any,
  );
  const { data: topIndustriesResp } = useApiQuery(
    endpoints.inkd.topIndustries,
    { enabled: true } as any,
  );

  const rankedEntries = blogsResp?.data?.data?.entries ?? blogsResp?.data?.entries ?? [];
  const searchEntries =
    searchBlogsResp?.data?.data?.entries ?? searchBlogsResp?.data?.entries ?? [];
  const industryEntries =
    topIndustriesResp?.data?.data?.entries ?? topIndustriesResp?.data?.entries ?? [];

  const blogs = useMemo(
    () => mapInkDBlogEntries(Array.isArray(rankedEntries) ? rankedEntries.slice(1, 7) : []),
    [rankedEntries],
  );
  const searchResults = useMemo(
    () => mapInkDBlogEntries(Array.isArray(searchEntries) ? searchEntries : []),
    [searchEntries],
  );
  const popularIndustries = useMemo(
    () => mapIndustryEntries(Array.isArray(industryEntries) ? industryEntries : []),
    [industryEntries],
  );

  const leftBlogs = useMemo(() => blogs.slice(0, 3), [blogs]);
  const pulseBlogPool = useMemo(() => blogs.slice(3, 6), [blogs]);
  const isSearchModalOpen = searchQuery.trim().length > 0;

  if (blogsLoading && !leftBlogs.length) {
    return (
      <section className="bg-[#f3f4f6] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1410px] animate-pulse">
          <div className="h-10 w-80 rounded bg-[#dbe3f4]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <div className="h-48 rounded bg-[#dde3ef]" />
              <div className="h-48 rounded bg-[#dde3ef]" />
              <div className="h-48 rounded bg-[#dde3ef]" />
            </div>
            <div className="space-y-5">
              <div className="h-14 rounded bg-[#dde3ef]" />
              <div className="h-36 rounded bg-[#dde3ef]" />
              <div className="h-96 rounded bg-[#dde3ef]" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f3f4f6] px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <div className="mx-auto max-w-[1410px]">
        <div className="border-b-2 border-[#0f172b] pb-1">
          <h2 className="font-serif text-[30px] font-bold uppercase tracking-[-0.025em]">
            <span className="text-[#2d68f6]">Today&apos;s</span>{" "}
            <span className="text-black">Edition</span>
          </h2>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-7">
            {leftBlogs.map((blog) => (
              <TodayEditionItem key={blog._id} blog={blog} />
            ))}
          </div>

          <div className="space-y-4">
            <SearchTrigger value={searchQuery} onChange={setSearchQuery} />
            <PopularIndustriesPanel industries={popularIndustries} />
            <CommunityPulseCard blogs={pulseBlogPool} />
          </div>
        </div>
      </div>

      <SearchArticlesDialog
        open={isSearchModalOpen}
        query={searchQuery}
        isLoading={searchBlogsLoading}
        results={searchResults}
        onQueryChange={setSearchQuery}
        onOpenChange={(open) => {
          if (!open) {
            setSearchQuery("");
          }
        }}
      />
    </section>
  );
}
