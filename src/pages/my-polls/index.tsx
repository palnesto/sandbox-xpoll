import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Copy, Check, Share } from "lucide-react";

import BackButton from "@/components/commons/back-button";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { heightStyles } from "@/styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { CardGridSkeleton } from "@/components/commons/FullScreenLoader";
import { buildShareUrl } from "@/lib/referral/share-url";
import { useAuth } from "@/hooks/useAuth";

type Reward = {
  assetId: string;
  amount: number;
  rewardAmountCap?: number;
  currentDistribution?: number;
  rewardType?: "max" | "flat" | string;
};

type MyPoll = {
  _id: string;
  title: string;
  expireRewardAt?: string | null;
  rewards?: Reward[];
  createdAt?: string;
  archivedAt?: string | null;
  totalViews?: number;
  totalVotes?: number;
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "--";

const isRewardExpired = (expireRewardAt?: string | null) => {
  if (!expireRewardAt) return false;
  return Date.parse(expireRewardAt) <= Date.now();
};

const getEntries = (raw: any): MyPoll[] => {
  const d = raw?.data?.data ?? raw?.data ?? raw ?? {};
  if (Array.isArray(d)) return d as MyPoll[];
  if (Array.isArray(d?.entries)) return d.entries as MyPoll[];
  return [];
};

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1 rounded-xl text-center bg-[#F7F7F7] px-2 py-3">
      <div className="text-xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[9px]">{label}</div>
    </div>
  );
}

function StatusPills({
  ended,
  rewardExpired,
}: {
  ended: boolean;
  rewardExpired: boolean;
}) {
  if (ended) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
          Ended
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end text-center gap-1 md:gap-2 w-fit">
      <span className="w-fit rounded-full bg-emerald-100 px-2 md:py-1 text-[11px] md:text-base font-semibold text-emerald-700 ring-1 ring-emerald-400">
        Active
      </span>
      {rewardExpired && (
        <span className="w-fit rounded-full bg-violet-50 px-2 py-1 text-[7px] md:text-sm font-semibold text-violet-700 ring-1 ring-violet-200">
          Reward expired
        </span>
      )}
    </div>
  );
}

export default function MyPollsPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // FIX: track which poll is being shared, instead of a single boolean
  const [sharePollId, setSharePollId] = useState<string | null>(null);

  const { user } = useAuth(); // who is sharing
  const { data, isLoading, isError } = useApiQuery(
    endpoints.poll.myPolls.getAllMyPolls,
  );
  const entries = useMemo(() => getEntries(data), [data]);

  // FIX: compute url for selected poll (keeps behavior the same, but now correct + prevents multiple dialogs)
  const currentUrl = useMemo(() => {
    const selected = sharePollId
      ? entries.find((e) => e._id === sharePollId)
      : null;

    const currentId = selected?._id;

    return currentId
      ? buildShareUrl("poll", {
          baseUrl: String(import.meta.env.VITE_CLIENT_URL),
          id: currentId,
          externalAccountId:
            (user as any)?._id ??
            (user as any)?.id ??
            (user as any)?.externalAccountId ??
            null,
        })
      : String(new URL("/feed/polls", String(import.meta.env.VITE_CLIENT_URL)));
  }, [entries, sharePollId, user]);

  return (
    <main style={heightStyles} className="p-3">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to="/profile" />
          <h1 className="text-lg font-semibold">My Polls</h1>
        </div>
        <Button
          className="rounded-full border border-black hover:bg-gray-100"
          variant={"ghost"}
          onClick={() => navigate("/add-polls")}
        >
          + Create
        </Button>
      </header>

      {isLoading && <CardGridSkeleton items={3} />}

      {!isLoading && (isError || entries.length === 0) && (
        <div className="mt-10 text-center text-sm text-black/60">
          {isError ? "Failed to load polls." : "No polls yet."}
        </div>
      )}

      <ul className="space-y-3">
        {entries.map((p) => {
          const ended = !!p.archivedAt;
          const rewardExpired = !ended && isRewardExpired(p.expireRewardAt);

          return (
            <li
              key={p._id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between">
                <h2 className="max-w-[70%] text-[15px] font-semibold leading-snug">
                  {p.title}
                </h2>
                <StatusPills ended={ended} rewardExpired={!!rewardExpired} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatTile value={p?.totalVotes ?? 0} label="Total Votes" />
                <StatTile value={p?.totalViews ?? 0} label="Total Views" />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-[12px] text-black/60">
                  {fmtDate(p.createdAt)}
                </div>
                <section className="flex items-center gap-4">
                  <button
                    onClick={() => setSharePollId(p._id)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/5 hover:bg-black/10"
                    aria-label="Open poll"
                    title="Open"
                  >
                    <Share className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/my-polls/${p._id}`)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/5 hover:bg-black/10"
                    aria-label="Open poll"
                    title="Open"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </section>

                <Dialog
                  open={sharePollId === p._id}
                  onOpenChange={(open) => {
                    if (!open) setSharePollId(null);
                  }}
                >
                  <DialogOverlay className="fixed inset-0 z-20 bg-transparent" />
                  <DialogContent className="max-w-xs rounded-md ">
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
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
