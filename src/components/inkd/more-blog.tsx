import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Eye, Users } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import fallbackImage from "@/assets/inkd/eight.webp";
import { extractYouTubeId } from "@/types/petition";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import ReactMarkdown from "react-markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

type LinkedIndustry = {
    _id: string;
    name: string;
    description?: string | null;
};

type ComputedByAssetItem = { assetId: string; total: string };

type RewardSums = {
    activeTrials?: {
        computedByAsset?: ComputedByAssetItem[];
    };
};

type InkDBlogEntry = {
    _id: string;
    title: string;
    description: string;
    uploadedImageLinks?: string[];
    uploadedVideoLinks?: string[];
    ytVideoLinks?: string[];
    linkedIndustries?: LinkedIndustry[];
    rewardSums?: RewardSums;
    lifetimeStats?: {
        seenTotal?: number;
        participationTotal?: number;
    };
};

function markdownToPlain(md: string) {
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

function getFirstMarkdownBlock(text: string) {
    const source = String(text || "").trim();
    if (!source) return "";
    const parts = source
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean);
    return parts[0] || "";
}

function estimateReadMinutes(text: string) {
    const plain = markdownToPlain(text);
    const words = plain ? plain.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / 200));
}

function getMediaSource(blog?: InkDBlogEntry | null) {
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

function MediaPreview({ blog }: { blog?: InkDBlogEntry | null }) {
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

function getIndustryLabel(blog?: InkDBlogEntry | null) {
    const name = blog?.linkedIndustries?.[0]?.name;
    if (!name) return null;
    return String(name).replace(/[-_]+/g, " ").toUpperCase();
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
        })
    );
    return `${parentStr} ${spec.parent}`;
}

