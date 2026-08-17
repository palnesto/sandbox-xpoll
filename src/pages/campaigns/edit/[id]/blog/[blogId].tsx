import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import apiInstance, { queryClient } from "@/api/queryClient";
import { useApiQuery } from "@/hooks/useApiQuery";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { BlogUpsertView } from "@/components/campaign/blog/BlogUpsertView";
import { CampaignBlogSocialPublishConfirmModal } from "@/components/campaign/blog/CampaignBlogSocialPublishConfirmModal";
import { CampaignBlogSocialPublicationHistorySection } from "@/components/campaign/blog/CampaignBlogSocialPublicationHistorySection";
import { CampaignSocialPublishRateLimitTooltip } from "@/components/campaign/social/campaign-social-publish-rate-limit-tooltip";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { canCreateBlogByCampaignStatus } from "@/utils/campaign-status";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import {
  getCampaignBlogSocialPublishDisabledReason,
  getPublishableCampaignSocialPlatforms,
  hasPendingCampaignSocialPublications,
  readCampaignSocialErrorMessage,
  reconcileCampaignBlogSocialPublications,
} from "@/lib/campaign/social";
import {
  pickDataRoot,
  type ApiCampaignBlogSocialPublicationRateLimitListResult,
  type ApiCampaignSocialPublicationListResult,
  type ApiCampaignSocialStatus,
} from "@/types/campaigns";
import { appToast } from "@/utils/toast";

const CAMPAIGN_BLOG_SOCIAL_PUBLICATIONS_POLL_INTERVAL_MS = 10_000;
const CAMPAIGN_BLOG_SOCIAL_PUBLICATIONS_PAGE_SIZE = 10;
const BLOG_DETAIL_TAB_QUERY_PARAM = "tab";

type BlogDetailTab = "edit" | "social-history";

function readBlogDetailTabFromSearch(search: string): BlogDetailTab {
  const value = new URLSearchParams(search).get(BLOG_DETAIL_TAB_QUERY_PARAM);
  return value === "social-history" ? "social-history" : "edit";
}

