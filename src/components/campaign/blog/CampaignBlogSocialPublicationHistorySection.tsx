import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ChevronDown,
  ImageIcon,
  Link2,
  RefreshCw,
  Video,
} from "lucide-react";

import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type {
  ApiCampaignSocialPublication,
  ApiCampaignSocialPublicationListResult,
  CampaignSocialPublicationSource,
  CampaignSocialPlatformKey,
} from "@/types/campaigns";

const PLATFORM_META: Record<
  CampaignSocialPlatformKey,
  {
    label: string;
    badge: string;
    badgeClassName: string;
  }
> = {
  x: {
    label: "X",
    badge: "X",
    badgeClassName: "bg-[#111827] text-white",
  },
  instagram: {
    label: "Instagram",
    badge: "IG",
    badgeClassName: "bg-[#FCE7F3] text-[#BE185D]",
  },
  facebook: {
    label: "Facebook",
    badge: "f",
    badgeClassName: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
};

const STATUS_META: Record<
  ApiCampaignSocialPublication["status"],
  {
    label: string;
    badgeClassName: string;
    description: string;
  }
> = {
  initiated: {
    label: "Initiated",
    badgeClassName: "bg-[#E2E8F0] text-[#334155]",
    description:
      "xPoll created this platform publication and is starting Upload Post.",
  },
  accepted: {
    label: "Accepted",
    badgeClassName: "bg-[#DBEAFE] text-[#1D4ED8]",
    description: "Upload Post accepted this publish request.",
  },
  processing: {
    label: "Processing",
    badgeClassName: "bg-[#FEF3C7] text-[#B45309]",
    description: "Upload Post is still working on this platform publish.",
  },
  published: {
    label: "Published",
    badgeClassName: "bg-[#DCFCE7] text-[#15803D]",
    description: "This platform publish completed successfully.",
  },
  rate_limited: {
    label: "Rate limited",
    badgeClassName: "bg-[#F3E8FF] text-[#7E22CE]",
    description:
      "Ignored due to rate limit. No social media publish was attempted for this platform.",
  },
  failed: {
    label: "Failed",
    badgeClassName: "bg-[#FEE2E2] text-[#B91C1C]",
    description: "This platform publish did not complete successfully.",
  },
};

const SOURCE_META: Record<
  CampaignSocialPublicationSource,
  {
    label: string;
    badgeClassName: string;
  }
> = {
  manual: {
    label: "Manual",
    badgeClassName: "bg-[#F1F5F9] text-[#475569]",
  },
  inkd_auto: {
    label: "Automatic",
    badgeClassName: "bg-[#E0F2FE] text-[#0F766E]",
  },
};

function PublicationListLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-2xl border border-[#E2E8F0] bg-white"
        />
      ))}
    </div>
  );
}

