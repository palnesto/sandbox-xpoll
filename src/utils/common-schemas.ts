import { z } from "zod";

export const mongoIdZod = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid ID format" });
export const appPasscodeZod = z.string().trim().min(1);
export const zodIdSchema = z.object({
  _id: mongoIdZod,
});

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      return new Date(arg + "T00:00:00");
    }
    const d = new Date(arg);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (arg instanceof Date) {
    return isNaN(arg.getTime()) ? undefined : arg;
  }
  return undefined;
}, z.date().optional());

export const emailZ = z.string().email().max(190);

export const passwordZ = z
  .string()
  .min(8)
  .max(128)
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).*/, {
    message: "Password must include upper, lower, number and symbol",
  });

export const mediaItemZod = z
  .object({
    type: z.enum(["image", "video"]),
    url: z.string().url(),
  })
  .strict();

export const ytVidIdZod = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/, "Invalid YouTube video ID");
export const internetImageUrlZod = z
  .string()
  .url()
  .regex(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i, "Invalid image URL");

export const RESOURCE_TYPES_STRING = {
  YOUTUBE: "youtube",
  IMAGE: "image",
} as const;
export const resourceTypes = [
  RESOURCE_TYPES_STRING.YOUTUBE,
  RESOURCE_TYPES_STRING.IMAGE,
] as const;
export const resourceTypeEnum = z.enum(resourceTypes);
export type ResourceType = z.infer<typeof resourceTypeEnum>;
export const resourceZod = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(RESOURCE_TYPES_STRING.YOUTUBE),
    value: ytVidIdZod,
  }),
  z.object({
    type: z.literal(RESOURCE_TYPES_STRING.IMAGE),
    value: internetImageUrlZod,
  }),
]);

export const toStringArray = (v: unknown): string[] => {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  // split comma lists, trim, drop empties
  const flat = arr.flatMap((x) =>
    String(x)
      .split(",")
      .map((s) => s.trim())
  );
  // treat empty string as no filter
  const filtered = flat.filter((s) => s.length > 0);
  // de-dup
  return Array.from(new Set(filtered));
};

export const toIdOrNullArray = (v: unknown): (string | null)[] => {
  // supports ?from=...,?from=... and ?from=...,null
  const items = toStringArray(v).map((s) =>
    s.toLowerCase() === "null" ? null : s
  );
  // if user explicitly passed only "null", keep [null]; otherwise keep strings + nulls
  return items;
};
