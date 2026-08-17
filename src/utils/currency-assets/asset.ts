import z from "zod";
import xpoll from "@/assets/xpoll.webp";
import aptos from "@/assets/aptos.webp";
import sui from "@/assets/sui.webp";
import xrp from "@/assets/xrp.webp";
import strain from "@/assets/strain.webp";
import cmpn from "@/assets/cmpn.webp";
import amy from "@/assets/amy.webp";
import shelly from "@/assets/shelly.webp";
import snitch from "@/assets/snitch.webp";
import bubble from "@/assets/bubble.webp";
import terra from "@/assets/terra.webp";
import meta from "@/assets/meta.webp";
import coffee from "@/assets/coffee.webp";
import curette from "@/assets/curette.webp";
import mark from "@/assets/mark.webp";
import stanton from "@/assets/stanton.webp";
import k from "@/assets/k.webp";
import scope from "@/assets/chart.webp";
import slice from "@/assets/cut.webp";
import jack from "@/assets/jack.webp";
import term from "@/assets/term.webp";
import three from "@/assets/three.webp";
import mrT from "@/assets/t.webp";
import tin from "@/assets/tin.webp";
import ledge from "@/assets/ledge.webp";

export const ASSETS = {
  X_POLL: "xPoll", // xPoll
  X_OCTA: "xOcta", // Aptos
  X_MYST: "xMYST", // SUI
  X_DROP: "xDrop", // XRP
  X_HIGH: "xHigh", // xStrain
  X_GIVE: "xGive", // xCampaign
  X_AMBIT: "xAmbit", // xAmy
  X_SHELL: "xShell", // xShelly
  X_TIP: "xTip", // xSnitch
  X_BCBUBBLE: "xBcbc", // XBCBUBBLE
  X_ST3: "xSt3", // xST3
  X_Coffee: "xCoffee", // xCoffee
  X_Mason: "xMason", // xMason
  X_Cure: "xCure", // xCure
  X_Meta: "xMeta", // xMeta
  X_STAN_MINI: "xStanMini", // xSTAN
  X_K_MINI: "xKMini", // xCONTRACTOR
  X_SCOPE: "xScope", // xChart
  X_SLICE: "xSlice", // xCut
  // new coins
  X_JACK_MINI: "xJackMini", // xJackMini
  X_TERM_MINI: "xTermMini", // xTermMini
  X_THREE_LETTER_MINI: "xThreeLetterMini", // xThreeLetterMini
  X_MR_T_MINI: "xMRTMini", // xMRTMini
  X_TAX_MINI: "xTaxMini", // xTaxMini
  X_LEDGE_MINI: "xLedgeMini", // xLedgeMini
} as const;
export type AssetType = (typeof ASSETS)[keyof typeof ASSETS];

const _assets = [
  ASSETS.X_POLL,
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
  ASSETS.X_HIGH,
  ASSETS.X_GIVE,
  ASSETS.X_AMBIT,
  ASSETS.X_SHELL,
  ASSETS.X_TIP,
  ASSETS.X_BCBUBBLE,
  ASSETS.X_ST3,
  ASSETS.X_Coffee,
  ASSETS.X_Mason,
  ASSETS.X_Cure,
  ASSETS.X_Meta,
  ASSETS.X_STAN_MINI,
  ASSETS.X_K_MINI,
  ASSETS.X_SCOPE,
  ASSETS.X_SLICE,
  ASSETS.X_JACK_MINI,
  ASSETS.X_TERM_MINI,
  ASSETS.X_THREE_LETTER_MINI,
  ASSETS.X_MR_T_MINI,
  ASSETS.X_TAX_MINI,
  ASSETS.X_LEDGE_MINI,
] as const;
export const coinAssets = [
  ASSETS.X_POLL,
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
  ASSETS.X_HIGH,
  ASSETS.X_GIVE,
  ASSETS.X_AMBIT,
  ASSETS.X_SHELL,
  ASSETS.X_TIP,
  ASSETS.X_BCBUBBLE,
  ASSETS.X_ST3,
  ASSETS.X_Coffee,
  ASSETS.X_Mason,
  ASSETS.X_Cure,
  ASSETS.X_Meta,
  ASSETS.X_STAN_MINI,
  ASSETS.X_K_MINI,
  ASSETS.X_SCOPE,
  ASSETS.X_SLICE,
  ASSETS.X_JACK_MINI,
  ASSETS.X_TERM_MINI,
  ASSETS.X_THREE_LETTER_MINI,
  ASSETS.X_MR_T_MINI,
  ASSETS.X_TAX_MINI,
  ASSETS.X_LEDGE_MINI,
] as const;
export const assetEnum = z.enum(_assets);
export const sellableAssetEnum = z.enum([
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
]);
export const coinAssetEnum = z.enum(coinAssets);
export const assets = assetEnum.options;

const CHAINS = {
  APTOS: "APTOS",
  SUI: "SUI",
  XRP: "XRP",
  STRAIN: "BASE",
} as const;
const chains = [CHAINS.APTOS, CHAINS.SUI, CHAINS.XRP, CHAINS.STRAIN] as const;
export const chainEnumZ = z.enum(chains);
export type Chain = z.infer<typeof chainEnumZ>;

export const canSellZ = z
  .object({
    standardOrderAmount: z.number().min(1).default(1),
    conversionFeesInXpoll: z.number().min(0).default(1),
  })
  .strict();

export type CanSellSpec = z.infer<typeof canSellZ>;

