import { CampaignCardModel } from "@/components/commons/campaign-card-variants";
import { DurationOption, PriceMatrix } from "@/types/campaigns";

export type CampaignSectionKey = "participated" | "new_for_you";

export type CampaignSectionConfig = {
  key: CampaignSectionKey;
  title: string;
  layout: "horizontal" | "grid";
  pick: (all: CampaignCardModel[]) => CampaignCardModel[];
  cardSize: "sm" | "base";
};

export const CAMPAIGNS_SCREEN_CONFIG: CampaignSectionConfig[] = [
  {
    key: "participated",
    title: "Campaign you’ve participated in…",
    layout: "horizontal",
    cardSize: "sm",
    pick: (all) => all.filter((c) => !!c.participated),
  },
  {
    key: "new_for_you",
    title: "New for you",
    layout: "grid",
    cardSize: "base",
    pick: (all) => all.filter((c) => !!c.new_for_you),
  },
];

export const DURATION_OPTIONS: DurationOption[] = [
  { key: "m1", label: "1 month" },
  { key: "m2", label: "2 months" },
  { key: "m3", label: "3 months" },
];

// Mock API response (12 prices = 3 durations × 4 combinations)
export const PRICES: PriceMatrix = {
  no_non_political: { m1: 220, m2: 310, m3: 430 },
  yes_non_political: { m1: 260, m2: 360, m3: 490 },
  no_political: { m1: 280, m2: 390, m3: 540 },
  yes_political: { m1: 320, m2: 450, m3: 620 },
};

export const fmtUsd = (n: number) => `$ ${n}`;

export const durationLabel = (k: "m1" | "m2" | "m3") =>
  k === "m1" ? "1 month" : k === "m2" ? "2 months" : "3 months";
