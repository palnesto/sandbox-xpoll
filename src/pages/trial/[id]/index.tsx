import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlarmClockPlus,
  Copy,
  Check,
  MessageCircle,
  Send,
  MoveLeft,
} from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import CommonButton from "@/components/commons/CommonButton";
import { CommentsBox } from "@/components/swipe-factory/comments/comments-box";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { heightStyles } from "@/styles";
import { PollCardSkeleton } from "@/components/commons/FullScreenLoader";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { useAuth } from "@/hooks/useAuth";
import { useMarkEntitySeenOnce, useTrialMarkSeen } from "@/hooks/use-mark-seen";
import {
  buildCampaignShareUrl,
  buildInkDTrialShareUrl,
  buildTrialShareUrl,
} from "@/lib/referral/share-url";
import { truncateText } from "@/utils/truncateWords";
import { useCountdown } from "@/hooks/countdown";
import { extractYouTubeId } from "@/types/petition";
import TrialAccessBlocked from "@/components/trial/trial-access-blocked";
import BackButton from "@/components/commons/back-button";

type Reward = {
  assetId: AssetType;
  amount: number;
  computedReward: string;
};

type Poll = {
  _id: string;
  title: string;
  description?: string;
  resourceAssets: { type: string; value: string }[];
  options: { _id: string; text: string }[];
};

type Trial = {
  _id: string;
  title: string;
  description?: string;
  resourceAssets: { type: string; value: string }[];
  rewards: Reward[];
  expireRewardAt?: string | null;
  belongsToCampaignId?: string | null;
  belongsToInkDBlogId?: string | null;
  seenAt?: string | null;
  externalAuthor?: { username?: string } | string | null;
  isForAdmin?: boolean;
};

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return isDesktop;
}

