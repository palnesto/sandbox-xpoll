import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import apiInstance, { queryClient } from "@/api/queryClient";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { canCreateBlogByCampaignStatus } from "@/utils/campaign-status";
import {
  Pencil,
  Trash2,
  UploadCloud,
  ArrowDownToLine,
  EllipsisVertical,
  SendHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCampaignBlogSocialPublishDisabledReason,
  getPublishableCampaignSocialPlatforms,
} from "@/lib/campaign/social";
import { CampaignBlogSocialPublishConfirmModal } from "@/components/campaign/blog/CampaignBlogSocialPublishConfirmModal";
import { CampaignSocialPublishRateLimitTooltip } from "@/components/campaign/social/campaign-social-publish-rate-limit-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { truncateText } from "@/utils/truncateWords";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { normalizeCampaignBlockedStateFromResponse } from "@/lib/campaign";
import { CampaignBlogInkDAgentAttribution, type GeneratedByInkDAgent } from "@/components/campaign/blog/CampaignBlogInkDAgentAttribution";
import {
  pickDataRoot,
  type ApiCampaignBlogSocialPublicationRateLimitListResult,
  type ApiCampaignSocialStatus,
} from "@/types/campaigns";

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

const BLOGS_PAGE_SIZE = 10;
const NEWLY_GENERATED_WINDOW_MS = 5 * 60 * 1000;
const NEWLY_GENERATED_TICK_MS = 30 * 1000;

function isDeletedBlog(b: BlogRow) {
  return !!b.archivedAt || b.status === "deleted";
}

