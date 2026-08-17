import type {
  RealtimeOpenAiCallArgs,
  RealtimeOpenAiCallResult,
  RealtimeOpenAiErrorCode,
  RealtimeOpenAiSessionConfig,
  RealtimeOpenAiResponseStatus,
} from "./types";

const DEFAULT_REALTIME_CALLS_URL =
  import.meta.env.VITE_OPENAI_REALTIME_CALLS_URL ||
  "https://api.openai.com/v1/realtime/calls";

const buildFallbackRealtimeSessionConfig = (
  model: string,
): RealtimeOpenAiSessionConfig => ({
  type: "realtime",
  model,
  output_modalities: ["text"],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isRealtimeResponseStatusType = (
  value: unknown,
): value is RealtimeOpenAiResponseStatus["type"] =>
  value === "completed" ||
  value === "cancelled" ||
  value === "failed" ||
  value === "incomplete";

export class RealtimeOpenAiError extends Error {
  code: RealtimeOpenAiErrorCode;
  responseStatus?: RealtimeOpenAiResponseStatus;

  constructor(
    message: string,
    options: {
      code: RealtimeOpenAiErrorCode;
      responseStatus?: RealtimeOpenAiResponseStatus;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "RealtimeOpenAiError";
    this.code = options.code;
    this.responseStatus = options.responseStatus;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const isRealtimeOpenAiError = (
  error: unknown,
): error is RealtimeOpenAiError => error instanceof RealtimeOpenAiError;

export function normalizeRealtimeOpenAiError(
  error: unknown,
  options?: {
    responseStatus?: RealtimeOpenAiResponseStatus;
  },
): RealtimeOpenAiError {
  if (error instanceof RealtimeOpenAiError) return error;
  if (error instanceof Error) {
    if (/Timed out waiting/i.test(error.message)) {
      return new RealtimeOpenAiError(error.message, {
        code: "timeout",
        responseStatus: options?.responseStatus,
        cause: error,
      });
    }
    return new RealtimeOpenAiError(error.message || "OpenAI realtime error.", {
      code: "realtime_error",
      responseStatus: options?.responseStatus,
      cause: error,
    });
  }
  return new RealtimeOpenAiError("Unknown OpenAI realtime error.", {
    code: "realtime_error",
    responseStatus: options?.responseStatus,
    cause: error,
  });
}

const channelOpen = (channel: RTCDataChannel, timeoutMs = 15_000) =>
  new Promise<void>((resolve, reject) => {
    if (channel.readyState === "open") {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new RealtimeOpenAiError("Timed out waiting for OpenAI realtime channel.", {
          code: "timeout",
        }),
      );
    }, timeoutMs);

    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(
        new RealtimeOpenAiError("OpenAI realtime channel failed.", {
          code: "realtime_error",
        }),
      );
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      channel.removeEventListener("open", onOpen);
      channel.removeEventListener("error", onError);
    };

    channel.addEventListener("open", onOpen);
    channel.addEventListener("error", onError);
  });

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload?.error?.message || `OpenAI call failed with ${response.status}`;
  } catch {
    return `OpenAI call failed with ${response.status}`;
  }
};

const parseRealtimeResponseStatus = (
  response: unknown,
): RealtimeOpenAiResponseStatus => {
  const root = isRecord(response) ? response : {};
  const status = isRealtimeResponseStatusType(root.status)
    ? root.status
    : "failed";
  const details = isRecord(root.status_details) ? root.status_details : {};
  const errorDetails = isRecord(details.error) ? details.error : {};

  return {
    type: status,
    reason: typeof details.reason === "string" ? details.reason : undefined,
    errorCode:
      typeof errorDetails.code === "string" ? errorDetails.code : undefined,
    errorType:
      typeof errorDetails.type === "string" ? errorDetails.type : undefined,
  };
};

const extractFunctionCallFromResponseOutput = (
  response: unknown,
  expectedToolName?: string,
): {
  arguments?: string;
  name?: string;
} => {
  const root =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};
  const outputs = Array.isArray(root.output) ? root.output : [];
  let fallback: {
    arguments?: string;
    name?: string;
  } = {};

  for (const outputItem of outputs) {
    const outputRecord = isRecord(outputItem) ? outputItem : {};
    if (outputRecord.type !== "function_call") continue;

    const name =
      typeof outputRecord.name === "string" ? outputRecord.name : undefined;
    const argumentsText =
      typeof outputRecord.arguments === "string"
        ? outputRecord.arguments
        : undefined;
    if (!fallback.arguments && argumentsText) {
      fallback = {
        arguments: argumentsText,
        name,
      };
    }
    if (!expectedToolName || name === expectedToolName) {
      return {
        arguments: argumentsText,
        name,
      };
    }
  }

  return fallback;
};