export const assetSpecs: Record<
  AssetType,
  {
    decimal: number;
    name: string;
    symbol: string;
    parent: string;
    parentSymbol: string;
    img: string;
    canSell: CanSellSpec | null;
    chain: string;
  }
> = {
  [ASSETS.X_POLL]: {
    decimal: 0,
    name: "XPOLL",
    symbol: "XPL",
    parent: "XPOLL",
    parentSymbol: "XPL",
    img: xpoll,
    canSell: null, // NOT sellable.
    chain: "xChain",
  },
  [ASSETS.X_OCTA]: {
    decimal: 8,
    name: "xOCTA",
    symbol: "XOT",
    parent: "xAptos",
    parentSymbol: "XAPT",
    img: aptos,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: CHAINS.APTOS,
  },
  [ASSETS.X_MYST]: {
    decimal: 9,
    name: "XMYST",
    symbol: "XMT",
    parent: "xSUI",
    parentSymbol: "XSUI",
    img: sui,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: CHAINS.SUI,
  },
  [ASSETS.X_DROP]: {
    decimal: 6,
    name: "XDROP",
    symbol: "XDP",
    parent: "xXRP",
    parentSymbol: "XXRP",
    img: xrp,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: CHAINS.XRP,
  },
  [ASSETS.X_HIGH]: {
    decimal: 6,
    name: "XHIGH",
    symbol: "XHG",
    parent: "xStrain",
    parentSymbol: "XSTR",
    img: strain,
    canSell: {
      standardOrderAmount: 100000000,
      conversionFeesInXpoll: 100000000,
    },
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_GIVE]: {
    decimal: 2,
    name: "XGIVE",
    symbol: "XGV",
    parent: "xCampaign",
    parentSymbol: "XCMPN",
    img: cmpn,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_AMBIT]: {
    decimal: 8,
    name: "XAMBIT",
    symbol: "XAMB",
    parent: "xAmy",
    parentSymbol: "XAMY",
    img: amy,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_SHELL]: {
    decimal: 6,
    name: "XSHELL",
    symbol: "XSHL",
    parent: "xShelly",
    parentSymbol: "XSHLY",
    img: shelly,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_TIP]: {
    decimal: 7,
    name: "XTIP",
    symbol: "XTP",
    parent: "xSnitch",
    parentSymbol: "XSNI",
    img: snitch,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_BCBUBBLE]: {
    decimal: 6,
    name: "XBCBUBBLE",
    symbol: "XBC",
    parent: "xBubbleCoin",
    parentSymbol: "XBCBC",
    img: bubble,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_ST3]: {
    decimal: 7,
    name: "XST3",
    symbol: "XST3",
    parent: "xTerranova",
    parentSymbol: "xST3",
    img: terra,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_Coffee]: {
    decimal: 8,
    name: "XCOFFEE",
    symbol: "XCF",
    parent: "xCoffeeMilk",
    parentSymbol: "XCFM",
    img: coffee,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_Mason]: {
    decimal: 7,
    name: "XMASON",
    symbol: "XMS",
    parent: "xMark",
    parentSymbol: "XMK",
    img: mark,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_Cure]: {
    decimal: 8,
    name: "XCURE",
    symbol: "XCR",
    parent: "xCurette",
    parentSymbol: "XCRT",
    img: curette,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_Meta]: {
    decimal: 8,
    name: "XMETA",
    symbol: "XMTA",
    parent: "xMeta4",
    parentSymbol: "XMT4",
    img: meta,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_STAN_MINI]: {
    decimal: 8,
    name: "XSTAN_MINI",
    symbol: "XST_MN",
    parent: "xStanton",
    parentSymbol: "XSTAN",
    img: stanton,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_K_MINI]: {
    decimal: 8,
    name: "XK_MINI",
    symbol: "XK_MN",
    parent: "xK",
    parentSymbol: "XCONTRACTOR",
    img: k,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_SCOPE]: {
    decimal: 7,
    name: "XSCOPE",
    symbol: "XSC",
    parent: "xChart",
    parentSymbol: "XCHRT",
    img: scope,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_SLICE]: {
    decimal: 7,
    name: "XSLICE",
    symbol: "XSL",
    parent: "xCut",
    parentSymbol: "XCUT",
    img: slice,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_JACK_MINI]: {
    decimal: 6,
    name: "XJACK_MINI",
    symbol: "XJKM",
    parent: "XJack",
    parentSymbol: "XJK",
    img: jack,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_TERM_MINI]: {
    decimal: 6,
    name: "XTERM_MINI",
    symbol: "XTRM",
    parent: "xTerm",
    parentSymbol: "XTERM",
    img: term,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_THREE_LETTER_MINI]: {
    decimal: 6,
    name: "X_THREE_LETTER_MINI",
    symbol: "X3LM",
    parent: "xThreeLetter",
    parentSymbol: "X3L",
    img: three,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_MR_T_MINI]: {
    decimal: 6,
    name: "X_MR_T_MINI",
    symbol: "XMRTM",
    parent: "xMr.T",
    parentSymbol: "XMRT",
    img: mrT,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_TAX_MINI]: {
    decimal: 6,
    name: "X_TAX_MINI",
    symbol: "XTAXM",
    parent: "xTinman",
    parentSymbol: "XTAX",
    img: tin,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_LEDGE_MINI]: {
    decimal: 6,
    name: "X_LEDGE_MINI",
    symbol: "XLDGM",
    parent: "xLedge",
    parentSymbol: "XLDG",
    img: ledge,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
};
