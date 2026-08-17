import { z } from "zod";

export const INKD_AGENT_SIGNAL_NAME_MIN = 3;
export const INKD_AGENT_SIGNAL_NAME_MAX = 64;
export const INKD_AGENT_LONG_TEXT_MIN = 100;
export const INKD_AGENT_LONG_TEXT_MAX = 15000;
export const INKD_AGENT_BLOG_LENGTH_MIN = 2000;
export const INKD_AGENT_BLOG_LENGTH_MAX = 15000;
export const INKD_AGENT_PRIORITY_SOURCE_MAX = 3;

export const inkdAgentManageFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        INKD_AGENT_SIGNAL_NAME_MIN,
        `Min ${INKD_AGENT_SIGNAL_NAME_MIN} characters`,
      )
      .max(
        INKD_AGENT_SIGNAL_NAME_MAX,
        `Max ${INKD_AGENT_SIGNAL_NAME_MAX} characters`,
      ),
    foundationalInformation: z
      .string()
      .trim()
      .min(INKD_AGENT_LONG_TEXT_MIN, `Min ${INKD_AGENT_LONG_TEXT_MIN} characters`)
      .max(INKD_AGENT_LONG_TEXT_MAX),
    brandLanguage: z
      .string()
      .trim()
      .min(INKD_AGENT_LONG_TEXT_MIN, `Min ${INKD_AGENT_LONG_TEXT_MIN} characters`)
      .max(INKD_AGENT_LONG_TEXT_MAX),
    maxBlogDescriptionLength: z.coerce
      .number()
      .int()
      .min(INKD_AGENT_BLOG_LENGTH_MIN)
      .max(INKD_AGENT_BLOG_LENGTH_MAX),
    prioritySources: z
      .array(
        z
          .string()
          .trim()
          .url("Enter a valid URL that starts with http:// or https://"),
      )
      .max(
        INKD_AGENT_PRIORITY_SOURCE_MAX,
        `Max ${INKD_AGENT_PRIORITY_SOURCE_MAX} priority URLs`,
      ),
    scheduleEnabled: z.boolean(),
    scheduleWeekdays: z.array(z.string()).default([]),
    scheduleTimeLocal: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.scheduleEnabled) return;

    if (!value.scheduleWeekdays.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduleWeekdays"],
        message: "Pick at least one weekday",
      });
    }

    if (!value.scheduleTimeLocal.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduleTimeLocal"],
        message: "Select a local time",
      });
    }
  });

export type InkdAgentManageFormValues = z.infer<
  typeof inkdAgentManageFormSchema
>;
