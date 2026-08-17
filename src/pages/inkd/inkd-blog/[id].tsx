import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Check, Clock3, Copy, Eye, Send, User2 } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import highbg from "@/assets/inkd/ink.svg";
import inkdHero from "@/assets/inkd/inkd.webp";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { Button } from "@/components/ui/button";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { useAuth } from "@/hooks/useAuth";
import { useInkDBlogMarkSeen, useMarkEntitySeenOnce } from "@/hooks/use-mark-seen";
import { buildInkDBlogShareUrl } from "@/lib/referral/share-url";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import BackButton from "@/components/commons/back-button";
import { MarkdownPreview } from "@/components/commons/editor/markdown-preview";

type InkDBlog = {
    _id: string;
    title: string;
    description: string;
    externalLinks: string[];
    uploadedImageLinks: string[];
    uploadedVideoLinks: string[];
    ytVideoLinks: string[];
    linkedIndustries: { _id: string; name: string }[];
    createdAt: string | null;
    inkdInternalAgentName: string;
    seenAt?: string | null;
    lifetimeStats?: {
        seenTotal?: number;
        participationTotal?: number;
    };
};

type InkDTrialReward = {
    assetId: AssetType;
    amount: string;
    rewardAmountCap: string;
    currentDistribution: string;
    rewardType: "min" | "max";
    computedAmount: string;
};

type InkDTrial = {
    _id: string;
    title: string;
    description: string;
    resourceAssets: { type: "image" | "video" | "youtube"; value: string }[];
    rewards: InkDTrialReward[];
    alreadyCasted?: boolean;
};

function markdownToPlain(md: string): string {
    return String(md || "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
        .replace(/>\s?/g, "")
        .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function splitDescriptionForPreview(text: string): { first: string; rest: string } {
    const source = String(text ?? "").trim();
    if (!source) return { first: "", rest: "" };

    const parts = source
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    if (!parts.length) return { first: "", rest: "" };
    return {
        first: parts[0],
        rest: parts.slice(1).join("\n\n"),
    };
}

function estimateReadMinutes(text: string): number {
    const plain = markdownToPlain(text);
    const words = plain ? plain.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / 200));
}

function getYoutubeEmbedUrl(value: string): string {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (raw.includes("youtube.com/embed/")) return raw;

    const watchMatch = raw.match(/[?&]v=([^&]+)/);
    if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}`;

    const shortMatch = raw.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}`;

    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://www.youtube.com/embed/${encodeURIComponent(raw)}`;
}

function pickHeroMedia(blog: InkDBlog): {
    kind: "image" | "video" | "youtube" | "fallback";
    src: string;
} {
    const img = blog.uploadedImageLinks?.[0];
    if (img) return { kind: "image", src: img };

    const vid = blog.uploadedVideoLinks?.[0];
    if (vid) return { kind: "video", src: vid };

    const yt = blog.ytVideoLinks?.[0];
    if (yt) return { kind: "youtube", src: getYoutubeEmbedUrl(yt) };

    return { kind: "fallback", src: highbg };
}

function formatRewardToParent(r: InkDTrialReward): string {
    const spec = assetSpecs[r.assetId];
    const parentStr = unwrapString(
        amount({
            op: "toParent",
            assetId: r.assetId,
            value: r.computedAmount ?? "0",
            output: "string",
            trim: true,
            group: true,
        })
    );

    return `${parentStr} ${spec.parent}`;
}

function formatIndustryChip(name?: string) {
    if (!name) return "WEB3 & DEFI";
    return String(name).replace(/[-_]+/g, " ").toUpperCase();
}

function getReferenceLabel(url: string) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