export function CampaignBlogSocialPublicationHistorySection(props: {
  publicationList: ApiCampaignSocialPublicationListResult | null;
  isLoading: boolean;
  isError: boolean;
  page: number;
  rateLimitTooltip?: ReactNode;
  reconcilePending?: boolean;
  refreshDisabledReason?: string | null;
  onRetryList: () => void;
  onRefreshStatuses: () => void;
  onPageChange: (page: number) => void;
}) {
  const entries = props.publicationList?.entries ?? [];
  const meta = props.publicationList?.meta ?? null;
  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      disabled={!!props.refreshDisabledReason || props.reconcilePending}
      className="rounded-full border-[#D7DCE2] px-5 text-[#1E293B]"
      onClick={props.onRefreshStatuses}
    >
      <RefreshCw
        className={cn(
          "mr-2 h-4 w-4",
          props.reconcilePending ? "animate-spin" : "",
        )}
      />
      {props.reconcilePending ? "Refreshing..." : "Refresh pending statuses"}
    </Button>
  );

  return (
    <section className="mt-6 rounded-2xl border border-[#D9E4EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-black/5 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#117C7C]">
            Social publication history
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#132238]">
            Every social publish run for this blog
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5F7283]">
            Manual publishes and InkD-triggered automatic publishes both land
            here, with one tracked row per social platform so you can follow
            pending states, final links, and failures in one place.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          {props.rateLimitTooltip ? props.rateLimitTooltip : null}
          {props.refreshDisabledReason ? (
            <PermissionDisabledTooltip
              hasPermission={false}
              message={props.refreshDisabledReason}
            >
              {refreshButton}
            </PermissionDisabledTooltip>
          ) : (
            refreshButton
          )}
          {props.refreshDisabledReason ? (
            <p className="text-xs text-[#64748B]">
              {props.refreshDisabledReason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {props.isLoading ? (
          <PublicationListLoadingState />
        ) : props.isError ? (
          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C]">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B91C1C]">
                    Couldn’t load publication history
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[#132238]">
                    This blog’s publish runs aren’t available right now
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5F7283]">
                    Retry to load the latest social publication rows for this
                    campaign blog.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
                onClick={props.onRetryList}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9E4EC] bg-[#F8FAFC] p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#117C7C] shadow-sm">
              <Link2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#117C7C]">
              No publication history yet
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#132238]">
              This blog does not have social publication history yet
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5F7283]">
              Once this blog is published manually or through InkD automatic
              social publishing, each platform attempt will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <PublicationRow key={entry._id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="mt-6 border-t border-black/5 pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={cn(
                    meta.page <= 1 ? "pointer-events-none opacity-50" : "",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    if (meta.page <= 1) return;
                    props.onPageChange(meta.page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-[#5F7283]">
                  Page {meta.page} of {meta.totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={cn(
                    meta.page >= meta.totalPages
                      ? "pointer-events-none opacity-50"
                      : "",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    if (meta.page >= meta.totalPages) return;
                    props.onPageChange(meta.page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </section>
  );
}

function PublicationRow(props: { entry: ApiCampaignSocialPublication }) {
  const [expanded, setExpanded] = useState(false);
  const platformMeta = PLATFORM_META[props.entry.platform];
  const statusMeta = STATUS_META[props.entry.status];
  const sourceMeta = SOURCE_META[props.entry.source];
  const mediaItems = props.entry.payloadSnapshot.mediaItems ?? [];
  const imageItems = mediaItems.filter((item) => item.type === "image");
  const videoItems = mediaItems.filter((item) => item.type === "video");
  const showExpandedMedia = imageItems.length > 0 || videoItems.length > 0;

  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold",
              platformMeta.badgeClassName,
            )}
          >
            {platformMeta.badge}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[#132238]">
                {platformMeta.label}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  sourceMeta.badgeClassName,
                )}
              >
                {sourceMeta.label}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  statusMeta.badgeClassName,
                )}
              >
                {statusMeta.label}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-[#5F7283]">
              {statusMeta.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748B]">
              <span className="rounded-full bg-white px-3 py-1">
                Run ref: {props.entry.publishRunCode}
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Created: {new Date(props.entry.createdAt).toLocaleString()}
              </span>
              {props.entry.lastReconciledAt ? (
                <span className="rounded-full bg-white px-3 py-1">
                  Last checked:{" "}
                  {new Date(props.entry.lastReconciledAt).toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2 self-start lg:self-auto">
          {props.entry.postUrl ? (
            <a
              href={props.entry.postUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-[#D7DCE2] bg-white px-4 py-2 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#F8FAFC]"
            >
              View post
            </a>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="h-11 w-11 rounded-full border-[#D7DCE2] bg-white p-0 text-[#1E293B]"
            aria-expanded={expanded}
            aria-label={expanded ? "Hide details" : "Show details"}
            title={expanded ? "Hide details" : "Show details"}
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded ? "rotate-180" : "",
              )}
            />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-black/5 pt-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
              Caption snapshot
            </p>
            <p className="mt-2 text-sm leading-6 text-[#334155]">
              {props.entry.payloadSnapshot.caption}
            </p>

            {props.entry.payloadSnapshot.linkUrl ? (
              <div className="mt-3 flex items-start gap-2 text-sm text-[#475569]">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0EA5A5]" />
                <a
                  href={props.entry.payloadSnapshot.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline decoration-[#9BD4D4] underline-offset-2"
                >
                  {props.entry.payloadSnapshot.linkUrl}
                </a>
              </div>
            ) : null}

            {showExpandedMedia ? (
              <div className="mt-4 space-y-3">
                {imageItems.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      Media snapshot
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {imageItems.map((item, index) => (
                        <a
                          key={`${item.url}-${index}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative w-24 overflow-hidden rounded-2xl border border-[#D9E4EC] bg-[#F8FAFC] sm:w-28 md:w-32"
                        >
                          <img
                            src={item.url}
                            alt={`Publish snapshot ${index + 1}`}
                            className="aspect-[4/5] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                            {item.source === "default_fallback"
                              ? "Fallback image"
                              : `Image ${index + 1}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {videoItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {videoItems.map((item, index) => (
                      <span
                        key={`${item.url}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Legacy video snapshot
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
                <ImageIcon className="h-3.5 w-3.5" />
                No media snapshot
              </div>
            )}
          </div>

          {props.entry.errorMessage ? (
            <div className="mt-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {props.entry.errorMessage}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