const extractTextFromResponseOutput = (response: unknown): string => {
  const root =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};
  const outputs = Array.isArray(root.output) ? root.output : [];
  const chunks: string[] = [];

  for (const outputItem of outputs) {
    const outputRecord = isRecord(outputItem) ? outputItem : {};
    const content = Array.isArray(outputRecord.content)
      ? outputRecord.content
      : [];
    for (const contentItem of content) {
      const contentRecord = isRecord(contentItem) ? contentItem : {};
      const text =
        (typeof contentRecord.text === "string" && contentRecord.text) ||
        (typeof contentRecord.transcript === "string" &&
          contentRecord.transcript) ||
        (typeof contentRecord.value === "string" && contentRecord.value) ||
        "";
      if (text) chunks.push(text);
    }
  }

  return chunks.join("").trim();
};

const extractJsonObjectString = (text: string): string => {
  const cleaned = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned;
  }

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return cleaned.slice(start, i + 1);
      }
    }
  }

  throw new RealtimeOpenAiError(
    "OpenAI output did not contain a valid JSON object.",
    {
      code: "invalid_function_args",
    },
  );
};

const parseFunctionArguments = (rawArguments: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(rawArguments) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new RealtimeOpenAiError(
        "OpenAI function arguments must decode to an object.",
        {
          code: "invalid_function_args",
        },
      );
    }
    return parsed as Record<string, unknown>;
  } catch (error: unknown) {
    if (error instanceof RealtimeOpenAiError) throw error;
    throw new RealtimeOpenAiError(
      "OpenAI returned malformed function arguments.",
      {
        code: "invalid_function_args",
        cause: error,
      },
    );
  }
};

const parseJsonObjectFromText = (text: string) => {
  const objectText = extractJsonObjectString(text);
  try {
    const parsed = JSON.parse(objectText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new RealtimeOpenAiError(
        "OpenAI JSON output must decode to an object.",
        {
          code: "invalid_function_args",
        },
      );
    }
    return {
      objectText,
      parsed: parsed as Record<string, unknown>,
    };
  } catch (error: unknown) {
    if (error instanceof RealtimeOpenAiError) throw error;
    throw new RealtimeOpenAiError("OpenAI returned malformed JSON output.", {
      code: "invalid_function_args",
      cause: error,
    });
  }
};

const buildStatusError = (
  status: RealtimeOpenAiResponseStatus,
): RealtimeOpenAiError => {
  if (status.type === "incomplete") {
    if (status.reason === "content_filter") {
      return new RealtimeOpenAiError(
        "OpenAI interrupted the suggestion because of content filtering.",
        {
          code: "status_incomplete",
          responseStatus: status,
        },
      );
    }
    if (status.reason === "max_output_tokens") {
      return new RealtimeOpenAiError(
        "OpenAI stopped before finishing the suggestion because it hit the output token limit.",
        {
          code: "status_incomplete",
          responseStatus: status,
        },
      );
    }
    return new RealtimeOpenAiError("OpenAI returned an incomplete response.", {
      code: "status_incomplete",
      responseStatus: status,
    });
  }

  if (status.type === "cancelled") {
    if (status.reason === "turn_detected") {
      return new RealtimeOpenAiError(
        "OpenAI cancelled the response after detecting a new turn.",
        {
          code: "status_cancelled",
          responseStatus: status,
        },
      );
    }
    return new RealtimeOpenAiError("OpenAI cancelled the response.", {
      code: "status_cancelled",
      responseStatus: status,
    });
  }

  if (status.type === "failed") {
    const suffix = [status.errorCode, status.errorType].filter(Boolean).join("/");
    return new RealtimeOpenAiError(
      suffix ? `OpenAI response failed (${suffix}).` : "OpenAI response failed.",
      {
        code: "status_failed",
        responseStatus: status,
      },
    );
  }

  return new RealtimeOpenAiError("OpenAI realtime request failed.", {
    code: "realtime_error",
    responseStatus: status,
  });
};