function isRecentlyGeneratedBlog(b: BlogRow, nowMs: number) {
  if (!b.generatedByInkDAgent) return false;

  const createdAtMs = new Date(String(b.createdAt ?? "")).getTime();
  if (!Number.isFinite(createdAtMs)) return false;

  const ageMs = nowMs - createdAtMs;
  return ageMs >= 0 && ageMs <= NEWLY_GENERATED_WINDOW_MS;
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

export default function BlogManagePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");
  const [page, setPage] = useState(1);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const {
    campaignName,
    campaignData,
    permissions,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignLoading,
  } = useCampaignByOwner(campaignId);
  const campaignStatus = String(campaignData?.status ?? "").toLowerCase();
  const allowBlogCreateByStatus = canCreateBlogByCampaignStatus(campaignStatus);
  const blogPerms = permissions.campaignBlog;
  const socialRoute = campaignId
    ? endpoints.campaigns.getCampaignSocial(campaignId)
    : "";

  const { data: socialResp, isLoading: socialLoading, isError: socialError } =
    useApiQuery(socialRoute, {
      enabled: !!campaignId,
      retry: false,
      queryKey: [socialRoute],
    });

  const blogRoute = useMemo(() => {
    if (!campaignId) return "";
    const query = new URLSearchParams({
      belongsToCampaignId: campaignId,
      page: String(page),
      pageSize: String(BLOGS_PAGE_SIZE),
    });
    return `${endpoints.campaigns.blogsAdvancedListing}?${query.toString()}`;
  }, [campaignId, page]);

  const {
    data: blogsResp,
    isLoading,
    isError,
    refetch,
  } = useApiQuery(blogRoute, {
    enabled: !!campaignId && !isCampaignLoading && !isPaymentRequired,
    queryKey: [blogRoute],
  });
  const blogBlockedState = useMemo(
    () =>
      normalizeCampaignBlockedStateFromResponse(
        blogsResp?.data?.data ?? blogsResp?.data,
      ),
    [blogsResp],
  );
  const socialStatus = useMemo(
    () => pickDataRoot<ApiCampaignSocialStatus>(socialResp),
    [socialResp],
  );
  const blogRateLimitRouteBase = campaignId
    ? endpoints.campaigns.getCampaignBlogSocialPublicationRateLimitsBase(
        campaignId,
      )
    : "";
  const publishablePlatforms = useMemo(
    () => getPublishableCampaignSocialPlatforms(socialStatus),
    [socialStatus],
  );
  const [publishBlog, setPublishBlog] = useState<BlogRow | null>(null);
  const showPaymentRequired =
    isPaymentRequired || blogBlockedState?.kind === "payment_required";

  const { entries, totalPages, total, currentPage } = useMemo(() => {
    const root = blogsResp?.data?.data ?? blogsResp?.data ?? {};
    const rawEntries = Array.isArray(root.entries) ? root.entries : [];
    const filteredEntries = rawEntries
      .map((b: BlogRow) => ({ ...b, _id: String(b._id) }))
      .filter((b: BlogRow) => !isDeletedBlog(b));

    const meta = root.meta ?? {};
    const resolvedTotal =
      typeof meta.total === "number" ? meta.total : filteredEntries.length;
    const resolvedPageSize =
      typeof meta.pageSize === "number" ? meta.pageSize : BLOGS_PAGE_SIZE;
    const resolvedTotalPages =
      typeof meta.totalPages === "number"
        ? meta.totalPages
        : resolvedTotal > 0
          ? Math.ceil(resolvedTotal / resolvedPageSize)
          : 0;
    const resolvedPage =
      typeof meta.page === "number" ? meta.page : page;

    return {
      entries: filteredEntries,
      totalPages: resolvedTotalPages,
      total: resolvedTotal,
      currentPage: resolvedPage,
    };
  }, [blogsResp, page]);
  const pageBlogIds = useMemo(() => entries.map((entry) => entry._id), [entries]);
  const blogRateLimitIdsKey = useMemo(
    () => pageBlogIds.join(","),
    [pageBlogIds],
  );
  const { data: blogRateLimitResp } = useQuery({
    queryKey: [blogRateLimitRouteBase, blogRateLimitIdsKey],
    enabled: !!campaignId && pageBlogIds.length > 0,
    retry: false,
    queryFn: async () => {
      const response = await apiInstance.post(blogRateLimitRouteBase, {
        blogIds: pageBlogIds,
      });
      return response.data;
    },
  });
  const blogRateLimitList = useMemo(
    () =>
      pickDataRoot<ApiCampaignBlogSocialPublicationRateLimitListResult>(
        blogRateLimitResp,
      ),
    [blogRateLimitResp],
  );
  const blogRateLimitMap = useMemo(
    () =>
      new Map(
        (blogRateLimitList?.blogs ?? []).map((entry) => [
          entry.campaignBlogId,
          entry.rateLimit,
        ]),
      ),
    [blogRateLimitList?.blogs],
  );

  useEffect(() => {
    if (totalPages === 0 && page !== 1) {
      setPage(1);
      return;
    }

    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, NEWLY_GENERATED_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

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
    onSuccess: () => {
      refetch();
    },
  });

  const { mutateAsync: makeBlogDraft, isPending: makeDraftPending } = useApiMutation<
    { campaignBlogId: string },
    unknown
  >({
    route: endpoints.campaigns.setAsDraft,
    method: "PATCH",
    onSuccess: () => {
      refetch();
    },
  });

  const deleteBlogMut = useApiMutation<{ campaignBlogId: string }, unknown>({
    route: endpoints.campaigns.deleteBlog,
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.blogsAdvancedListing],
      });
      refetch();
    },
  });

  const busy =
    makeLivePending || makeDraftPending || deleteBlogMut.isPending;

  const getRowPublishDisabledReason = useCallback(
    (blogId: string) =>
      getCampaignBlogSocialPublishDisabledReason({
        campaign: campaignData,
        socialStatus,
        publishRateLimits: {
          resetAt:
            blogRateLimitList?.resetAt ??
            socialStatus?.publishRateLimits?.resetAt ??
            null,
          user: socialStatus?.publishRateLimits?.user ?? null,
          campaign: socialStatus?.publishRateLimits?.campaign ?? null,
          blog: blogRateLimitMap.get(blogId) ?? null,
        },
        isMainOwner,
        isPaymentRequired,
        socialStatusLoading: socialLoading,
        socialStatusError: socialError,
      }),
    [
      campaignData,
      blogRateLimitList?.resetAt,
      blogRateLimitMap,
      isMainOwner,
      isPaymentRequired,
      socialError,
      socialLoading,
      socialStatus,
    ],
  );

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

  const handleOpenPublish = useCallback(
    (blog: BlogRow) => {
      setPublishBlog(blog);
    },
    [],
  );

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab="blogs"
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => {}}
    >
      <div className="p-4 min-h-screen">
        <div className="rounded-2xl bg-[#F5F5F5] border border-black/5 p-5">
          <header className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Manage Blogs</h1>
            {!showPaymentRequired && allowBlogCreateByStatus ? (
              <PermissionDisabledTooltip hasPermission={blogPerms.create}>
                <button
                  onClick={() => navigate(`/campaigns/edit/${campaignId}/blog/create`)}
                  className="rounded-full bg-[#E4F2DF] px-5 py-2.5 text-sm font-semibold text-[#315326]"
                >
                  + Add a blog
                </button>
              </PermissionDisabledTooltip>
            ) : !showPaymentRequired && campaignStatus ? (
              <p className="text-sm text-amber-700">
                Blog can not be created as campaign is {campaignStatus}.
              </p>
            ) : null}
          </header>

          {showPaymentRequired ? (
            <CampaignPaymentRequiredPrompt
              campaignId={campaignId}
              featureName="Blogs"
              isMainOwner={isMainOwner}
              billingMode={billingMode}
            />
          ) : isLoading ? (
            <div className="mt-6 text-sm text-black/60">Loading blogs…</div>
          ) : isError ? (
            <div className="mt-6 text-sm text-red-600">Failed to load blogs</div>
          ) : (
            <div className="mt-6">
              {entries.length === 0 && (
                <div className="rounded-xl bg-white p-6 text-sm text-black/60">
                  No blogs yet.
                </div>
              )}

              <div className="space-y-4">
                {entries?.map((b) => {
                const cover = pickCover(b);
                const date = fmtDate(b.publishDate || b.createdAt || b.updatedAt);
                const isNewlyGenerated = isRecentlyGeneratedBlog(b, nowMs);
                const publishDisabledReason = getRowPublishDisabledReason(b._id);

                return (
                  <button
                    key={b._id}
                    onClick={() =>
                      navigate(`/campaigns/edit/${campaignId}/blog/${b._id}`)
                    }
                    className={cn(
                      "w-full text-left rounded-2xl border transition overflow-hidden cursor-pointer",
                      isNewlyGenerated
                        ? "bg-[#FBF7FF] border-[#E1D3F2] shadow-[0_10px_30px_rgba(122,84,170,0.10)] hover:border-[#CFB9EC]"
                        : "bg-white border-black/10 hover:border-black/20",
                    )}
                  >
                    <section className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                      <figure className="h-[180px] w-full rounded-xl bg-[#EDEDED] overflow-hidden shrink-0 sm:h-[130px] sm:w-[220px]">
                        {cover?.kind === "image" && (
                          <img
                            src={cover.url}
                            className="h-full w-full object-cover"
                            alt=""
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
                            alt=""
                          />
                        )}
                      </figure>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-black/50">{date}</div>
                            <div className="font-semibold line-clamp-2 text-lg">
                              {truncateText(b.title, 10)}
                            </div>
                            <CampaignBlogInkDAgentAttribution
                              agent={b.generatedByInkDAgent}
                              className="mt-2"
                            />
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
                              <DropdownMenuItem
                                disabled={busy || !!publishDisabledReason}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (publishDisabledReason) return;
                                  handleOpenPublish(b);
                                }}
                              >
                                <SendHorizontal className="mr-2 h-4 w-4" /> Publish
                              </DropdownMenuItem>
                              {publishDisabledReason ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <div className="max-w-64 px-3 py-2 text-xs leading-5 text-[#64748B]">
                                    {publishDisabledReason}
                                  </div>
                                </>
                              ) : null}

                              {b.status === "draft" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <PermissionDisabledTooltip
                                    hasPermission={blogPerms.edit}
                                  >
                                    <DropdownMenuItem
                                      disabled={busy}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/campaigns/edit/${campaignId}/blog/${b._id}`,
                                        );
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                  </PermissionDisabledTooltip>
                                  <PermissionDisabledTooltip
                                    hasPermission={blogPerms.live}
                                  >
                                    <DropdownMenuItem
                                      disabled={busy}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleMakeBlogLive(b._id);
                                      }}
                                    >
                                      <UploadCloud className="mr-2 h-4 w-4" /> Make live
                                    </DropdownMenuItem>
                                  </PermissionDisabledTooltip>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuSeparator />
                                  <PermissionDisabledTooltip
                                    hasPermission={blogPerms.draft}
                                  >
                                    <DropdownMenuItem
                                      disabled={busy}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleMakeBlogDraft(b._id);
                                      }}
                                    >
                                      <ArrowDownToLine className="mr-2 h-4 w-4" /> Make draft to edit
                                    </DropdownMenuItem>
                                  </PermissionDisabledTooltip>
                                </>
                              )}

                              <DropdownMenuSeparator />
                              <PermissionDisabledTooltip
                                hasPermission={blogPerms.delete}
                              >
                                <DropdownMenuItem
                                  disabled={busy}
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    (deleteBlogMut.mutate as unknown as (v: { campaignBlogId: string }) => void)({
                                      campaignBlogId: b._id,
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </PermissionDisabledTooltip>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
                          <BlogStatusPill status={b.status} />
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <CampaignSocialPublishRateLimitTooltip
                              user={socialStatus?.publishRateLimits?.user ?? null}
                              campaign={
                                socialStatus?.publishRateLimits?.campaign ?? null
                              }
                              blog={blogRateLimitMap.get(b._id) ?? null}
                              blogRule={
                                socialStatus?.publishRateLimits?.blogRule ?? null
                              }
                              resetAt={
                                blogRateLimitList?.resetAt ??
                                socialStatus?.publishRateLimits?.resetAt ??
                                null
                              }
                              trigger={
                                <span
                                  onClick={(event) => {
                                    event.stopPropagation();
                                  }}
                                  className="inline-flex items-center gap-2 rounded-full border border-[#D7DCE2] bg-[#F8FBFD] px-3 py-1.5 text-xs font-medium text-[#334155]"
                                >
                                  24h publish limits
                                </span>
                              }
                            />
                            {isNewlyGenerated ? (
                              <span className="rounded-full border border-[#C6E5CE] bg-[#E9F9EE] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2D7A47]">
                                Newly generated
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </section>
                  </button>
                );
                })}
              </div>

              {totalPages > 1 ? (
                <div className="mt-6 border-t border-black/5 pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={cn(
                            currentPage <= 1
                              ? "pointer-events-none opacity-50"
                              : "",
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage <= 1) return;
                            setPage(currentPage - 1);
                          }}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="px-3 text-sm text-[#5F7283]">
                          Page {currentPage} of {totalPages}
                          {typeof total === "number" ? ` · ${total} blogs` : ""}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={cn(
                            currentPage >= totalPages
                              ? "pointer-events-none opacity-50"
                              : "",
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage >= totalPages) return;
                            setPage(currentPage + 1);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <CampaignBlogSocialPublishConfirmModal
        open={!!publishBlog}
        campaignId={campaignId}
        blog={
          publishBlog
            ? {
                _id: publishBlog._id,
                title: publishBlog.title,
                description: publishBlog.description,
              }
            : null
        }
        publishablePlatforms={publishablePlatforms}
        publishRateLimits={
          publishBlog
            ? {
                user: socialStatus?.publishRateLimits?.user ?? null,
                campaign: socialStatus?.publishRateLimits?.campaign ?? null,
                blog: blogRateLimitMap.get(publishBlog._id) ?? null,
                blogRule: socialStatus?.publishRateLimits?.blogRule ?? null,
                resetAt:
                  blogRateLimitList?.resetAt ??
                  socialStatus?.publishRateLimits?.resetAt ??
                  null,
              }
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setPublishBlog(null);
          }
        }}
        onPublished={async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [blogRateLimitRouteBase, blogRateLimitIdsKey],
            }),
            queryClient.invalidateQueries({
              queryKey: [socialRoute],
            }),
          ]);
        }}
      />
    </CampaignLayout>
  );
}
