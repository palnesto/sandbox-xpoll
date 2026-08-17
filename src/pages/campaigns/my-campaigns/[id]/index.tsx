import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MoveRight } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import BackButton from "@/components/commons/back-button";
import { ViewAllButton } from "@/utils/view-all-button";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_STATUS, type CampaignStatus } from "@/utils/campaign-status";
import { queryClient } from "@/api/queryClient";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { utcToUser, userZone } from "@/utils/time";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeObj = (v: any) => (v && typeof v === "object" ? v : {});

const compact = (n: number) => {
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = utcToUser(String(iso), userZone);
  if (!d.isValid()) return "";
  return d.format("MMM DD, YYYY");
};

function normalizeStatus(s: any): CampaignStatus {
  const v = String(s ?? "")
    .toLowerCase()
    .trim();
  if (v === CAMPAIGN_STATUS.DRAFT) return CAMPAIGN_STATUS.DRAFT;
  if (v === CAMPAIGN_STATUS.LIVE) return CAMPAIGN_STATUS.LIVE;
  if (v === CAMPAIGN_STATUS.PAUSED) return CAMPAIGN_STATUS.PAUSED;
  if (v === CAMPAIGN_STATUS.ENDED) return CAMPAIGN_STATUS.ENDED;
  if (v === CAMPAIGN_STATUS.ARCHIVED) return CAMPAIGN_STATUS.ARCHIVED;
  if (v === CAMPAIGN_STATUS.DELETED) return CAMPAIGN_STATUS.DELETED;
  return CAMPAIGN_STATUS.DRAFT;
}

function Avatar({
  username,
  avatar,
}: {
  username?: string | null;
  avatar?: string | null;
}) {
  const name = username ?? "Unknown";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return avatar ? (
    <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
      {initials || "U"}
    </div>
  );
}

function convertDonationLikeAllDonations(d: any): string {
  const leg = d?.legs?.[0];
  const assetId = (leg?.assetId ?? "") as AssetType;

  if (!assetId) return "0";
  const raw =
    leg?.amount?.$numberDecimal != null
      ? String(leg.amount.$numberDecimal)
      : String(leg?.amount ?? "0");

  const converted = unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: raw,
      output: "string",
      trim: true,
      group: false,
    }),
    "0",
  );

  return converted;
}

