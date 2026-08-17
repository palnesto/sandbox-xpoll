// src/components/commons/form/examples/ExampleForm.tsx

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { TextField } from "../TextField";
import { NumberField } from "../NumberField";
import { handleSubmitNormalized } from "../utils/rhfSubmit";
import { TextAreaField } from "../TextAreaField";
import { ToggleField } from "../ToggleField";

export const exampleFormZ = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(150).optional(),
  rewardAmountCap: z.number().min(1, "Total tokens must be > 0"),
  price: z.number().min(1, "Price must be ≥ 0"),
  discount: z.number().optional(),
  isActive: z.boolean(),
  // optional toggle
  // allowDiscounts: z.boolean().optional(),
});

export type ExampleFormValues = z.infer<typeof exampleFormZ>;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ExampleForm() {
  const form = useForm<ExampleFormValues>({
    mode: "onChange",
    resolver: zodResolver(exampleFormZ),
  });

  const {
    formState: { isValid, isSubmitting },
  } = form;

  useEffect(() => {
    console.log("isSubmitting:", isSubmitting);
  }, [isSubmitting]);

  const onSubmit = async (data: ExampleFormValues) => {
    console.log("FORM DATA →", data);

    // ✅ testing: keep RHF in submitting state for 3s
    await sleep(3000);
    // await mutateAsync(payload)

    console.log("DONE AFTER 3s →", data);
  };

  return (
    <div className="max-w-xl mx-auto mt-16 rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Create something</h2>

      <form
        onSubmit={handleSubmitNormalized(exampleFormZ, form, onSubmit)}
        className="mt-6 space-y-5"
        noValidate
      >
        <TextField<ExampleFormValues>
          form={form}
          schema={exampleFormZ}
          name="title"
          label="Title"
          placeholder="Enter title"
          helperText="A short title users will see in the list. A short title users will see in the list. A short title users will see in the list. A short title users will see in the list. A short title users will see in the list. A short title users will see in the list."
          showCounter
          showError
        />

        <NumberField<ExampleFormValues>
          form={form}
          schema={exampleFormZ}
          name="rewardAmountCap"
          label="Reward Amount Cap"
          placeholder="0"
          decimalScale={0}
          helperText="Total tokens allowed for this campaign."
          showError
        />

        <NumberField<ExampleFormValues>
          form={form}
          schema={exampleFormZ}
          name="price"
          label="Price"
          placeholder="0.00"
          decimalScale={2}
          helperText="2 decimal places allowed."
          showError
        />

        <NumberField<ExampleFormValues>
          form={form}
          schema={exampleFormZ}
          name="discount"
          label="Discount (optional)"
          placeholder="0.00"
          decimalScale={3}
          helperText="Leave empty if no discount."
          showError
        />

        <TextAreaField<ExampleFormValues>
          form={form}
          schema={exampleFormZ}
          name="description"
          label="Description"
          placeholder="Explain in a short sentence…"
          helperText="Optional. Max 150 characters."
          rows={4}
          showCounter
          showError
        />

        <ToggleField<ExampleFormValues>
          form={form}
          schema={exampleFormZ}
          name="isActive"
          label="Is Active?"
          helperText="Active campaigns are visible to users."
          showError
        />
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={cn(
            "w-full rounded-full py-3 text-sm font-semibold text-white transition",
            isValid && !isSubmitting
              ? "bg-blue hover:bg-[#29d8d8]"
              : "bg-gray-300 cursor-not-allowed",
          )}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
