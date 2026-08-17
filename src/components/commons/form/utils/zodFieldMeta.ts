// src/components/form/utils/zodFieldMeta.ts
import { z } from "zod";

type AnyZod = z.ZodTypeAny;

function unwrapAll(t: AnyZod): AnyZod {
  let cur: AnyZod = t;
  while (cur instanceof z.ZodEffects) cur = cur._def.schema;
  if (cur instanceof z.ZodDefault) cur = cur._def.innerType;
  return cur;
}

function peelOptionalNullable(t: AnyZod) {
  let cur: AnyZod = unwrapAll(t);
  let optional = false;
  let nullable = false;

  while (cur instanceof z.ZodOptional || cur instanceof z.ZodNullable) {
    if (cur instanceof z.ZodOptional) optional = true;
    if (cur instanceof z.ZodNullable) nullable = true;
    cur = unwrapAll(cur._def.innerType);
  }

  return { inner: cur, optional, nullable };
}

function getFieldSchema(schema: z.ZodObject<any>, path: string): AnyZod {
  const parts = path.split(".");
  let cur: AnyZod = schema;

  for (const p of parts) {
    const u = unwrapAll(cur);
    if (!(u instanceof z.ZodObject)) {
      throw new Error(`Path "${path}" is not a ZodObject at "${p}"`);
    }
    const shape = u.shape as Record<string, AnyZod>;
    cur = shape[p];
    if (!cur) throw new Error(`Field "${p}" not found in schema for "${path}"`);
  }

  return cur;
}

export function getZodFieldMeta(schema: z.ZodObject<any>, path: string) {
  const field = getFieldSchema(schema, path);
  const { inner, optional, nullable } = peelOptionalNullable(field);

  const base =
    inner instanceof z.ZodString
      ? "string"
      : inner instanceof z.ZodNumber
        ? "number"
        : "other";

  return { optional, nullable, base };
}

export function getZodStringMax(
  schema: z.ZodObject<any>,
  path: string,
): number | null {
  const field = getFieldSchema(schema, path);
  const { inner } = peelOptionalNullable(field);
  if (!(inner instanceof z.ZodString)) return null;

  const checks = (inner._def as any)?.checks as Array<any> | undefined;
  const maxCheck = checks?.find((c) => c.kind === "max");
  return typeof maxCheck?.value === "number" ? maxCheck.value : null;
}
