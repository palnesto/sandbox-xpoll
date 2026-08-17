import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  BaseOption,
  PetitionForm,
  petitionFormZ,
  safeArr,
  resolveCountryNames,
  normalizeHttpUrl,
  extractYouTubeId,
  type MediaState,
  type MediaType,
} from "@/types/petition";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import { PetitionCreateEditView } from "@/components/campaign/petition/PetitionCreateEditView";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { usePetitionEditStore } from "@/stores/petition-edit.store";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

const API_BASE = import.meta.env.VITE_BACKEND_URL;
const WATCH_THROTTLE_MS = 500;

function buildFormDefaultsFromPetition(petition: any): PetitionForm {
  const links = safeArr(petition?.externalLinks).map(String).slice(0, 3);
  const codes = safeArr(petition?.targetGeo?.countries).map(String);
  const countryOpts = codes.map((c) => ({ value: c, label: c }));
  const img = safeArr(petition?.uploadedImageLinks)[0] ?? null;
  const vid = safeArr(petition?.uploadedVideoLinks)[0] ?? null;
  const yt = safeArr(petition?.ytVideoLinks)[0] ?? null;
  let mediaType: MediaType = "none";
  if (img) mediaType = "image";
  else if (vid) mediaType = "video";
  else if (yt) mediaType = "youtube";
  return {
    name: String(petition?.name ?? ""),
    description: String(petition?.description ?? ""),
    externalLinks: links.length ? links : [],
    countryOpts,
    mediaType,
    youtubeDraft: yt ? String(yt) : "",
  };
}

type EditableSnapshot = {
  name: string;
  description: string;
  externalLinks: string[];
  countryOpts: { value: string; label: string }[];
  mediaType: MediaType;
  youtubeDraft: string;
  mediaImageUrl: string | null;
  mediaVideoUrl: string | null;
  mediaYtId: string | null;
};

function buildEditableSnapshot(
  values: PetitionForm,
  media: MediaState,
): EditableSnapshot {
  const links = safeArr(values.externalLinks).slice(0, 3);
  const opts = safeArr(values.countryOpts);
  let mediaImageUrl: string | null = null;
  let mediaVideoUrl: string | null = null;
  let mediaYtId: string | null = null;
  if (media.type === "image") {
    if (media.files?.[0]) mediaImageUrl = "__NEW_FILE__";
    else if (media.urls?.[0] || media.previews?.[0])
      mediaImageUrl = media.urls?.[0] ?? media.previews?.[0] ?? null;
  }
  if (media.type === "video") {
    if (media.files?.[0]) mediaVideoUrl = "__NEW_FILE__";
    else if (media.urls?.[0] || media.previews?.[0])
      mediaVideoUrl = media.urls?.[0] ?? media.previews?.[0] ?? null;
  }
  if (media.type === "youtube" && media.ytIds?.[0])
    mediaYtId = media.ytIds[0];
  return {
    name: String(values.name ?? ""),
    description: String(values.description ?? ""),
    externalLinks: links,
    countryOpts: opts,
    mediaType: (values.mediaType ?? "none") as MediaType,
    youtubeDraft: String(values.youtubeDraft ?? ""),
    mediaImageUrl,
    mediaVideoUrl,
    mediaYtId,
  };
}

function editableSnapshotsEqual(a: EditableSnapshot, b: EditableSnapshot): boolean {
  if (a.name !== b.name || a.description !== b.description) return false;
  if (a.mediaType !== b.mediaType || a.youtubeDraft !== b.youtubeDraft)
    return false;
  if (
    a.mediaImageUrl !== b.mediaImageUrl ||
    a.mediaVideoUrl !== b.mediaVideoUrl ||
    a.mediaYtId !== b.mediaYtId
  )
    return false;
  const linkA = a.externalLinks.slice(0, 3).map(String).sort().join("|");
  const linkB = b.externalLinks.slice(0, 3).map(String).sort().join("|");
  if (linkA !== linkB) return false;
  const countryA = a.countryOpts.map((o) => o.value).sort().join(",");
  const countryB = b.countryOpts.map((o) => o.value).sort().join(",");
  return countryA === countryB;
}