export default function TrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: meData } = useApiQuery(endpoints.profile.me);
  const me = useMemo(() => meData?.data?.data ?? null, [meData]);
  const { data, isLoading, isError } = useApiQuery(
    endpoints.trial.getTrialById(id!),
    { enabled: !!id },
  );

  const filteredData = useMemo(() => data?.data?.data ?? null, [data]);
  const isAccessBlocked = filteredData?.accessible === false;
  const blockedMessage = data?.data?.message || "This trail is not available.";
  const trial: Trial | null = useMemo(
    () => filteredData?.trial ?? null,
    [filteredData],
  );
  useMarkEntitySeenOnce(
    trial?._id ?? null,
    filteredData?.seenAt ?? null,
    useTrialMarkSeen,
  );
  const timeLeft = useCountdown(trial?.expireRewardAt);
  const externalAuthorObj =
    filteredData?.trial?.externalAuthor &&
    typeof filteredData.trial.externalAuthor === "object"
      ? (filteredData.trial.externalAuthor as { username?: string })
      : null;
  const authorLabel = externalAuthorObj?.username
    ? `Trail by ${externalAuthorObj.username}`
    : "Trail by admin";

  const polls: Poll[] = useMemo(
    () => filteredData?.polls ?? [],
    [filteredData],
  );

  if (isLoading) {
    return <PollCardSkeleton />;
  }

  if (isAccessBlocked) {
    return (
      <TrialAccessBlocked
        message={blockedMessage}
        onBackToTrials={() => navigate("/trial")}
        onGoHome={() => navigate("/")}
      />
    );
  }

  if (isError || !trial) {
    return <p className="text-center text-red-500">Failed to load trial.</p>;
  }

  const currentId = trial?._id;
  const belongsToCampaignId = trial?.belongsToCampaignId;

  const baseUrl = String(import.meta.env.VITE_CLIENT_URL);
  const externalAccountId =
    user?._id ?? user?.id ?? user?.externalAccountId ?? null;

  const currentUrl = currentId
    ? trial?.belongsToInkDBlogId
      ? buildInkDTrialShareUrl({
          baseUrl,
          trialId: currentId,
          externalAccountId,
        })
      : belongsToCampaignId
      ? buildCampaignShareUrl({
          baseUrl,
          campaignId: belongsToCampaignId,
          trialId: currentId,
          externalAccountId,
        })
      : buildTrialShareUrl({
          baseUrl,
          trialId: currentId,
          externalAccountId,
        })
    : String(new URL("/trial", baseUrl));

  const comments = trial?._id && (
    <CommentsBox
      entityType="trial"
      entityId={trial._id}
      heightClass={cn("", {
        "h-full": isDesktop,
        "h-[420px]": !isDesktop,
      })}
      className={"h-full"}
      pageSize={10}
      repliesPageSize={3}
      showOptimisticUser
      onSubmitRoot={async (payload) => console.log("create root", payload)}
      onSubmitReply={async (rootId, payload) =>
        console.log("create reply", { rootId, ...payload })
      }
      onToggleLike={async (commentId, like) =>
        console.log("toggle like", { commentId, like })
      }
    />
  );

  return (
    <div
      style={heightStyles}
      className="px-4 space-y-4 bg-white overflow-y-auto"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
        <span className="flex gap-2">
          <BackButton
            onClick={() => {
              const inkdBlogId = trial?.belongsToInkDBlogId;
              if (inkdBlogId) {
                navigate(`/inkd/inkd-blog/${inkdBlogId}`);
                return;
              }
              const campaignId = trial?.belongsToCampaignId;
              if (campaignId) {
                navigate(`/campaigns/all-campaigns/${campaignId}`);
              } else {
                navigate("/trial");
              }
            }} 
          />

          {filteredData?.campaign?.name && (
            <h1 className="text-lg font-semibold text-black">
              Campaign Name : {truncateText(filteredData.campaign?.name, 20)}
            </h1>
          )}
        </span>

        {!filteredData?.campaign?.name && trial?.expireRewardAt && (
          <span className="text-[12px] flex items-center gap-1 tracking-widest  bg-white px-2 py-[4px] rounded-full">
            <AlarmClockPlus className="w-4 h-4" />
            {timeLeft}
          </span>
        )}
      </header>
      <section className="overflow-hidden">
        <figure className="relative w-full">
          {(() => {
            const first = trial?.resourceAssets?.[0];
            if (!first?.value) {
              return (
                <img
                  src="/images/placeholder.png"
                  alt={trial?.title ?? "Trial"}
                  className="w-full h-80 rounded-xl border object-cover"
                />
              );
            }
            if (first.type === "image") {
              return (
                <img
                  src={first.value}
                  alt={trial?.title ?? "Trial"}
                  className="w-full h-80 rounded-xl border object-cover"
                />
              );
            }
            if (first.type === "video") {
              return (
                <video
                  src={first.value}
                  controls
                  playsInline
                  loop
                  autoPlay
                  muted
                  className="w-full aspect-video rounded-xl border bg-black object-contain"
                />
              );
            }
            if (first.type === "youtube") {
              const videoId = extractYouTubeId(first.value);
              if (!videoId) {
                return (
                  <img
                    src="/images/placeholder.png"
                    alt={trial?.title ?? "Trial"}
                    className="w-full h-44 rounded-xl border object-cover"
                  />
                );
              }
              return (
                <div className="w-full aspect-video rounded-xl border overflow-hidden bg-black">
                  <iframe
                    title="YouTube video"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&rel=0&playsinline=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }
            return (
              <img
                src="/images/placeholder.png"
                alt={trial?.title ?? "Trial"}
                className="w-full h-44 rounded-xl border object-cover"
              />
            );
          })()}
          <figcaption className="absolute top-1 left-2 bg-gray-100 rounded-full px-2 py-1">
            {polls?.length} Polls
          </figcaption>
        </figure>
        <div className="py-7">
          <p className="font-semibold text-gray-700 uppercase tracking-wide mb-1">
            {authorLabel}
          </p>
          <h1 className="text-lg font-semibold">Trail Name : {trial?.title}</h1>
          <p className="text-lg -mt-4 -ml-4">
            <RichTextPreview content={trial?.description ?? ""} />
          </p>

          <section className="pt-7">
            <div className="text-lg text-[#343434] font-medium mb-2">
              REWARDS (LEVEL {me?.profile?.level})
            </div>
            <div className="flex flex-wrap gap-2">
              {trial?.rewards?.map((r, idx) => {
                const spec = assetSpecs[r.assetId];
                if (!spec) return null;
                const formatted = unwrapString(
                  amount({
                    op: "toParent",
                    assetId: r.assetId,
                    value: r.computedReward,
                    output: "string",
                    trim: true,
                    group: false,
                  }),
                );

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-2"
                  >
                    <img src={spec.img} alt={spec.name} className="h-6" />
                    <span className="font-semibold">{formatted}</span>
                    <span>{spec.parent}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
      <section className="flex items-center gap-5 pb-4">
        <Button
          className={`px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100 cursor-pointer`}
          onClick={() => {
            setCommentsOpen(true);
          }}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          className={`px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100 cursor-pointer`}
          onClick={() => setShareOpen(true)}
        >
          <Send className="h-4 w-4" />
        </Button>
        <CommonButton
          text="START POLLING"
          onClick={() => navigate(`/trial/${trial?._id}/polls`)}
        />
      </section>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-xs rounded-md">
          <AlertDialogHeader>
            <DialogTitle>Share link</DialogTitle>
            <DialogDescription></DialogDescription>
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
      {trial?._id && (
        <>
          {isDesktop ? (
            <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
              <SheetContent
                side="right"
                className="p-0 w-[480px] sm:w-[560px] rounded-tl-3xl rounded-bl-3xl"
              >
                {comments}
              </SheetContent>
            </Sheet>
          ) : (
            <Drawer open={commentsOpen} onOpenChange={setCommentsOpen}>
              <DrawerContent className="mx-1 [&>div:first-child]:hidden rounded-t-2xl rounded-b-[35px]">
                <div className="w-full">{comments}</div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}
    </div>
  );
}
