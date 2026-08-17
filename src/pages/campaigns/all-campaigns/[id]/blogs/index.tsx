import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import BackButton from "@/components/commons/back-button";
import { BlogCard, type ApiBlogEntry } from "@/components/campaign/blog/BlogCard";

export default function CampaignBlogsPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const campaignId = routeId ?? "";

  const blogsRoute = `${endpoints.campaigns.blogsAdvancedListing}?enforceUserView=true&belongsToCampaignId=${encodeURIComponent(
    campaignId,
  )}&page=1&pageSize=50`;

  const {
    data: blogsResp,
    isLoading,
    isError,
  } = useApiQuery(blogsRoute, {
    enabled: Boolean(campaignId),
  } as any);

  const entries: ApiBlogEntry[] = useMemo(() => {
    const root = blogsResp?.data?.data ?? blogsResp?.data ?? {};
    const list = root?.entries ?? [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e: any) => e && String(e.belongsToCampaignId) === String(campaignId),
    );
  }, [blogsResp, campaignId]);

  const handleViewPost = (blogId: string) => {
    navigate(
      `/campaigns/all-campaigns/${encodeURIComponent(
        campaignId,
      )}/blogs/${encodeURIComponent(blogId)}`,
    );
  };

  return (
    <main className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <BackButton
            to={`/campaigns/all-campaigns/${encodeURIComponent(campaignId)}`}
          />
          <div className="text-[17px] font-semibold text-zinc-900">
            Campaigns : Blogs
          </div>
        </div>
      </header>

      <div className="px-6 pb-12">
        {isLoading ? (
          <div className="mt-6 text-sm text-zinc-500">Loading blogs...</div>
        ) : null}

        {!isLoading && isError ? (
          <div className="mt-6 text-sm text-zinc-500">
            Failed to load blogs.
          </div>
        ) : null}

        {!isLoading && !isError && entries.length === 0 ? (
          <div className="mx-auto mt-16 max-w-[900px] rounded-xl border border-zinc-200 bg-white p-10">
            <div className="text-2xl font-semibold text-zinc-900">
              No blogs available
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              This campaign doesn’t have any blog posts yet. Check back later or
              go back to the campaign page.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/campaigns/all-campaigns/${encodeURIComponent(campaignId)}`,
                )
              }
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Campaign
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && entries.length > 0 ? (
          <div className="mt-8">
            <div className="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-2 2xl:grid-cols-3">
              {entries?.map((entry) => (
                <BlogCard
                  key={entry._id}
                  entry={entry}
                  onView={handleViewPost}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
