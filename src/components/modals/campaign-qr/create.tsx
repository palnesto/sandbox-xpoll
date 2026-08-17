import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import CustomModal from "../custom-modal";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/button";

export const createCampaignQrZ = z.object({
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
});

export type CreateCampaignQrValues = z.infer<typeof createCampaignQrZ>;

type Props = {
  campaignId: string | null;
  onClose: () => void;
};

export default function CreateCampaignQrModal({ campaignId, onClose }: Props) {
  const form = useForm<CreateCampaignQrValues>({
    mode: "onChange",
    resolver: zodResolver(createCampaignQrZ),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const { mutate, isPending: isSubmitting } = useApiMutation({
    route: endpoints.campaigns.campaignQr.createCampaignQr,
    method: "POST",
    onSuccess: () => {
      form.reset();
      onClose();
    },
  });

  const {
    formState: { isValid },
  } = form;

  const onSubmit = async (data: CreateCampaignQrValues) => {
    const payload = {
      campaignId,
      name: data.name.trim(),
      description: data.description?.trim()
        ? data.description.trim()
        : undefined,
    };

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
          form="create-campaign-qr-form"
          disabled={!isValid || isSubmitting}
          className={cn(
            "max-w-52 p-2 w-full rounded-full text-[15px] font-semibold text-white bg-[#0DACAD] hover:bg-[#29d8d8] disabled:bg-[#cccccc] text-center disabled:opacity-95 disabled:cursor-not-allowed",
          )}
        >
          {isSubmitting ? "Please wait..." : "Generate QR"}
        </Button>
      </div>
    );
  }, [isSubmitting, isValid, onClose]);

  return (
    <CustomModal
      open={!!campaignId}
      title="Generate QR"
      description="Add a name and optional description for this QR."
      loading={isSubmitting}
      error={null}
      onClose={() => {
        if (isSubmitting) return;
        onClose();
      }}
      footer={footer}
      widthClassName="w-[560px] max-w-[92vw]"
    >
      <form
        id="create-campaign-qr-form"
        onSubmit={handleSubmitNormalized(createCampaignQrZ, form, onSubmit)}
        className="space-y-5"
        noValidate
      >
        <TextField<CreateCampaignQrValues>
          form={form}
          schema={createCampaignQrZ}
          name="name"
          label="Name"
          placeholder="Enter QR name"
          helperText="This will help you identify the QR in your library."
          showCounter
          showError
        />

        <TextAreaField<CreateCampaignQrValues>
          form={form}
          schema={createCampaignQrZ}
          name="description"
          label="Description (optional)"
          placeholder="Add a short description…"
          helperText="Optional. Max 250 characters."
          rows={4}
          showCounter
          showError
        />
      </form>
    </CustomModal>
  );
}
