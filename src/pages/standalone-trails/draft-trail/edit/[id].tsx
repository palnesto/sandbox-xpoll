import { useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import BackButton from "@/components/commons/back-button";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { ApiDraftTrial } from "@/schema/draft-trial.schema";
import TrailCreateView from "@/components/campaign/trails/trail-create-view";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";

function pickDataRoot(resp: unknown) {
  return (resp as any)?.data?.data ?? (resp as any)?.data ?? resp ?? null;
}

function draftToInitialData(d: ApiDraftTrial | null) {
  if (!d) return undefined;
  return {
    title: d.title ?? null,
    description: d.description ?? null,
    resourceAssets: (d.resourceAssets ?? []).map((a) => ({
      type: a.type,
      value: String(a.value),
    })),
    rewards: (d.rewards ?? []).map((r) => ({
      assetId: String(r.assetId),
      amount: typeof r.amount === "number" ? r.amount : Number(r.amount) || 0,
      rewardAmountCap:
        typeof r.rewardAmountCap === "number"
          ? r.rewardAmountCap
          : Number(r.rewardAmountCap) || 0,
      rewardType: r.rewardType === "max" ? ("max" as const) : ("min" as const),
    })),
    polls: (d.polls ?? []).map((p) => ({
      title: p.title ?? "",
      description: p.description ?? "",
      options: p.options ?? [],
      resourceAssets: (p.resourceAssets ?? []).map((a: any) => ({
        type: a.type,
        value: String(a.value),
      })),
    })),
  };
}

export default function StandaloneDraftTrailEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const pathMatch = location.pathname.match(
    /\/standalone-trails\/draft-trail\/edit\/([^/]+)/,
  );
  const draftId = pathMatch?.[1] ?? params.id ?? "";

  const draftRoute = draftId ? endpoints.campaigns.getDraftTrialById(draftId) : "";
  const { data: draftRes, isLoading: draftLoading, isError: draftError } =
    useApiQuery(draftRoute, {
      queryKey: [draftRoute],
      enabled: !!draftId && /^[a-f0-9]{24}$/i.test(draftId),
    });
  const draft = useMemo(
    () => pickDataRoot(draftRes) as ApiDraftTrial | null,
    [draftRes],
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialDataFromDraft = useMemo(
    () => draftToInitialData(draft),
    [draft],
  );

  if (draftId && !/^[a-f0-9]{24}$/i.test(draftId)) {
    return (
      <div className="min-h-screen bg-[#F1F3F6]">
        <BackButton
          className="absolute z-20 top-4 left-4"
          to={"/"}
        />
        <div className="pt-16 pb-8 px-4 max-w-6xl mx-auto">
          <div className="p-4 text-red-600">Invalid draft ID.</div>
        </div>
      </div>
    );
  }

  if (draftLoading || (draftId && !draft && !draftError)) {
    return (
      <div className="min-h-screen bg-[#F1F3F6]">
        <BackButton
          className="absolute z-20 top-4 left-4"
          to={"/standalone-trails"}
        />
        <div className="pt-16 pb-8 px-4 max-w-6xl mx-auto">
          <div className="p-4 text-black/60">Loading draft…</div>
        </div>
      </div>
    );
  }

  if (draftError || (draftId && !draft)) {
    return (
      <div className="min-h-screen bg-[#F1F3F6]">
        <BackButton
          className="absolute z-20 top-4 left-4"
          to={"/standalone-trails"}
        />
        <div className="pt-16 pb-8 px-4 max-w-6xl mx-auto">
          <div className="p-4 text-red-600">Draft not found.</div>
        </div>
      </div>
    );
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <div className="min-h-screen bg-[#F1F3F6] hidden lg:block">
          <BackButton
            className="absolute z-20 top-4 left-4"
            to={"/standalone-trails/draft-trail"}
          /> 
            <TrailCreateView
              canEdit={true}
              mode="edit-draft"
              draftId={draftId}
              isStandalone={true}
              initialDataFromDraft={initialDataFromDraft}
              onViewAllTrails={() =>
                requestLeave(() => navigate("/standalone-trails/draft-trail"))
              }
              onSaved={() => {}}
              onDraftUpdated={() =>
                navigate("/standalone-trails/draft-trail")
              }
              onDirtyChange={setHasUnsavedChanges}
              onLoadToCreate={(payload) => {
                navigate("/standalone-trails/create", {
                  state: { loadFromDraft: { ...payload, _id: draftId } },
                });
              }}
            /> 
        </div>
      )}
    </PreventLeaveGuard>
  );
}
