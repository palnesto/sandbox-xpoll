import { endpoints } from "@/api/endpoints";
import { TRAIL_CONSTRAINTS } from "@/schema/campaign.schemas";
import { z } from "zod";
import {
  callRealtimeOpenAiForToolArgs,
  normalizeRealtimeOpenAiError,
  type RealtimeOpenAiSessionConfig,
  RealtimeOpenAiError,
  requestSuggestionBackend,
} from "./base";

const TRAIL_MIN = TRAIL_CONSTRAINTS.textMin;
const TRAIL_NAME_MAX = TRAIL_CONSTRAINTS.trailNameMax;
const TRAIL_DESCRIPTION_MAX = TRAIL_CONSTRAINTS.trailDescriptionMax;
const POLL_NAME_MAX = TRAIL_CONSTRAINTS.pollNameMax;
const POLL_DESCRIPTION_MAX = TRAIL_CONSTRAINTS.pollDescriptionMax;
const POLL_OPTION_MAX = TRAIL_CONSTRAINTS.pollOptionMax;
const POLLS_MAX = TRAIL_CONSTRAINTS.pollsMax;
const POLL_OPTIONS_MIN = TRAIL_CONSTRAINTS.optionsMin;
const POLL_OPTIONS_MAX = TRAIL_CONSTRAINTS.optionsMax;
const POLLS_MIN = 1;

const FALLBACK_REALTIME_MODEL =
  import.meta.env.VITE_OPENAI_REALTIME_MODEL || "gpt-realtime";

const TRAIL_SUGGESTION_TOOL_NAME = "submit_trail_suggestion";

const realtimeSessionConfigZod = z
  .object({
    type: z.literal("realtime"),
    model: z.string().min(1),
    output_modalities: z.tuple([z.literal("text")]),
  })
  .strict();

const normalizedRateLimitZod = z
  .object({
    serviceMinuteCount: z.number().int().min(1),
    identityMinuteCount: z.number().int().min(1),
    systemMinuteCount: z.number().int().min(1),
    dailyCount: z.number().int().min(0),
  })
  .strict();

const presignRateLimitZod = z
  .union([
    normalizedRateLimitZod,
    z
      .object({
        userMinuteCount: z.number().int().min(1),
        ipMinuteCount: z.number().int().min(1),
        globalMinuteCount: z.number().int().min(1),
        dailyCount: z.number().int().min(0),
      })
      .strict(),
  ])
  .transform((value) => {
    if (
      "serviceMinuteCount" in value &&
      typeof value.serviceMinuteCount === "number"
    ) {
      return value;
    }

    const legacy = value as {
      userMinuteCount: number;
      ipMinuteCount: number;
      globalMinuteCount: number;
      dailyCount: number;
    };
    return {
      serviceMinuteCount: legacy.userMinuteCount,
      identityMinuteCount: legacy.ipMinuteCount,
      systemMinuteCount: legacy.globalMinuteCount,
      dailyCount: legacy.dailyCount,
    };
  });

const uniqueCaseInsensitive = (values: string[]) =>
  new Set(values.map((v) => v.toLowerCase())).size === values.length;

const trailSuggestionPollZod = z
  .object({
    pollName: z.string().trim().min(TRAIL_MIN).max(POLL_NAME_MAX),
    pollDescription: z.string().trim().min(TRAIL_MIN).max(POLL_DESCRIPTION_MAX),
    options: z
      .array(z.string().trim().min(1).max(POLL_OPTION_MAX))
      .min(POLL_OPTIONS_MIN)
      .max(POLL_OPTIONS_MAX)
      .refine(uniqueCaseInsensitive, "Poll options must be unique"),
  })
  .strict();

const buildTrailSuggestionShapeZod = (exactPollCount?: number | null) =>
  z
    .object({
      trailName: z.string().trim().min(TRAIL_MIN).max(TRAIL_NAME_MAX),
      description: z.string().trim().min(TRAIL_MIN).max(TRAIL_DESCRIPTION_MAX),
      polls:
        typeof exactPollCount === "number"
          ? z.array(trailSuggestionPollZod).length(exactPollCount)
          : z.array(trailSuggestionPollZod).min(1).max(POLLS_MAX),
    })
    .strict();

export const trailSuggestionInputZod = z
  .object({
    campaignId: z.string().trim().length(24),
    prompt: z.string().trim().min(10).max(2000),
  })
  .strict();

export const standaloneTrailSuggestionInputZod = z
  .object({
    prompt: z.string().trim().min(10).max(2000),
  })
  .strict();

const trailSuggestionPresignResponseZod = z
  .object({
    service: z.string().min(1).optional(),
    client_secret: z.string().min(1),
    expiresAt: z.number().int().positive(),
    traceId: z.string().min(1),
    reused: z.boolean(),
    providerRequestId: z.string().min(1).optional(),
    model: z.string().min(1),
    session: realtimeSessionConfigZod.optional(),
    rateLimit: presignRateLimitZod,
  })
  .strict();

