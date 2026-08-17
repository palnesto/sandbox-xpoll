import { UseFormRegister, FieldErrors } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { TrailCreateValues } from "@/schema/campaign.schemas";

export function TrailCreateNameField({
  register,
  errors,
  canEdit,
}: {
  register: UseFormRegister<TrailCreateValues>;
  errors: FieldErrors<TrailCreateValues>;
  canEdit: boolean;
}) {
  return (
    <div>
      <div className="text-[#7A7A7A] mb-2">Trail name</div>
      <input
        readOnly={!canEdit}
        disabled={!canEdit}
        className={cn(
          "w-full rounded-lg bg-white border px-4 py-3 text-sm outline-none",
          errors.trailName ? "border-red-300" : "border-black/10",
        )}
        placeholder="Cost of Living Pulse"
        {...register("trailName")}
      />
      {errors.trailName?.message && (
        <p className="mt-2 text-xs text-red-600">
          {errors.trailName.message}
        </p>
      )}
    </div>
  );
}
