import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { appToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { type ExternalUserLite } from "@/components/commons/selects/user-select";
import AddCoOwnerInlineForm from "../../../../components/campaign/co-owners/AddCoOwnerInlineForm";
import CoOwnerList from "../../../../components/campaign/co-owners/CoOwnerList";
import PermissionsModal from "../../../../components/campaign/co-owners/PermissionsModal";
import {
  type AddCoOwnerFormValues,
  type AddCoOwnersPayload,
  type AddCoOwnersResult,
  addResultSummary,
  type ApiEnvelope,
  buildPatchDiff,
  clonePermissions,
  defaultPermissions,
  externalUserId,
  getApiData,
  type CampaignOwnerResponse,
  type CoOwnerMapping,
  type CoOwnerListResponse,
  MAX_CO_OWNER_PER_CAMPAIGN,
  normalizePermissions,
  type PatchCoOwnerPermissionsPayload,
  type PermissionFormValues,
  type RemoveCoOwnersPayload,
  type RemoveCoOwnersResult,
  safeId,
  userLabel,
} from "../../../../components/campaign/co-owners/model";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

type PatchCoOwnerResponse = {
  updated: boolean;
};

type MeProfile = {
  _id?: string;
  id?: string;
  externalAccountId?: string;
};

export default function CampaignCoOwnersPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = safeId(id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [userSelectKey, setUserSelectKey] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<CoOwnerMapping | null>(null);
  const [permissionTarget, setPermissionTarget] =
    useState<CoOwnerMapping | null>(null);
  const [initialPermissions, setInitialPermissions] =
    useState(defaultPermissions());

  const addCoOwnerForm = useForm<AddCoOwnerFormValues>({
    mode: "onChange",
    defaultValues: { selectedUsers: [] },
  });
  const permissionForm = useForm<PermissionFormValues>({
    mode: "onChange",
    defaultValues: { permissions: defaultPermissions() },
  });

  const selectedUsersToAdd = addCoOwnerForm.watch("selectedUsers", []);
  const permissionDraft = permissionForm.watch("permissions");
  const currentPermissionDraft = permissionDraft ?? defaultPermissions();

  const {
    isPaymentRequired,
    billingMode,
    campaignName: ownerCampaignName,
  } = useCampaignByOwner(campaignId);

  const campaignRoute = campaignId
    ? endpoints.campaigns.getCampaignByIdOwner(campaignId)
    : "";

  const {
    data: campaignResp,
    isLoading: isCampaignLoading,
    refetch: refetchCampaign,
  } = useApiQuery(campaignRoute, {
    enabled: !!campaignId,
    queryKey: [campaignRoute],
  });

  const { data: meResp, isLoading: isMeLoading } = useApiQuery(
    endpoints.profile.me,
    {
      queryKey: [endpoints.profile.me],
    },
  );

  const campaignData = useMemo(
    () => getApiData<CampaignOwnerResponse>(campaignResp),
    [campaignResp],
  );
  const meData = useMemo(() => getApiData<MeProfile>(meResp), [meResp]);

  const campaignName = ownerCampaignName || String(campaignData?.name ?? "Campaign");
  const campaignStatus = String(campaignData?.status ?? "").toLowerCase();
  const isArchived = campaignStatus === "archived";

  const mainOwnerId = safeId(
    campaignData?.externalAuthor?._id ??
      campaignData?.externalAuthor?.externalAccountId ??
      campaignData?.externalAuthor?.id,
  );
  const currentUserId = safeId(
    meData?.externalAccountId ?? meData?._id ?? meData?.id,
  );
  const ownershipType = String(campaignData?.ownership?.type ?? "").toLowerCase();
  const isMainOwner = ownershipType === "main-owner";
  const ownerCheckResolved = !isCampaignLoading && !isMeLoading;
  const isCampaignOwner =
    ownerCheckResolved && !!mainOwnerId && mainOwnerId === currentUserId;

  useEffect(() => {
    if (ownerCheckResolved && !isMainOwner && !isPaymentRequired && campaignId) {
      navigate(`/campaigns/edit/${campaignId}/overview`, { replace: true });
    }
  }, [ownerCheckResolved, isMainOwner, isPaymentRequired, campaignId, navigate]);

  const coOwnerListRoute = campaignId
    ? endpoints.campaigns.coOwner.getByCampaignId(campaignId)
    : "";

  const {
    data: coOwnerListResp,
    isLoading: isCoOwnerListLoading,
    isFetching: isCoOwnerListFetching,
    isError: isCoOwnerListError,
    refetch: refetchCoOwnerList,
  } = useApiQuery(coOwnerListRoute, {
    enabled: !!coOwnerListRoute && isCampaignOwner && !isPaymentRequired,
    queryKey: [coOwnerListRoute],
  });

  const coOwnerListData = useMemo(
    () => getApiData<CoOwnerListResponse>(coOwnerListResp),
    [coOwnerListResp],
  );
  const coOwners = useMemo(
    () => coOwnerListData?.coOwners ?? [],
    [coOwnerListData?.coOwners],
  );
  const maxAllowed = coOwnerListData?.maxAllowed ?? MAX_CO_OWNER_PER_CAMPAIGN;
  const remainingSlots = Math.max(0, maxAllowed - coOwners.length);
  const canAddMore = isCampaignOwner && !isArchived && remainingSlots > 0;

  const coOwnerMapIds = useMemo(
    () =>
      new Set(
        coOwners
          .map((x) => safeId(x.externalAccountId))
          .filter((x) => x.length > 0),
      ),
    [coOwners],
  );

  const selectedAddIds = useMemo(
    () => selectedUsersToAdd.map((u) => externalUserId(u)).filter(Boolean),
    [selectedUsersToAdd],
  );

  const excludeIdsCsv = useMemo(() => {
    const ids = new Set<string>();
    coOwnerMapIds.forEach((v) => ids.add(v));
    selectedAddIds.forEach((v) => ids.add(v));
    if (mainOwnerId) ids.add(mainOwnerId);
    return Array.from(ids).join(",");
  }, [coOwnerMapIds, selectedAddIds, mainOwnerId]);

  const coOwnerDetailRoute = permissionTarget?._id
    ? endpoints.campaigns.coOwner.getById(permissionTarget._id)
    : "";

  const {
    data: coOwnerDetailResp,
    isLoading: isCoOwnerDetailLoading,
    refetch: refetchCoOwnerDetail,
  } = useApiQuery(coOwnerDetailRoute, {
    enabled: !!coOwnerDetailRoute && isCampaignOwner && !isPaymentRequired,
    queryKey: [coOwnerDetailRoute],
  });

  const coOwnerDetailData = useMemo(
    () => getApiData<CoOwnerMapping>(coOwnerDetailResp),
    [coOwnerDetailResp],
  );

  const resetAddCoOwnerForm = useCallback(() => {
    addCoOwnerForm.reset({ selectedUsers: [] });
    setUserSelectKey((k) => k + 1);
  }, [addCoOwnerForm]);

  const closeAddForm = useCallback(() => {
    setShowAddForm(false);
    resetAddCoOwnerForm();
  }, [resetAddCoOwnerForm]);

  const refetchRequiredGetApis = useCallback(
    async (targetCoOwnerMapId?: string) => {
      await Promise.all([refetchCoOwnerList(), refetchCampaign()]);
      if (targetCoOwnerMapId && safeId(targetCoOwnerMapId).length > 0) {
        await refetchCoOwnerDetail();
      }

      queryClient.invalidateQueries({ queryKey: [coOwnerListRoute] });
      queryClient.invalidateQueries({ queryKey: [campaignRoute] });
      if (targetCoOwnerMapId) {
        queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.coOwner.getById(targetCoOwnerMapId)],
        });
      }
    },
    [
      campaignRoute,
      coOwnerListRoute,
      refetchCampaign,
      refetchCoOwnerDetail,
      refetchCoOwnerList,
    ],
  );

  const addCoOwnersMut = useApiMutation<
    AddCoOwnersPayload,
    ApiEnvelope<AddCoOwnersResult>
  >({
    route: endpoints.campaigns.coOwner.root,
    method: "POST",
    onSuccess: async (resp) => {
      const result = resp?.data;
      if (result) {
        const summary = addResultSummary(result);
        const addedCount = result.added?.length ?? 0;
        if (addedCount > 0) appToast.success(summary);
        else appToast.info(summary);
      } else {
        appToast.success("Co-owner update completed.");
      }

      closeAddForm();
      await refetchRequiredGetApis();
    },
    onError: () => {
      appToast.error("Could not add co-owner(s). Please try again.");
    },
  });

  const removeCoOwnersMut = useApiMutation<
    RemoveCoOwnersPayload,
    ApiEnvelope<RemoveCoOwnersResult>
  >({
    route: endpoints.campaigns.coOwner.root,
    method: "DELETE",
    onSuccess: async (resp) => {
      const removed = resp?.data?.removedCount ?? 0;
      if (removed > 0) appToast.success("Co-owner removed.");
      else appToast.info("No co-owner was removed. List refreshed.");

      setRemoveTarget(null);
      await refetchRequiredGetApis();
    },
    onError: () => {
      appToast.error("Could not remove co-owner. Please try again.");
    },
  });

  const patchPermissionsMut = useApiMutation<
    PatchCoOwnerPermissionsPayload,
    ApiEnvelope<PatchCoOwnerResponse>
  >({
    route: endpoints.campaigns.coOwner.root,
    method: "PATCH",
    onSuccess: async () => {
      const targetId = permissionTarget?._id;
      await refetchRequiredGetApis(targetId);
      appToast.success("Permissions updated.");
      setPermissionTarget(null);
    },
    onError: () => {
      appToast.error("Could not update permissions. Please try again.");
    },
  });

  useEffect(() => {
    if (!permissionTarget) return;
    const normalized = normalizePermissions(permissionTarget.permissions);
    setInitialPermissions(normalized);
    permissionForm.reset({ permissions: clonePermissions(normalized) });
  }, [permissionTarget, permissionForm]);

  useEffect(() => {
    if (!permissionTarget || !coOwnerDetailData) return;
    if (safeId(coOwnerDetailData._id) !== safeId(permissionTarget._id)) return;
    const normalized = normalizePermissions(coOwnerDetailData.permissions);
    setInitialPermissions(normalized);
    permissionForm.reset({ permissions: clonePermissions(normalized) });
  }, [coOwnerDetailData, permissionTarget, permissionForm]);

  const permissionPatch = useMemo(
    () => buildPatchDiff(initialPermissions, currentPermissionDraft),
    [initialPermissions, currentPermissionDraft],
  );
  const hasPermissionChanges = Object.keys(permissionPatch).length > 0;

  const pendingAddCount = selectedUsersToAdd.length;
  const addSubmitDisabled =
    !canAddMore ||
    pendingAddCount === 0 ||
    pendingAddCount > remainingSlots ||
    addCoOwnersMut.isPending;

  const rowBusy = removeCoOwnersMut.isPending || patchPermissionsMut.isPending;
  const removeTargetLabel = removeTarget
    ? userLabel(removeTarget)
    : "this co-owner";
  const permissionTargetLabel = permissionTarget
    ? userLabel(permissionTarget)
    : "co-owner";

  const onSelectCandidateUser = useCallback(
    (user: ExternalUserLite | null) => {
      if (!user) return;
      const nextId = externalUserId(user);
      if (!nextId) return;
      const currentSelected = addCoOwnerForm.getValues("selectedUsers") ?? [];

      if (selectedAddIds.includes(nextId)) {
        appToast.info("User already selected.");
        setUserSelectKey((k) => k + 1);
        return;
      }

      if (coOwnerMapIds.has(nextId) || nextId === mainOwnerId) {
        appToast.info("This user is already excluded.");
        setUserSelectKey((k) => k + 1);
        return;
      }

      if (currentSelected.length >= remainingSlots) {
        appToast.error(`Only ${remainingSlots} slot(s) remaining.`);
        setUserSelectKey((k) => k + 1);
        return;
      }

      addCoOwnerForm.setValue("selectedUsers", [...currentSelected, user], {
        shouldDirty: true,
      });
      setUserSelectKey((k) => k + 1);
    },
    [
      addCoOwnerForm,
      coOwnerMapIds,
      mainOwnerId,
      remainingSlots,
      selectedAddIds,
    ],
  );

  const submitAddCoOwners = (values: AddCoOwnerFormValues) => {
    if (!isCampaignOwner) return;
    if (isArchived) {
      appToast.error("Archived campaigns cannot add co-owners.");
      return;
    }

    const ids = Array.from(
      new Set(
        values.selectedUsers
          .map((u) => externalUserId(u))
          .filter((x) => x.length > 0),
      ),
    );

    if (!ids.length) {
      appToast.info("Select at least one user.");
      return;
    }
    if (ids.length > remainingSlots) {
      appToast.error(`You can add only ${remainingSlots} more co-owner(s).`);
      return;
    }

    addCoOwnersMut.mutate({
      campaignId,
      externalAccountIds: ids,
    });
  };

  const confirmRemoveCoOwner = () => {
    if (!removeTarget) return;
    removeCoOwnersMut.mutate({
      campaignId,
      externalAccountIds: [safeId(removeTarget.externalAccountId)],
    });
  };

  const savePermissionChanges = (values: PermissionFormValues) => {
    if (!permissionTarget) return;
    const patch = buildPatchDiff(initialPermissions, values.permissions);
    if (!Object.keys(patch).length) return;

    patchPermissionsMut.mutate({
      coOwnerMapId: permissionTarget._id,
      permissions: patch,
    });
  };

  const closePermissionModal = () => {
    if (patchPermissionsMut.isPending) return;
    setPermissionTarget(null);
  };

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const listIsLoading =
    isCampaignLoading || isMeLoading || isCoOwnerListLoading;
  const listIsError = !listIsLoading && isCoOwnerListError;

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab="co-owners"
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => {}}
    >
      <div className="p-4 min-h-screen">
        <div className="rounded-2xl border border-black/5 bg-[#F5F5F5] p-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold">Co Owners</h1>
              <p className="mt-1 text-sm text-black/60">
                Max {maxAllowed} co-owners per campaign
              </p>
              <p className="text-xs text-black/50">
                {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
              </p>
            </div>

            {!isPaymentRequired && isCampaignOwner ? (
              <button
                type="button"
                disabled={!canAddMore || showAddForm}
                onClick={() => setShowAddForm(true)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold duration-200",
                  !canAddMore || showAddForm
                    ? "cursor-not-allowed bg-[#E9E9E9] text-[#5B5B5B]"
                    : "bg-[#E4F2DF] text-[#315326] hover:bg-[#CDE0C7]",
                )}
              >
                <UserPlus2 className="h-4 w-4" />
                Add Co Owner
              </button>
            ) : null}
          </header>

          {!isPaymentRequired && isArchived && isCampaignOwner ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Campaign is archived. Adding co-owners is disabled.
            </div>
          ) : null}

          {isPaymentRequired ? (
            <CampaignPaymentRequiredPrompt
              campaignId={campaignId}
              featureName="Co-Owners"
              isMainOwner={isMainOwner}
              billingMode={billingMode}
            />
          ) : ownerCheckResolved && !isCampaignOwner ? (
            <div className="mt-5 rounded-xl border border-black/10 bg-white p-6 text-sm text-black/65">
              Co-owner management is owner-only.
            </div>
          ) : (
            <>
              {showAddForm && isCampaignOwner ? (
                <AddCoOwnerInlineForm
                  form={addCoOwnerForm}
                  userSelectKey={userSelectKey}
                  excludeIdsCsv={excludeIdsCsv}
                  remainingSlots={remainingSlots}
                  pendingAddCount={pendingAddCount}
                  submitDisabled={addSubmitDisabled}
                  isSubmitting={addCoOwnersMut.isPending}
                  onSelectCandidateUser={onSelectCandidateUser}
                  onCancel={closeAddForm}
                  onSubmit={submitAddCoOwners}
                />
              ) : null}

              <CoOwnerList
                isLoading={listIsLoading}
                isError={listIsError}
                isFetching={isCoOwnerListFetching}
                coOwners={coOwners}
                rowBusy={rowBusy}
                showActions={isCampaignOwner}
                onRetry={() => refetchCoOwnerList()}
                onOpenPermissions={setPermissionTarget}
                onRemove={setRemoveTarget}
              />
            </>
          )}
        </div>
      </div>

      <CampaignActionConfirmModal
        open={!!removeTarget}
        title="Remove Co Owner"
        description={`Remove ${removeTargetLabel} from this campaign?`}
        confirmLabel="Remove"
        tone="danger"
        loading={removeCoOwnersMut.isPending}
        onClose={() => {
          if (removeCoOwnersMut.isPending) return;
          setRemoveTarget(null);
        }}
        onConfirm={confirmRemoveCoOwner}
      />

      <PermissionsModal
        open={!!permissionTarget}
        title={`Permissions — ${permissionTargetLabel}`}
        isDetailLoading={isCoOwnerDetailLoading}
        hasChanges={hasPermissionChanges}
        isSubmitting={patchPermissionsMut.isPending}
        form={permissionForm}
        onSubmit={savePermissionChanges}
        onClose={closePermissionModal}
      />
    </CampaignLayout>
  );
}
