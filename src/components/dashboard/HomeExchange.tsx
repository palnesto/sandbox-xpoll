import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import aptosChest from "@/assets/exchangeAptos.webp";
import suiChest from "@/assets/exchangeSui.webp";
import xrpChest from "@/assets/exchangeXrp.webp";
import highChest from "@/assets/exchangeHigh.webp";
import shellChest from "@/assets/exchangeShelly.webp";
import ambChest from "@/assets/exchangeAmy.webp";
import tipChest from "@/assets/exchangeSnitch.webp";
import st3Chest from "@/assets/exchangeSt3.webp";
import coffeeChest from "@/assets/exchangeCoffee.webp";
import masonChest from "@/assets/exchangeMason.webp";
import cureChest from "@/assets/exchangeCure.webp";
import metaChest from "@/assets/exchangeMeta.webp";
import bubbleChest from "@/assets/exchangeBubble.webp";
import stantonChest from "@/assets/exchangeStanton.webp";
import kChest from "@/assets/exchangeK.webp";
import chartChest from "@/assets/exchangeChart.webp";
import cutChest from "@/assets/exchangeCut.webp";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";

import { ASSETS, type AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { cn } from "@/lib/utils";

export type ExchangeCardItem = {
  id: string;
  symbol: string;
  formatted: string;
  imgSrc: string;
  background: string;
  accent?: string;
  href?: string;
};

export type ExchangeCardsProps = {
  items?: ExchangeCardItem[];
  heading?: string;
  className?: string;
};

const META: Record<
  AssetType,
  { label: string; bg: string; img: string; route: string; accent?: string }
> = {
  [ASSETS.X_MYST]: {
    label: "XSUI",
    bg: "#31CAEA",
    img: suiChest,
    route: "/exchange/exchange-sui",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_DROP]: {
    label: "XXRP",
    bg: "#EA3131",
    img: xrpChest,
    route: "/exchange/exchange-xrp",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_OCTA]: {
    label: "XAPTOS",
    bg: "#6C31EA",
    img: aptosChest,
    route: "/exchange/exchange-aptos",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_POLL]: {
    label: "XPOLL",
    bg: "linear-gradient(90deg,#111827,#374151)",
    img: aptosChest,
    route: "/exchange/exchange-xpoll",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_HIGH]: {
    label: "XSTRAIN",
    bg: "#31EA62",
    img: highChest,
    route: "/exchange/exchange-strain",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_SHELL]: {
    label: "XSHELLY",
    bg: "#B9B9B9",
    img: shellChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_AMBIT]: {
    label: "XAMY",
    bg: "#B9B9B9",
    img: ambChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_TIP]: {
    label: "XSNITCH",
    bg: "#B9B9B9",
    img: tipChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_ST3]: {
    label: "xST3",
    bg: "#B9B9B9",
    img: st3Chest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_Coffee]: {
    label: "xCOFFEE",
    bg: "#B9B9B9",
    img: coffeeChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_Mason]: {
    label: "xMASON",
    bg: "#B9B9B9",
    img: masonChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_Cure]: {
    label: "xCURE",
    bg: "#B9B9B9",
    img: cureChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_Meta]: {
    label: "xMETA4",
    bg: "#B9B9B9",
    img: metaChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_BCBUBBLE]: {
    label: "xBUBBLE",
    bg: "#B9B9B9",
    img: bubbleChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_STAN_MINI]: {
    label: "xSTAN",
    bg: "#B9B9B9",
    img: stantonChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_K_MINI]: {
    label: "xK",
    bg: "#B9B9B9",
    img: kChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_SCOPE]: {
    label: "xCHART",
    bg: "#B9B9B9",
    img: chartChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
  [ASSETS.X_SLICE]: {
    label: "xCUT",
    bg: "#B9B9B9",
    img: cutChest,
    route: "",
    accent: "rgba(255,255,255,0.18)",
  },
};

function Card({ item }: { item: ExchangeCardItem }) {
  const navigate = useNavigate();

  const isComingSoon =
    item.symbol === "XSHELL" ||
    item.symbol === "XAMBIT" ||
    item.symbol === "XTIP" ||
    item.symbol === "xST3" ||
    item.symbol === "xCoffee" ||
    item.symbol === "xMark" ||
    item.symbol === "xCure" ||
    item.symbol === "xMeta4" ||
    item.symbol === "xBubbleCoin";
    item.symbol === "xStan" ||
    item.symbol === "xK" ||
    item.symbol === "xChart" ||
    item.symbol === "xCut";

  const handleClick = () => {
    if (isComingSoon) return;
    if (item.href) navigate(item.href);
  };
  return (
    <article
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        isComingSoon && "cursor-not-allowed opacity-80",
      )}
      style={{
        background: item.background,
        cursor: isComingSoon ? "not-allowed" : "pointer",
      }}
    >
      {/* faint circles */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full"
        style={{ background: item.accent ?? "rgba(255,255,255,0.18)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full"
        style={{ background: "rgba(255,255,255,0.28)" }}
      />

      <div className="relative grid grid-cols-[1fr,132px] sm:grid-cols-[1fr,220px] gap-2 p-4 sm:p-5 h-44 md:h-48">
        {/* Left content */}
        <div className="z-10 flex flex-col justify-center">
          <div className="inline-flex text-lg md:text-2xl font-extrabold tracking-[0.28em] text-black/90">
            {item.symbol}
          </div>

          {["XSUI", "XAPTOS", "XXRP", "XSTRAIN"].includes(item.symbol) && (
            <>
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-black/60">
                Total Coins
              </div>
              <div className="mt-1 text-xl sm:text-3xl font-semibold text-black/90 leading-none">
                {item.formatted}
              </div>
            </>
          )}

          <div className="mt-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-black/25 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-black/20"
            >
              {isComingSoon ? "Coming soon" : "Exchange now"}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 -right-10 md:-right-4 h-44">
          <img
            src={item.imgSrc}
            alt={`${item.symbol} asset`}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </article>
  );
}

export default function HomeExchangeCards({
  items,
  heading = "Exchange",
  className = "flex flex-col w-full gap-4",
}: ExchangeCardsProps) {
  const { data } = useApiQuery(endpoints.profile.me);

  const derived: ExchangeCardItem[] = useMemo(() => {
    if (items && items.length) return items;

    const me = data?.data?.data ?? data?.data ?? data;
    const mappings = me?.assetMappings ?? {};

    // Sandbox: all four exchangeable chains are shown so the demo covers the
    // full exchange surface (production currently ships XSTRAIN only).
    const order: AssetType[] = [
      ASSETS.X_MYST,
      ASSETS.X_DROP,
      ASSETS.X_OCTA,
      ASSETS.X_HIGH,
    //   ASSETS.X_SHELL,
    //   ASSETS.X_AMBIT,
    //   ASSETS.X_TIP,
    //   ASSETS.X_ST3,
    //   ASSETS.X_Coffee,
    //   ASSETS.X_Mason,
    //   ASSETS.X_Cure,
    //   ASSETS.X_Meta,
    //   ASSETS.X_BCBUBBLE,
    //   ASSETS.X_STAN_MINI,
    //   ASSETS.X_K_MINI,
    //   ASSETS.X_SCOPE,
    //   ASSETS.X_SLICE,

    ];

    return order
      .map((asset) => {
        const row = mappings?.[asset];
        if (!row) return null;

        const formatted = unwrapString(
          amount({
            op: "toParent",
            assetId: asset,
            value: row.amount ?? 0,
            output: "string",
            trim: true,
            group: true,
          }),
        );

        const meta = META[asset];
        return {
          id: asset,
          symbol: meta.label,
          formatted,
          imgSrc: meta.img,
          background: meta.bg,
          accent: meta.accent,
          href: meta.route,
        } as ExchangeCardItem;
      })
      .filter(Boolean) as ExchangeCardItem[];
  }, [items, data]);

  return (
    <section className={className}>
      <a href="/exchange" className="my-2 text-2xl font-semibold">
        {heading}
      </a>
      <div className="space-y-3 w-full">
        {derived?.map((it) => (
          <Card key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}