function StatCard({
  value,
  label,
  assetId,
}: {
  value: string | number;
  label: string;
  assetId?: AssetType;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 min-h-[86px] flex flex-col items-center justify-center text-center">
      <div className="text-2xl font-semibold text-[#111] leading-6">
        {value}
        <span className="text-[12px] pl-2">
          {assetId ? assetSpecs[assetId]?.parentSymbol : ""}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function LevelCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 min-h-[78px] flex flex-col items-center justify-center text-center">
      <div className="text-xl font-semibold text-[#111] leading-6">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function TrialRowLite({
  title,
  votes,
  onClick,
}: {
  title: string;
  votes: number;
  onClick: () => void;
}) {
  return (
    <section
      onClick={onClick}
      className="group bg-[#F2F3F5] rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#ECEEF2]"
    >
      <h2 className="text-sm font-medium text-[#111]">{title}</h2>
      <section className="flex flex-col items-center gap-2">
        <h3 className="text-xs text-gray-600">{votes} Votes</h3>
        <figure className="h-8 w-12 rounded-full border border-gray-300 bg-white flex items-center justify-center group-hover:bg-black/5">
          <MoveRight className="h-4 w-4 text-[#111]" />
        </figure>
      </section>
    </section>
  );
}
export default function CampaignDetailsPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const campaignId = routeId ?? "";
  const API_BASE = import.meta.env.VITE_BACKEND_URL;

  const [endOpen, setEndOpen] = useState(false);
  const [endBusy, setEndBusy] = useState(false);
  const [endErr, setEndErr] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<CampaignStatus | null>(
    null,
  );
  const getByIdRoute = endpoints.campaigns.getCampaignByIdUser(campaignId);
  const {
    data: apiResp,
    isLoading: headerLoading,
    isError: headerError,
  } = useApiQuery(getByIdRoute, { enabled: Boolean(campaignId) } as any);

  const apiCampaign = useMemo(() => {
    const campaign = apiResp?.data?.data ?? null;
    return campaign?._id ? campaign : null;
  }, [apiResp]);

  const status = useMemo(() => {
    if (statusOverride) return statusOverride;
    return normalizeStatus(apiCampaign?.status);
  }, [statusOverride, apiCampaign?.status]);

  const showEdit =
    status === CAMPAIGN_STATUS.LIVE ||
    status === CAMPAIGN_STATUS.PAUSED ||
    status === CAMPAIGN_STATUS.ARCHIVED ||
    status === CAMPAIGN_STATUS.DRAFT ||
    status === CAMPAIGN_STATUS.ENDED;

  const showEnd =
    status === CAMPAIGN_STATUS.PAUSED ||
    status === CAMPAIGN_STATUS.DRAFT ||
    status === CAMPAIGN_STATUS.LIVE;

  useEffect(() => {
    const s = normalizeStatus(apiCampaign?.status);
    if (!statusOverride) return;
    if (s === statusOverride) setStatusOverride(null);
  }, [apiCampaign?.status, statusOverride]);

  const onConfirmEnd = async () => {
    if (!campaignId || endBusy) return;

    setEndErr(null);
    setEndBusy(true);

    try {
      const res = await fetch(`${API_BASE}${endpoints.campaigns.end}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || json?.message || "Failed to end campaign",
        );
      }

      setStatusOverride(CAMPAIGN_STATUS.ENDED);
      setEndOpen(false);

      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getCampaignByIdUser(campaignId)],
      });
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.myCampaigns],
      });
      queryClient.refetchQueries({
        queryKey: [endpoints.campaigns.getCampaignByIdUser(campaignId)],
      });
    } catch (e: any) {
      setEndErr(e?.message || "Server error");
    } finally {
      setEndBusy(false);
    }
  };
  const analyticsRoute = endpoints.campaigns.getAnalytics(campaignId);
  const {
    data: analyticsResp,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useApiQuery(analyticsRoute, { enabled: Boolean(campaignId) } as any);

  const campaignAnalytics: any = useMemo(() => {
    const campaigns = analyticsResp?.data?.data?.campaigns;
    return campaigns?.[campaignId] ?? null;
  }, [analyticsResp, campaignId]);

  const trialsEntries: any[] = useMemo(() => {
    const entries = campaignAnalytics?.trials?.entries;
    return Array.isArray(entries) ? entries : [];
  }, [campaignAnalytics]);

  const trialsTotal = toNum(campaignAnalytics?.trials?.totalTrials);
  const sharesTotal = toNum(campaignAnalytics?.shares?.total);
  const viewsTotal = toNum(campaignAnalytics?.views?.total);
  const uniqueParticipants = toNum(campaignAnalytics?.participation?.total);
  const totalVotes = useMemo(() => {
    let sum = 0;
    const entries = campaignAnalytics?.trials?.entries;
    if (!Array.isArray(entries)) return 0;

    for (const trial of entries) {
      if (!Array.isArray(trial?.polls)) continue;
      for (const poll of trial.polls) {
        if (!Array.isArray(poll?.options)) continue;
        for (const opt of poll.options) sum += toNum(opt?.votes);
      }
    }
    return sum;
  }, [campaignAnalytics?.trials?.entries]);

  const DONATION_ASSET_ID = "xGive" as AssetType;

  const totalDonationsConverted = useMemo(() => {
    const totalsByAsset = campaignAnalytics?.donations?.totalsByAsset;
    const raw = safeObj(totalsByAsset)?.[DONATION_ASSET_ID];
    const rawStr = raw == null ? "0" : String(raw);

    return unwrapString(
      amount({
        op: "toParent",
        assetId: DONATION_ASSET_ID,
        value: rawStr,
        output: "string",
        trim: true,
        group: false,
      }),
      "0",
    );
  }, [campaignAnalytics]);

  const levelWise = safeObj(campaignAnalytics?.participation?.levelWise);
  const level1 = toNum(levelWise?.["1"]?.count);
  const level2 = toNum(levelWise?.["2"]?.count);
  const level3 = toNum(levelWise?.["3"]?.count);
  const level4 = toNum(levelWise?.["4"]?.count);
  const level5 = toNum(levelWise?.["5"]?.count);

  const topDonors: any[] = useMemo(() => {
    const list = campaignAnalytics?.donations?.topDonors;
    return Array.isArray(list) ? list : [];
  }, [campaignAnalytics]);

  return (
    <main className="mx-auto w-full max-w-3xl 2xl:max-w-4xl">
      <header className="bg-white rounded-b-2xl border-b border-gray-200 shadow-2xl">
        <div className="px-4 md:px-4 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton to="/campaigns/my-campaigns" />
            <div className="min-w-0">
              <div className="text-sm text-gray-500 leading-4">Campaign</div>
              <div className="text-base md:text-lg font-semibold text-[#111] truncate">
                {apiCampaign?.name ?? "—"}
              </div>
              {apiCampaign ? (
                <CampaignStatePills
                  input={apiCampaign}
                  ownershipType={apiCampaign?.ownership?.type}
                  billingMode={apiCampaign?.billing?.mode ?? null}
                  showBillingMode={apiCampaign?.tier === "paid"}
                  className="mt-2"
                />
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showEdit ? (
              <Button
                className="rounded-full bg-[#19C6C3] px-4 text-black hover:bg-[#19c6c3cc]"
                onClick={() =>
                  navigate(`/campaigns/edit/${campaignId}/overview`)
                }
              >
                Edit Campaign
              </Button>
            ) : null}

            {showEnd ? (
              <Button
                variant="ghost"
                className="rounded-full border border-red-300 bg-red-50 px-4 text-red-600 hover:bg-red-100"
                onClick={() => {
                  setEndErr(null);
                  setEndOpen(true);
                }}
              >
                End Campaign
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {(headerLoading || analyticsLoading) && (
        <div className="px-6 md:px-10 py-10 text-sm text-black/50">
          Loading...
        </div>
      )}

      {!headerLoading && headerError && (
        <div className="px-6 md:px-10 py-10 text-sm text-black/50">
          Failed to load campaign.
        </div>
      )}

      {!analyticsLoading && analyticsError && (
        <div className="px-6 md:px-10 py-10 text-sm text-black/50">
          Failed to load analytics.
        </div>
      )}

      {!headerLoading &&
        !analyticsLoading &&
        apiCampaign &&
        campaignAnalytics && (
          <div className="py-8 px-2 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">
              Campaign Analysis
            </h2>

            <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <StatCard value={trialsTotal} label="Total Trails" />
              <StatCard value={totalVotes} label="Total Votes" />
              <StatCard
                value={uniqueParticipants}
                label="Unique Participants"
              />
              <StatCard value={sharesTotal} label="Shares" />
              <StatCard value={compact(viewsTotal)} label="Views" />
              <StatCard
                value={`${totalDonationsConverted}`}
                assetId={`xGive`}
                label="Total Donations"
              />
            </section>

            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <LevelCard value={level1} label="Level 1" />
              <LevelCard value={level2} label="Level 2" />
              <LevelCard value={level3} label="Level 3" />
              <LevelCard value={level4} label="Level 4" />
              <LevelCard value={level5} label="Level 5" />
            </section>

            <div className="grid md:grid-cols-2 gap-6 pt-5">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Overview
                </h3>

                <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
                  <h4 className="text-sm font-semibold text-[#111]">
                    Trail Results
                  </h4>

                  <div className="space-y-3">
                    {trialsEntries.length === 0 ? (
                      <div className="text-sm text-black/50">
                        No trials found.
                      </div>
                    ) : (
                      trialsEntries.map((t) => {
                        const trialId = String(t?._id ?? "");
                        const title = String(t?.title ?? "Untitled");
                        const votes = toNum(t?.participation?.total);

                        return (
                          <TrialRowLite
                            key={trialId}
                            title={title}
                            votes={votes}
                            onClick={() => {
                              if (!trialId) return;
                              navigate(
                                `/campaigns/my-campaigns/${campaignId}/trial/${encodeURIComponent(
                                  trialId,
                                )}`,
                              );
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              {/* Top 5 Donations */}
              <div className="space-y-2">
                <header className="flex justify-between font-medium text-black/80">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Recent Donations
                  </h2>
                  <ViewAllButton
                    className="font-medium text-gray-700"
                    title="View all"
                    onClick={() =>
                      navigate(
                        `/campaigns/my-campaigns/${campaignId}/all-campaign-donations`,
                      )
                    }
                  >
                    view all
                  </ViewAllButton>
                </header>

                <div className="divide-y divide-gray-200 bg-white rounded-2xl border border-gray-200 p-4">
                  {topDonors.length === 0 ? (
                    <div className="text-sm text-black/50 py-4">
                      No donations found.
                    </div>
                  ) : (
                    topDonors.map((d, idx) => {
                      const username = d?.account?.username ?? "Unknown";
                      const avatar = d?.account?.avatar ?? null;
                      const amountStr = convertDonationLikeAllDonations(d);
                      const assetId = (d?.legs?.[0]?.assetId ??
                        "") as AssetType;
                      const spec = assetId ? assetSpecs[assetId] : null;

                      const date = fmtDate(d?.lastAction?.createdAt);

                      return (
                        <div
                          key={String(d?.externalAccountId ?? idx)}
                          className={cn(
                            "py-4 flex items-center justify-between",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar username={username} avatar={avatar} />
                            <div className="text-sm font-medium text-[#111]">
                              {username}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold text-[#111] flex items-center justify-end gap-1">
                              {amountStr}
                              {spec?.parentSymbol ? (
                                <span className="pl-1.5 font-medium text-black/60">
                                  {spec.parentSymbol}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-500">{date}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      <CampaignActionConfirmModal
        open={endOpen}
        title="End Campaign?"
        description="This will end the campaign (allowed from draft/live/paused)."
        confirmLabel="END"
        tone="danger"
        loading={endBusy}
        error={endErr}
        onClose={() => {
          if (endBusy) return;
          setEndOpen(false);
          setEndErr(null);
        }}
        onConfirm={onConfirmEnd}
      />
    </main>
  );
}