function MoreBlogRewardPanel({ blog }: { blog: InkDBlogEntry }) {
    const [open, setOpen] = useState(false);
    const items = blog?.rewardSums?.activeTrials?.computedByAsset ?? [];
    if (!items.length) return null;

    return (
        <div className="mt-6" onClick={(e) => e.stopPropagation()}>
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="rounded-[10px] border border-[#dde4ef] bg-[#edf2fb] p-3">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 text-left"
                        >
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#2d68f6]">
                                Earning Potential
                            </span>
                            <ChevronDown
                                className={`h-4 w-4 text-[#2d68f6] transition-transform ${
                                    open ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="mt-3 flex flex-wrap gap-4">
                            {items.map((item, idx) => {
                                const label = formatComputedToParent(item);
                                const spec = assetSpecs[item.assetId as AssetType];
                                if (!label || !spec) return null;
                                return (
                                    <div
                                        key={`${item.assetId}-${idx}`}
                                        className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#2b3448]"
                                    >
                                        <img src={spec.img} alt="" className="h-3.5 w-3.5" />
                                        <span>{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>
        </div>
    );
}

function MoreBlogCard({ blog }: { blog: InkDBlogEntry }) {
    const navigate = useNavigate();
    const industry = getIndustryLabel(blog);
    const readTime = estimateReadMinutes(blog.description);
    const descriptionPreview = getFirstMarkdownBlock(blog.description);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/inkd/inkd-blog/${blog._id}`)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/inkd/inkd-blog/${blog._id}`);
                }
            }}
            className="w-full text-left flex flex-col  overflow-hidden rounded-[14px] border border-[#d7deea] bg-white shadow-[0_40px_18px_rgba(10,20,50,0.05)] hover:shadow-[0_6px_24px_rgba(10,20,50,0.08)] transition-shadow"
        >
            <div className="h-[200px] w-full overflow-hidden">
                <MediaPreview blog={blog} />
            </div>

            <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                    {industry ? (
                        <>
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#2d68f6]">
                                {industry}
                            </span>
                            <span className="text-[10px] text-[#99a1af]">•</span>
                        </>
                    ) : null}

                    <span className="font-mono text-[9px] text-[#99a1af]">{readTime} min</span>
                    <span className="text-[10px] text-[#99a1af]">•</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[#99a1af]">
                        <Eye className="h-3 w-3" />
                        {blog.lifetimeStats?.seenTotal ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[#99a1af]">
                        <Users className="h-3 w-3" />
                        {blog.lifetimeStats?.participationTotal ?? 0}
                    </span>
                </div>

                <h3 className="mt-3 font-serif text-[18px] font-bold leading-[1.2] text-[#111827] line-clamp-2">
                    {blog.title}
                </h3>
                <div className="mt-3 text-[13px] leading-[1.6] text-[#5c667b] line-clamp-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{descriptionPreview}</ReactMarkdown>
                </div>
                <MoreBlogRewardPanel blog={blog} />
            </div>
        </div>
    );
}

const PAGE_SIZE = 6;

export default function MoreBlogs() {
    const [page, setPage] = useState(1);
    const route = `${endpoints.inkd.getAllInkdBlogs}?rankByPopularity=false&page=${page}&pageSize=${PAGE_SIZE}`;
    const { data: blogsResp, isLoading } = useApiQuery(route, {
        enabled: true,
        queryKey: [route],
    } as any);

    const { moreBlogs, totalPages } = useMemo(() => {
        const toFiniteNumber = (value: unknown, fallback: number) => {
            const n = typeof value === "number" ? value : Number(value);
            return Number.isFinite(n) ? n : fallback;
        };

        const entries = blogsResp?.data?.data?.entries ?? blogsResp?.data?.entries ?? [];
        const meta = blogsResp?.data?.data?.meta ?? blogsResp?.data?.meta ?? {};
        const total = toFiniteNumber((meta as any).total, 0);
        const pageSize = toFiniteNumber((meta as any).pageSize, PAGE_SIZE);
        const metaTotalPages = toFiniteNumber((meta as any).totalPages, 0);
        const totalPages =
            metaTotalPages > 0 ? metaTotalPages : Math.max(1, Math.ceil(total / pageSize));

        if (!Array.isArray(entries)) {
            return { moreBlogs: [] as InkDBlogEntry[], totalPages: 1 };
        }

        const list = entries.map((entry: any) => ({
            _id: String(entry._id ?? ""),
            title: String(entry.title ?? ""),
            description: String(entry.description ?? ""),
            uploadedImageLinks: Array.isArray(entry.uploadedImageLinks) ? entry.uploadedImageLinks : [],
            uploadedVideoLinks: Array.isArray(entry.uploadedVideoLinks) ? entry.uploadedVideoLinks : [],
            ytVideoLinks: Array.isArray(entry.ytVideoLinks) ? entry.ytVideoLinks : [],
            linkedIndustries: Array.isArray(entry.linkedIndustries) ? entry.linkedIndustries : [],
            rewardSums: entry.rewardSums ?? undefined,
            lifetimeStats: entry.lifetimeStats ?? undefined,
        }));
        return { moreBlogs: list, totalPages };
    }, [blogsResp]);

    const pageItems = useMemo<(number | "...")[]>(() => {
        const maxPagesToShow = 7;
        if (totalPages <= maxPagesToShow) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const pages: (number | "...")[] = [];
        const windowSize = 1;
        const start = Math.max(2, page - windowSize);
        const end = Math.min(totalPages - 1, page + windowSize);

        pages.push(1);
        if (start > 2) pages.push("...");
        for (let current = start; current <= end; current++) {
            pages.push(current);
        }
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);

        return pages;
    }, [page, totalPages]);

    if (isLoading && !moreBlogs.length) {
        return (
            <section id="more-blogs" className="bg-[#f3f4f6] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[1410px] animate-pulse">
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <div className="h-10 w-52 rounded bg-[#dbe3f4]" />
                            <div className="mt-2 h-4 w-96 rounded bg-[#dbe3f4]" />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-[420px] rounded-[14px] bg-[#dde3ef]" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="more-blogs" className="bg-[#f3f4f6] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1100px]">
                <div className="mb-6">
                    <h2 className="font-serif text-[32px] font-bold tracking-[-0.03em] text-[#2d68f6]">
                        More Blogs
                    </h2>
                    <p className="mt-2 text-[14px] font-medium text-[#5d6780]">
                        Explore curated perspectives on technology, politics, and the future
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {moreBlogs.map((blog) => (
                        <MoreBlogCard key={blog._id} blog={blog} />
                    ))}
                </div>

                {totalPages > 1 && (
                    <section className="mt-10 flex justify-center py-4">
                        <Pagination className="w-fit rounded-2xl bg-white px-3 py-2 shadow-md">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        aria-disabled={page <= 1}
                                        className={
                                            page <= 1
                                                ? "pointer-events-none opacity-50"
                                                : ""
                                        }
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (page > 1) setPage((p) => p - 1);
                                        }}
                                    />
                                </PaginationItem>

                                {pageItems.map((item, index) =>
                                    item === "..." ? (
                                        <PaginationItem key={`ellipsis-${index}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    ) : (
                                        <PaginationItem key={item}>
                                            <PaginationLink
                                                href="#"
                                                isActive={item === page}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (item !== page) setPage(item);
                                                }}
                                            >
                                                {item}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )
                                )}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        aria-disabled={page >= totalPages}
                                        className={
                                            page >= totalPages
                                                ? "pointer-events-none opacity-50"
                                                : ""
                                        }
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (page < totalPages) setPage((p) => p + 1);
                                        }}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </section>
                )}
            </div>
        </section>
    );
}