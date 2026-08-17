import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import inkdVideo from "@/assets/inkd/inkdbg.mp4";
import fallbackImage from "@/assets/inkd/first.webp";
import { extractYouTubeId } from "@/types/petition";
import inkdLogo from "@/assets/inkd/ink.svg";

type LinkedIndustry = {
    _id?: string;
    name?: string | null;
};

type InkDBlogEntry = {
    _id: string;
    title: string;
    description: string;
    uploadedImageLinks: string[];
    uploadedVideoLinks: string[];
    ytVideoLinks: string[];
    inkdInternalAgentName?: string;
    linkedIndustries?: LinkedIndustry[];
    createdAt?: string | null;
};

function formatHoursOrDaysAgo(createdAt?: string | null) {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    if (diffMs <= 0) return "1 hour ago";

    const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (hours < 24) {
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }

    const days = Math.max(1, Math.floor(hours / 24));
    return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function getIndustryLabel(blog: InkDBlogEntry) {
    const names = (blog.linkedIndustries ?? [])
        .map((item) => String(item?.name ?? "").trim())
        .filter(Boolean);

    if (!names.length) return "";
    return names.slice(0, 2).join(" / ");
}

function getBlogMedia(blog: InkDBlogEntry) {
    if (blog.uploadedImageLinks?.[0]) {
        return { kind: "image" as const, src: blog.uploadedImageLinks[0] };
    }

    if (blog.uploadedVideoLinks?.[0]) {
        return { kind: "video" as const, src: blog.uploadedVideoLinks[0] };
    }

    if (blog.ytVideoLinks?.[0]) {
        const id = extractYouTubeId(blog.ytVideoLinks[0]);
        if (id) {
            return {
                kind: "youtube" as const,
                src: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            };
        }
    }

    return { kind: "fallback" as const, src: fallbackImage };
}

function MediaPreview({ blog }: { blog: InkDBlogEntry }) {
    const media = getBlogMedia(blog);

    if (media.kind === "video") {
        return (
            <video
                src={media.src}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
            />
        );
    }

    return (
        <img
            src={media.src}
            alt={blog.title}
            className="h-full w-full object-cover"
            loading="lazy"
        />
    );
}

export default function InkdHomeHero() {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isNavigatingToInkd, setIsNavigatingToInkd] = useState(false);
    const dragRef = useRef<{
        pointerId: number | null;
        startX: number;
        startY: number;
        didSwipe: boolean;
        lastActionAt: number;
    }>({
        pointerId: null,
        startX: 0,
        startY: 0,
        didSwipe: false,
        lastActionAt: 0,
    });

    const navTimerRef = useRef<number | null>(null);
    const wheelCooldownRef = useRef(0);

    const route = `${endpoints.inkd.getAllInkdBlogs}?page=1&pageSize=3`;

    const { data, isLoading } = useApiQuery(route, {
        enabled: true,
        queryKey: [route],
    } as any);

    const blogs = useMemo<InkDBlogEntry[]>(() => {
        const entries = data?.data?.data?.entries ?? data?.data?.entries ?? [];
        if (!Array.isArray(entries)) return [];

        return entries
            .map((entry: any) => ({
                _id: String(entry?._id ?? ""),
                title: String(entry?.title ?? ""),
                description: String(entry?.description ?? ""),
                uploadedImageLinks: Array.isArray(entry?.uploadedImageLinks)
                    ? entry.uploadedImageLinks
                    : [],
                uploadedVideoLinks: Array.isArray(entry?.uploadedVideoLinks)
                    ? entry.uploadedVideoLinks
                    : [],
                ytVideoLinks: Array.isArray(entry?.ytVideoLinks) ? entry.ytVideoLinks : [],
                inkdInternalAgentName: String(entry?.inkdInternalAgentName ?? ""),
                linkedIndustries: Array.isArray(entry?.linkedIndustries)
                    ? entry.linkedIndustries
                    : [],
                createdAt: entry?.createdAt ?? null,
            }))
            .filter((entry) => entry._id)
            .slice(0, 3);
    }, [data]);

    useEffect(() => {
        if (!blogs.length) return;
        setActiveIndex((prev) => (prev >= blogs.length ? 0 : prev));
    }, [blogs]);

    useEffect(() => {
        if (blogs.length <= 1) return;

        const interval = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % blogs.length);
        }, 5000);

        return () => window.clearInterval(interval);
    }, [blogs.length]);

    useEffect(() => {
        return () => {
            if (navTimerRef.current != null) {
                window.clearTimeout(navTimerRef.current);
                navTimerRef.current = null;
            }
        };
    }, []);

    const navigateToInkd = () => {
        if (isNavigatingToInkd) return;
        setIsNavigatingToInkd(true);

        // Small delay so the logo rotation is visible before the route changes.
        navTimerRef.current = window.setTimeout(() => {
            navigate("/inkd", { state: { fromInkdHero: true } });
        }, 420);
    };

    const activeBlog = blogs[activeIndex] ?? null;

    const goPrev = () => {
        if (blogs.length <= 1) return;
        setActiveIndex((prev) => (prev - 1 + blogs.length) % blogs.length);
    };

    const goNext = () => {
        if (blogs.length <= 1) return;
        setActiveIndex((prev) => (prev + 1) % blogs.length);
    };

    const navigateToActiveBlog = (e: SyntheticEvent) => {
        e.stopPropagation();
        if (!activeBlog) return;
        navigate(`/inkd/inkd-blog/${activeBlog._id}`);
    };

    if (!isLoading && !activeBlog) return null;

    return (
        <section className="relative mt-4 w-full">
            <div
                role="button"
                tabIndex={0}
                onClick={() => {
                    // If a swipe happened, don't treat it like a click-through.
                    if (isNavigatingToInkd) return;
                    if (dragRef.current.didSwipe) {
                        dragRef.current.didSwipe = false;
                        return;
                    }
                    navigateToInkd();
                }}
                onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        goPrev();
                        return;
                    }
                    if (e.key === "ArrowRight") {
                        e.preventDefault();
                        goNext();
                        return;
                    }
                    if (e.key === "Enter" || e.key === " ") {
                        if (isNavigatingToInkd) return;
                        e.preventDefault();
                        navigateToInkd();
                    }
                }}
                className="relative overflow-hidden flex cursor-pointer flex-col items-start justify-start rounded-[22px] border-2 border-[#00000010] bg-[#f6f6fb] shadow-2xl shadow-[0_6px_20px_rgba(17,24,39,0.06)] h-[390px] md:h-[420px]"
                style={{ touchAction: "pan-y" }}
                onPointerDown={(e) => {
                    if (isNavigatingToInkd) return;
                    if (blogs.length <= 1) return;
                    if (e.pointerType === "mouse" && e.button !== 0) return;

                    dragRef.current.pointerId = e.pointerId;
                    dragRef.current.startX = e.clientX;
                    dragRef.current.startY = e.clientY;
                    dragRef.current.didSwipe = false;

                    try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {}
                }}
                onPointerUp={(e) => {
                    if (dragRef.current.pointerId !== e.pointerId) return;

                    const dx = e.clientX - dragRef.current.startX;
                    const dy = e.clientY - dragRef.current.startY;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    const SWIPE_PX = 45;
                    const COOLDOWN_MS = 450;
                    const now = Date.now();

                    if (
                        absDx >= SWIPE_PX &&
                        absDx > absDy &&
                        now - dragRef.current.lastActionAt >= COOLDOWN_MS
                    ) {
                        dragRef.current.lastActionAt = now;
                        if (dx < 0) goNext();
                        else goPrev();
                        dragRef.current.didSwipe = true;
                    }

                    dragRef.current.pointerId = null;
                }}
                onPointerCancel={() => {
                    dragRef.current.pointerId = null;
                    dragRef.current.didSwipe = false;
                }}
                onPointerLeave={() => {
                    dragRef.current.pointerId = null;
                    dragRef.current.didSwipe = false;
                }}
            >
                {isNavigatingToInkd && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f3f4f6]/85 backdrop-blur-[4px]">
                        <div className="flex flex-col items-center gap-2">
                            <img
                                src={inkdLogo}
                                alt="Loading"
                                className="h-14 w-14 animate-spin duration-[2100ms] ease-linear"
                            />
                            <div className="text-xs font-semibold text-[#171717] opacity-80">
                                Opening INKD
                            </div>
                        </div>
                    </div>
                )}
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="hidden md:block absolute inset-0 h-[550px] w-[150%] object-cover object-left "
                >
                    <source src={inkdVideo} type="video/mp4" />
                </video>


                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isNavigatingToInkd) navigateToInkd();
                    }}
                    className="absolute right-5 top-3 z-20 text-[14px] md:text-base font-medium text-[#171717] bg-[#613FEC42] backdrop-blur-sm border-l border-b shadow-sm transition hover:scale-[1.03] rounded-full px-3 md:px-5 py-1 hover:bg-[#a995ef] lg:right-7"
                >
                    view all
                </button>

                <div className="relative flex flex-col md:items-center justify-center z-10 h-full px-3 pb-6 px-6 pt-4 lg:px-7 lg:pb-7">

                    <figure className="text-2xl font-semibold tracking-[-0.03em] text-[#171717] flex items-center gap-2">
                        <img
                            src={inkdLogo}
                            alt="INKD"
                            className={`h-5 w-5 pointer-events-none  ${
                                isNavigatingToInkd
                                    ? "animate-spin duration-[2100ms] ease-linear"
                                    : ""
                            }`}
                        />{" "}
                        INKD

                    </figure>


                    <div className="mt-3 h-[calc(100%-38px)]">
                        <div
                            className="relative h-full max-w-[320px] rounded-[18px] bg-[#a995ef] shadow-[0_10px_30px_rgba(78,66,230,0.18)] "
                            style={{ touchAction: "pan-y" }}
                            onClick={(e) => {
                                const el = e.target as HTMLElement | null;
                                if (!el?.closest) return;
                                if (el.closest("button")) return;
                                navigateToActiveBlog(e);
                            }}
                            onWheel={(e) => {
                                if (blogs.length <= 1 || isNavigatingToInkd) return;
                                const isHorizontal =
                                    Math.abs(e.deltaX) > Math.abs(e.deltaY);
                                const delta = isHorizontal
                                    ? e.deltaX
                                    : e.shiftKey
                                      ? e.deltaY
                                      : 0;
                                if (Math.abs(delta) < 14) return;
                                const now = Date.now();
                                if (now - wheelCooldownRef.current < 550) return;
                                wheelCooldownRef.current = now;
                                e.preventDefault();
                                e.stopPropagation();
                                if (delta > 0) goNext();
                                else goPrev();
                            }}
                        >
                            <div className="absolute left-[-14px] top-[46%] z-20 -translate-y-1/2">
                                <button
                                    type="button"
                                    aria-label="Previous slide"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onPointerUp={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goPrev();
                                    }}
                                    className="flex h-7 w-10 items-center justify-center rounded-full bg-[#613FEC42] backdrop-blur-sm border-l border-b  text-white shadow-sm transition hover:scale-[1.03]"
                                >
                                    <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="absolute right-[-14px] top-[46%] z-20 -translate-y-1/2">
                                <button
                                    type="button"
                                    aria-label="Next slide"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onPointerUp={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goNext();
                                    }}
                                    className="flex h-7 w-10 items-center justify-center rounded-full bg-[#613FEC42] backdrop-blur-sm border-l border-b text-white shadow-sm transition hover:scale-[1.03]"
                                >
                                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                            </div>

                            <div
                                role="button"
                                tabIndex={0}
                                onClick={navigateToActiveBlog}
                                onKeyDown={(e) => {
                                    if ((e.key === "Enter" || e.key === " ") && activeBlog) {
                                        e.preventDefault();
                                        navigateToActiveBlog(e);
                                    }
                                }}
                                className="flex h-full cursor-pointer flex-col p-2.5"
                            >
                                <div className="overflow-hidden rounded-[12px]">
                                    <div className="h-[178px] w-full sm:h-[188px]">
                                        {activeBlog ? (
                                            <MediaPreview blog={activeBlog} />
                                        ) : (
                                            <div className="h-full w-full animate-pulse bg-[#ece7ff]" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 px-1 pb-1 pt-3 text-white">
                                    <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-2">
                                        {activeBlog && getIndustryLabel(activeBlog) ? (
                                            <span className="inline-flex w-fit rounded-full bg-[#5c45d8] px-3 py-[5px] text-[11px] font-semibold uppercase leading-none tracking-[0.02em] text-white">
                                                {getIndustryLabel(activeBlog)}
                                            </span>
                                        ) : null}

                                        <span className="text-[13px] font-medium text-[#4f3f89]">
                                            {activeBlog?.createdAt
                                                ? formatHoursOrDaysAgo(activeBlog.createdAt)
                                                : ""}
                                        </span>
                                    </div>

                                    <h3
                                        className="mt-4 line-clamp-2 text-[18px] font-semibold leading-[1.08] tracking-[-0.03em] text-white"
                                        style={{ fontFamily: "Georgia, serif" }}
                                    >
                                        {activeBlog?.title ?? "Loading latest story"}
                                    </h3>

                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onPointerUp={(e) => e.stopPropagation()}
                                        onClick={navigateToActiveBlog}
                                        className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium tracking-[-0.02em] text-[#2d2453] transition hover:opacity-70"
                                    >
                                        Read
                                        <span className="text-[16px] leading-none">→</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {blogs.length > 1 && (
                            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
                                {blogs.map((blog, index) => (
                                    <button
                                        key={blog._id}
                                        type="button"
                                        aria-label={`Go to slide ${index + 1}`}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onPointerUp={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveIndex(index);
                                        }}
                                        className="pointer-events-auto"
                                    >
                                        <span
                                            className={[
                                                "block h-[6px] rounded-full transition-all duration-300",
                                                index === activeIndex
                                                    ? "w-[22px] bg-[#6f4cff]"
                                                    : "w-[6px] bg-[#b7a7ff]",
                                            ].join(" ")}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}