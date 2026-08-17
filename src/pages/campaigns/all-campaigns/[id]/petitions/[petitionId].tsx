import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import {
  ArrowLeft,
  SquareChartGantt,
  Link as LinkIcon,
  CopyCheck,
  Send,
} from "lucide-react";

import { useIsBeforeLg } from "@/hooks/use-mobile";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import apiInstance, { BASE_URL } from "@/api/queryClient";
import { truncateText } from "@/utils/truncateWords";
import { RichTextPreview } from "@/components/commons/editor/preview";

type Vote = "yes" | "no";

type VoteCountCache = {
  yes?: number;
  no?: number;
};

function safeNum(n: unknown) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v < 0 ? 0 : v;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function firstStr(v: any): string | null {
  if (!Array.isArray(v)) return null;
  const x = v[0];
  if (!x) return null;
  return String(x);
}

function normalizeLinks(v: any): string[] {
  if (!Array.isArray(v)) return [];
  // IMPORTANT: keep duplicates if API has duplicates (you asked to show icon count = array length)
  return v
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

function PetitionMedia({
  petition,
  containerClassName,
  campaignId,
  petitionId,
}: {
  petition: any;
  containerClassName: string;
  campaignId?: string;
  petitionId?: string;
}) {
  const img = firstStr(petition?.uploadedImageLinks);
  const vid = firstStr(petition?.uploadedVideoLinks);
  const yt = firstStr(petition?.ytVideoLinks);

  const shareUrl = useMemo(() => {
    if (!campaignId || !petitionId) return "";
    const base = String(import.meta.env.VITE_CLIENT_URL || "").replace(
      /\/+$/,
      "",
    );
    return `${base}/campaigns/all-campaigns/${campaignId}/petitions/${petitionId}`;
  }, [campaignId, petitionId]);

  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current)
        window.clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const onShare = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      if (copiedTimeoutRef.current)
        window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(
        () => setCopied(false),
        2000,
      );
    } catch {
      // fallback for older browsers / permission issues
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        if (copiedTimeoutRef.current)
          window.clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = window.setTimeout(
          () => setCopied(false),
          2000,
        );
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-gray-200 overflow-hidden",
        containerClassName,
      )}
    >
      {shareUrl ? (
        <button
          type="button"
          onClick={onShare}
          className={cn(
            "absolute right-2 top-2 z-20 inline-flex items-center md:gap-2 rounded-full bg-black/25 border-t border-b px-2 py-1 md:px-7 md:py-3 font-semibold text-xs md:text-base text-white shadow-sm backdrop-blur hover:bg-neutral-600",
          )}
          aria-label={copied ? "Copied" : "Share"}
        >
          {copied ? (
            <>
              <CopyCheck className="h-4 w-4" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Share</span>
            </>
          )}
        </button>
      ) : null}

      {img ? (
        <img src={img} alt="" className="h-full w-full object-cover" />
      ) : vid ? (
        <video
          src={vid}
          controls
          playsInline
          loop
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
      ) : yt ? (
        <iframe
          title="YouTube"
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${encodeURIComponent(
            yt,
          )}?rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : null}
    </div>
  );
}

