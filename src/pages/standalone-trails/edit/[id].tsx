import { useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import BackButton from "@/components/commons/back-button";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { ApiTrial } from "@/types/campaigns";
import { toNum } from "@/types/campaigns";
import type { TrailCreateValues } from "@/schema/campaign.schemas";
import TrailCreateView from "@/components/campaign/trails/trail-create-view";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";

function pickDataRoot(resp: unknown) {
  return (resp as any)?.data?.data ?? (resp as any)?.data ?? resp ?? null;
}

function normalizeTrialResponse(
  raw: unknown,
): (ApiTrial & { polls?: any[] }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const trial = (r.trial ?? r) as ApiTrial & { polls?: unknown[] };
  if (!trial || typeof trial !== "object") return null;
  const rootPolls = Array.isArray(r.polls) ? r.polls : undefined;
  const trialPolls = Array.isArray(trial.polls) ? trial.polls : undefined;
  const pollList = Array.isArray((trial as any).pollList)
    ? (trial as any).pollList
    : undefined;
  const items = Array.isArray((r as any).items) ? (r as any).items : undefined;
  const polls = trialPolls ?? rootPolls ?? pollList ?? items ?? [];
  return { ...trial, polls } as ApiTrial & { polls: any[] };
}

function trialToCreateValues(t: ApiTrial & { polls?: any[] }): TrailCreateValues {
  const rawPolls =
    (t as any).polls ?? (t as any).pollList ?? (t as any).pollListings ?? [];
  const polls = rawPolls.map((p: any, i: number) => {
    const id = p.id ?? p._id ?? `p-${i}`;
    const opts = Array.isArray(p.options)
      ? p.options
        .map((o: any) =>
          typeof o === "string"
            ? o
            : String((o as any)?.text ?? (o as any)?.label ?? o ?? ""),
        )
        .filter(Boolean)
        .slice(0, 4)
      : [];
    return {
      id: String(id),
      pollName: p.title ?? p.pollName ?? p.name ?? "",
      pollDescription: p.description ?? p.pollDescription ?? "",
      resourceAssets: (p.resourceAssets ?? p.media ?? p.assets ?? []).map(
        (a: any) => ({
          type: (a.type ?? "image") as "image" | "youtube" | "video",
          value: String(a.value ?? a.url ?? ""),
        }),
      ),
      options: opts.length >= 2 ? opts : [...opts, "", ""].slice(0, 4),
    };
  });
  const pollsPadded = polls.map((p: { options: string[] }) => ({
    ...p,
    options:
      p.options.length >= 2 ? p.options : [...p.options, "", ""].slice(0, 4),
  }));
  const rewards = (t.rewards ?? []).map((r: any, i: number) => ({
    id: r.id ?? `r-${i}`,
    assetId: r.assetId,
    amount: toNum(r.amount),
    rewardAmountCap: toNum(
      r.rewardAmountCap ?? (r as any).rewardCap ?? r.computedReward,
    ),
    rewardType: r.rewardType ?? "min",
  }));
  const resourceAssets =
    (t as any).resourceAssets ?? (t as any).media ?? t.resourceAssets ?? [];
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

export default function StandaloneTrailEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const pathMatch = location.pathname.match(
    /\/standalone-trails\/edit\/([^/]+)/,
  );
  const trialId = pathMatch?.[1] ?? params.id ?? "";

  const trialRoute = trialId ? endpoints.standaloneTrail.getById(trialId) : "";
  const { data: trialRes, isLoading: trialLoading, isError: trialError } =
    useApiQuery(trialRoute, {
      queryKey: [trialRoute],
      enabled: !!trialId,
    });
  const rawTrial = useMemo(() => pickDataRoot(trialRes), [trialRes]);
  const trial = useMemo(
    () =>
      normalizeTrialResponse(rawTrial) as (ApiTrial & { polls?: any[] }) | null,
    [rawTrial],
  );
  const initialValues = useMemo(
    () => (trial ? trialToCreateValues(trial) : null),
    [trial],
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  if (trialLoading || (trialId && !trial && !trialError)) {
    return (
      <div className="min-h-screen bg-[#F1F3F6]">
        <BackButton
          className="absolute z-20 top-4 left-4"
          to="/standalone-trails"
        />
        <div className="pt-16 pb-8 px-4 max-w-6xl mx-auto">
          <div className="p-4 text-black/60">Loading trail…</div>
        </div>
      </div>
    );
  }

  if (trialError || !trial || !initialValues) {
    return (
      <div className="min-h-screen bg-[#F1F3F6]">
        <BackButton
          className="absolute z-20 top-4 left-4"
          to="/standalone-trails"
        />
        <div className="pt-16 pb-8 px-4 max-w-6xl mx-auto">
          <div className="p-4 text-red-600">Trail not found.</div>
        </div>
      </div>
    );
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <div className="min-h-screen p-4 hidden lg:block">
          <BackButton
            className="absolute z-20 top-4 left-4"
            to="/standalone-trails"
          />
          <TrailCreateView
            canEdit={false}
            mode="edit-launched"
            trialId={trialId}
            isStandalone={true}
            initialValuesForLaunchedEdit={initialValues}
            onViewAllTrails={() =>
              requestLeave(() => navigate("/standalone-trails"))
            }
            onSaved={() => { }}
            onMediaSaved={() => navigate("/standalone-trails")}
            onDirtyChange={setHasUnsavedChanges}
          />
        </div>
      )}
    </PreventLeaveGuard>
  );
}
