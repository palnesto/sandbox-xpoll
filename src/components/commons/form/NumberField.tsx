// src/components/form/NumberField.tsx
import { useEffect, useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { getZodFieldMeta } from "./utils/zodFieldMeta";

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  schema: z.ZodObject<any>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  helperText?: string;
  decimalScale?: number; // 0 for ints, 2 for decimals etc
  showError?: boolean;
  className?: string;
};

function isValidNumericInput(raw: string, decimalScale: number) {
  if (!/^-?\d*\.?\d*$/.test(raw)) return false;

  if (decimalScale <= 0) return /^-?\d*$/.test(raw);

  const parts = raw.split(".");
  if (parts.length > 2) return false;
  if (parts[1] && parts[1].length > decimalScale) return false;

  return true;
}

export function NumberField<T extends FieldValues>({
  form,
  schema,
  name,
  label,
  placeholder,
  helperText,
  decimalScale = 0,
  showError,
  className,
}: Props<T>) {
  const { control, setValue, getValues, formState } = form;
  const meta = getZodFieldMeta(schema, String(name));
  const err = (formState.errors as any)?.[name]?.message as string | undefined;
  const isRequired = !!label && !meta.optional;

  // ✅ local text buffer so "." / "2." can exist while typing
  const [text, setText] = useState<string>("");

  // ✅ watch actual RHF value safely (hook is top-level)
  const watchedValue = useWatch({ control, name });

  // ✅ smart init: required numbers default to 0
  useEffect(() => {
    if (meta.base !== "number") return;
    const v = getValues(name);
    if (!meta.optional && v === undefined) {
      setValue(name, 0 as any, { shouldDirty: false, shouldTouch: false });
    }
  }, [meta.base, meta.optional, getValues, name, setValue]);

  // ✅ sync text when RHF value changes externally (reset, setValue, defaults, etc.)
  useEffect(() => {
    const v = watchedValue as any;

    if (v === undefined || v === null) {
      // only clear if local text isn't actively a partial value
      if (text === "" || text === "-" || text === "." || text === "-.") {
        setText("");
      }
      return;
    }

    const next = String(v);
    if (next !== text) setText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValue]);

  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <label className="text-sm font-medium">
          {label}
          {isRequired ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}

      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <>
            <input
              inputMode={decimalScale > 0 ? "decimal" : "numeric"}
              value={text}
              placeholder={placeholder}
              onBlur={(e) => {
                field.onBlur();
                const raw = e.target.value.trim();

                // finalize on blur
                if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
                  if (meta.optional) {
                    field.onChange(undefined);
                    setText("");
                  } else {
                    field.onChange(0);
                    setText("0");
                  }
                  return;
                }

                const n = Number(raw);
                if (!Number.isFinite(n)) {
                  if (meta.optional) {
                    field.onChange(undefined);
                    setText("");
                  } else {
                    field.onChange(0);
                    setText("0");
                  }
                  return;
                }

                field.onChange(n);
                setText(String(n));
              }}
              onChange={(e) => {
                const raw = e.target.value;

                // allow clearing
                if (raw === "") {
                  setText("");
                  if (meta.optional) field.onChange(undefined);
                  else field.onChange(0);
                  return;
                }

                // block invalid chars / too many decimals
                if (!isValidNumericInput(raw, decimalScale)) return;

                // keep user typing
                setText(raw);

                // don't force numeric while partial
                if (
                  raw === "-" ||
                  raw === "." ||
                  raw === "-." ||
                  raw.endsWith(".")
                ) {
                  return;
                }

                const n = Number(raw);
                if (Number.isFinite(n)) field.onChange(n);
              }}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2",
                err
                  ? "border-red-500 focus:ring-red-200"
                  : "border-[#C2C2C2] focus:ring-gray-200",
              )}
            />

            {helperText ? (
              <div className="mt-1 text-xs text-gray-500">{helperText}</div>
            ) : null}

            {showError && err ? (
              <div className="text-xs text-red-600">{err}</div>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