const waitForFunctionCall = (
  channel: RTCDataChannel,
  expectedToolName: string,
  timeoutMs = 30_000,
) =>
  new Promise<RealtimeOpenAiCallResult>((resolve, reject) => {
    let streamedArguments = "";
    let finalArguments = "";
    let functionName = "";

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new RealtimeOpenAiError("Timed out waiting for OpenAI response.", {
          code: "timeout",
        }),
      );
    }, timeoutMs);

    const onMessage = (event: MessageEvent<string>) => {
      let payload: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(event.data) as unknown;
        payload =
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : null;
      } catch {
        return;
      }
      if (!payload) return;

      const eventType = payload.type;
      if (eventType === "error") {
        cleanup();
        const errorPayload =
          payload.error && typeof payload.error === "object"
            ? (payload.error as Record<string, unknown>)
            : {};
        reject(
          new RealtimeOpenAiError(
            typeof errorPayload.message === "string"
              ? errorPayload.message
              : "OpenAI realtime error.",
            {
              code: "realtime_error",
            },
          ),
        );
        return;
      }

      if (
        eventType === "response.function_call_arguments.delta" &&
        typeof payload.delta === "string"
      ) {
        streamedArguments += payload.delta;
        if (typeof payload.name === "string") {
          functionName = payload.name;
        }
      }

      if (
        eventType === "response.function_call_arguments.done" &&
        typeof payload.arguments === "string"
      ) {
        finalArguments = payload.arguments;
        if (typeof payload.name === "string") {
          functionName = payload.name;
        }
      }

      if (eventType === "response.done") {
        const responseStatus = parseRealtimeResponseStatus(payload.response);
        const fallback = extractFunctionCallFromResponseOutput(
          payload.response,
          expectedToolName,
        );
        const fallbackText = extractTextFromResponseOutput(payload.response);
        const resolvedFunctionName =
          functionName || fallback.name || expectedToolName;
        const rawArguments = (
          finalArguments ||
          streamedArguments ||
          fallback.arguments ||
          ""
        ).trim();
        cleanup();
        if (responseStatus.type !== "completed") {
          reject(buildStatusError(responseStatus));
          return;
        }

        if (rawArguments && resolvedFunctionName === expectedToolName) {
          try {
            resolve({
              rawArguments,
              parsed: parseFunctionArguments(rawArguments),
              functionName: resolvedFunctionName,
              source: "function_call",
              responseStatus,
            });
          } catch (error: unknown) {
            reject(
              normalizeRealtimeOpenAiError(error, {
                responseStatus,
              }),
            );
          }
          return;
        }

        if (fallbackText) {
          try {
            const parsedText = parseJsonObjectFromText(fallbackText);
            resolve({
              rawArguments: parsedText.objectText,
              parsed: parsedText.parsed,
              source: "output_text",
              responseStatus,
            });
          } catch (error: unknown) {
            reject(
              normalizeRealtimeOpenAiError(error, {
                responseStatus,
              }),
            );
          }
          return;
        }

        if (!rawArguments || resolvedFunctionName !== expectedToolName) {
          reject(
            new RealtimeOpenAiError(
              "OpenAI completed without returning the required suggestion function call.",
              {
                code: "no_function_call",
                responseStatus,
              },
            ),
          );
          return;
        }

      }
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      channel.removeEventListener("message", onMessage);
    };

    channel.addEventListener("message", onMessage);
  });

export async function callRealtimeOpenAiForToolArgs(
  args: RealtimeOpenAiCallArgs,
): Promise<RealtimeOpenAiCallResult> {
  if (typeof RTCPeerConnection === "undefined") {
    throw new RealtimeOpenAiError(
      "This browser does not support RTCPeerConnection.",
      {
        code: "realtime_error",
      },
    );
  }

  const callsUrl = args.callsUrl || DEFAULT_REALTIME_CALLS_URL;
  const sessionConfig =
    args.session || buildFallbackRealtimeSessionConfig(args.model);
  const peer = new RTCPeerConnection();
  peer.addTransceiver("audio", { direction: "recvonly" });
  const channel = peer.createDataChannel("oai-events");

  try {
    const openPromise = channelOpen(channel, Math.max(10_000, Math.min(30_000, args.timeoutMs ?? 15_000)));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    if (!offer.sdp) {
      throw new Error("Failed to create SDP offer for OpenAI realtime call.");
    }

    const formData = new FormData();
    formData.set("sdp", offer.sdp);
    formData.set(
      "session",
      JSON.stringify(sessionConfig),
    );

    const sessionRes = await fetch(callsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.clientSecret}`,
      },
      body: formData,
    });
    if (!sessionRes.ok) {
      throw new Error(await readErrorMessage(sessionRes));
    }

    const answerSdp = await sessionRes.text();
    await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await openPromise;

    const toolCallPromise = waitForFunctionCall(
      channel,
      args.tool.name,
      args.timeoutMs ?? 30_000,
    );

    channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: args.userPrompt }],
        },
      }),
    );

    channel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["text"],
          instructions: args.instructions,
          tool_choice: "required",
          tools: [
            {
              type: "function",
              name: args.tool.name,
              description: args.tool.description,
              parameters: args.tool.parameters,
            },
          ],
        },
      }),
    );

    return await toolCallPromise;
  } finally {
    if (channel.readyState !== "closed") channel.close();
    peer.close();
  }
}
