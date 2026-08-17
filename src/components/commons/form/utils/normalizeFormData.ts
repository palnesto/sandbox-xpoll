// src/components/form/utils/normalizeFormData.ts
import { z } from "zod";
import { getZodFieldMeta } from "./zodFieldMeta";

export function normalizeFormDataBySchema<T extends Record<string, any>>(
  schema: z.ZodObject<any>,
  data: T,
): T {
  const out: any = { ...data };
  const shape = schema.shape as Record<string, z.ZodTypeAny>;

  for (const key of Object.keys(shape)) {
    const meta = getZodFieldMeta(schema, key);

    // If optional field is undefined, turn into null
    if (meta.optional && out[key] === undefined) {
      if (meta.base === "string" || meta.base === "number") {
        out[key] = null;
      }
    }
  }

  return out as T;
}
