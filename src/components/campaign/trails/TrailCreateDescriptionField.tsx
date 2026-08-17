import { Control, Controller, FieldErrors } from "react-hook-form";
import { cn } from "@/lib/utils";
import { RichTextReadOnly } from "@/components/commons/editor/preview";
import { TipTap } from "@/components/commons/editor/tiptap";
import type { TrailCreateValues } from "@/schema/campaign.schemas";

export function TrailCreateDescriptionField({
  control,
  errors,
  canEdit,
}: {
  control: Control<TrailCreateValues>;
  errors: FieldErrors<TrailCreateValues>;
  canEdit: boolean;
}) {
  return (
    <div>
      <header className="flex items-center justify-between">
        <h2 className="text-[#7A7A7A]">Add Description</h2>
        <div className="text-[12px] text-[#B0B0B0]">350 characters</div>
      </header>
      <div
        className={cn(
          "mt-2",
          errors.description ? "border-red-300" : "border-black/10",
          !canEdit ? "bg-white" : "",
        )}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) =>
            !canEdit ? (
              <RichTextReadOnly html={String(field.value || "")} />
            ) : (
              <TipTap
                description={field.value || ""}
                onChange={(next) => field.onChange(next)}
              />
            )
          }
        />
      </div>

      {errors.description?.message ? (
        <p className="mt-2 text-xs text-red-600">
          {String(errors.description.message)}
        </p>
      ) : null}
    </div>
  );
}
