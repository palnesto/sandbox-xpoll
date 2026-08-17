// src/components/form/utils/rhfSubmit.ts
import type {
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";
import { z } from "zod";
import { normalizeFormDataBySchema } from "./normalizeFormData";

export function handleSubmitNormalized<T extends FieldValues>(
  schema: z.ZodObject<any>,
  form: UseFormReturn<T>,
  onValid: SubmitHandler<T>,
) {
  return form.handleSubmit((data) => {
    const normalized = normalizeFormDataBySchema(schema, data);
    return onValid(normalized);
  });
}
