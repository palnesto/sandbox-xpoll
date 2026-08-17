import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BackButton from "@/components/commons/back-button";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/commons/FullScreenLoader";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import { CampaignStatus } from "@/types/campaigns";
import { StatusPill } from "@/utils/campaign-status";
import { formatShortDate } from "@/utils/time";
import { motion } from "framer-motion";
import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";

type OwnershipMainOwner = {
  externalAccountId?: string;
  username?: string;
  avatar?: { name?: string; imageUrl?: string };
};

type MyCampaign = {
  _id: string;
  name: string;
  goal: string;
  status: CampaignStatus;
  isPolitical: boolean;
  tier?: "basic" | "paid";
  visibility?: "listed" | "unlisted";
  ownerAccessState?: "full" | "payment_required";
  billing?: {
    mode?: "one_time" | "subscription" | null;
  } | null;

  createdAt?: string;
  updatedAt?: string;

  lastDraftedAt?: string | null;
  lastPublishedAt?: string | null;
  lastPausedAt?: string | null;
  lastEndedAt?: string | null;
  lastArchivedAt?: string | null;
  lastDeletedAt?: string | null;

  totalActiveTrials?: number;
  totalParticipation?: number;
  shares?: {
    total: number;
    unique: number;
  };

  ownership?: {
    type?: string;
    mainOwner?: OwnershipMainOwner;
  };
};

export const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    : "--";

const pickDisplayDate = (c: MyCampaign) =>
  c.lastPublishedAt ??
  c.lastPausedAt ??
  c.lastEndedAt ??
  c.lastArchivedAt ??
  c.lastDeletedAt ??
  c.lastDraftedAt ??
  c.createdAt ??
  c.updatedAt ??
  null;

const getEntries = (raw: any): MyCampaign[] => {
  const d = raw?.data?.data ?? raw?.data ?? raw ?? {};
  if (Array.isArray(d)) return d as MyCampaign[];
  if (Array.isArray(d?.entries)) return d.entries as MyCampaign[];
  return [];
};

const buildMyCampaignsUrl = (params: Record<string, string | number | boolean>) =>
  `${endpoints.campaigns.myCampaigns}?${new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  ).toString()}`;

const getMainOwnerDisplayName = (c: MyCampaign): string | null => {
  const main = c.ownership?.mainOwner;
  if (!main) return null;
  return main.username ?? "Owner";
};

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1 rounded-xl text-center bg-[#F7F7F7] px-2 py-3">
      <div className="text-xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[9px]">{label}</div>
    </div>
  );
}

