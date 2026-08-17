import { type ExternalUserLite } from "@/components/commons/selects/user-select";

export type ApiEnvelope<T> = {
  statusCode?: number;
  data?: T;
  message?: string;
  success?: boolean;
};

export type MeProfile = {
  _id?: string;
  id?: string;
  externalAccountId?: string;
};

export type CampaignAuthor = {
  _id?: string;
  id?: string;
  externalAccountId?: string;
  username?: string | null;
  avatar?: {
    name?: string | null;
    imageUrl?: string | null;
  } | null;
};

export type CampaignOwnerResponse = {
  _id?: string;
  name?: string;
  status?: string | null;
  externalAuthor?: CampaignAuthor | null;
};

export type CampaignPermission = {
  edit: boolean;
  pause: boolean;
  live: boolean;
  end: boolean;
  archive: boolean;
  delete: boolean;
  shareReward: boolean;
  toggleDonation: boolean;
};

export type CampaignTrialPermission = {
  create: boolean;
  edit: boolean;
  delete: boolean;
  topUp: boolean;
  draftCreate: boolean;
  draftEdit: boolean;
  draftDelete: boolean;
};

export type CampaignPetitionPermission = {
  toggleGlobalEnable: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type CampaignQrPermission = {
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type CampaignBlogPermission = {
  create: boolean;
  edit: boolean;
  draft: boolean;
  live: boolean;
  delete: boolean;
};

export type CoOwnerPermissions = {
  campaign: CampaignPermission;
  campaignTrial: CampaignTrialPermission;
  campaignPetition: CampaignPetitionPermission;
  campaignQr: CampaignQrPermission;
  campaignBlog: CampaignBlogPermission;
};

export type CoOwnerPermissionsPatch = {
  campaign?: Partial<CampaignPermission>;
  campaignTrial?: Partial<CampaignTrialPermission>;
  campaignPetition?: Partial<CampaignPetitionPermission>;
  campaignQr?: Partial<CampaignQrPermission>;
  campaignBlog?: Partial<CampaignBlogPermission>;
};

export type PartialPermissions = {
  campaign?: Partial<CampaignPermission> | null;
  campaignTrial?: Partial<CampaignTrialPermission> | null;
  campaignPetition?: Partial<CampaignPetitionPermission> | null;
  campaignQr?: Partial<CampaignQrPermission> | null;
  campaignBlog?: Partial<CampaignBlogPermission> | null;
};

export type CoOwnerMapping = {
  _id: string;
  campaignId: string;
  externalAccountId: string;
  permissions?: PartialPermissions | null;
  username?: string | null;
  avatar?: {
    _id?: string;
    name?: string | null;
    imageUrl?: string | null;
    country?: string | null;
  } | null;
};

export type CoOwnerListResponse = {
  campaignId: string;
  total: number;
  coOwners: CoOwnerMapping[];
  maxAllowed?: number;
};

export type AddCoOwnersPayload = {
  campaignId: string;
  externalAccountIds: string[];
  permissions?: CoOwnerPermissions;
};

export type AddCoOwnersResult = {
  campaignId: string;
  added: string[];
  alreadyCoOwners: string[];
  skippedAsMainOwner: string[];
  invalidOrIneligible: string[];
  appliedPermissions?: CoOwnerPermissions;
};

export type RemoveCoOwnersPayload = {
  campaignId: string;
  externalAccountIds: string[];
};

export type RemoveCoOwnersResult = {
  campaignId: string;
  removedCount: number;
  removedRequestedIds: string[];
  skippedAsMainOwner: string[];
};

export type PatchCoOwnerPermissionsPayload = {
  coOwnerMapId: string;
  permissions: CoOwnerPermissionsPatch;
};

export type PermissionDomain = keyof CoOwnerPermissions;

export type PermissionGroup = {
  key: PermissionDomain;
  label: string;
  items: Array<{ key: string; label: string }>;
};

export type AddCoOwnerFormValues = {
  selectedUsers: ExternalUserLite[];
};

export type PermissionFormValues = {
  permissions: CoOwnerPermissions;
};

export const MAX_CO_OWNER_PER_CAMPAIGN = 3;

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "campaign",
    label: "Campaign",
    items: [
      { key: "edit", label: "Edit campaign" },
      { key: "pause", label: "Pause campaign" },
      { key: "live", label: "Make campaign live" },
      { key: "end", label: "End campaign" },
      { key: "archive", label: "Archive campaign" },
      { key: "delete", label: "Delete campaign" },
      { key: "shareReward", label: "Edit share rewards" },
      { key: "toggleDonation", label: "Toggle donations" },
    ],
  },
  {
    key: "campaignTrial",
    label: "Campaign Trial",
    items: [
      { key: "create", label: "Create trial" },
      { key: "edit", label: "Edit trial" },
      { key: "delete", label: "Delete trial" },
      { key: "topUp", label: "Top up trial" },
      { key: "draftCreate", label: "Create draft trial" },
      { key: "draftEdit", label: "Edit draft trial" },
      { key: "draftDelete", label: "Delete draft trial" },
    ],
  },
  {
    key: "campaignPetition",
    label: "Campaign Petition",
    items: [
      { key: "toggleGlobalEnable", label: "Toggle petitions feature" },
      { key: "create", label: "Create petition" },
      { key: "edit", label: "Edit petition" },
      { key: "delete", label: "Delete petition" },
    ],
  },
  {
    key: "campaignQr",
    label: "Campaign QR",
    items: [
      { key: "create", label: "Create QR" },
      { key: "edit", label: "Edit QR" },
    ],
  },
  {
    key: "campaignBlog",
    label: "Campaign Blog",
    items: [
      { key: "create", label: "Create blog" },
      { key: "edit", label: "Edit blog" },
      { key: "draft", label: "Draft blog" },
      { key: "live", label: "Publish blog" },
      { key: "delete", label: "Delete blog" },
    ],
  },
];

