import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/commons/back-button";
import { useStandaloneTrails } from "@/hooks/useStandaloneTrails";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { FileText } from "lucide-react";
import TopUpTrailRewardsModal from "@/components/modals/top-up-trail-modal";
import { lazy, Suspense } from "react";

const StandaloneTrailsManageSectionLazy = lazy(
  () =>
    import("@/components/standaloneTrails/StandaloneTrailsManageSection").then(
      (m) => ({ default: m.StandaloneTrailsManageSection }),
    ),
);

function pickDataRoot(resp: unknown) {
  return resp?.data?.data ?? resp?.data ?? resp ?? null;
}

export default function StandaloneTrailsListPage() {
  const navigate = useNavigate();
  const trails = useStandaloneTrails();

  const draftListingsUrl = useMemo(
    () =>
      endpoints.standaloneTrail.getDraftTrialListingsUrl({
        page: 1,
        pageSize: 100,
      }),
    [],
  );
  const { data: draftListingsData } = useApiQuery(draftListingsUrl, {
    queryKey: [draftListingsUrl],
    enabled: true,
  });
  const draftCount = useMemo(() => {
    const raw = draftListingsData as any;
    const root = pickDataRoot(raw) ?? raw ?? {};
    const entries =
      root?.entries ?? root?.items ?? root?.results ?? root?.list ?? [];
    const arr = Array.isArray(entries) ? entries : [];
    const total = root?.total;
    if (typeof total === "number" && total >= 0) return total;
    const totalCount = root?.totalCount;
    if (typeof totalCount === "number" && totalCount >= 0) return totalCount;
    return arr.length;
  }, [draftListingsData]);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpTrialId, setTopUpTrialId] = useState<string | null>(null);

  const myDraftsButton = (
    <button
      type="button"
      onClick={() => navigate("/standalone-trails/draft-trail")}
      className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#78BC61] bg-white px-4 py-2 text-base font-medium text-[#315326] hover:bg-[#E4F2DF] relative"
    >
      <FileText className="h-4 w-4" />
      My drafts
      {draftCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#ED0C1D] text-white text-[10px] font-bold flex items-center justify-center px-1">
          {draftCount > 99 ? "99+" : draftCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen py-7 px-4 xl:px-10">
      <BackButton className="hidden lg:absolute z-20 top-4 left-4" to="/add-campaign" />
      
        <Suspense
          fallback={
            <div className="text-sm text-black/60 p-4">Loading…</div>
          }
        >
          <StandaloneTrailsManageSectionLazy
            cards={trails.cards}
            isLoading={trails.isLoading}
            isError={trails.isError}
            listingRoute={trails.listingRoute}
            onAddTrail={() => navigate("/standalone-trails/create")}
            onEditCard={(id) => navigate(`/standalone-trails/edit/${id}`)}
            onTopUpClick={(id) => {
              setTopUpTrialId(id);
              setTopUpOpen(true);
            }}
            onDeleteCard={(id) =>
              trails.setCards((prev) => prev.filter((x) => x.id !== id))
            }
            leftHeaderContent={myDraftsButton}
          />
        </Suspense>

        <TopUpTrailRewardsModal
          open={topUpOpen}
          trialId={topUpTrialId}
          onClose={() => {
            setTopUpOpen(false);
            setTopUpTrialId(null);
          }}
          isStandalone
        /> 
    </div>
  );
}
