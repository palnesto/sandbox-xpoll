import type z from "zod";

export type BackendRequestArgs<TReq, TRes> = {
  route: string;
  payload: TReq;
  responseSchema: z.ZodType<TRes>;
};

export type RealtimeOpenAiCallArgs = {
  clientSecret: string;
  model: string;
  session?: RealtimeOpenAiSessionConfig;
  userPrompt: string;
  instructions: string;
  tool: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
  callsUrl?: string;
  timeoutMs?: number;
};

export type RealtimeOpenAiSessionConfig = {
  type: "realtime";
  model: string;
  output_modalities: ["text"];
};

export type RealtimeOpenAiErrorCode =
  | "timeout"
  | "status_incomplete"
  | "status_failed"
  | "status_cancelled"
  | "no_function_call"
  | "invalid_function_args"
  | "realtime_error";

export type RealtimeOpenAiResponseStatus = {
  type: "completed" | "cancelled" | "failed" | "incomplete";
  reason?: string;
  errorCode?: string;
  errorType?: string;
};

export type RealtimeOpenAiCallResult = {
  rawArguments: string;
  parsed: Record<string, unknown>;
  functionName?: string;
  source: "function_call" | "output_text";
  responseStatus: RealtimeOpenAiResponseStatus;
};