export const TOTAL_PERMISSION_COUNT = PERMISSION_GROUPS.reduce(
  (sum, group) => sum + group.items.length,
  0,
);

function asBool(v: unknown) {
  return v === true;
}

export function defaultPermissions(): CoOwnerPermissions {
  return {
    campaign: {
      edit: false,
      pause: false,
      live: false,
      end: false,
      archive: false,
      delete: false,
      shareReward: false,
      toggleDonation: false,
    },
    campaignTrial: {
      create: false,
      edit: false,
      delete: false,
      topUp: false,
      draftCreate: false,
      draftEdit: false,
      draftDelete: false,
    },
    campaignPetition: {
      toggleGlobalEnable: false,
      create: false,
      edit: false,
      delete: false,
    },
    campaignQr: {
      create: false,
      edit: false,
      delete: false,
    },
    campaignBlog: {
      create: false,
      edit: false,
      draft: false,
      live: false,
      delete: false,
    },
  };
}

export function clonePermissions(p: CoOwnerPermissions): CoOwnerPermissions {
  return {
    campaign: { ...p.campaign },
    campaignTrial: { ...p.campaignTrial },
    campaignPetition: { ...p.campaignPetition },
    campaignQr: { ...p.campaignQr },
    campaignBlog: { ...p.campaignBlog },
  };
}

export function normalizePermissions(
  input?: PartialPermissions | null,
): CoOwnerPermissions {
  const source = input ?? {};
  return {
    campaign: {
      edit: asBool(source.campaign?.edit),
      pause: asBool(source.campaign?.pause),
      live: asBool(source.campaign?.live),
      end: asBool(source.campaign?.end),
      archive: asBool(source.campaign?.archive),
      delete: asBool(source.campaign?.delete),
      shareReward: asBool(source.campaign?.shareReward),
      toggleDonation: asBool(source.campaign?.toggleDonation),
    },
    campaignTrial: {
      create: asBool(source.campaignTrial?.create),
      edit: asBool(source.campaignTrial?.edit),
      delete: asBool(source.campaignTrial?.delete),
      topUp: asBool(source.campaignTrial?.topUp),
      draftCreate: asBool(source.campaignTrial?.draftCreate),
      draftEdit: asBool(source.campaignTrial?.draftEdit),
      draftDelete: asBool(source.campaignTrial?.draftDelete),
    },
    campaignPetition: {
      toggleGlobalEnable: asBool(source.campaignPetition?.toggleGlobalEnable),
      create: asBool(source.campaignPetition?.create),
      edit: asBool(source.campaignPetition?.edit),
      delete: asBool(source.campaignPetition?.delete),
    },
    campaignQr: {
      create: asBool(source.campaignQr?.create),
      edit: asBool(source.campaignQr?.edit),
      delete: asBool(source.campaignQr?.delete),
    },
    campaignBlog: {
      create: asBool(source.campaignBlog?.create),
      edit: asBool(source.campaignBlog?.edit),
      draft: asBool(source.campaignBlog?.draft),
      live: asBool(source.campaignBlog?.live),
      delete: asBool(source.campaignBlog?.delete),
    },
  };
}