export default function BlogEditPage() {
  const navigate = useNavigate();
  const { id, blogId } = useParams();
  const campaignId = String(id ?? "");
  const activeBlogId = String(blogId ?? "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRefreshPending, setHistoryRefreshPending] = useState(false);
  const [activeTab, setActiveTab] = useState<BlogDetailTab>(() => {
    if (typeof window === "undefined") return "edit";
    return readBlogDetailTabFromSearch(window.location.search);
  });

  const {
    campaignData,
    campaignName,
    permissions,
    isMainOwner,
    isCoOwner,
    isPaymentRequired,
    billingMode,
  } = useCampaignByOwner(campaignId);
  const campaignStatus = String(campaignData?.status ?? "").toLowerCase();
  const allowBlogCreateByStatus = canCreateBlogByCampaignStatus(campaignStatus);
  const canCreate = permissions.campaignBlog.create;
  const canEdit = permissions.campaignBlog.edit;
  const canSetDraft = permissions.campaignBlog.draft;
  const socialRoute = campaignId
    ? endpoints.campaigns.getCampaignSocial(campaignId)
    : "";
  const { data: socialResp, isLoading: socialLoading, isError: socialError } =
    useApiQuery(socialRoute, {
      enabled: !!campaignId,
      retry: false,
      queryKey: [socialRoute],
    });
  const socialStatus = useMemo(
    () => pickDataRoot<ApiCampaignSocialStatus>(socialResp),
    [socialResp],
  );
  const blogRateLimitRouteBase = campaignId
    ? endpoints.campaigns.getCampaignBlogSocialPublicationRateLimitsBase(
        campaignId,
      )
    : "";
  const { data: blogRateLimitResp } = useQuery({
    queryKey: [blogRateLimitRouteBase, activeBlogId],
    enabled: !!campaignId && !!activeBlogId,
    retry: false,
    queryFn: async () => {
      const response = await apiInstance.post(blogRateLimitRouteBase, {
        blogIds: [activeBlogId],
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
  const activeBlogRateLimit = useMemo(
    () =>
      (
        blogRateLimitList?.blogs ?? []
      ).find((entry) => entry.campaignBlogId === activeBlogId)?.rateLimit ?? null,
    [activeBlogId, blogRateLimitList?.blogs],
  );
  const publishablePlatforms = useMemo(
    () => getPublishableCampaignSocialPlatforms(socialStatus),
    [socialStatus],
  );
  const blogRoute = activeBlogId
    ? endpoints.campaigns.getBlogById(activeBlogId)
    : "";
  const {
    data: blogResp,
    isLoading: blogLoading,
    isError: blogError,
  } = useApiQuery(blogRoute, {
    enabled: !!activeBlogId,
  });
  const activeBlog = useMemo(() => {
    const root = pickDataRoot<any>(blogResp);
    if (!root) return null;

    return {
      _id: String(root._id ?? root.id ?? ""),
      title: String(root.title ?? ""),
      description:
        typeof root.description === "string" ? root.description : null,
    };
  }, [blogResp]);
  const historyRoute =
    campaignId && activeBlogId
      ? endpoints.campaigns.getCampaignBlogSocialPublications(
          campaignId,
          activeBlogId,
          historyPage,
          CAMPAIGN_BLOG_SOCIAL_PUBLICATIONS_PAGE_SIZE,
        )
      : "";
  const {
    data: historyResp,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useApiQuery(historyRoute, {
    enabled: !!campaignId && !!activeBlogId,
    retry: false,
  });
  const historyList = useMemo(
    () => pickDataRoot<ApiCampaignSocialPublicationListResult>(historyResp),
    [historyResp],
  );
  const historyBaseRoute =
    campaignId && activeBlogId
      ? endpoints.campaigns.getCampaignBlogSocialPublicationsBase(
          campaignId,
          activeBlogId,
        )
      : "";
  const hasPendingPublications = useMemo(
    () => hasPendingCampaignSocialPublications(historyList),
    [historyList],
  );
  const historyRefreshDisabledReason = useMemo(() => {
    if (!isMainOwner) {
      return "Only the main owner can refresh pending publications.";
    }
    if (historyLoading) {
      return "Loading publication history...";
    }
    if (historyError) {
      return "Publication history is unavailable right now.";
    }
    if (!hasPendingPublications) {
      return "No pending publications need a status refresh right now.";
    }
    return null;
  }, [hasPendingPublications, historyError, historyLoading, isMainOwner]);
  const socialPublishDisabledReason = useMemo(() => {
    if (activeBlogId && blogLoading) {
      return "Loading blog details before publishing...";
    }

    if (activeBlogId && (blogError || !activeBlog?._id)) {
      return "Blog details are unavailable right now.";
    }

    return getCampaignBlogSocialPublishDisabledReason({
      campaign: campaignData,
      socialStatus,
      publishRateLimits: {
        resetAt:
          blogRateLimitList?.resetAt ??
          socialStatus?.publishRateLimits?.resetAt ??
          null,
        user: socialStatus?.publishRateLimits?.user ?? null,
        campaign: socialStatus?.publishRateLimits?.campaign ?? null,
        blog: activeBlogRateLimit,
      },
      isMainOwner,
      isPaymentRequired,
      socialStatusLoading: socialLoading,
      socialStatusError: socialError,
    });
  }, [
    activeBlog?._id,
    activeBlogId,
    blogError,
    blogLoading,
    campaignData,
    isMainOwner,
    isPaymentRequired,
    activeBlogRateLimit,
    blogRateLimitList?.resetAt,
    socialError,
    socialLoading,
    socialStatus,
  ]);

  useEffect(() => {
    if (!campaignId || campaignData === undefined) return;
    if (campaignData && !canEdit && !isCoOwner && !isPaymentRequired) {
      navigate(`/campaigns/edit/${campaignId}/blog`, { replace: true });
    }
  }, [campaignId, campaignData, canEdit, isCoOwner, isPaymentRequired, navigate]);

  useEffect(() => {
    setHistoryPage(1);
  }, [activeBlogId]);

  useEffect(() => {
    const totalPages = historyList?.meta?.totalPages;
    if (typeof totalPages !== "number") return;

    if (totalPages <= 0 && historyPage !== 1) {
      setHistoryPage(1);
      return;
    }

    if (totalPages > 0 && historyPage > totalPages) {
      setHistoryPage(totalPages);
    }
  }, [historyList?.meta?.totalPages, historyPage]);

  useEffect(() => {
    if (!historyBaseRoute || isPaymentRequired) return;

    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return (
            typeof queryKey === "string" &&
            queryKey.startsWith(historyBaseRoute)
          );
        },
      });
    }, CAMPAIGN_BLOG_SOCIAL_PUBLICATIONS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [historyBaseRoute, isPaymentRequired]);

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const goBack = () => navigate(`/campaigns/edit/${campaignId}/blog`);

  const setActiveDetailTab = (nextTab: BlogDetailTab) => {
    setActiveTab(nextTab);

    if (typeof window === "undefined") return;

    const nextSearchParams = new URLSearchParams(window.location.search);
    if (nextTab === "edit") {
      nextSearchParams.delete(BLOG_DETAIL_TAB_QUERY_PARAM);
    } else {
      nextSearchParams.set(BLOG_DETAIL_TAB_QUERY_PARAM, nextTab);
    }

    const nextSearch = nextSearchParams.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  };

  // After save: clear unsaved flag first so PreventLeaveGuard won't block, then navigate.
  const handleSavedAndNavigate = () => {
    setHasUnsavedChanges(false);
    setTimeout(() => navigate(`/campaigns/edit/${campaignId}/blog`), 0);
  };

  const invalidateHistoryQueries = async () => {
    if (!historyBaseRoute) return;

    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey[0];
        return (
          typeof queryKey === "string" &&
          queryKey.startsWith(historyBaseRoute)
        );
      },
    });
  };

  const handleRefreshStatuses = async () => {
    if (!activeBlogId || historyRefreshDisabledReason) return;

    setHistoryRefreshPending(true);
    try {
      const result = await reconcileCampaignBlogSocialPublications(
        campaignId,
        activeBlogId,
      );
      await invalidateHistoryQueries();
      await refetchHistory();

      if (result.checkedCount === 0) {
        appToast.info("No pending publications needed a refresh.");
      } else if (result.updatedCount > 0) {
        appToast.success(
          `Updated ${result.updatedCount} publication status${
            result.updatedCount === 1 ? "" : "es"
          }.`,
        );
      } else {
        appToast.info("Pending publication statuses were checked.");
      }
    } catch (error) {
      appToast.error(
        readCampaignSocialErrorMessage(
          error,
          "Couldn't refresh publication statuses right now.",
        ),
      );
    } finally {
      setHistoryRefreshPending(false);
    }
  };

  if (isPaymentRequired) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={campaignName}
        activeTab="blogs"
        onTabChange={goTab}
        onBack={goBack}
        onRewards={() => {}}
      >
        <div className="p-4">
          <CampaignPaymentRequiredPrompt
            campaignId={campaignId}
            featureName="Blogs"
            isMainOwner={isMainOwner}
            billingMode={billingMode}
          />
        </div>
      </CampaignLayout>
    );
  }

  if (campaignData && !canEdit) {
    return null;
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={campaignId}
          campaignName={campaignName}
          activeTab="blogs"
          onTabChange={(t) => requestLeave(() => goTab(t))}
          onBack={() => requestLeave(goBack)}
          onRewards={() => {}}
        >
          {!allowBlogCreateByStatus && campaignStatus ? (
            <div className="px-4 pt-2">
              <p className="text-sm text-amber-700">
                Blog can not be created as campaign is {campaignStatus}.
              </p>
            </div>
          ) : null}
          <div className="px-4 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="inline-flex rounded-full border border-[#D9E4EC] bg-white p-1 shadow-sm"
                role="tablist"
                aria-label="Blog detail sections"
              >
                <div className="inline-flex items-center">
                  {([
                    {
                      id: "edit" as const,
                      label: "Edit Blog",
                    },
                    {
                      id: "social-history" as const,
                      label: "Social publication history",
                    },
                  ] satisfies Array<{ id: BlogDetailTab; label: string }>).map(
                    (tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          id={`blog-detail-tab-${tab.id}`}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-controls={`blog-detail-panel-${tab.id}`}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            isActive
                              ? "bg-[#117C7C] text-white shadow-sm"
                              : "text-[#5F7283] hover:text-[#132238]"
                          }`}
                          onClick={() => setActiveDetailTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {allowBlogCreateByStatus && canCreate ? (
                <button
                  type="button"
                  onClick={() =>
                    requestLeave(() =>
                      navigate(`/campaigns/edit/${campaignId}/blog/create`),
                    )
                  }
                  className="self-start rounded-full bg-[#E4F2DF] px-4 py-2 text-sm font-semibold text-[#315326] sm:self-auto"
                >
                  + Create blog
                </button>
              ) : null}
            </div>
          </div>
          <div
            id="blog-detail-panel-edit"
            role="tabpanel"
            aria-labelledby="blog-detail-tab-edit"
            className={activeTab === "edit" ? "" : "hidden"}
          >
            <BlogUpsertView
              campaignId={campaignId}
              blogId={activeBlogId || null}
              onBack={() => requestLeave(goBack)}
              onSavedAndNavigate={handleSavedAndNavigate}
              onUnsavedChange={setHasUnsavedChanges}
              canSetDraft={canSetDraft}
              canEditBlog={canEdit}
              socialPublishDisabledReason={socialPublishDisabledReason}
              onOpenPublish={() => {
                setPublishModalOpen(true);
              }}
            />
          </div>
          <div
            id="blog-detail-panel-social-history"
            role="tabpanel"
            aria-labelledby="blog-detail-tab-social-history"
            className={activeTab === "social-history" ? "px-4 pb-4" : "hidden"}
          >
            <CampaignBlogSocialPublicationHistorySection
              publicationList={historyList}
              isLoading={historyLoading}
              isError={historyError}
              page={historyPage}
              rateLimitTooltip={
                <CampaignSocialPublishRateLimitTooltip
                  user={socialStatus?.publishRateLimits?.user ?? null}
                  campaign={socialStatus?.publishRateLimits?.campaign ?? null}
                  blog={activeBlogRateLimit}
                  blogRule={socialStatus?.publishRateLimits?.blogRule ?? null}
                  resetAt={
                    blogRateLimitList?.resetAt ??
                    socialStatus?.publishRateLimits?.resetAt ??
                    null
                  }
                />
              }
              reconcilePending={historyRefreshPending}
              refreshDisabledReason={historyRefreshDisabledReason}
              onRetryList={() => {
                void refetchHistory();
              }}
              onRefreshStatuses={() => {
                void handleRefreshStatuses();
              }}
              onPageChange={setHistoryPage}
            />
          </div>
          <CampaignBlogSocialPublishConfirmModal
            open={publishModalOpen}
            campaignId={campaignId}
            blog={activeBlog}
            publishablePlatforms={publishablePlatforms}
            publishRateLimits={{
              user: socialStatus?.publishRateLimits?.user ?? null,
              campaign: socialStatus?.publishRateLimits?.campaign ?? null,
              blog: activeBlogRateLimit,
              blogRule: socialStatus?.publishRateLimits?.blogRule ?? null,
              resetAt:
                blogRateLimitList?.resetAt ??
                socialStatus?.publishRateLimits?.resetAt ??
                null,
            }}
            onOpenChange={setPublishModalOpen}
            onPublished={async () => {
              setHistoryPage(1);
              await Promise.all([
                invalidateHistoryQueries(),
                queryClient.invalidateQueries({
                  queryKey: [blogRateLimitRouteBase, activeBlogId],
                }),
                queryClient.invalidateQueries({
                  queryKey: [socialRoute],
                }),
              ]);
            }}
          />
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
