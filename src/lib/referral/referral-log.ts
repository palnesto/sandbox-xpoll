// src/referral/referral-log.ts

import apiInstance from "@/api/queryClient";
import type { ReferralLogPayload } from "./types";

/**
 * Plain invocation helper (NO hooks).
 * Uses axios apiInstance (withCredentials already enabled).
 */
export async function postReferralLog(payload: ReferralLogPayload) {
  // If you already have endpoints.referral.log, swap this to that.
  const res = await apiInstance.post("/external/referral/log", payload);
  return res.data;
}
