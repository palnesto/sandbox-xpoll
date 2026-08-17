import { useNavigate, useLocation } from "react-router-dom";
import BackButton from "@/components/commons/back-button";
import TrailCreateView from "@/components/campaign/trails/trail-create-view";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { useState } from "react";

export default function StandaloneTrailCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadFromDraft = (location.state as { loadFromDraft?: Record<string, unknown> } | null)
    ?.loadFromDraft;

  const goToList = () => navigate("/standalone-trails");
  const draftListUrl = endpoints.standaloneTrail.getDraftTrialListingsUrl({
    page: 1,
    pageSize: 50,
  });
  const draftCountUrl = endpoints.standaloneTrail.getDraftTrialListingsUrl({
    page: 1,
    pageSize: 100,
  });

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <div className="min-h-screen p-4 hidden lg:block">
          <BackButton
            className="absolute z-20 top-4 left-4"
            to="/standalone-trails"
          /> 
            <TrailCreateView
              canEdit={true}
              canDraftCreate={true}
              isStandalone={true}
              onViewAllTrails={() => requestLeave(goToList)}
              initialDataFromDraft={loadFromDraft as any}
              onDirtyChange={setHasUnsavedChanges}
              onDraftSaved={() => {
                queryClient.invalidateQueries({ queryKey: [draftListUrl] });
                queryClient.invalidateQueries({ queryKey: [draftCountUrl] });
                navigate("/standalone-trails/draft-trail");
              }}
              onSaved={() => {
                queryClient.invalidateQueries({
                  queryKey: [endpoints.standaloneTrail.getAll],
                });
                goToList();
              }}
            /> 
        </div>
      )}
    </PreventLeaveGuard>
  );
}
