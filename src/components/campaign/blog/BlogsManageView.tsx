import { useMemo } from "react";
import { useApiInfinitePagedQuery } from "@/hooks/useApiInfinitePagedQuery";
import { endpoints } from "@/api/endpoints";
import {
  Pencil,
  Trash2,
  UploadCloud,
  ArrowDownToLine,
  EllipsisVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateText } from "@/utils/truncateWords";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import {
  CampaignBlogInkDAgentAttribution,
  type GeneratedByInkDAgent,
} from "@/components/campaign/blog/CampaignBlogInkDAgentAttribution";

type BlogStatus = "draft" | "live" | "deleted";

type BlogRow = {
  _id: string;
  belongsToCampaignId: string;
  title: string;
  description: string;
  status: BlogStatus;
  archivedAt?: string | null;
  publishDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  uploadedImageLinks?: string[];
  uploadedVideoLinks?: string[];
  ytVideoLinks?: string[];
  generatedByInkDAgent?: GeneratedByInkDAgent;
};

function isDeletedBlog(b: BlogRow) {
  return !!b.archivedAt || b.status === "deleted";
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pickCover(b: BlogRow) {
  if (b.uploadedVideoLinks?.[0])
    return { kind: "video" as const, url: b.uploadedVideoLinks[0] };
  if (b.uploadedImageLinks?.[0])
    return { kind: "image" as const, url: b.uploadedImageLinks[0] };
  if (b.ytVideoLinks?.[0])
    return { kind: "youtube" as const, ytId: b.ytVideoLinks[0] };
  return null;
}

function BlogStatusPill({ status }: { status: BlogStatus }) {
  return status === "live" ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
      Live
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
      In draft
    </span>
  );
}

export function BlogsManageView({
  campaignId,
  onCreate,
  onOpen,
}: {
  campaignId: string;
  onCreate: () => void;
  onOpen: (blogId: string) => void;
}) {
  const {
    items: blogs,
    isLoading,
    isError,
    refetch,
  } = useApiInfinitePagedQuery<BlogRow, { belongsToCampaignId: string }>({
    route: endpoints.campaigns.blogsAdvancedListing,
    filters: { belongsToCampaignId: campaignId },
    pageSize: 12,
  });

  const entries = useMemo(() => {
    return blogs
      .map((b) => ({ ...b, _id: String(b._id) }))
      .filter((b) => !isDeletedBlog(b));
  }, [blogs]);

  /**
   * Mutations
   */
  const invalidateBlogQueries = (blogId: string) => {
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.blogsAdvancedListing],
    });
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.getBlogById(blogId)],
    });
  };

  const { mutateAsync: makeBlogLive, isPending: makeLivePending } = useApiMutation<
    { campaignBlogId: string },
    unknown
  >({
    route: endpoints.campaigns.makeBlogLive,
    method: "PATCH",
    onSuccess: async () => {
      refetch();
    },
  });

  const { mutateAsync: makeBlogDraft, isPending: makeDraftPending } = useApiMutation<
    { campaignBlogId: string },
    unknown
  >({
    route: endpoints.campaigns.setAsDraft,
    method: "PATCH",
    onSuccess: async () => {
      refetch();
    },
  });

  const deleteBlogMut = useApiMutation<{ campaignBlogId: string }, any>({
    route: endpoints.campaigns.deleteBlog,
    method: "DELETE",
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.blogsAdvancedListing],
      });
      refetch();
    },
  });

  const busy =
    makeLivePending || makeDraftPending || deleteBlogMut.isPending;

  const handleMakeBlogLive = async (blogId: string) => {
    try {
      await makeBlogLive({ campaignBlogId: blogId });
      invalidateBlogQueries(blogId);
    } catch {}
  };

  const handleMakeBlogDraft = async (blogId: string) => {
    try {
      await makeBlogDraft({ campaignBlogId: blogId });
      invalidateBlogQueries(blogId);
    } catch {}
  };

  return (
    <div className="p-4 min-h-screen">
      <div className="rounded-2xl bg-[#F5F5F5] border border-black/5 p-5">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Manage Blogs</h1>
          <button
            onClick={onCreate}
            className="rounded-full bg-[#E4F2DF] px-5 py-2.5 text-sm font-semibold text-[#315326]"
          >
            + Add a blog
          </button>
        </header>

        {isLoading && (
          <div className="mt-6 text-sm text-black/60">Loading blogs…</div>
        )}
        {isError && (
          <div className="mt-6 text-sm text-red-600">Failed to load blogs</div>
        )}

        {!isLoading && !isError && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            {entries.length === 0 && (
              <div className="col-span-3 rounded-xl bg-white p-6 text-sm text-black/60">
                No blogs yet.
              </div>
            )}

            {entries.map((b) => {
              const cover = pickCover(b);
              const date = fmtDate(b.publishDate || b.createdAt || b.updatedAt);

              return (
                <button
                  key={b._id}
                  onClick={() => onOpen(b._id)}
                  className="text-left rounded-2xl bg-white border border-black/10 hover:border-black/20 transition overflow-hidden"
                >
                  <section className="flex p-3 gap-3">
                    <figure className="w-[150px] h-[100px] bg-[#EDEDED] rounded-xl overflow-hidden shrink-0">
                      {cover?.kind === "image" && (
                        <img
                          src={cover.url}
                          className="h-full w-full object-cover"
                        />
                      )}
                      {cover?.kind === "video" && (
                        <video
                          src={cover.url}
                          className="h-full w-full object-cover"
                          muted
                        />
                      )}
                      {cover?.kind === "youtube" && (
                        <img
                          src={`https://img.youtube.com/vi/${cover.ytId}/hqdefault.jpg`}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </figure>

                    <div className="flex-1">
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="text-xs text-black/50">{date}</div>
                          <div className="font-semibold line-clamp-2">
                            {truncateText(b.title, 10)}
                          </div>
                          <CampaignBlogInkDAgentAttribution
                            agent={b.generatedByInkDAgent}
                            className="mt-2"
                          />
                          <div className="mt-2">
                            <BlogStatusPill status={b.status} />
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl hover:bg-black/5"
                            >
                              <EllipsisVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            {b.status === "draft" ? (
                              <>
                                <DropdownMenuItem
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpen(b._id);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleMakeBlogLive(b._id);
                                  }}
                                >
                                  <UploadCloud className="mr-2 h-4 w-4" /> Make
                                  live
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleMakeBlogDraft(b._id);
                                }}
                              >
                                <ArrowDownToLine className="mr-2 h-4 w-4" />{" "}
                                Make draft to edit
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              disabled={busy}
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBlogMut.mutate({
                                  campaignBlogId: b._id,
                                });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </section>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