export function getApiData<T>(
  resp: { data?: ApiEnvelope<T> } | undefined,
): T | null {
  return resp?.data?.data ?? null;
}

export function safeId(v: unknown) {
  return String(v ?? "").trim();
}

export function externalUserId(user: ExternalUserLite) {
  return safeId(user.externalAccountId || user._id);
}

export function initials(label: string) {
  const txt = label.trim();
  if (!txt) return "U";
  return txt
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

export function userLabel(owner: CoOwnerMapping) {
  return owner.username?.trim() || "Unknown";
}

export function getPermissionValue(
  permissions: CoOwnerPermissions,
  domain: PermissionDomain,
  key: string,
) {
  const section = permissions[domain] as Record<string, boolean>;
  return section[key] === true;
}

export function setPermissionValue(
  permissions: CoOwnerPermissions,
  domain: PermissionDomain,
  key: string,
  value: boolean,
) {
  const section = permissions[domain] as Record<string, boolean>;
  return {
    ...permissions,
    [domain]: {
      ...section,
      [key]: value,
    },
  } as CoOwnerPermissions;
}

export function setDomainValue(
  permissions: CoOwnerPermissions,
  domain: PermissionDomain,
  itemKeys: string[],
  value: boolean,
) {
  const section = { ...(permissions[domain] as Record<string, boolean>) };
  itemKeys.forEach((k) => {
    section[k] = value;
  });
  return {
    ...permissions,
    [domain]: section,
  } as CoOwnerPermissions;
}

export function groupState(
  permissions: CoOwnerPermissions,
  group: PermissionGroup,
) {
  const count = group.items.reduce(
    (sum, item) =>
      sum + (getPermissionValue(permissions, group.key, item.key) ? 1 : 0),
    0,
  );
  const total = group.items.length;
  return {
    allChecked: count === total,
    indeterminate: count > 0 && count < total,
  };
}

export function countPermissionsEnabled(permissions: CoOwnerPermissions) {
  return PERMISSION_GROUPS.reduce((sum, group) => {
    const inside = group.items.reduce(
      (acc, item) =>
        acc + (getPermissionValue(permissions, group.key, item.key) ? 1 : 0),
      0,
    );
    return sum + inside;
  }, 0);
}

export function buildPatchDiff(
  initialPermissions: CoOwnerPermissions,
  currentPermissions: CoOwnerPermissions,
): CoOwnerPermissionsPatch {
  const patch: CoOwnerPermissionsPatch = {};

  PERMISSION_GROUPS.forEach((group) => {
    const changed: Record<string, boolean> = {};
    group.items.forEach((item) => {
      const before = getPermissionValue(
        initialPermissions,
        group.key,
        item.key,
      );
      const after = getPermissionValue(currentPermissions, group.key, item.key);
      if (before !== after) changed[item.key] = after;
    });

    if (!Object.keys(changed).length) return;

    if (group.key === "campaign")
      patch.campaign = changed as Partial<CampaignPermission>;
    if (group.key === "campaignTrial")
      patch.campaignTrial = changed as Partial<CampaignTrialPermission>;
    if (group.key === "campaignPetition")
      patch.campaignPetition = changed as Partial<CampaignPetitionPermission>;
    if (group.key === "campaignQr")
      patch.campaignQr = changed as Partial<CampaignQrPermission>;
    if (group.key === "campaignBlog")
      patch.campaignBlog = changed as Partial<CampaignBlogPermission>;
  });

  return patch;
}

export function addResultSummary(result: AddCoOwnersResult) {
  const chunks: string[] = [];
  const added = result.added?.length ?? 0;
  const already = result.alreadyCoOwners?.length ?? 0;
  const invalid = result.invalidOrIneligible?.length ?? 0;
  const skippedOwner = result.skippedAsMainOwner?.length ?? 0;

  chunks.push(`Added ${added}`);
  if (already) chunks.push(`${already} already co-owner`);
  if (invalid) chunks.push(`${invalid} invalid/ineligible`);
  if (skippedOwner) chunks.push(`${skippedOwner} skipped as main owner`);
  return chunks.join(" • ");
}
