import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import type { ApiTrial } from "@/types/campaigns";
import { toNum } from "@/types/campaigns";
import type { TrailCreateValues } from "@/schema/campaign.schemas";
import TrailCreateView from "@/components/campaign/trails/trail-create-view";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

function pickDataRoot(resp: unknown) {
  return (resp as any)?.data?.data ?? (resp as any)?.data ?? resp ?? null;
}

/** Normalize getTrialById response: API may return trial at root or under .trial; polls may be on trial or at root */
function normalizeTrialResponse(raw: unknown): (ApiTrial & { polls?: any[] }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const trial = (r.trial ?? r) as ApiTrial & { polls?: unknown[] };
  if (!trial || typeof trial !== "object") return null;
  const rootPolls = Array.isArray(r.polls) ? r.polls : undefined;
  const trialPolls = Array.isArray(trial.polls) ? trial.polls : undefined;
  const pollList = Array.isArray((trial as any).pollList) ? (trial as any).pollList : undefined;
  const items = Array.isArray((r as any).items) ? (r as any).items : undefined;
  const polls = trialPolls ?? rootPolls ?? pollList ?? items ?? [];
  return { ...trial, polls } as ApiTrial & { polls: any[] };
}

function trialToCreateValues(t: ApiTrial & { polls?: any[] }): TrailCreateValues {
  const rawPolls = (t as any).polls ?? (t as any).pollList ?? (t as any).pollListings ?? [];
  const polls = rawPolls.map((p: any, i: number) => {
    const id = p.id ?? p._id ?? `p-${i}`;
    const opts = Array.isArray(p.options)
      ? p.options.map((o: any) => (typeof o === "string" ? o : String((o as any)?.text ?? (o as any)?.label ?? o ?? ""))).filter(Boolean).slice(0, 4)
      : [];
    return {
      id: String(id),
      pollName: p.title ?? p.pollName ?? p.name ?? "",
      pollDescription: p.description ?? p.pollDescription ?? "",
      resourceAssets: (p.resourceAssets ?? p.media ?? p.assets ?? []).map((a: any) => ({
        type: (a.type ?? "image") as "image" | "youtube" | "video",
        value: String(a.value ?? a.url ?? ""),
      })),
      options: opts.length >= 2 ? opts : [...opts, "", ""].slice(0, 4),
    };
  });
  const pollsPadded = polls.map((p: { options: string[] }) => ({
    ...p,
    options: p.options.length >= 2 ? p.options : [...p.options, "", ""].slice(0, 4),
  }));
  const rewards = (t.rewards ?? []).map((r: any, i: number) => ({
    id: r.id ?? `r-${i}`,
    assetId: r.assetId,
    amount: toNum(r.amount),
    rewardAmountCap: toNum(r.rewardAmountCap),
    rewardType: r.rewardType ?? "min",
  }));
  const resourceAssets = (t as any).resourceAssets ?? (t as any).media ?? t.resourceAssets ?? [];
  return {
    trailName: (t as any).title ?? t.title ?? (t as any).name ?? "",
    description: (t as any).description ?? t.description ?? "",
    trialResourceAssets: (resourceAssets ?? []).map((a: any) => ({
      type: (a.type ?? "image") as "image" | "youtube" | "video",
      value: a.value ?? a.url ?? "",
    })),
    polls: pollsPadded,
    rewards,
  };
}

export default function LaunchedTrailEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const pathMatch = location.pathname.match(/\/campaigns\/edit\/([^/]+)\/trails\/edit\/([^/]+)/);
  const campaignId = pathMatch?.[1] ?? params.id ?? "";
  const trialId = pathMatch?.[2] ?? "";

  const setCampaignId = useCreateCampaignStore((s) => s.setCampaignId);

  const campaignRoute = campaignId ? endpoints.campaigns.getCampaignByIdOwner(campaignId) : "";
  const { data: campaignRes } = useApiQuery(campaignRoute, {
    queryKey: [campaignRoute],
    enabled: !!campaignId,
  });
  const apiCampaign = useMemo(() => pickDataRoot(campaignRes), [campaignRes]);
  const {
    campaignName,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignOwnerLoading,
  } = useCampaignByOwner(campaignId);

  const trialRoute = trialId ? endpoints.campaigns.getTrialById(trialId) : "";
  const { data: trialRes, isLoading: trialLoading, isError: trialError } = useApiQuery(trialRoute, {
    queryKey: [trialRoute],
    enabled: !!trialId && !isCampaignOwnerLoading && !isPaymentRequired,
  });
  const rawTrial = useMemo(() => pickDataRoot(trialRes), [trialRes]);
  const trial = useMemo(() => normalizeTrialResponse(rawTrial) as (ApiTrial & { polls?: any[] }) | null, [rawTrial]);
  const initialValues = useMemo(
    () => (trial ? trialToCreateValues(trial) : null),
    [trial],
  );

  useEffect(() => {
    if (campaignId) setCampaignId(campaignId);
  }, [campaignId, setCampaignId]);

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const displayName = campaignName || String(apiCampaign?.name ?? "Campaign");

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  if (isPaymentRequired) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails`)}
        onRewards={() => {}}
      >
        <div className="p-4">
          <CampaignPaymentRequiredPrompt
            campaignId={campaignId}
            featureName="Trails"
            isMainOwner={isMainOwner}
            billingMode={billingMode}
          />
        </div>
      </CampaignLayout>
    );
  }

  if (trialLoading || (trialId && !trial && !trialError)) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails`)}
        onRewards={() => {}}
      >
        <div className="p-4 text-black/60">Loading trail…</div>
      </CampaignLayout>
    );
  }

  if (trialError || !trial || !initialValues) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={displayName}
        activeTab="trails"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/trails`)}
        onRewards={() => {}}
      >
        <div className="p-4 text-red-600">Trail not found.</div>
      </CampaignLayout>
    );
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={campaignId}
          campaignName={displayName}
          activeTab="trails"
          onTabChange={(tab) => requestLeave(() => goTab(tab))}
          onBack={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/trails`))}
          onRewards={() => {}}
        >
          <TrailCreateView
            canEdit={false}
            mode="edit-launched"
            allowAiSuggestions={!isBasic}
            trialId={trialId}
            initialValuesForLaunchedEdit={initialValues}
            onViewAllTrails={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/trails`))}
            onSaved={() => {}}
            onMediaSaved={() => navigate(`/campaigns/edit/${campaignId}/trails`)}
            onDirtyChange={setHasUnsavedChanges}
          />
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
