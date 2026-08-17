import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X, FileText, Trash2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import { blogCreateBaseZ } from "@/schema/blog.schemas";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/commons/editor/markdown-editor";
import { Controller } from "react-hook-form";
import { ImageSlot } from "@/components/campaign/petition/CampaignImageSlot";
import EasyReactCropper from "@/components/commons/image-cropper";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";
import { TrialSelect } from "@/components/commons/selects/trial-select";
import type { ListingOption, TrialListItem } from "@/components/commons/selects/trial-select";
import { canCreateBlogByCampaignStatus } from "@/utils/campaign-status";
import { useBlogCreateForm } from "@/components/campaign/blog/useBlogCreateForm";
import { ACCEPT_IMAGE, ACCEPT_VIDEO, BLOG_MAX_IMAGE_MB, BLOG_MAX_VIDEO_MB, CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS, CAMPAIGN_BLOG_MAX_TITLE_CHARS, CROP_VIEW_H, CROP_VIEW_W, MAX_LINKED_TRIALS, safeArr, VIDEO_HELPER_TEXT } from "@/constants/blog-create.constants";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

export default function BlogCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");

  const {
    campaignData,
    campaignName,
    permissions,
    isMainOwner,
    isPaymentRequired,
    billingMode,
  } = useCampaignByOwner(campaignId);
  const campaignStatus = String(campaignData?.status ?? "").toLowerCase();
  const allowBlogCreateByStatus = canCreateBlogByCampaignStatus(campaignStatus);
  const canCreate = permissions.campaignBlog.create;

  const {
    form,
    trialPickerKey,
    linkedTrialsView,
    hasDeletedLinkedTrial,
    onAddTrial,
    onRemoveTrial,
    saving,
    onSubmit,
    canSubmit,
    hasUnsavedChanges,
    cropUIOpen,
    cropperImageUrl,
    dragOver,
    setDragOver,
    mediaHandlers,
    mediaRefs,
  } = useBlogCreateForm(campaignId);

  useEffect(() => {
    if (!campaignId || campaignData === undefined) return;
    if (campaignData && !canCreate && !isPaymentRequired) {
      navigate(`/campaigns/edit/${campaignId}/blog`, { replace: true });
    }
  }, [campaignId, campaignData, canCreate, isPaymentRequired, navigate]);

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const handleSubmit = (v: Parameters<typeof onSubmit>[0]) =>
    onSubmit(v, () => navigate(`/campaigns/edit/${campaignId}/blog`, { replace: true }));

  const canSubmitWithStatus = canSubmit && allowBlogCreateByStatus;
  const externalLinks = form.watch("externalLinks") ?? [];
  const linkedTrialIds = form.watch("linkedTrials") ?? [];
  const mediaType = form.watch("mediaType");
  const imageLink = form.watch("imageLink");
  const videoLink = form.watch("videoLink");

  if (isPaymentRequired) {
    return (
      <CampaignLayout
        campaignId={campaignId}
        campaignName={campaignName}
        activeTab="blogs"
        onTabChange={goTab}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/blog`)}
        onRewards={() => {}}
      >
        <section className="min-h-screen p-4">
          <CampaignPaymentRequiredPrompt
            campaignId={campaignId}
            featureName="Blogs"
            isMainOwner={isMainOwner}
            billingMode={billingMode}
          />
        </section>
      </CampaignLayout>
    );
  }

  if (campaignData && !canCreate) {
    return null;
  }

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={campaignId}
          campaignName={campaignName}
          activeTab="blogs"
          onTabChange={(t) => requestLeave(() => goTab(t))}
          onBack={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/blog`))}
          onRewards={() => {}}
        >
          <section className="p-4 min-h-screen">
            <div className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5">
              <header className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/blog`))}
                  className="rounded-full bg-white border border-black/10 px-4 py-2 hover:bg-black/5 shadow-inner shadow-sm backdrop-blur-lg"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <section>
                  <h1 className="text-lg font-semibold text-[#111]">Create Blog</h1>
                  <h2 className="text-xs text-black/50">Blog will be created as Draft</h2>
                </section>
              </header>

              {!allowBlogCreateByStatus && campaignStatus && (
                <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Blog can not be created as campaign is {campaignStatus}.
                </p>
              )}

              <form
                onSubmit={handleSubmitNormalized(blogCreateBaseZ as any, form, handleSubmit)}
                className="mt-6 grid grid-cols-2 gap-6"
                noValidate
              >
                <div className="space-y-5">
                  <section className="space-y-2">
                    <p className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-[#111]">
                        Blog name <span className="text-red-500">*</span>
                      </h2>
                      <span className="text-sm text-black/50">Max {CAMPAIGN_BLOG_MAX_TITLE_CHARS} characters</span>
                    </p>
                    <Input
                      {...form.register("title")}
                      placeholder="Blog title"
                      className="bg-white"
                      disabled={!allowBlogCreateByStatus}
                    />
                    {form.formState.errors.title?.message && (
                      <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
                    )}
                  </section>

                  <section className="rounded-xl bg-white border border-black/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[#111]">External Links</div>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = safeArr(externalLinks).slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS);
                          if (cur.length < CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS)
                            form.setValue("externalLinks", [...cur, ""], {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                        }}
                        disabled={safeArr(externalLinks).length >= CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS}
                        className="rounded-full bg-[#E4F2DF] px-3 py-1 text-[11px] font-semibold text-[#315326] disabled:opacity-60"
                      >
                        + Add Link
                      </button>
                    </div>
                    <div className="space-y-2">
                      {safeArr(externalLinks).slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS).map((_, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="https://example.com or example.com"
                              value={String(externalLinks[idx] ?? "")}
                              onChange={(e) => {
                                const next = [...(externalLinks ?? [])];
                                next[idx] = e.target.value;
                                form.setValue("externalLinks", next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                              className={
                                (form.formState.errors?.externalLinks as { [i: number]: { message?: string } })?.[idx]
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = safeArr(form.getValues("externalLinks")).filter(
                                  (_, i) => i !== idx
                                );
                                form.setValue("externalLinks", next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                              className="rounded-lg p-2 hover:bg-black/5"
                            >
                              <X className="h-4 w-4 text-black/60" />
                            </button>
                          </div>
                          {(form.formState.errors?.externalLinks as { [i: number]: { message?: string } })?.[idx]
                            ?.message && (
                            <p className="text-xs text-red-600">
                              {
                                (form.formState.errors.externalLinks as { [i: number]: { message?: string } })[idx]
                                  .message
                              }
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="rounded-xl bg-white border border-black/10 p-4">
                    <section className="flex items-center justify-between gap-2 flex-wrap">
                      <h2 className="font-semibold text-[#111]">Media</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(["image", "video", "youtube", "none"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => mediaHandlers.onMediaTypeChange(t)}
                            className={cn(
                              "rounded-full px-2 xl:px-3 py-1.5 text-[10px] xl:text-[12px] font-semibold border",
                              mediaType === t
                                ? "bg-[#EDEDED] border-gray-300"
                                : "bg-white border-black/10 text-black/60 hover:bg-black/5"
                            )}
                          >
                            {t === "image"
                              ? "Image"
                              : t === "video"
                                ? "Video"
                                : t === "youtube"
                                  ? "YouTube"
                                  : "No Media Required"}
                          </button>
                        ))}
                      </div>
                    </section>
                    {([form.watch("imageLink"), videoLink, form.watch("youtubeId")].filter(
                      (v) => v && String(v).trim()
                    ).length > 1) && (
                      <p className="mt-2 text-xs text-red-600">
                        Only one media type allowed. Please remove the other or choose one type.
                      </p>
                    )}
                    {mediaType === "image" && (
                      <div className="mt-3">
                        <p className="text-sm text-black/60 mb-2">
                          JPG, PNG, WEBP, GIF. Max {BLOG_MAX_IMAGE_MB} MB.
                        </p>
                        <div
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            mediaRefs.dragCounterRef.current++;
                            if (e.dataTransfer?.types?.includes("Files")) setDragOver(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            mediaRefs.dragCounterRef.current = Math.max(
                              0,
                              mediaRefs.dragCounterRef.current - 1
                            );
                            if (mediaRefs.dragCounterRef.current === 0) setDragOver(false);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                            setDragOver(true);
                          }}
                          onDrop={mediaHandlers.onImgDrop}
                          className={cn(
                            "relative rounded-xl transition-all",
                            dragOver && "ring-2 ring-[#78BC61] ring-dashed"
                          )}
                        >
                          <ImageSlot
                            size="big"
                            value={imageLink ?? null}
                            onPick={mediaHandlers.openImagePicker}
                            onRemove={mediaHandlers.removeImage}
                            error={form.formState.errors?.imageLink?.message as string | undefined}
                          />
                          {dragOver && (
                            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                              <span className="rounded-full bg-white/90 px-3 py-1 text-xs">
                                Drop to upload
                              </span>
                            </div>
                          )}
                        </div>
                        <input
                          ref={mediaRefs.fileRef as React.RefObject<HTMLInputElement>}
                          type="file"
                          accept={ACCEPT_IMAGE}
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) mediaHandlers.applyImage(f);
                            e.currentTarget.value = "";
                          }}
                        />
                        {cropUIOpen && cropperImageUrl && (
                          <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                            <p className="mb-2 text-sm font-medium text-[#5E6366]">Crop image</p>
                            <div
                              className="relative w-full overflow-hidden rounded-lg bg-[#dfd7d7]"
                              style={{ height: CROP_VIEW_H }}
                            >
                              <EasyReactCropper
                                key={cropperImageUrl}
                                image={cropperImageUrl}
                                ref={mediaRefs.cropperRef as any}
                                width={CROP_VIEW_W}
                                height={CROP_VIEW_H}
                              />
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={mediaHandlers.closeCropper}
                              >
                                Cancel
                              </Button>
                              <Button type="button" onClick={mediaHandlers.handleSaveCrop}>
                                Apply Crop
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {mediaType === "video" && (
                      <div className="mt-3">
                        <p className="text-sm text-black/60 mb-2">
                          {VIDEO_HELPER_TEXT}
                        </p>
                        <MediaDropzone
                          accept={ACCEPT_VIDEO}
                          onFiles={(files) => {
                            const f = files[0];
                            if (f) mediaHandlers.onVideoFile(f);
                          }}
                          onPickClick={mediaHandlers.openVideoPicker}
                          className={cn(
                            "rounded-xl border border-black/10 p-3",
                            !videoLink && "min-h-[170px]"
                          )}
                        >
                          <div
                            className={cn("flex-1", !videoLink && "flex min-h-[240px]")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {videoLink ? (
                              <div>
                                <video
                                  src={typeof videoLink === "string" ? videoLink : undefined}
                                  playsInline
                                  controls
                                  muted
                                  className="w-full rounded-lg h-[200px] object-cover bg-black/5"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    mediaHandlers.removeVideo();
                                  }}
                                  className="mt-2"
                                >
                                  Remove
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    mediaHandlers.openVideoPicker();
                                  }}
                                  className="mt-2 ml-2"
                                >
                                  Replace video
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mediaHandlers.openVideoPicker();
                                }}
                                className="w-full min-h-[170px] rounded-lg border border-dashed border-black/15 px-3 py-6 flex items-center justify-center"
                              >
                                <div className="flex items-center gap-2 text-xs text-[#315326]">
                                  <FileText className="h-4 w-4 text-[#78BC61]" /> + Upload video
                                  ({BLOG_MAX_VIDEO_MB} MB max)
                                </div>
                              </button>
                            )}
                          </div>
                        </MediaDropzone>
                        <input
                          ref={mediaRefs.videoRef as React.RefObject<HTMLInputElement>}
                          type="file"
                          accept={ACCEPT_VIDEO}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            mediaHandlers.onVideoFile(file);
                            e.currentTarget.value = "";
                          }}
                        />
                        {form.formState.errors?.videoLink?.message && (
                          <p className="mt-2 text-[11px] text-red-600">
                            {form.formState.errors.videoLink.message}
                          </p>
                        )}
                      </div>
                    )}
                    {mediaType === "youtube" && (
                      <div className="mt-3 rounded-xl border border-black/10 bg-[#F7F7F7] p-3">
                        <Label>YouTube URL or Video ID</Label>
                        <Input
                          className="mt-2"
                          placeholder="Paste YouTube link or 11-char ID"
                          value={form.watch("youtubeId") ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v && String(v).trim()) {
                              mediaHandlers.removeImage();
                              mediaHandlers.removeVideo();
                            }
                            form.setValue("youtubeId", v, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        />
                        {form.formState.errors?.youtubeId?.message && (
                          <p className="mt-1 text-xs text-red-600">
                            {form.formState.errors.youtubeId.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-black/50">
                    <h2 className="font-semibold text-[#111]">
                      Description <span className="text-red-500">*</span>
                    </h2>
                    <span className="text-sm text-black/50">Max {CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS} characters</span>
                  </div>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <MarkdownEditor value={field.value || ""} onChange={field.onChange} minHeight={360} />
                    )}
                  />
                  {form.formState.errors.description?.message && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.description.message}
                    </p>
                  )}

                  <div className="rounded-xl bg-white border border-black/10 p-4 mt-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#111] pb-3">
                      <h2>Link Trails</h2>
                      <p className="text-black/50">
                        {Math.min(MAX_LINKED_TRIALS, linkedTrialsView.length)}/{MAX_LINKED_TRIALS}
                      </p>
                    </div>
                    <TrialSelect
                      key={trialPickerKey}
                      onChange={(opt) => onAddTrial(opt as ListingOption<TrialListItem>)}
                      additionalFilters={{
                        belongsToCampaignIds: campaignId,
                        ...(linkedTrialIds?.length
                          ? { excludeIds: (linkedTrialIds as string[]).join(",") }
                          : {}),
                      }}
                      selectProps={{
                        isClearable: true,
                        menuPortalTarget: document.body,
                        isDisabled: linkedTrialIds.length >= MAX_LINKED_TRIALS,
                      }}
                      placeholder="Search trails"
                    />
                    {linkedTrialsView.length ? (
                      <div className="mt-3 space-y-2">
                        {linkedTrialsView.map((t) => (
                          <div
                            key={t.id}
                            className={cn(
                              "flex items-center justify-between rounded-xl border px-3 py-2",
                              t.isDeleted
                                ? "bg-red-50 border-red-200"
                                : "border-black/10 bg-[#FAFAFA]"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-10 w-10 rounded-lg bg-black/5 overflow-hidden shrink-0">
                                {t.imageUrl ? (
                                  <img
                                    src={t.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    {t.isDeleted ? (
                                      <Trash2 className="h-4 w-4 text-red-400" />
                                    ) : (
                                      <LinkIcon className="h-4 w-4 text-black/40" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[#111] truncate">
                                  {t.title}
                                </div>
                                <div className="text-[11px] text-black/50 truncate">{t.id}</div>
                                {t.isDeleted && (
                                  <p className="text-xs font-medium text-red-600 mt-1">
                                    This trail no longer exists. Please unlink it before saving.
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveTrial(t.id)}
                              className="rounded-lg p-2 hover:bg-black/5 shrink-0"
                              title="Remove trial"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-black/50">No linked trails yet.</div>
                    )}
                  </div>
                </div>
              </form>

              {hasDeletedLinkedTrial && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-blink">
                  The trail you linked recently got deleted. Would you like to link a new trail?
                </p>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!canSubmitWithStatus || saving || form.formState.isSubmitting}
                  onClick={() => form.handleSubmit((v) => handleSubmit(v))()}
                  className={cn(
                    "rounded-full px-6 py-3 text-sm font-semibold text-white",
                    canSubmitWithStatus && !saving && !form.formState.isSubmitting
                      ? "bg-[#0EA5A5] hover:bg-[#0b8f8f]"
                      : "bg-[#BFBFBF] cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {saving || form.formState.isSubmitting ? "Creating..." : "Create Blog"}
                </button>
              </div>
            </div>
          </section>
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
