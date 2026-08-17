// src/referral/types.ts

export type ReferralKind = "poll" | "trial" | "campaign";

export type ReferralLogPayload = {
  id: string;
  kind: ReferralKind;
  ru?: string;
  url?: string;
  path?: string;
  source?: string;
};
