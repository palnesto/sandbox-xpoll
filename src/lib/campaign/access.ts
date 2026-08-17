import type {
  CampaignBlockedResponse,
  CampaignFeatureAccessState,
  CampaignOwnerAccessState,
  CampaignPaymentRequiredResponse,
  CampaignTier,
  CampaignUpgradeRequiredResponse,
  CampaignVisibility,
} from "@/types/campaigns";

function normalizeValue(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized || null;
}

function unwrapApiEnvelopeData(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const maybeInput = input as any;
  return maybeInput?.data?.data ?? maybeInput?.data ?? input;
}

export function getCampaignTier(input: unknown): CampaignTier {
  const tier = normalizeValue(
    typeof input === "object" && input !== null ? (input as any)?.tier : input,
  );
  return tier === "basic" ? "basic" : "paid";
}

export function getCampaignVisibility(input: unknown): CampaignVisibility {
  const visibility = normalizeValue(
    typeof input === "object" && input !== null
      ? (input as any)?.visibility
      : input,
  );
  return visibility === "unlisted" ? "unlisted" : "listed";
}

export function getCampaignOwnerAccessState(
  input: unknown,
): CampaignOwnerAccessState {
  const ownerAccessState = normalizeValue(
    typeof input === "object" && input !== null
      ? (input as any)?.ownerAccessState
      : input,
  );
  return ownerAccessState === "payment_required"
    ? "payment_required"
    : "full";
}

export function isBasicCampaign(input: unknown): boolean {
  return getCampaignTier(input) === "basic";
}

export function isPaidCampaign(input: unknown): boolean {
  return getCampaignTier(input) === "paid";
}

export function isUnlistedCampaign(input: unknown): boolean {
  return getCampaignVisibility(input) === "unlisted";
}

export function isBasic(input: unknown): boolean {
  return isBasicCampaign(input);
}

export function isPaid(input: unknown): boolean {
  return isPaidCampaign(input);
}

export function isUnlisted(input: unknown): boolean {
  return isUnlistedCampaign(input);
}

export function isPaymentRequiredResponse(
  input: unknown,
): input is CampaignPaymentRequiredResponse {
  if (!input || typeof input !== "object") return false;
  const reason = normalizeValue((input as any)?.reason);
  const ownerAccessState = normalizeValue((input as any)?.ownerAccessState);
  const dataAccessState = normalizeValue((input as any)?.dataAccessState);
  return (
    reason === "payment_required" ||
    ownerAccessState === "payment_required" ||
    dataAccessState === "payment_required"
  );
}

export function isUpgradeRequiredResponse(
  input: unknown,
): input is CampaignUpgradeRequiredResponse {
  if (!input || typeof input !== "object") return false;
  const reason = normalizeValue((input as any)?.reason);
  const featureAccessState = normalizeValue((input as any)?.featureAccessState);
  return (
    reason === "upgrade_required" ||
    reason === "hidden_for_basic" ||
    featureAccessState === "upgrade_required" ||
    featureAccessState === "hidden"
  );
}

export function isPaymentRequired(input: unknown): boolean {
  return (
    getCampaignOwnerAccessState(input) === "payment_required" ||
    isPaymentRequiredResponse(input)
  );
}

export function isUpgradeRequired(input: unknown): boolean {
  return isUpgradeRequiredResponse(input);
}

export type NormalizedCampaignBlockedState =
  | {
      kind: "payment_required";
      ownerAccessState: "payment_required";
      response: CampaignPaymentRequiredResponse;
    }
  | {
      kind: "upgrade_required";
      featureAccessState: CampaignFeatureAccessState;
      response: CampaignUpgradeRequiredResponse;
    };

export function normalizeCampaignBlockedState(
  input: unknown,
): NormalizedCampaignBlockedState | null {
  if (isPaymentRequiredResponse(input)) {
    return {
      kind: "payment_required",
      ownerAccessState: "payment_required",
      response: {
        ...(input as CampaignPaymentRequiredResponse),
        ownerAccessState: "payment_required",
        dataAccessState: "payment_required",
        reason: "payment_required",
        tier: getCampaignTier(input),
        visibility: getCampaignVisibility(input),
      },
    };
  }

  if (isUpgradeRequiredResponse(input)) {
    const featureAccessState = normalizeValue(
      (input as any)?.featureAccessState,
    );
    return {
      kind: "upgrade_required",
      featureAccessState:
        featureAccessState === "hidden" ? "hidden" : "upgrade_required",
      response: {
        ...(input as CampaignUpgradeRequiredResponse),
        reason:
          normalizeValue((input as any)?.reason) === "hidden_for_basic"
            ? "hidden_for_basic"
            : "upgrade_required",
        featureAccessState:
          featureAccessState === "hidden" ? "hidden" : "upgrade_required",
        tier: getCampaignTier(input),
        visibility: getCampaignVisibility(input),
      },
    };
  }

  return null;
}

export function normalizeCampaignBlockedResponse(
  input: unknown,
): CampaignBlockedResponse | null {
  return normalizeCampaignBlockedState(input)?.response ?? null;
}

export function normalizeCampaignBlockedStateFromResponse(
  input: unknown,
): NormalizedCampaignBlockedState | null {
  return normalizeCampaignBlockedState(unwrapApiEnvelopeData(input));
}

export function normalizeCampaignBlockedResponseFromResponse(
  input: unknown,
): CampaignBlockedResponse | null {
  return normalizeCampaignBlockedResponse(unwrapApiEnvelopeData(input));
}
