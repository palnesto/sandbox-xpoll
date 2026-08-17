import apiInstance from "@/api/queryClient";
import type { BackendRequestArgs } from "./types";

function getIssueSummary(error: {
  issues?: Array<{
    message?: string;
  }>;
}): string {
  const first = error.issues?.[0];
  return first?.message || "Invalid AI response shape";
}

export async function requestSuggestionBackend<TReq, TRes>(
  args: BackendRequestArgs<TReq, TRes>,
): Promise<TRes> {
  const response = await apiInstance.post(args.route, args.payload);
  const payload = response?.data?.data ?? response?.data;
  const parsed = args.responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(getIssueSummary(parsed.error));
  }
  return parsed.data;
}