export default function PetitionEditPage() {
  const navigate = useNavigate();
  const { id, petitionId } = useParams();
  const campaignId = String(id ?? "");
  const activePetitionId = String(petitionId ?? "");
  const watchThrottleRef = useRef(0);
  const [initDoneForPetitionId, setInitDoneForPetitionId] = useState<string | null>(null); 
  const initialSnapshotRef = useRef<EditableSnapshot | null>(null);

  const [media, setMedia] = useState<MediaState>({ type: "none" });
  const [, setMediaOversize] = useState(false);
  const [mediaErrorText, setMediaErrorText] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    name?: string;
  }>({ open: false, id: null });
  const [deleteSaving, setDeleteSaving] = useState(false);

  const { data: meResp } = useApiQuery(endpoints.profile.me, {
    queryKey: [endpoints.profile.me],
  } as any);
  const userId = String(meResp?.data?.data?.id ?? meResp?.data?.id ?? "");

  const {
    getDraft,
    setPatch,
    resetForPetition,
    clear: clearEditStore,
    isExpired,
    loadFromLocalStorage,
  } = usePetitionEditStore();

  const { data: campaignResp } = useApiQuery(
    endpoints.campaigns.getCampaignByIdOwner(campaignId),
    { enabled: !!campaignId, queryKey: [endpoints.campaigns.getCampaignByIdOwner(campaignId)] } as any,
  );
  const campaignName = String(campaignResp?.data?.data?.name ?? "Campaign");
  const {
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignLoading,
  } = useCampaignByOwner(campaignId);

  // Single petition fetch: used for form defaults and always for media (never from store)
  const petitionByIdRoute = activePetitionId
    ? endpoints.campaigns.getPetitionById(activePetitionId)
    : null;
  const { data: petitionByIdResp } = useApiQuery(petitionByIdRoute || "", {
    enabled:
      !!petitionByIdRoute &&
      !isCampaignLoading &&
      !isBasic &&
      !isPaymentRequired,
    queryKey: petitionByIdRoute ? [petitionByIdRoute] : [],
  } as any);

  const petitionById = useMemo(() => {
    if (!petitionByIdResp) return null;
    const root = petitionByIdResp?.data?.data ?? petitionByIdResp?.data ?? null;
    const p = root?.petition ?? root?.data ?? root;
    if (!p?._id && !p?.id) return null;
    return { ...p, _id: String(p._id ?? p.id) } as any;
  }, [petitionByIdResp]);

  const listQueryKey = useMemo(
    () => [
      endpoints.campaigns.getPetitionsListings,
      {
        belongsToCampaignId: campaignId,
        isAdmin: true,
        page: 1,
        pageSize: 50,
      },
    ],
    [campaignId],
  );

  const updatePetitionRoute = activePetitionId
    ? endpoints.campaigns.updatePetition(activePetitionId)
    : "";
  const { mutateAsync: updatePetitionMutation, isPending: saving } =
    useApiMutation<
      {
        externalLinks?: string[];
        uploadedImageLinks?: string[];
        uploadedVideoLinks?: string[];
        ytVideoLinks?: string[];
      },
      unknown
    >({
      route: updatePetitionRoute,
      method: "PUT",
      onSuccess: () => {
        appToast.success("Petition updated");
        clearEditStore(userId);
        queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.getPetitionById(activePetitionId)],
        });
        queryClient.invalidateQueries({ queryKey: listQueryKey });
        navigate(`/campaigns/edit/${campaignId}/petition`);
      },
      onError: (err: Error) => {
        appToast.error(err?.message ?? "Update failed");
      },
    });

  const form = useForm<PetitionForm>({
    resolver: zodResolver(petitionFormZ),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      externalLinks: [],
      countryOpts: [],
      mediaType: "none",
      youtubeDraft: "",
    },
  });

  const mediaType = form.watch("mediaType");
  const ytDraft = form.watch("youtubeDraft");
  const externalLinks = form.watch("externalLinks");
  const descVal = form.watch("description");
  const countryOpts = form.watch("countryOpts");
  form.watch(); // subscribe to all fields so hasEditableChanges re-runs when any value changes

  const { uploadImage } = useImageUpload();
  const { uploadVideo } = useVideoUpload();

  // First fetch petition; then init form from API or store (store key = petitionId, 30min TTL)
  useEffect(() => {
    if (!petitionById || !userId || !activePetitionId) return;
    const currentPetitionId = String(petitionById._id ?? petitionById.id ?? activePetitionId);
    if (initDoneForPetitionId === currentPetitionId) return;

    initialSnapshotRef.current = null; // clear until we capture after this init
    loadFromLocalStorage(userId);
    const draftPayload = getDraft();
    const apiDefaults = buildFormDefaultsFromPetition(petitionById);
    const codes = safeArr(petitionById?.targetGeo?.countries).map(String);

    const applyApiData = () => {
      resetForPetition(userId, activePetitionId, apiDefaults);
      form.reset(apiDefaults);
      resolveCountryNames({
        codes,
        apiBase: API_BASE,
        route: endpoints.location.getAllCountries,
      }).then((map) => {
        form.setValue(
          "countryOpts",
          codes.map((c) => ({ value: c, label: map[c] || c })),
          { shouldDirty: false, shouldValidate: false },
        );
      });
      const img = safeArr(petitionById?.uploadedImageLinks)[0] ?? null;
      const vid = safeArr(petitionById?.uploadedVideoLinks)[0] ?? null;
      const yt = safeArr(petitionById?.ytVideoLinks)[0] ?? null;
      const mt = apiDefaults.mediaType;
      if (mt === "image" && img)
        setMedia({ type: "image", urls: [img], files: [], previews: [img] });
      else if (mt === "video" && vid)
        setMedia({ type: "video", urls: [vid], files: [], previews: [vid] });
      else if (mt === "youtube" && yt)
        setMedia({ type: "youtube", ytIds: [String(yt)] });
      else setMedia({ type: "none" });
    };

    // Store has only non-media fields. Media always comes from GET API (petitionById).
    const applyStoreData = (
      draft: Partial<PetitionForm> | PetitionForm,
      apiPetition: any,
    ) => {
      const d = draft as PetitionForm;
      const apiDefaults = buildFormDefaultsFromPetition(apiPetition);
      form.reset({
        name: d.name ?? "",
        description: d.description ?? "",
        externalLinks: safeArr(d.externalLinks).slice(0, 3),
        countryOpts: safeArr(d.countryOpts),
        mediaType: apiDefaults.mediaType,
        youtubeDraft: apiDefaults.youtubeDraft ?? "",
      });
      const img = safeArr(apiPetition?.uploadedImageLinks)[0] ?? null;
      const vid = safeArr(apiPetition?.uploadedVideoLinks)[0] ?? null;
      const yt = safeArr(apiPetition?.ytVideoLinks)[0] ?? null;
      const mt = apiDefaults.mediaType;
      if (mt === "image" && img)
        setMedia({ type: "image", urls: [img], files: [], previews: [img] });
      else if (mt === "video" && vid)
        setMedia({ type: "video", urls: [vid], files: [], previews: [vid] });
      else if (mt === "youtube" && yt)
        setMedia({ type: "youtube", ytIds: [String(yt)] });
      else setMedia({ type: "none" });
    };

    // a) No persisted value -> use API data and store it
    if (!draftPayload) {
      applyApiData();
      setInitDoneForPetitionId(currentPetitionId);
      return;
    }

    // b) Has store: compare petitionId (no campaignId check)
    const storedPetitionId = draftPayload.petitionId;

    if (storedPetitionId !== currentPetitionId) {
      // b.1 Different petition -> use API and store
      applyApiData();
      setInitDoneForPetitionId(currentPetitionId);
      return;
    }

    if (isExpired()) {
      // b.2 Same petition but expired -> use API and store
      applyApiData();
      setInitDoneForPetitionId(currentPetitionId);
      return;
    }

    // b.3 Same petition, not expired -> use store for form fields; media always from API
    applyStoreData(draftPayload.draft, petitionById);

    setInitDoneForPetitionId(currentPetitionId);
  }, [
    petitionById,
    userId,
    activePetitionId,
    initDoneForPetitionId,
    form,
    loadFromLocalStorage,
    getDraft,
    resetForPetition,
    isExpired,
  ]);

  // Persist form changes to store (throttled); only after init for this petition
  useEffect(() => {
    if (!userId || !activePetitionId || initDoneForPetitionId !== activePetitionId) return;
    const sub = form.watch((values) => {
      if (Date.now() - watchThrottleRef.current < WATCH_THROTTLE_MS) return;
      watchThrottleRef.current = Date.now();
      // Persist only non-media to stay under localStorage 4MB; media always from GET API
      setPatch(userId, {
        name: values.name,
        description: values.description,
        externalLinks: safeArr(values.externalLinks).slice(0, 3),
        countryOpts: safeArr(values.countryOpts),
      });
    });
    return () => sub.unsubscribe();
  }, [form.watch, userId, activePetitionId, initDoneForPetitionId, setPatch]);

  // Capture initial form + media snapshot once hydration is done (enable Save only when there are changes)
  useEffect(() => {
    if (initDoneForPetitionId !== activePetitionId) return;
    initialSnapshotRef.current = buildEditableSnapshot(
      form.getValues(),
      media,
    );
  }, [initDoneForPetitionId, activePetitionId]); // form, media intentionally not deps: capture once after init
 
  useEffect(() => {
    if (!petitionById || initDoneForPetitionId !== activePetitionId) return;
    const img = safeArr(petitionById?.uploadedImageLinks)[0] ?? null;
    const vid = safeArr(petitionById?.uploadedVideoLinks)[0] ?? null;
    const yt = safeArr(petitionById?.ytVideoLinks)[0] ?? null;
    const apiDefaults = buildFormDefaultsFromPetition(petitionById);
    // Don’t overwrite if user has picked a new file
    if (media.type === "image" && media.files?.[0]) return;
    if (media.type === "video" && media.files?.[0]) return;
    if (apiDefaults.mediaType === "image" && img)
      setMedia({ type: "image", urls: [img], files: [], previews: [img] });
    else if (apiDefaults.mediaType === "video" && vid)
      setMedia({ type: "video", urls: [vid], files: [], previews: [vid] });
    else if (apiDefaults.mediaType === "youtube" && yt)
      setMedia({ type: "youtube", ytIds: [String(yt)] });
    else setMedia({ type: "none" });
  }, [petitionById, initDoneForPetitionId, activePetitionId]); // media intentionally excluded: only sync from API when petitionById changes

  const hasEditableChanges = (() => {
    const initial = initialSnapshotRef.current;
    if (!initial) return false;
    const current = buildEditableSnapshot(form.getValues(), media);
    return !editableSnapshotsEqual(initial, current);
  })();

  useEffect(() => {
    if (mediaType === "none") setMedia({ type: "none" });
  }, [mediaType]);

  const addLink = () => {
    const cur = safeArr(externalLinks).slice(0, 3);
    if (cur.length >= 3) return;
    form.setValue("externalLinks", [...cur, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeLinkAt = (idx: number) => {
    const cur = safeArr(form.getValues("externalLinks")).slice(0, 3);
    const next = cur.filter((_, i) => i !== idx);
    form.setValue("externalLinks", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onCountriesChange = (opts: { value: string; label: string }[]) => {
    form.setValue("countryOpts", safeArr(opts), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  async function uploadMediaIfNeeded(): Promise<{
    uploadedImageLinks: string[];
    uploadedVideoLinks: string[];
    ytVideoLinks: string[];
  }> {
    if (mediaType === "none")
      return {
        uploadedImageLinks: [],
        uploadedVideoLinks: [],
        ytVideoLinks: [],
      };
    if (mediaType === "youtube") {
      const id = extractYouTubeId(
        form.getValues("youtubeDraft") || "",
      );
      return {
        uploadedImageLinks: [],
        uploadedVideoLinks: [],
        ytVideoLinks: id ? [id] : [],
      };
    }
    if (mediaType === "image" && media.type === "image") {
      if (media.files[0]) {
        const url = await uploadImage(media.files[0]);
        return {
          uploadedImageLinks: url ? [url] : [],
          uploadedVideoLinks: [],
          ytVideoLinks: [],
        };
      }
      if (media.urls[0])
        return {
          uploadedImageLinks: [media.urls[0]],
          uploadedVideoLinks: [],
          ytVideoLinks: [],
        };
      return {
        uploadedImageLinks: [],
        uploadedVideoLinks: [],
        ytVideoLinks: [],
      };
    }
    if (mediaType === "video" && media.type === "video") {
      if (media.files[0]) {
        const url = await uploadVideo(media.files[0]);
        return {
          uploadedImageLinks: [],
          uploadedVideoLinks: url ? [url] : [],
          ytVideoLinks: [],
        };
      }
      if (media.urls[0])
        return {
          uploadedImageLinks: [],
          uploadedVideoLinks: [media.urls[0]],
          ytVideoLinks: [],
        };
      return {
        uploadedImageLinks: [],
        uploadedVideoLinks: [],
        ytVideoLinks: [],
      };
    }
    return {
      uploadedImageLinks: [],
      uploadedVideoLinks: [],
      ytVideoLinks: [],
    };
  }

  async function updatePetition() {
    if (!activePetitionId) return;
    const ok = await form.trigger([
      "externalLinks",
      "youtubeDraft",
      "countryOpts",
    ] as any);
    if (!ok) return;
    try {
      const v = form.getValues();
      const mediaPayload = await uploadMediaIfNeeded();
      const payload = {
        externalLinks: v.externalLinks?.map(normalizeHttpUrl),
        uploadedImageLinks: mediaPayload.uploadedImageLinks,
        uploadedVideoLinks: mediaPayload.uploadedVideoLinks,
        ytVideoLinks: mediaPayload.ytVideoLinks,
      };
      await (
        updatePetitionMutation as unknown as (
          p: {
            externalLinks: string[];
            uploadedImageLinks: string[];
            uploadedVideoLinks: string[];
            ytVideoLinks: string[];
          },
        ) => Promise<unknown>
      )(payload);
    } catch {
      // onError toast already from useApiMutation
    }
  }

  async function deletePetition(idToDelete: string) {
    setDeleteSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}${endpoints.campaigns.deletePetition(idToDelete)}`,
        { method: "DELETE", credentials: "include" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || json?.message || "Delete petition failed",
        );
      }
      appToast.success("Petition deleted");
      setDeleteConfirm({ open: false, id: null });
      navigate(`/campaigns/edit/${campaignId}/petition`);
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    } catch (e: any) {
      appToast.error(e?.message || "Delete failed");
    } finally {
      setDeleteSaving(false);
    }
  }

  const hasUnsavedChanges = Boolean(
    !saving &&
      !deleteSaving &&
      (form.formState.isDirty ||
        safeArr(countryOpts).length > 0 ||
        safeArr(externalLinks).some((x) => String(x || "").trim().length > 0) ||
        mediaType !== "none" ||
        (media.type === "image" &&
          (media.files?.length ||
            media.urls?.length ||
            media.previews?.length)) ||
        (media.type === "video" &&
          (media.files?.length ||
            media.urls?.length ||
            media.previews?.length)) ||
        (media.type === "youtube" &&
          (!!media.ytIds?.[0] || !!String(ytDraft || "").trim())))
  );

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  if (!petitionById && petitionByIdResp !== undefined) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={campaignName}
        activeTab="petitions"
        onTabChange={goTab}
        onBack={() => navigate(-1)}
        onRewards={() => {}}
      >
        <div className="p-4">Petition not found.</div>
      </CampaignLayout>
    );
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={campaignId}
          campaignName={campaignName}
          activeTab="petitions"
          onTabChange={(t) => requestLeave(() => goTab(t))}
          onBack={() =>
            requestLeave(() => navigate(`/campaigns/edit/${campaignId}/petition`))
          }
          onRewards={() => {}}
        >
          {isPaymentRequired ? (
            <div className="p-4">
              <CampaignPaymentRequiredPrompt
                campaignId={campaignId}
                featureName="Petitions"
                isMainOwner={isMainOwner}
                billingMode={billingMode}
              />
            </div>
          ) : isBasic ? (
            <div className="p-4">
              <BasicFeatureUpgradePrompt
                campaignId={campaignId}
                featureName="Petitions"
                isMainOwner={isMainOwner}
              />
            </div>
          ) : (
          <PetitionCreateEditView
            saving={saving || deleteSaving}
            onBack={() =>
              requestLeave(() =>
                navigate(`/campaigns/edit/${campaignId}/petition`),
              )
            }
            form={form}
            countryOpts={countryOpts as BaseOption[]}
            onCountriesChange={onCountriesChange}
            externalLinks={externalLinks as string[]}
            addLink={addLink}
            removeLinkAt={removeLinkAt}
            mediaType={mediaType}
            setMediaType={(t) => {
              form.setValue("mediaType", t, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setMediaErrorText(null);
              setMediaOversize(false);
              // Only clear media when explicitly choosing "none". When switching to image/video/youtube
              // tab, keep existing media so if user comes back without selecting anything, last selection is preserved.
              if (t === "none") setMedia({ type: "none" });
            }}
            media={media}
            setMedia={setMedia}
            mediaErrorText={mediaErrorText}
            clearMediaError={() => {
              setMediaErrorText(null);
              form.clearErrors("mediaType" as any);
            }}
            setMediaErrorText={(msg) => {
              setMediaErrorText(msg);
              form.setError("mediaType", {
                type: "manual",
                message: msg,
              } as any);
            }}
            setMediaOversize={(v) => setMediaOversize(v)}
            ytDraft={ytDraft}
            setYtDraft={(v) =>
              form.setValue("youtubeDraft", v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            descVal={String(descVal ?? "")}
            onDeleteClick={() =>
              setDeleteConfirm({
                open: true,
                id: activePetitionId,
                name: form.getValues("name"),
              })
            }
            onSaveClick={form.handleSubmit(updatePetition)}
            saveDisabledWhenNoChanges={!hasEditableChanges}
          />
          )}

          <CampaignActionConfirmModal
            open={deleteConfirm.open}
            title="Delete petition?"
            description={`This will permanently delete "${deleteConfirm.name || "this petition"}".`}
            confirmLabel="Delete"
            tone="danger"
            loading={deleteSaving}
            onClose={() => setDeleteConfirm({ open: false, id: null })}
            onConfirm={() => {
              if (!deleteConfirm.id) return;
              deletePetition(deleteConfirm.id);
            }}
          />
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
