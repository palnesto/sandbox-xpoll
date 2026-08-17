// src/components/modals/EditCampaignQrModal.tsx
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

import CustomModal from "../custom-modal";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const editCampaignQrZ = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Max 100 characters"),
  description: z
    .string()
    .trim()
    .max(250, "Max 250 characters")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type EditCampaignQrValues = z.infer<typeof editCampaignQrZ>;

type Props = {
  qrId: string | null;
  onClose: () => void;
};

function pickDataRoot(resp: any) {
  return resp?.data?.data ?? resp?.data ?? resp ?? null;
}

export default function EditCampaignQrModal({ qrId, onClose }: Props) {
  const open = !!qrId;

  const form = useForm<EditCampaignQrValues>({
    mode: "onChange",
    resolver: zodResolver(editCampaignQrZ),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // fetch inside modal
  const { data: campaignQrIdData, isLoading: isCampaignQrIdLoading } =
    useApiQuery(
      open && qrId
        ? endpoints.campaigns.campaignQr.getCampaignQrById(qrId)
        : (null as any),
    );

  const filteredCampaignQrIdData = useMemo(() => {
    if (!campaignQrIdData) return null;
    return pickDataRoot(campaignQrIdData);
  }, [campaignQrIdData]);

  // hydrate form when data arrives / qr changes
  useEffect(() => {
    if (!open) return;

    if (isCampaignQrIdLoading) return;

    const d = filteredCampaignQrIdData;
    if (!d) return;

    form.reset({
      name: d?.name ?? "",
      description: d?.description ?? "",
      isActive: typeof d?.isActive === "boolean" ? d.isActive : true,
    });
  }, [open, qrId, isCampaignQrIdLoading, filteredCampaignQrIdData]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate, isPending: isSubmitting } = useApiMutation({
    route: endpoints.campaigns.campaignQr.editCampaignQr(qrId) ?? "", // <-- adjust if your endpoint key differs
    method: "PATCH",
    onSuccess: () => {
      form.reset();
      onClose();
    },
  });

  const {
    formState: { isValid },
  } = form;

  const onSubmit = async (data: EditCampaignQrValues) => {
    if (!qrId) return;

    const payload = {
      name: data.name.trim(),
      description: data.description?.trim()
        ? data.description.trim()
        : undefined,
      isActive: !!data.isActive,
    };
    console.log("payload", payload);

    mutate(payload);
  };

  const footer = useMemo(() => {
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            if (isSubmitting) return;
            onClose();
          }}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-semibold",
            "border border-black/10 hover:bg-black/5",
            isSubmitting ? "opacity-70 cursor-not-allowed" : "",
          )}
        >
          Cancel
        </button>

        <Button
          type="submit"
          form="edit-campaign-qr-form"
          disabled={!isValid || isSubmitting || isCampaignQrIdLoading}
          className={cn(
            "max-w-52 p-2 w-full rounded-full text-[15px] font-semibold text-white bg-[#0DACAD] hover:bg-[#29d8d8] disabled:bg-[#cccccc] text-center disabled:opacity-95 disabled:cursor-not-allowed",
          )}
        >
          {isSubmitting ? "Please wait..." : "Save changes"}
        </Button>
      </div>
    );
  }, [isSubmitting, isValid, onClose, isCampaignQrIdLoading]);

  return (
    <CustomModal
      open={open}
      title="Edit QR"
      description="Update the details for this QR."
      loading={isSubmitting}
      error={null}
      onClose={() => {
        if (isSubmitting) return;
        onClose();
      }}
      footer={footer}
      widthClassName="w-[560px] max-w-[92vw]"
    >
      {isCampaignQrIdLoading ? (
        <div className="space-y-5">
          {/* Active row skeleton */}
          <div className="rounded-xl border border-black/10 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </div>

          {/* Name skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      ) : (
        <form
          id="edit-campaign-qr-form"
          onSubmit={handleSubmitNormalized(editCampaignQrZ, form, onSubmit)}
          className="space-y-5"
          noValidate
        >
          {/* Active toggle row */}
          <div className="rounded-xl border border-black/10 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[#111]">Active</div>

              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
          </div>

          <TextField<EditCampaignQrValues>
            form={form}
            schema={editCampaignQrZ}
            name="name"
            label="Name"
            placeholder="Enter QR name"
            helperText="This will help you identify the QR in your library."
            showCounter
            showError
          />

          <TextAreaField<EditCampaignQrValues>
            form={form}
            schema={editCampaignQrZ}
            name="description"
            label="Description (optional)"
            placeholder="Add a short description…"
            helperText="Optional. Max 250 characters."
            rows={4}
            showCounter
            showError
          />
        </form>
      )}
    </CustomModal>
  );
}
