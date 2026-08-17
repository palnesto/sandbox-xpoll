import z from "zod";

export const LEG_TYPES = {
  DEFAULT: "default",
  FEES: "fees",
  REWARD: "reward",
  INTENT_AMOUNT: "intent-amount",
  PLEDGE: "pledge",
} as const;

export const legTypes = [
  LEG_TYPES.DEFAULT,
  LEG_TYPES.FEES,
  LEG_TYPES.REWARD,
  LEG_TYPES.INTENT_AMOUNT,
  LEG_TYPES.PLEDGE,
] as const;
export const legTypeEnumZ = z.enum(legTypes);
export type LegType = (typeof legTypes)[number];
