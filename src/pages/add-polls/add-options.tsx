import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useAddPollFormStore } from "@/stores/addUserPoll.store";
import { type OptionsForm, optionsSchema } from "@/schema/create-user-poll";
import CreatePollLayout from "@/layouts/create-poll-layout";

export default function AddPollsOptions() {
  const navigate = useNavigate();
  const { data, setPartial } = useAddPollFormStore();

  const form = useForm<OptionsForm>({
    resolver: zodResolver(optionsSchema),
    defaultValues: useMemo(
      () => ({
        options:
          data.options?.length && data.options.length >= 2
            ? data.options
            : [{ text: "" }, { text: "" }],
      }),
      [data]
    ),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const onSubmit = (values: OptionsForm) => {
    setPartial(values);
    navigate("/add-polls/add-rewards");
  };

  // Called when invalid on submit: focus the first invalid option.text
  const onInvalid = () => {
    const errs = form.formState.errors;
    // Find first invalid option index
    const firstIdx =
      (errs.options || []).findIndex((e) => Boolean(e?.text)) ?? -1;

    if (firstIdx >= 0) {
      setTimeout(() => form.setFocus(`options.${firstIdx}.text` as const), 0);
    } else if (
      errs.options &&
      typeof (errs.options as any).message === "string"
    ) {
      // Array-level error (e.g., fewer than 2 or more than 4)
      // Focus first input as a fallback
      setTimeout(() => form.setFocus("options.0.text"), 0);
    }
  };

  return (
    <CreatePollLayout
      title="Creating poll"
      currentStep={2}
      totalSteps={3}
      nextLabel="Next"
      // Keep enabled so clicking triggers RHF validation & shows errors
      nextDisabled={
        !form.formState.isDirty ||
        !form.formState.isValid ||
        form.formState.isSubmitting
      }
      onNext={form.handleSubmit(onSubmit, onInvalid)}
    >
      <section className="rounded-xl bg-white p-4 shadow-sm border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-600">Add options</h3>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              append({ text: "" }, { shouldFocus: true });
              form.trigger("options"); // validate immediately after append
            }}
            className="h-8"
            disabled={(form.watch("options")?.length ?? 0) >= 4}
          >
            + Add option
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div key={f.id} className="flex flex-col gap-2">
              <div className="flex w-full">
                <div className="grid gap-2 flex-1">
                  <Label htmlFor={`opt-${idx}`}>Option {idx + 1}</Label>
                  <Input
                    id={`opt-${idx}`}
                    placeholder={`Option ${idx + 1}`}
                    aria-invalid={!!form.formState.errors.options?.[idx]?.text}
                    {...form.register(`options.${idx}.text` as const)}
                    className="placeholder:text-xs"
                  />
                </div>

                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      remove(idx);
                      form.trigger("options"); // keep validation state fresh after remove
                    }}
                    className="self-end"
                  >
                    Remove
                  </Button>
                )}
              </div>

              {form.formState.errors.options?.[idx]?.text && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.options[idx]?.text?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Array-level error (e.g., min/max options) */}
        {typeof (form.formState.errors.options as any)?.message ===
          "string" && (
          <p className="text-xs text-red-600">
            {(form.formState.errors.options as any).message}
          </p>
        )}
      </section>
    </CreatePollLayout>
  );
}
