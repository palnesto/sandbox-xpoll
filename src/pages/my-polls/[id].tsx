import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { Progress } from "@/components/ui/progress";

import { amount, unwrapString } from "@/utils/currency-assets/base";
import { ASSETS, assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import BackButton from "@/components/commons/back-button";
import { ConfirmEndPoll } from "@/components/commons/delete-poll-modal";
import { RichTextPreview } from "@/components/commons/editor/preview";

type PollOption = {
  _id: string;
  text: string;
  numVotes: number;
  percentage: number; // 0..100
};

type RewardRow = {
  assetId: AssetType;
  amount: number; // base units
  rewardType: "max" | "min" | string;
  rewardAmountCap: number;
  currentDistribution: number;
  distributionPercentage?: number; // 0..100 (optional)
};

type PollByIdResponse = {
  _id: string;
  title: string;
  description?: string;
  createdAt?: string;
  archivedAt?: string | null;
  options: PollOption[];
  totals: { totalViews: number; totalVotes: number };
  rewards: RewardRow[];
  expireRewardAt?: string | null;
  target?: any;
};

const fmtPercent = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

const symForAsset = (a: AssetType) =>
  a === ASSETS.X_POLL ? "XPOLL" : assetSpecs[a].parentSymbol;

function OptionRow({ opt, idx }: { opt: PollOption; idx: number }) {
  const letter = String.fromCharCode("A".charCodeAt(0) + idx);
  return (
    <li className="flex items-center justify-between rounded-xl bg-[#F7F7F8] p-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <h2 className="grid h-7 w-7 place-items-center text-[12px] font-semibold">
          {letter})
        </h2>
        <p className="text-[13px]">{opt.text}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-[13px] font-semibold">
          {fmtPercent(opt.percentage)}
        </div>
        <div className="text-[11px] text-black/40">({opt.numVotes} votes)</div>
      </div>
    </li>
  );
}

function RewardCard({ r }: { r: RewardRow }) {
  const spec = assetSpecs[r.assetId];
  const symbol = symForAsset(r.assetId);

  const displayAmount = unwrapString(
    amount({
      op: "toParent",
      assetId: r.assetId,
      value: r.amount ?? 0,
      output: "string",
      trim: true,
      group: true,
    }),
  );

  const displayGivenOut = unwrapString(
    amount({
      op: "toParent",
      assetId: r.assetId,
      value: r.currentDistribution ?? 0,
      output: "string",
      trim: true,
      group: true,
    }),
  );

  const displayTotalPledged = unwrapString(
    amount({
      op: "toParent",
      assetId: r.assetId,
      value: r.rewardAmountCap ?? 0,
      output: "string",
      trim: true,
      group: true,
    }),
  );

  const left = unwrapString(
    amount({
      op: "toParent",
      assetId: r.assetId,
      value: Math.max(
        0,
        (r.rewardAmountCap ?? 0) - (r.currentDistribution ?? 0),
      ),
      output: "string",
      trim: true,
      group: true,
    }),
  );

  const pct =
    typeof r.distributionPercentage === "number"
      ? r.distributionPercentage
      : (r.rewardAmountCap ?? 0) > 0
        ? ((r.currentDistribution ?? 0) / (r.rewardAmountCap ?? 1)) * 100
        : 0;

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={spec.img}
            alt={symbol}
            className="h-9 w-9 rounded-full object-contain"
          />
          <div>
            <div className="text-[13px] font-semibold">{symbol}</div>
            <div className="text-[11px] text-black/60">
              {r.rewardType?.toLowerCase() === "min" ? "Min." : "Max."} Votes:{" "}
              {displayAmount}
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] font-semibold text-black/80">
          {fmtPercent(pct)}
          <br /> Distributed
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#F7F7F7] px-4 py-3 text-center">
          <p className="text-sm font-bold">{displayGivenOut}</p>
          <p className="mt-1 text-[11px] text-black/60">Given Out</p>
        </div>
        <div className="rounded-xl bg-[#F7F7F7] px-4 py-3 text-center">
          <p className="text-sm font-bold">{displayTotalPledged}</p>
          <p className="mt-1 text-[11px] text-black/60">Total Pledged</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <Progress
          value={Math.max(0, Math.min(100, pct))}
          className="h-2 bg-gray-200 [&>div]:bg-[#25FBEC]"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-black/60">
          <span>{displayGivenOut}</span>
          <span>{left} Left</span>
        </div>
      </div>
    </li>
  );
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1 rounded-xl bg-[#F7F7F8] px-4 py-3 text-center">
      <div className="text-xl font-medium leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-black/60">{label}</div>
    </div>
  );
}

export default function MyPollDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useApiQuery(
    id ? endpoints.poll.myPolls.getMyPollById(id) : "",
    { enabled: !!id },
  );

  // ✅ directly use `data?.data?.data`
  const poll: PollByIdResponse | null = useMemo(
    () => (data as any)?.data?.data ?? null,
    [data],
  );

  return (
    <main className="min-h-screen space-y-7">
      {/* Header */}
      <header className="px-2 py-4 flex justify-between bg-white rounded-b-xl shadow-sm">
        <section className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-[15px] font-semibold">
            {poll?.title ?? (isLoading ? "Loading…" : "Poll")}
          </h1>
        </section>
        {id && <ConfirmEndPoll id={id} onEnded={() => navigate(-1)} />}
      </header>

      {/* Description */}
      {poll?.description && (
        <p className="text-[12px] leading-relaxed text-black/70 px-2">
          <RichTextPreview content={poll.description ?? ""} />
        </p>
      )}

      {/* Voting Results */}
      <section className="m-2 rounded-2xl bg-white p-3">
        <h2 className="pb-2 text-[15px] font-medium">Voting Results</h2>
        <ul className="space-y-2">
          {(poll?.options ?? []).map((opt, i) => (
            <OptionRow key={opt._id} opt={opt} idx={i} />
          ))}
        </ul>
      </section>

      {/* Engagement */}
      <section className="m-2 rounded-2xl bg-white p-3">
        <h2 className="pb-2 text-[15px] font-medium">Engagement</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatTile value={poll?.totals?.totalViews ?? 0} label="Views" />
          <StatTile value={poll?.totals?.totalVotes ?? 0} label="Votes" />
        </div>
      </section>

      {/* Reward Distribution */}
      <section className="p-2">
        <h2 className="pb-2 text-[15px] font-medium">Reward Distribution</h2>

        {isLoading && (
          <ul className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <li
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-white/60"
              />
            ))}
          </ul>
        )}

        {!isLoading && isError && (
          <div className="py-8 text-center text-sm text-black/60">
            Failed to load rewards.
          </div>
        )}

        {!isLoading && !isError && (
          <ul className="space-y-2">
            {(poll?.rewards ?? []).map((r, idx) => (
              <RewardCard key={`${r.assetId}-${idx}`} r={r} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