const buildSystemInstruction = (requestedPollCount: number | null) => {
  const pollCountConstraint =
    typeof requestedPollCount === "number"
      ? `Return exactly ${requestedPollCount} polls.`
      : `Determine a genuine, contentful poll count from the prompt (between ${POLLS_MIN} and ${POLLS_MAX}).`;

  return [
    "You generate campaign trail form content for XPOLL.",
    "Call the provided function exactly once.",
    "Do not respond with plain text.",
    pollCountConstraint,
    `trailName must be ${TRAIL_MIN}-${TRAIL_NAME_MAX} chars.`,
    `description must be ${TRAIL_MIN}-${TRAIL_DESCRIPTION_MAX} chars.`,
    `pollName must be ${TRAIL_MIN}-${POLL_NAME_MAX} chars.`,
    `pollDescription must be ${TRAIL_MIN}-${POLL_DESCRIPTION_MAX} chars.`,
    `Each poll must have ${POLL_OPTIONS_MIN}-${POLL_OPTIONS_MAX} unique options.`,
    `Each option must be 1-${POLL_OPTION_MAX} chars.`,
    "Avoid filler, avoid duplicate polls, keep output practical and specific.",
  ].join(" ");
};

const buildTrailSuggestionToolSchema = (
  requestedPollCount: number | null,
): Record<string, unknown> => {
  const pollSchema = {
    type: "object",
    additionalProperties: false,
    required: ["pollName", "pollDescription", "options"],
    properties: {
      pollName: {
        type: "string",
        minLength: TRAIL_MIN,
        maxLength: POLL_NAME_MAX,
      },
      pollDescription: {
        type: "string",
        minLength: TRAIL_MIN,
        maxLength: POLL_DESCRIPTION_MAX,
      },
      options: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
          maxLength: POLL_OPTION_MAX,
        },
        minItems: POLL_OPTIONS_MIN,
        maxItems: POLL_OPTIONS_MAX,
        uniqueItems: true,
      },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: ["trailName", "description", "polls"],
    properties: {
      trailName: {
        type: "string",
        minLength: TRAIL_MIN,
        maxLength: TRAIL_NAME_MAX,
      },
      description: {
        type: "string",
        minLength: TRAIL_MIN,
        maxLength: TRAIL_DESCRIPTION_MAX,
      },
      polls: {
        type: "array",
        items: pollSchema,
        minItems:
          typeof requestedPollCount === "number"
            ? requestedPollCount
            : POLLS_MIN,
        maxItems:
          typeof requestedPollCount === "number"
            ? requestedPollCount
            : POLLS_MAX,
      },
    },
  };
};

const inferRequestedPollCount = (prompt: string): number | null => {
  const text = String(prompt ?? "").toLowerCase();
  const patterns = [
    /\b(?:create|generate|make|build|draft|give|provide)\s+(\d{1,2})\s+(?:polls?|questions?)\b/i,
    /\b(\d{1,2})\s+(?:polls?|questions?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const count = Number.parseInt(match[1], 10);
    if (!Number.isFinite(count)) continue;
    return Math.max(1, Math.min(POLLS_MAX, count));
  }

  return null;
};

const truncate = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const toUniqueOptions = (values: unknown[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const trimmed = truncate(raw, POLL_OPTION_MAX);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= POLL_OPTIONS_MAX) break;
  }

  return out;
};

const normalizeTrailSuggestionCandidate = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  const rawPolls = Array.isArray(value.polls) ? value.polls : [];

  const polls = rawPolls
    .map((poll) => {
      if (!poll || typeof poll !== "object") return null;
      const p = poll as Record<string, unknown>;
      return {
        pollName: truncate(p.pollName ?? p.title, POLL_NAME_MAX),
        pollDescription: truncate(
          p.pollDescription ?? p.description,
          POLL_DESCRIPTION_MAX,
        ),
        options: toUniqueOptions(Array.isArray(p.options) ? p.options : []),
      };
    })
    .filter((p): p is { pollName: string; pollDescription: string; options: string[] } => Boolean(p))
    .slice(0, POLLS_MAX);

  return {
    trailName: truncate(
      value.trailName ?? value.trialTitle ?? value.title,
      TRAIL_NAME_MAX,
    ),
    description: truncate(
      value.description ?? value.trialDescription,
      TRAIL_DESCRIPTION_MAX,
    ),
    polls,
  };
};

export const trailSuggestionResponseZod = z
  .object({
    trailName: z.string().trim().min(TRAIL_MIN).max(TRAIL_NAME_MAX),
    description: z.string().trim().min(TRAIL_MIN).max(TRAIL_DESCRIPTION_MAX),
    polls: z.array(trailSuggestionPollZod).min(1).max(POLLS_MAX),
    meta: z
      .object({
        requestedPollCount: z.number().int().min(1).max(POLLS_MAX).nullable(),
        generatedPollCount: z.number().int().min(1).max(POLLS_MAX),
        traceId: z.string().min(1),
        reused: z.boolean(),
        expiresAt: z.number().int().positive(),
        model: z.string().min(1),
        providerRequestId: z.string().min(1).optional(),
        rateLimit: normalizedRateLimitZod,
      })
      .strict(),
  })
  .strict();