export default function MyCampaignsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const setCampaignId = useCreateCampaignStore((s) => s.setCampaignId);
  const setBasics = useCreateCampaignStore((s) => s.setBasics);
  const setCampaignStatus = useCreateCampaignStore((s) => s.setCampaignStatus);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [status] = useState<"all" | CampaignStatus>("all");
  const [political] = useState<"all" | "political" | "nonPolitical">("all");

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = {
      page,
      pageSize,
    };
    if (status !== "all") params.status = status;
    if (political !== "all") params.isPolitical = political === "political";
    return params;
  }, [page, pageSize, status, political]);

  const routeMain = useMemo(
    () => buildMyCampaignsUrl(queryParams),
    [queryParams],
  );
  const routeCoOwned = useMemo(
    () => buildMyCampaignsUrl({ ...queryParams, excludeMainOwned: true }),
    [queryParams],
  );

  const { data, isLoading, isError } = useApiQuery(routeMain);
  const { data: dataCoOwned, isLoading: isLoadingCoOwned } =
    useApiQuery(routeCoOwned);

  const entries = useMemo(() => {
    const main = getEntries(data);
    const coOwned = getEntries(dataCoOwned);
    const byId = new Map(main.map((c) => [c._id, c]));
    coOwned.forEach((c) => (!byId.has(c._id) ? byId.set(c._id, c) : null));
    return [...byId.values()].sort((a, b) => {
      const ta = new Date(pickDisplayDate(a) ?? 0).getTime();
      const tb = new Date(pickDisplayDate(b) ?? 0).getTime();
      return tb - ta;
    });
  }, [data, dataCoOwned]);
  const visibleEntries = useMemo(
    () => entries.filter((c) => c.status !== "deleted"),
    [entries],
  );

  const total = useMemo(() => {
    const d = data?.data?.data ?? data?.data ?? {};
    const dCo = dataCoOwned?.data?.data ?? dataCoOwned?.data ?? {};
    const mainTotal = typeof d?.total === "number" ? d.total : 0;
    const coOwnedTotal = typeof dCo?.total === "number" ? dCo.total : 0;
    return mainTotal + coOwnedTotal;
  }, [data, dataCoOwned]);

  const isLoadingAny = isLoading || isLoadingCoOwned;
  const canPrev = page > 1;
  const canNext = page * pageSize < total;


  const continueSetup = (c: MyCampaign) => {
    const editable = c.status === "draft" || c.status === "paused";

    if (editable) {
      setCampaignId(c._id);

      setBasics({
        campaignId: c._id,
        campaignName: c.name,
        goal: c.goal,
        campaignType: c.isPolitical ? "political" : "non_political",
      } as any);

      setCampaignStatus(c.status);
    }

    navigate(`/campaigns/edit/${c._id}/overview`);
  };

  const autoDoneRef = useRef(false);
  useEffect(() => {
    if (autoDoneRef.current) return;

    const sp = new URLSearchParams(location.search);
    const afterPayment = sp.get("afterPayment") === "1";
    if (!afterPayment) return;

    if (isLoadingAny || isError) return;
    if (!entries.length) return;

    const drafts = entries.filter((c) => c.status === "draft");
    if (!drafts.length) return;

    const newest = [...drafts].sort((a, b) => {
      const ta = new Date(pickDisplayDate(a) ?? 0).getTime();
      const tb = new Date(pickDisplayDate(b) ?? 0).getTime();
      return tb - ta;
    })[0];

    autoDoneRef.current = true;
    continueSetup(newest);
  }, [location.search, entries, isLoadingAny, isError]);

  return (
    <main className="p-3 max-w-3xl mx-auto">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to="/campaigns/all-campaigns" />
          <h1 className="text-lg font-semibold">My Campaigns</h1>
        </div>

        <Button
          className="rounded-full border border-black hover:bg-gray-100 hidden md:hidden"
          variant="ghost"
          onClick={() => navigate("/campaigns/create")}
        >
          + Create
        </Button>
      </header>

      {isLoadingAny && <CardGridSkeleton items={3} />}

      {!isLoadingAny && !isError && entries.length === 0 && (
        <div className="mt-10 relative flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="relative h-52 w-full max-w-sm mb-10 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-10 right-0 top-1/2 rounded-2xl border border-black/10 bg-white shadow-xl"
                initial={{ y: 30 + i * 16, opacity: 0, scale: 0.96 }}
                animate={{
                  y: [-20, -120],
                  opacity: [0, 1, 1, 0],
                  scale: [0.96, 1, 1, 0.94],
                }}
                transition={{
                  duration: 2.6,
                  delay: i * 0.4,
                  repeat: Infinity,
                  repeatDelay: 0.6,
                  ease: "easeInOut",
                }}
                style={{
                  width: 320 - i * 24,
                  height: 180 - i * 14,
                }}
              >
                <div className="p-4 space-y-3">
                  <div className="h-4 w-40 rounded bg-black/15" />
                  <div className="h-3 w-52 rounded bg-black/10" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-10 rounded-xl bg-black/10" />
                    <div className="h-10 rounded-xl bg-black/10" />
                    <div className="h-10 rounded-xl bg-black/10" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold"
          >
            No Campaigns Yet
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-2 text-sm text-black/60 max-w-xs"
          >
            Create a Basic campaign or choose a paid plan to start building signal.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/campaigns/create")}
            className="mt-6 rounded-full bg-[#0EA5A5] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(14,165,165,0.25)]"
          >
            CREATE CAMPAIGN
          </motion.button>
        </div>
      )}
      <ul className="space-y-3">
        {visibleEntries.map((c) => {
          return (
            <li
              key={c._id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="max-w-[75%]">
                  <h2 className="text-[15px] font-semibold leading-snug">
                    {c.name}
                  </h2>
                  <CampaignStatePills
                    input={c}
                    ownershipType={c.ownership?.type}
                    billingMode={c.billing?.mode ?? null}
                    showBillingMode={c.tier === "paid"}
                    className="mt-2"
                  />
                  {c.ownership?.type === "co-owner" &&
                    getMainOwnerDisplayName(c) && (
                      <p className="mt-0.5 text-xs text-black/60">
                        Co-Owned with {getMainOwnerDisplayName(c)}
                      </p>
                    )}
                </div>
                <StatusPill status={c.status} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatTile
                  value={c.totalActiveTrials ?? 0}
                  label="Total Active Trails"
                />
                <StatTile
                  value={c?.totalParticipation ?? 0}
                  label="Unique Participants"
                />
                <StatTile value={c?.shares?.total ?? 0} label="Shares" />
              </div>

              <div className="mt-4 flex items-center justify-between w-full">
                <div className="text-[12px] text-black/60 w-full">
                  {formatShortDate(pickDisplayDate(c))}
                </div>

                <div className="flex items-center justify-end gap-2 w-full text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => continueSetup(c)}
                    className="rounded-full bg-[#0EA5A5] px-4 py-2 text-white hover:text-blue hover:border border-blue hover:bg-transparent"
                  >
                    View Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/campaigns/my-campaigns/${c._id}`)}
                    className="rounded-full border border-blue px-4 py-2 text-blue hover:text-white hover:bg-blue"
                  >
                    Analytics
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!isLoadingAny && entries.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            className="rounded-full border border-black/10"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="ghost"
            className="rounded-full border border-black/10"
            disabled={!canNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