function ExternalLinksIcons({ links }: { links: string[] }) {
  if (!links?.length) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {links.map((href, i) => (
        <a
          key={`${i}-${href}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full border hover:bg-black/5"
          aria-label={`Open external link ${i + 1}`}
          title={href}
        >
          <LinkIcon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

function VoteDistribution({
  voteCountCache,
  userVote,
  animate = false,
}: {
  voteCountCache?: VoteCountCache | null;
  userVote?: Vote | null;
  animate?: boolean;
}) {
  const yesCount = safeNum(voteCountCache?.yes);
  const noCount = safeNum(voteCountCache?.no);
  const total = yesCount + noCount;

  const yesPct = pct(yesCount, total);
  const noPct = pct(noCount, total);

  const [barYes, setBarYes] = useState<number>(animate ? 0 : yesPct);
  const [barNo, setBarNo] = useState<number>(animate ? 0 : noPct);
  const [mounted, setMounted] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setBarYes(yesPct);
      setBarNo(noPct);
      setMounted(true);
      return;
    }

    setMounted(false);
    setBarYes(0);
    setBarNo(0);

    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setBarYes(yesPct);
      setBarNo(noPct);
    });

    return () => cancelAnimationFrame(raf);
  }, [animate, yesPct, noPct]);

  return (
    <div
      className={cn(
        "mt-8",
        "transition-all duration-500 ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <div className="flex items-center justify-between text-sm text-black/70">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#0EA5A5]">Yes</span>
          <span className="text-black/50">
            {yesCount} ({yesPct}%)
          </span>
          {userVote === "yes" ? (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E6FAFA] text-[#0EA5A5]">
              Your vote
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {userVote === "no" ? (
            <span className="mr-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              Your vote
            </span>
          ) : null}
          <span className="font-semibold text-red-600">No</span>
          <span className="text-black/50">
            {noCount} ({noPct}%)
          </span>
        </div>
      </div>

      <div className="mt-3 h-3 w-full rounded-full overflow-hidden bg-black/10">
        <div className="h-full flex w-full">
          <div
            className="h-full bg-[#0EA5A5] transition-[width] duration-700 ease-out"
            style={{ width: `${barYes}%` }}
          />
          <div
            className="h-full bg-red-600 transition-[width] duration-700 ease-out"
            style={{ width: `${barNo}%` }}
          />
        </div>
      </div>

      <div className="mt-2 text-xs text-black/40">Total votes: {total}</div>
    </div>
  );
}

/**
 * No useMutation: POST via disabled useQuery + ref payload, then we refetch GETs.
 */
function usePetitionCastVote() {
  const payloadRef = useRef<{ petitionId: string; vote: Vote } | null>(null);

  const q = useQuery({
    queryKey: ["petitionCastVote"],
    enabled: false,
    retry: false,
    queryFn: async () => {
      const payload = payloadRef.current;
      if (!payload?.petitionId) throw new Error("Missing petitionId");
      return apiInstance.post(
        `${BASE_URL}${endpoints.campaigns.petitions.castVote}`,
        payload,
      );
    },
  });

  const castVote = async (petitionId: string, vote: Vote) => {
    payloadRef.current = { petitionId, vote };
    return q.refetch();
  };

  return { castVote, isCasting: q.isFetching };
}
function hasNonEmptyString(arr: any): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.some((x) => typeof x === "string" && x.trim().length > 0);
}

function hasAnyMedia(petition: any): boolean {
  return (
    hasNonEmptyString(petition?.uploadedImageLinks) ||
    hasNonEmptyString(petition?.uploadedVideoLinks) ||
    hasNonEmptyString(petition?.ytVideoLinks)
  );
}

function DesktopView({ campaignId }: { campaignId?: string }) {
  const navigate = useNavigate();
  const { id, petitionId } = useParams();

  const petitionsListingRoute = useMemo(() => {
    if (!id) return "";
    return `${endpoints.campaigns.getPetitionsListings}?page=1&pageSize=20&belongsToCampaignId=${id}`;
  }, [id]);

  const { data: allPetitions, refetch: refetchPetitionsList } = useApiQuery(
    petitionsListingRoute,
    { enabled: Boolean(petitionsListingRoute) },
  );

  const petitions: any[] = allPetitions?.data?.data?.entries ?? [];

  const petitionByIdRoute = useMemo(() => {
    if (!petitionId) return "";
    return endpoints.campaigns.getPetitionById(petitionId);
  }, [petitionId]);

  const { data: petitionData, refetch: refetchPetition } = useApiQuery(
    petitionByIdRoute,
    { enabled: Boolean(petitionByIdRoute) },
  );

  const petition = petitionData?.data?.data;
  const alreadyCasted = petition?.alreadyCasted;
  const hasCasted = alreadyCasted?.status === true;
  const canVote = alreadyCasted?.status === false;

  const externalLinks = useMemo(
    () => normalizeLinks(petition?.externalLinks),
    [petition?.externalLinks],
  );

  const userVote: Vote | null =
    alreadyCasted?.vote === "yes" || alreadyCasted?.vote === "no"
      ? alreadyCasted.vote
      : null;

  const voteCountCache: VoteCountCache | null =
    petition?.voteCountCache && typeof petition.voteCountCache === "object"
      ? petition.voteCountCache
      : null;

  const { castVote, isCasting } = usePetitionCastVote();

  const [justVoted, setJustVoted] = useState<{
    petitionId: string;
    vote: Vote;
  } | null>(null);

  const animateResults = hasCasted && justVoted?.petitionId === petitionId;

  useEffect(() => {
    if (animateResults) {
      const t = setTimeout(() => setJustVoted(null), 1200);
      return () => clearTimeout(t);
    }
  }, [animateResults]);

  const afterVote = async () => {
    await Promise.allSettled([refetchPetition(), refetchPetitionsList()]);
  };

  return (
    <main className="bg-white h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/campaigns/all-campaigns/${campaignId}`)}
            className="p-2 rounded-full border hover:bg-black/5"
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <h1 className="text-lg font-semibold">Petitions</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[240px_1fr]">
        <aside className="bg-[#F2F3F5] border-r h-full overflow-auto">
          {petitions.map((p) => {
            const active = p._id === petitionId;
            return (
              <button
                key={p._id}
                onClick={() =>
                  navigate(`/campaigns/all-campaigns/${id}/petitions/${p._id}`)
                }
                className={cn(
                  "w-full py-6 text-left text-xs font-medium flex gap-2 items-start",
                  active
                    ? p?.alreadyCasted?.vote === "yes"
                      ? "border-l-8 border-l-blue border-b-2 border-b-blue px-3"
                      : p?.alreadyCasted?.vote === "no"
                        ? "border-l-8 border-l-red-600 border-b-2 border-b-red-600 px-3"
                        : "border-l-8 border-l-black/60 border-b-2 border-b-black/60 px-3"
                    : "border-b border-b-slate-500 px-5",
                  p?.alreadyCasted?.vote === "yes"
                    ? "text-[#0EA5A5]"
                    : p?.alreadyCasted?.vote === "no"
                      ? "text-red-600"
                      : "text-black/60",
                )}
              >
                <SquareChartGantt className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="w-full">{truncateText(p?.name, 20)}</span>
              </button>
            );
          })}
        </aside>

        <section className="h-full overflow-auto">
          <div className="px-10 py-8 max-w-4xl space-y-4 mx-auto">
            {hasAnyMedia(petition) ? (
              <PetitionMedia
                petition={petition}
                containerClassName="h-[280px] mb-6"
                campaignId={id}
                petitionId={petitionId}
              />
            ) : null}

            <h2 className="text-4xl font-semibold">{petition?.name ?? ""}</h2>

            <div className="text-black/70 leading-6 -ml-3">
              <RichTextPreview content={petition?.description ?? ""} />
            </div>
            <section className="flex items-center gap-2">
              <ExternalLinksIcons links={externalLinks} />
            </section>
            {hasCasted ? (
              <VoteDistribution
                voteCountCache={voteCountCache}
                userVote={userVote}
                animate={animateResults}
              />
            ) : (
              <div className="mt-8 flex gap-6">
                <button
                  disabled={!canVote || isCasting || !petitionId}
                  onClick={async () => {
                    if (!petitionId || !canVote) return;
                    const res = await castVote(petitionId, "yes");
                    if (res.isSuccess) {
                      setJustVoted({ petitionId, vote: "yes" });
                      await afterVote();
                    }
                  }}
                  className={cn(
                    "px-8 py-3 rounded-full border font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
                    "border-[#0EA5A5] text-[#0EA5A5] hover:bg-[#E6FAFA]",
                  )}
                >
                  Yes, I sign this
                </button>

                <button
                  disabled={!canVote || isCasting || !petitionId}
                  onClick={async () => {
                    if (!petitionId || !canVote) return;
                    const res = await castVote(petitionId, "no");
                    if (res.isSuccess) {
                      setJustVoted({ petitionId, vote: "no" });
                      await afterVote();
                    }
                  }}
                  className={cn(
                    "px-8 py-3 rounded-full border font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
                    "border-[#0EA5A5] text-[#111] hover:bg-red-50",
                  )}
                >
                  No
                </button>
              </div>
            )}

            {!alreadyCasted && petition ? (
              <div className="mt-4 text-sm text-black/40">
                Loading vote status…
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function dropdownToneClass(_: any) {
  return "bg-[#ECECEC] text-black/80";
}

function MobileView({ campaignId }: { campaignId?: string }) {
  const navigate = useNavigate();
  const { id, petitionId } = useParams();

  const petitionsListingRoute = useMemo(() => {
    if (!id) return "";
    return `${endpoints.campaigns.getPetitionsListings}?page=1&pageSize=50&belongsToCampaignId=${id}`;
  }, [id]);

  const { data: allPetitions, refetch: refetchPetitionsList } = useApiQuery(
    petitionsListingRoute,
    { enabled: Boolean(petitionsListingRoute) },
  );

  const petitions: any[] = allPetitions?.data?.data?.entries ?? [];
  const activePetitionId = petitionId || petitions?.[0]?._id || "";

  const petitionByIdRoute = useMemo(() => {
    if (!activePetitionId) return "";
    return endpoints.campaigns.getPetitionById(activePetitionId);
  }, [activePetitionId]);

  const { data: petitionData, refetch: refetchPetition } = useApiQuery(
    petitionByIdRoute,
    { enabled: Boolean(petitionByIdRoute) },
  );

  const petition = petitionData?.data?.data;
  const alreadyCasted = petition?.alreadyCasted;
  const hasCasted = alreadyCasted?.status === true;
  const canVote = alreadyCasted?.status === false;

  const externalLinks = useMemo(
    () => normalizeLinks(petition?.externalLinks),
    [petition?.externalLinks],
  );

  const userVote: Vote | null =
    alreadyCasted?.vote === "yes" || alreadyCasted?.vote === "no"
      ? alreadyCasted.vote
      : null;

  const voteCountCache: VoteCountCache | null =
    petition?.voteCountCache && typeof petition.voteCountCache === "object"
      ? petition.voteCountCache
      : null;

  const { castVote, isCasting } = usePetitionCastVote();

  const [justVoted, setJustVoted] = useState<{
    petitionId: string;
    vote: Vote;
  } | null>(null);

  const animateResults =
    hasCasted && justVoted?.petitionId === activePetitionId;

  useEffect(() => {
    if (animateResults) {
      const t = setTimeout(() => setJustVoted(null), 1200);
      return () => clearTimeout(t);
    }
  }, [animateResults]);

  const afterVote = async () => {
    await Promise.allSettled([refetchPetition(), refetchPetitionsList()]);
  };

  return (
    <main className="bg-white min-h-screen">
      <header className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/campaigns/all-campaigns/${campaignId}`)}
            className="p-2 rounded-full hover:bg-black/5"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Petition</h1>
        </div>
      </header>

      <div className="px-4 pb-6">
        <div className="mt-1">
          <Select
            value={activePetitionId}
            onValueChange={(newPetitionId) => {
              navigate(
                `/campaigns/all-campaigns/${id}/petitions/${newPetitionId}`,
              );
            }}
          >
            <SelectTrigger
              className={cn(
                "h-11 rounded-full px-4 border shadow-none ring-0 focus:ring-0 focus:ring-offset-0",
                hasCasted
                  ? userVote === "yes"
                    ? "bg-[#0EA5A5] text-white"
                    : userVote === "no"
                      ? "bg-red-700 text-white"
                      : "bg-[#ECECEC] text-black/80"
                  : dropdownToneClass(null),
              )}
            >
              <SelectValue placeholder="Select petition" />
            </SelectTrigger>

            <SelectContent className="mt-2 rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
              {petitions?.map((p) => {
                const vote = p?.alreadyCasted?.vote;

                const base =
                  vote === "yes"
                    ? "text-[#0EA5A5]"
                    : vote === "no"
                      ? "text-red-600"
                      : "text-black/60";

                const highlighted =
                  vote === "yes"
                    ? "data-[highlighted]:!text-[#0EA5A5]"
                    : vote === "no"
                      ? "data-[highlighted]:!text-red-600"
                      : "data-[highlighted]:!text-black/60";

                return (
                  <SelectItem
                    key={p._id}
                    value={p._id}
                    className={cn(
                      "rounded-xl py-3 text-[12px] font-semibold uppercase tracking-wider transition-colors",
                      "data-[highlighted]:bg-black/5",
                      base,
                      highlighted,
                    )}
                  >
                    {truncateText(p?.name, 20)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {hasAnyMedia(petition) ? (
          <PetitionMedia
            petition={petition}
            containerClassName="mt-4 h-[190px]"
            campaignId={id}
            petitionId={activePetitionId}
          />
        ) : null}

        <div className="mt-4">
          <h2 className="text-xl font-bold text-[#111]">
            {petition?.name ?? "—"}
          </h2>

          <div className="space-y-4 text-[15px] text-black/70 -ml-3.5 mb-4">
            <RichTextPreview content={petition?.description ?? ""} />
          </div>
          <section className="flex items-center gap-2">
            <ExternalLinksIcons links={externalLinks} />
          </section>
          {hasCasted ? (
            <VoteDistribution
              voteCountCache={voteCountCache}
              userVote={userVote}
              animate={animateResults}
            />
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <button
                disabled={!canVote || isCasting || !activePetitionId}
                onClick={async () => {
                  if (!activePetitionId || !canVote) return;
                  const res = await castVote(activePetitionId, "yes");
                  if (res.isSuccess) {
                    setJustVoted({ petitionId: activePetitionId, vote: "yes" });
                    await afterVote();
                  }
                }}
                className={cn(
                  "w-full rounded-full border px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
                  "border-[#0EA5A5] text-[#0EA5A5] hover:bg-[#E6FAFA]",
                )}
              >
                Yes, I sign this
              </button>

              <button
                disabled={!canVote || isCasting || !activePetitionId}
                onClick={async () => {
                  if (!activePetitionId || !canVote) return;
                  const res = await castVote(activePetitionId, "no");
                  if (res.isSuccess) {
                    setJustVoted({ petitionId: activePetitionId, vote: "no" });
                    await afterVote();
                  }
                }}
                className={cn(
                  "w-full rounded-full border px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
                  "border-[#0EA5A5] text-[#111] hover:bg-black/5",
                )}
              >
                No
              </button>
            </div>
          )}

          {!alreadyCasted && petition ? (
            <div className="mt-4 text-sm text-black/40">
              Loading vote status…
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function CampaignPetitionsPage() {
  const { id } = useParams();
  const isBeforeLg = useIsBeforeLg();

  if (isBeforeLg) return <MobileView campaignId={id} />;
  return <DesktopView campaignId={id} />;
}