export default function InkDBlogPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const blogId = String(id ?? "");
    const navigate = useNavigate();
    const [shareOpen, setShareOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const blogRoute = blogId ? endpoints.inkd.getInkdBlogsByIdNew(blogId) : "";
    const trailsRoute = blogId ? endpoints.inkd.getInkdBlogsTrails(blogId) : "";

    const { data: blogResp, isLoading: blogLoading } = useApiQuery(blogRoute, {
        enabled: !!blogRoute,
    } as any);

    const { data: trialsResp, isLoading: trialsLoading } = useApiQuery(trailsRoute, {
        enabled: !!trailsRoute,
    } as any);

    const blog: InkDBlog | null = useMemo(() => {
        const raw = blogResp?.data?.data ?? blogResp?.data ?? null;
        if (!raw) return null;

        return {
            _id: String(raw._id ?? ""),
            title: String(raw.title ?? ""),
            description: String(raw.description ?? ""),
            externalLinks: Array.isArray(raw.externalLinks) ? raw.externalLinks : [],
            uploadedImageLinks: Array.isArray(raw.uploadedImageLinks) ? raw.uploadedImageLinks : [],
            uploadedVideoLinks: Array.isArray(raw.uploadedVideoLinks) ? raw.uploadedVideoLinks : [],
            ytVideoLinks: Array.isArray(raw.ytVideoLinks) ? raw.ytVideoLinks : [],
            linkedIndustries: Array.isArray(raw.linkedIndustries) ? raw.linkedIndustries : [],
            createdAt: raw.createdAt ?? null,
            inkdInternalAgentName: String(raw.inkdInternalAgentName ?? ""),
            seenAt: raw.seenAt ?? null,
            lifetimeStats: raw.lifetimeStats ?? undefined,
        };
    }, [blogResp]);

    const trials: InkDTrial[] = useMemo(() => {
        const raw = trialsResp?.data?.data ?? trialsResp?.data ?? {};
        const list = raw.activeTrials ?? [];
        if (!Array.isArray(list)) return [];

        return list.map((t: any) => ({
            _id: String(t._id ?? ""),
            title: String(t.title ?? ""),
            description: String(t.description ?? ""),
            resourceAssets: Array.isArray(t.resourceAssets) ? t.resourceAssets : [],
            rewards: Array.isArray(t.rewards) ? t.rewards : [],
            alreadyCasted: Boolean(t.alreadyCasted),
        }));
    }, [trialsResp]);

    const heroMedia = useMemo(() => (blog ? pickHeroMedia(blog) : null), [blog]);
    const descriptionParts = useMemo(
        () => splitDescriptionForPreview(blog?.description ?? ""),
        [blog?.description]
    );
    const readMinutes = useMemo(() => estimateReadMinutes(blog?.description ?? ""), [blog?.description]);
    useMarkEntitySeenOnce(blog?._id ?? null, blog?.seenAt ?? null, useInkDBlogMarkSeen);

    const baseUrl = String(import.meta.env.VITE_CLIENT_URL);
    const externalAccountId =
        (user as any)?._id ??
        (user as any)?.id ??
        (user as any)?.externalAccountId ??
        null;

    const currentUrl = blog?._id
        ? buildInkDBlogShareUrl({
              baseUrl,
              inkdBlogId: blog._id,
              externalAccountId,
          })
        : String(new URL("/inkd", baseUrl));

    if (blogLoading && !blog) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#ececec]">
                <p className="text-sm text-black/60">Loading blog…</p>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#ececec]">
                <p className="text-sm text-red-600">Blog not found.</p>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Go back
                </Button>
            </div>
        );
    }

    const createdDate = blog.createdAt
        ? new Date(blog.createdAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : "";

    const chipLabel = formatIndustryChip(blog.linkedIndustries?.[0]?.name);

    return (
        <div className="min-h-screen bg-[#ececec] text-[#24304a]">
            <header
                className="relative h-[400px] 2xl:h-[500px] "
                style={{
                    background: "linear-gradient(135deg, #1E1A4D 0%, #0F172B 50%, #020618 100%)",
                }}
            >
                <BackButton className="absolute top-4 left-4 text-white w-14 h-10 cursor-pointer bg-white/10 rounded-full p-2 border border-white/20 hover:bg-white/50 transition-all duration-300 z-[100]" to="/inkd"/>
                <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
                    <button
                        className="text-white text-sm md:text-base cursor-pointer bg-white/10 rounded-full p-2 border border-white/20 hover:bg-white/50 transition-all duration-300"
                        onClick={() => setShareOpen(true)}
                    >
                        <span className="inline-flex items-center gap-1">
                            <Send className="h-3.5 w-3.5" />
                            Share
                        </span>
                    </button>
                    <button className="text-white text-sm md:text-base cursor-pointer bg-white/10 rounded-full p-2 border border-white/20 hover:bg-white/50 transition-all duration-300" onClick={() => navigate("/inkd")} >INKD home page</button>
                </div>
                <div className="absolute inset-0 opacity-[0.08]">
                    <div
                        className="h-full w-full"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                            backgroundSize: "72px 72px",
                        }}
                    />
                </div>

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(63,93,255,0.18),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(117,104,214,0.22),transparent_24%)]" />

                <div className="relative pl-4 2xl:pl-52 md:px-4 pb-[118px] pt-16 lg:px-8 lg:pb-[138px] lg:pt-10">
                    <div className="flex gap-2 lg:gap-8">
                        <div className="w-[620px] md:w-full max-w-[690px] pt-1 lg:pt-10">
                            <span className="inline-flex h-[24px] items-center rounded-full bg-[#2F6DFF] px-[10px] text-[10px] font-semibold tracking-[0.1em] text-white shadow-[0_6px_20px_rgba(47,109,255,0.32)]">
                                {chipLabel}
                            </span>

                            <h1 className="mt-5 font-serif text-[20px] font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-3xl xl:text-5xl">
                                {blog.title}
                            </h1>

                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/90 sm:text-[12px] lg:text-[13px]">
                            <span className="inline-flex items-center gap-1.5">
                                    <Eye className="h-[13px] w-[13px]" strokeWidth={1.8} />
                                    {blog.lifetimeStats?.seenTotal ?? 0} Views
                                </span> 
                                <span className="inline-flex  gap-1.5">
                                    <User2 className="h-[13px] w-[13px]" strokeWidth={1.8} />
                                    {blog.inkdInternalAgentName}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="h-[13px] w-[13px]" strokeWidth={1.8} />
                                    {createdDate}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-[13px] w-[13px]" strokeWidth={1.8} />
                                    {readMinutes} min read
                                </span>
                            </div>
                        </div>

                        <div className="h-[250px] md:h-[400px] 2xl:h-[750px] md:pl-10 md:-mt-16 2xl:-mt-24">
                            <img
                                src={inkdHero}
                                alt="InkD hero"
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[88px] sm:h-[102px] lg:h-[118px]">
                    <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="h-full w-full">
                        <path
                            d="M0,122 C120,134 230,136 360,125 C520,112 620,90 770,84 C945,77 1090,96 1220,102 C1315,106 1388,104 1440,100 L1440,160 L0,160 Z"
                            fill="#ececec"
                        />
                    </svg>
                </div>
            </header>

            <main className="relative z-10 mx-auto -mt-[50px] max-w-[1180px] px-4 pb-10 sm:px-6 md:-mt-[70px] lg:px-8 lg:pb-16">
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_286px] xl:grid-cols-[minmax(0,1fr)_306px] xl:gap-9">
                    <article className="min-w-0">
                        <div className="rounded-[10px] border border-[#d8d8d8] bg-white p-[12px] shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:rounded-[12px] sm:p-[16px] lg:p-[28px]">
                            <div className="overflow-hidden rounded-[10px] bg-[#dfe5ea] shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
                                {(heroMedia?.kind === "image" || heroMedia?.kind === "fallback") && (
                                    <img
                                        src={heroMedia.src}
                                        alt={blog.title}
                                        className="h-[170px] w-full object-contain sm:h-[240px] lg:h-[380px] xl:h-[400px]"
                                        loading="lazy"
                                    />
                                )}

                                {heroMedia?.kind === "video" && (
                                    <video
                                        src={heroMedia.src}
                                        className="h-[170px] w-full object-contain sm:h-[240px] lg:h-[380px] xl:h-[400px]" 
                                        playsInline
                                        muted
                                        autoPlay
                                    />
                                )}

                                {heroMedia?.kind === "youtube" && (
                                    <iframe
                                        src={heroMedia.src}
                                        title={blog.title}
                                        className="h-[170px] w-full sm:h-[240px] lg:h-[380px] xl:h-[400px]"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                )}
                            </div>

                            {descriptionParts.first && (
                                <div className="mt-5 rounded-[10px] bg-[#eef2fb] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(179,190,219,0.18)] lg:mt-6 lg:px-6 lg:py-5">
                                    <p className="border-l-[3px] border-[#2F6DFF] pl-5 font-serif text-[17px] leading-[1.68] text-[#313c57] sm:text-[18px] lg:text-[17px] xl:text-[18px]">
                                    <MarkdownPreview content={descriptionParts.first}/>
                                    </p>
                                </div>
                            )}

                            {descriptionParts.rest && (
                                <div className="mt-8 space-y-4 text-[12px] leading-[1.95] text-[#555e70] sm:text-[13px] lg:mt-8 lg:text-[13.5px] xl:text-[14px]">
                                    <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                    <MarkdownPreview content={descriptionParts.rest}/>
                                    </div>
                                </div>
                            )}

                            {blog.externalLinks?.length > 0 && (
                                <section className="mt-12 lg:mt-14">
                                    <h2 className="font-serif text-[18px] font-semibold text-[#2d3851]">
                                        References
                                    </h2>

                                    <ol className="mt-4 space-y-2.5 text-[10.5px] leading-[1.85] text-[#60697c] sm:text-[11px] lg:text-[11.5px]">
                                        {blog.externalLinks.map((href, idx) => (
                                            <li key={`${href}-${idx}`} className="flex items-start gap-2">
                                                <span className="mt-[1px] text-[#7b8396]">[{idx + 1}]</span>
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="break-all text-[#60697c] underline decoration-[#b9c3dc] underline-offset-2 hover:text-[#2F6DFF]"
                                                >
                                                    {getReferenceLabel(href)}
                                                </a>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}
                        </div>
                    </article>

                    <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
                        <div className="lg:max-h-[calc(100vh-42px)] lg:overflow-y-auto lg:pr-1">
                            <div className="pt-0 lg:pt-[66px]">
                                <div className="mb-4 flex items-start gap-3 lg:mb-5">
                                    <div className="mt-[2px] h-[42px] w-[3px] rounded-full bg-[#2F6DFF]" />
                                    <div>
                                        <h2 className="font-serif text-[20px] font-semibold leading-none text-[#2b3550] lg:text-[22px]">
                                            Trails
                                        </h2>
                                        <p className="mt-1.5 max-w-[250px] text-[10px] leading-[1.5] text-[#7f8798] lg:text-[10.5px]">
                                            Share your thoughts and earn coins! No right or wrong answers.
                                        </p>
                                    </div>
                                </div>

                                {trialsLoading && !trials.length ? (
                                    <div className="rounded-[14px] border border-[#d8dde8] bg-white p-5 text-sm text-[#6b7280] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                                        Loading trails...
                                    </div>
                                ) : !trials.length ? (
                                    <div className="rounded-[14px] border border-[#d8dde8] bg-white p-5 text-sm text-[#6b7280] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                                        No active trails for this blog yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {trials?.map((t) => (
                                            <div
                                                key={t._id}
                                                className="overflow-hidden rounded-[12px] border border-[#d6dbe8] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                                            >
                                                <div className="bg-[#3367F5] px-4 py-4 text-white">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="line-clamp-2 font-serif text-[17px] font-semibold leading-[1.3]">
                                                            {markdownToPlain(t.title)}
                                                        </h3>
                                                        <span
                                                            className={`inline-flex shrink-0 rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                                                                t.alreadyCasted
                                                                    ? "text-green-500"
                                                                    : "text-red-500"
                                                            }`}
                                                        >
                                                            {t.alreadyCasted ? "Completed" : "Incomplete"}
                                                        </span>
                                                    </div>
                                                    {/* <p className="mt-1.5 text-[10px] text-white/88">
                                                        10 Questions •
                                                    </p> */}
                                                </div>

                                                <div className="px-4 pb-4 pt-4">
                                                    <p className="line-clamp-3 text-[12px] leading-[1.8] text-[#70788b] -mt-8 -ml-4">
                                                    <RichTextPreview
                                                        content={t.description}
                                                    />
                                                    </p>

                                                    {t.rewards?.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#2F6DFF]">
                                                                Earning Potential
                                                            </p>

                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {t.rewards.map((r, idx) => {
                                                                    const spec = assetSpecs[r.assetId];
                                                                    return (
                                                                        <div
                                                                            key={`${t._id}-${r.assetId}-${idx}`}
                                                                            className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#d6dcea] bg-[#f7f8fc] px-2.5 text-[9.5px] font-medium text-[#4d566b]"
                                                                        >
                                                                            <img
                                                                                src={spec.img}
                                                                                alt={spec.name}
                                                                                className="h-3.5 w-3.5 rounded-full"
                                                                                loading="lazy"
                                                                            />
                                                                            <span>{formatRewardToParent(r)}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="mt-5 h-[44px] w-full rounded-[11px] border-[#ced6e4] bg-white font-serif text-[15px] font-semibold text-[#3d465d] shadow-none hover:bg-[#f7f9fd]"
                                                        onClick={() => navigate(`/trial/${t._id}`)}
                                                    >
                                                        Start Trail <span className="ml-1">→</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent className="max-w-xs rounded-md">
                    <AlertDialogHeader>
                        <DialogTitle>Share link</DialogTitle>
                        <DialogDescription />
                    </AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <Input id="link" value={currentUrl} readOnly />
                        <Button
                            className="bg-[#0DACAD] hover:bg-[#0dacadcc]"
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(currentUrl);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                        >
                            {copied ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                <Copy className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