export type TrailSuggestionInput = z.infer<typeof trailSuggestionInputZod>;
export type StandaloneTrailSuggestionInput = z.infer<
  typeof standaloneTrailSuggestionInputZod
>;
export type TrailSuggestionResponse = z.infer<typeof trailSuggestionResponseZod>;

const buildFallbackRealtimeSessionConfig = (
  model: string,
): RealtimeOpenAiSessionConfig => ({
  type: "realtime",
  model,
  output_modalities: ["text"],
});

const logRealtimeSuggestion = (
  level: "debug" | "warn",
  message: string,
  details: Record<string, unknown>,
) => {
  if (!import.meta.env.DEV) return;
  console[level](`[TrailSuggestion] ${message}`, details);
};

async function suggestTrailContentViaPresign(args: {
  prompt: string;
  route: string;
  payload: Record<string, unknown>;
}): Promise<TrailSuggestionResponse> {
  const prompt = String(args.prompt ?? "").trim();
  const requestedPollCount = inferRequestedPollCount(prompt);

  const presign = await requestSuggestionBackend({
    route: args.route,
    payload: args.payload,
    responseSchema: trailSuggestionPresignResponseZod,
  });

  const model =
    presign.session?.model || presign.model || FALLBACK_REALTIME_MODEL;
  const session =
    presign.session || buildFallbackRealtimeSessionConfig(model);
  const systemInstruction = buildSystemInstruction(requestedPollCount);
  const runtimeSchema = buildTrailSuggestionShapeZod(requestedPollCount);
  const toolSchema = buildTrailSuggestionToolSchema(requestedPollCount);

  let lastError: RealtimeOpenAiError | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const correction =
      attempt > 1
        ? `Previous function arguments were invalid: ${lastError?.message || "Unknown generation failure"}. Call the function again with corrected values.`
        : "";
    const promptForAttempt = correction
      ? `${prompt}\n\n${correction}`
      : prompt;

    try {
      const generated = await callRealtimeOpenAiForToolArgs({
        clientSecret: presign.client_secret,
        model,
        session,
        userPrompt: promptForAttempt,
        instructions: systemInstruction,
        tool: {
          name: TRAIL_SUGGESTION_TOOL_NAME,
          description:
            "Submit the completed trail suggestion as structured campaign trail content.",
          parameters: toolSchema,
        },
      });
      logRealtimeSuggestion("debug", "Realtime response completed", {
        traceId: presign.traceId,
        model,
        attempt,
        source: generated.source,
        status: generated.responseStatus,
      });
      const normalized = normalizeTrailSuggestionCandidate(generated.parsed);
      const parsed = runtimeSchema.safeParse(normalized);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        lastError = new RealtimeOpenAiError(issues, {
          code: "invalid_function_args",
          responseStatus: generated.responseStatus,
        });
        logRealtimeSuggestion("warn", "Function arguments failed validation", {
          traceId: presign.traceId,
          model,
          attempt,
          status: generated.responseStatus,
          issues,
        });
        continue;
      }

      return trailSuggestionResponseZod.parse({
        ...parsed.data,
        meta: {
          requestedPollCount,
          generatedPollCount: parsed.data.polls.length,
          traceId: presign.traceId,
          reused: presign.reused,
          expiresAt: presign.expiresAt,
          model,
          providerRequestId: presign.providerRequestId,
          rateLimit: presign.rateLimit,
        },
      });
    } catch (error: unknown) {
      lastError = normalizeRealtimeOpenAiError(error);
      logRealtimeSuggestion("warn", "Realtime request failed", {
        traceId: presign.traceId,
        model,
        attempt,
        code: lastError.code,
        message: lastError.message,
        status: lastError.responseStatus,
      });
    }
  }

  throw (
    lastError ??
    new RealtimeOpenAiError("Failed to generate AI suggestion.", {
      code: "realtime_error",
    })
  );
}

export async function suggestTrailContent(
  input: TrailSuggestionInput,
): Promise<TrailSuggestionResponse> {
  const payload = trailSuggestionInputZod.parse(input);
  return suggestTrailContentViaPresign({
    prompt: payload.prompt,
    route: endpoints.campaigns.suggestTrialPresign,
    payload: {
      campaignId: payload.campaignId,
    },
  });
}

export async function suggestStandaloneTrailContent(
  input: StandaloneTrailSuggestionInput,
): Promise<TrailSuggestionResponse> {
  const payload = standaloneTrailSuggestionInputZod.parse(input);
  return suggestTrailContentViaPresign({
    prompt: payload.prompt,
    route: endpoints.standaloneTrail.suggestTrialPresign,
    payload: {},
  });
}
