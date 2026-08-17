 // src/components/form/ToggleField.tsx
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { getZodFieldMeta } from "./utils/zodFieldMeta";

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  schema: z.ZodObject<any>;
  name: Path<T>;
  label?: string;
  helperText?: string;
  showError?: boolean;
  className?: string;

  // Optional UI controls
  disabled?: boolean;
  align?: "row" | "column"; // row = label on right, column = label above
};

export function ToggleField<T extends FieldValues>({
  form,
  schema,
  name,
  label,
  helperText,
  showError,
  className,
  disabled,
  align = "row",
}: Props<T>) {
  const { control, formState } = form;

  const meta = getZodFieldMeta(schema, String(name));
  const isRequired = !!label && !meta.optional;

  const err = (formState.errors as any)?.[name]?.message as string | undefined;

  return (
    <div className={cn("space-y-1", className)}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const checked = !!field.value;

          return (
            <>
              <div
                className={cn(
                  "flex gap-3",
                  align === "row" ? "items-center" : "flex-col items-start",
                )}
              >
                {/* Toggle */}
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={checked}
                  aria-disabled={disabled}
                  onBlur={field.onBlur}
                  onClick={() => {
                    const next = !checked;

                    // Optional boolean: false => undefined (so it can normalize to null on submit if you do that)
                    if (meta.base === "boolean" && meta.optional && !next) {
                      field.onChange(undefined);
                      return;
                    }

                    field.onChange(next);
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition focus:outline-none focus:ring-2",
                    disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer",
                    err
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:ring-gray-200",
                    checked ? "bg-black" : "bg-gray-200",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition",
                      checked ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>

                {/* Label */}
                {label ? (
                  <div className={cn(align === "row" ? "" : "space-y-1")}>
                    <div className="text-sm font-medium text-gray-900">
                      {label}
                      {isRequired ? (
                        <span className="ml-1 text-red-600">*</span>
                      ) : null}
                    </div>
                    {helperText ? (
                      <div className="text-xs text-gray-500">{helperText}</div>
                    ) : null}
                  </div>
                ) : helperText ? (
                  <div className="text-xs text-gray-500">{helperText}</div>
                ) : null}
              </div>

              {showError && err ? (
                <div className="text-xs text-red-600">{err}</div>
              ) : null}
            </>
          );
        }}
      />
    </div>
  );
}

