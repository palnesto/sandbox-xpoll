import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "@/components/commons/back-button";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { MoveRight, X } from "lucide-react";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { truncateText } from "@/utils/truncateWords";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";
type PollOption = { text?: string; votes?: number; pct?: number };
type PollItem = {
  title?: string;
  description?: string;
  options?: PollOption[];
};
const safeArr = (v: any) => (Array.isArray(v) ? v : []);

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function convertRewardAmountToParent(assetId: AssetType, raw: any): string {
  if (!assetId) return "0";
  const rawStr = raw == null ? "0" : String(raw);

  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: rawStr,
      output: "string",
      trim: true,
      group: false,
    }),
    "0",
  );
}

function PollRow({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <section
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-200 px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
    >
      <div className="text-sm font-medium text-[#111]">
        {truncateText(title, 25)}
      </div>
      <div className="h-9 w-14 rounded-full border border-gray-700 bg-gray-50 flex items-center justify-center group-hover:bg-black/5">
        <MoveRight className="h-4 w-4 text-[#111]" />
      </div>
    </section>
  );
}

const alphaLabel = (i: number) => String.fromCharCode(65 + i);

function VotingResultsModal({
  open,
  poll,
  onClose,
}: {
  open: boolean;
  poll: PollItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !poll) return null;

  const options = safeArr(poll.options);
  const totalVotes = options.reduce(
    (sum: number, o: any) => sum + toNum(o?.votes),
    0,
  );

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <section className="w-full max-w-xl bg-white rounded-[26px] shadow-2xl overflow-y-auto p-5">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-black">Overview</h1>

            <button
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-white border border-black/10 hover:bg-black/5 flex items-center gap-2"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <section className="">
            <h1 className="font-semibold text-lg">{poll?.title ?? "Poll"}</h1>
            <p className="text-lg font-semibold text-gray-700 -mt-4 -ml-4">
              <RichTextPreview content={poll?.description ?? ""} />
            </p>
            <h2 className="text-lg font-semibold text-[#111]">
              Voting Results
            </h2>

            <div className="mt-5 space-y-3">
              {options.length === 0 ? (
                <div className="text-sm text-black/50">No options found.</div>
              ) : (
                options?.map((o: any, idx: number) => {
                  const pct = toNum(o?.pct);
                  const votes = toNum(o?.votes);
                  const text = String(o?.text ?? "—");

                  return (
                    <div
                      key={`${idx}-${text}`}
                      className="rounded-2xl bg-[#F4F5F7] px-5 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-xl font-semibold text-[#111] w-10">
                          {alphaLabel(idx) + ")"}
                        </div>
                        <div className="text-sm text-[#111] leading-6">
                          {text}
                        </div>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <div className="text-lg font-semibold text-[#111]">
                          {pct.toFixed(pct % 1 === 0 ? 0 : 1)}%
                          <span className="text-sm font-medium text-black/40">
                            ({votes} Votes)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 text-xs text-black/40">
              Total votes: {totalVotes}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

export default function TrialAnalyticsPage() {
  const { id: campaignId, trialId } = useParams();

  const campaignRoute = endpoints.campaigns.getCampaignByIdUser(campaignId!);
  const { data: campaignResp } = useApiQuery(campaignRoute, {
    enabled: !!campaignId,
  } as any);

  const analyticsRoute = endpoints.campaigns.getAnalytics(campaignId!);
  const { data, isLoading, isError } = useApiQuery(analyticsRoute, {
    enabled: !!campaignId,
  } as any);

  const campaignMeta = useMemo(() => {
    const root = campaignResp?.data?.data ?? null;
    return root?._id ? root : null;
  }, [campaignResp]);

  const { campaign, trial } = useMemo(() => {
    const campaigns = data?.data?.data?.campaigns;
    const campaign = campaigns?.[campaignId!] ?? null;

    const entries = safeArr(campaign?.trials?.entries);
    const trial =
      entries.find((t) => String(t?._id) === String(trialId)) ?? null;

    return { campaign, trial };
  }, [data, campaignId, trialId]);

  const polls = useMemo(() => safeArr(trial?.polls), [trial]);
  const rewards = useMemo(() => safeArr(trial?.rewards), [trial]);

  const [selectedPoll, setSelectedPoll] = useState<PollItem | null>(null);

  if (isLoading) {
    return <div className="p-6 text-sm text-black/50">Loading…</div>;
  }

  if (isError || !campaign || !trial) {
    return (
      <div className="p-6 text-sm text-black/50">
        Trial not found / not allowed.
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4">
      <header className="bg-white rounded-b-2xl border border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <BackButton to={`/campaigns/my-campaigns/${campaignId}`} />

          <div className="min-w-0">
            <div className="text-xs text-gray-500">Trail analytics</div>
            <h1 className="text-base font-semibold text-[#111] truncate">
              {truncateText(trial?.title ?? "Trial", 25)}
            </h1>
            {campaignMeta?.name ? (
              <p className="text-xs text-gray-500 truncate">
                Campaign: {campaignMeta.name}
              </p>
            ) : null}
          </div>
        </div>

        {campaignMeta ? (
          <CampaignStatePills
            input={campaignMeta}
            ownershipType={campaignMeta?.ownership?.type}
            billingMode={campaignMeta?.billing?.mode ?? null}
            showBillingMode={campaignMeta?.tier === "paid"}
            className="mt-3"
          />
        ) : null}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 mt-6">
        <section className="space-y-3">
          <div className="text-sm font-semibold text-gray-700">Polls</div>

          {polls.length === 0 ? (
            <div className="text-sm text-black/50">No polls found.</div>
          ) : (
            <div className="space-y-3">
              {polls.map((p: any, idx: number) => (
                <PollRow
                  key={`${idx}-${p?.title ?? "poll"}`}
                  title={String(p?.title ?? "Untitled Poll")}
                  onClick={() => setSelectedPoll(p)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold text-gray-700">
            Trail Reward Distribution
          </div>

          {rewards.length === 0 ? (
            <div className="text-sm text-black/50">No rewards found.</div>
          ) : (
            <div className="space-y-4">
              {rewards.map((r: any, idx: number) => {
                const pct = toNum(r?.pctDistributed);

                const assetId = (r?.assetId ?? "") as AssetType;
                const meta = assetId ? assetSpecs[assetId] : null;

                const givenOut = convertRewardAmountToParent(
                  assetId,
                  r?.rewardDistributed,
                );
                const totalPledged = convertRewardAmountToParent(
                  assetId,
                  r?.rewardCap,
                );
                const left = convertRewardAmountToParent(
                  assetId,
                  r?.rewardsLeft,
                );
                const symbol = meta?.parentSymbol ?? "";

                return (
                  <section
                    key={`${r?.assetId ?? "asset"}-${idx}`}
                    className="bg-white rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {meta?.img ? (
                          <img
                            src={meta.img}
                            alt={meta.parent}
                            className="h-9 w-9 rounded-full object-contain"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-gray-200" />
                        )}

                        <div>
                          <div className="text-sm font-semibold text-[#111]">
                            {meta?.parent ?? r?.assetId ?? "Asset"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {r?.assetId}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#111]">
                          {pct}%
                        </div>
                        <div className="text-xs text-gray-500">Distributed</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="rounded-xl bg-gray-50 p-3 text-center">
                        <div className="text-sm font-semibold">
                          {givenOut}
                          {symbol ? (
                            <span className="pl-1 text-black/60">{symbol}</span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Given Out
                        </div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 text-center">
                        <div className="text-sm font-semibold">
                          {totalPledged}
                          {symbol ? (
                            <span className="pl-1 text-black/60">{symbol}</span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Total Pledged
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 bg-[#14B8B8]"
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                        <span>
                          {givenOut}
                          {symbol ? (
                            <span className="pl-1">{symbol}</span>
                          ) : null}
                        </span>
                        <span>
                          {left} Left
                          {symbol ? (
                            <span className="pl-1">{symbol}</span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <VotingResultsModal
        open={!!selectedPoll}
        poll={selectedPoll}
        onClose={() => setSelectedPoll(null)}
      />
    </main>
  );
}
