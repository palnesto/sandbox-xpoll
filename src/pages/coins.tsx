import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Info, Send } from "lucide-react";
import { useNavigate } from "react-router";
import { ASSETS } from "@/components/commons/constants";
import { ASSETS as COIN_ASSETS, type AssetType } from "@/utils/currency-assets/asset";
import curette from "@/assets/coins/curette.pdf";
import meta from "@/assets/coins/meta.pdf";
import mark from "@/assets/coins/mark.pdf";
import scope from "@/assets/coins/chart.pdf";
import slice from "@/assets/coins/cut.pdf";
import stanton from "@/assets/coins/stanton.pdf";
import k from "@/assets/coins/khat.pdf";
import bubble from "@/assets/coins/bc.pdf";
import terranova from "@/assets/coins/terra.pdf";
import coffee from "@/assets/coins/coffee.pdf";
import amy from "@/assets/coins/amy.pdf";
import snitch from "@/assets/coins/snitch.pdf";
import shelly from "@/assets/coins/snitch.pdf";
import strain from "@/assets/coins/strain.pdf";
import term from "@/assets/coins/term.pdf";
import three from "@/assets/coins/three.pdf";
import t from "@/assets/coins/t.pdf";
import jack from "@/assets/coins/jack.pdf";

type CoinKey = keyof typeof ASSETS.vids.coins;

type CoinCard = {
  id: string;
  title: string;
  industry: string;
  videoKey: CoinKey;
  pdfUrl?: string; 
  telegramUrl: string;
  rewardAssetId: AssetType;
};

const openNewTab = (url?: string) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};
 
const CARD_W = "w-[250px] md:w-[230px]";  
const CARD_H = "h-[300px] md:h-[290px]"; 

const coinGrid =
  "grid gap-8 w-full xl:max-w-5xl mx-auto place-items-center p-5 bg-gray-300 rounded-3xl " +
  "grid-cols-1 " + 
  "md:grid-cols-3 " +
  "xl:grid-cols-4";

const cardShell =
  "relative overflow-hidden rounded-[22px] bg-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.22)] " +
  "ring-1 ring-black/10";

const titleText =
  "text-white font-extrabold tracking-tight leading-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] " +
  "text-[28px]";

const pillBtn =
  "h-10 w-full rounded-full bg-[#0EA5A8] text-white text-[12px] font-semibold tracking-[0.20em] " +
  "shadow-[0_12px_28px_rgba(14,165,168,0.22)] " +
  "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]";

const iconPill =
  "p-2 rounded-full bg-[#0EA5A8] text-white grid place-items-center " +
  "shadow-[0_12px_28px_rgba(0,0,0,0.25)] transition-transform duration-200 " +
  "hover:scale-[1.05] active:scale-[0.98]";

const infoDot =
  "rounded-full bg-[#0EA5A8] text-white grid place-items-center " +
  "shadow-[0_14px_34px_rgba(0,0,0,0.30)] ring-1 ring-white/10 " +
  "transition-transform duration-200 hover:scale-[1.06] active:scale-[0.98]";

function CoinVideo({ src }: { src: string }) { 
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      autoPlay
      playsInline
      loop
      muted
      preload="metadata"
    />
  );
}

const CoinCardView = memo(function CoinCardView({
  item,
  reduceMotion,
  onStartPolling,
}: {
  item: CoinCard;
  reduceMotion: boolean;
  onStartPolling: (item: CoinCard) => void;
}) {
  const vid = ASSETS.vids.coins[item.videoKey] as string;

  return (
    <motion.article 
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{
        duration: 0.35,
        ease: [0.2, 0.85, 0.2, 1],
      }}
      className={`${CARD_W} ${CARD_H} ${cardShell} group`}
    > 
      <div className=" ">
        <CoinVideo src={vid} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[#0EA5A8]/18 blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
      </div>
 
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between px-2 pt-4">
          <h3 className={titleText}>{item.title}</h3>

          {/* <button
            type="button"
            aria-label={`${item.title} info`}
            onClick={() => openNewTab(item.pdfUrl)}
            className={infoDot}
          >
            <Info />
          </button> */}
        </div>
   
        <div className="px-2 pb-4">
          <div className="mb-3 text-[15px] font-medium text-white/85 drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]">
            Industry : {item.industry}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onStartPolling(item)}
              className={pillBtn}
            >
              START POLLING
            </button>

            <button
              type="button"
              aria-label={`${item.title} telegram`}
              onClick={() => openNewTab(item.telegramUrl)}
              className={iconPill}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
 
      <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/10" />
    </motion.article>
  );
});

export default function CoinDirectory() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const handleStartPolling = (item: CoinCard) => {
    navigate(`/campaigns/all-campaigns?coin=${encodeURIComponent(item.rewardAssetId)}`);
  };

  const COINS: CoinCard[] = useMemo(
    () => [
      {
        id: "meta4",
        title: "The Meta4",
        industry: "Social",
        videoKey: "xMeta",
        pdfUrl: meta, 
        telegramUrl: "https://t.me/Xpoll_signals/48328",
        rewardAssetId: COIN_ASSETS.X_Meta,
      },
      {
        id: "curette",
        title: "Curette",
        industry: "Health Care",
        videoKey: "xCure",
        pdfUrl: curette, 
        telegramUrl: "https://t.me/Xpoll_signals/48316",
        rewardAssetId: COIN_ASSETS.X_Cure,
      },
      {
        id: "mark",
        title: "The Mark",
        industry: "Social",
        videoKey: "xMason",
        pdfUrl: mark, 
        telegramUrl: "https://t.me/Xpoll_signals/1",
        rewardAssetId: COIN_ASSETS.X_Mason,
      },
      {
        id: "coffee-milk",
        title: "Coffee Milk",
        industry: "Government",
        videoKey: "xCoffee",
        pdfUrl: coffee, 
        telegramUrl: "https://t.me/Xpoll_signals/48326",
        rewardAssetId: COIN_ASSETS.X_Coffee,
      },

      {
        id: "snitch",
        title: "Snitch",
        industry: "Sports",
        videoKey: "xTIP",
        pdfUrl: snitch, 
        telegramUrl: "https://t.me/Xpoll_signals/45082",
        rewardAssetId: COIN_ASSETS.X_TIP,
      },
      {
        id: "strain",
        title: "Strain",
        industry: "Social",
        videoKey: "xHIGH",
        pdfUrl: strain, 
        telegramUrl: "https://t.me/Xpoll_signals/1",
        rewardAssetId: COIN_ASSETS.X_HIGH,
      },
      {
        id: "the-cut",
        title: "The cut",
        industry: "Entertainment",
        videoKey: "xSlice",
        pdfUrl: slice, 
        telegramUrl: "https://t.me/Xpoll_signals/48322",
        rewardAssetId: COIN_ASSETS.X_SLICE,
      },
      {
        id: "the-chart",
        title: "The Chart",
        industry: "Finance",
        videoKey: "xScope",
        pdfUrl: scope, 
        telegramUrl: "https://t.me/Xpoll_signals/48318",
        rewardAssetId: COIN_ASSETS.X_SCOPE,
      },
      {
        id: "k-hat",
        title: "K Hat",
        industry: "Contractor",
        videoKey: "xKMini",
        pdfUrl: k, 
        telegramUrl: "https://t.me/Xpoll_signals/48350",
        rewardAssetId: COIN_ASSETS.X_K_MINI,
      },
      {
        id: "terranova",
        title: "Terranova",
        industry: "Farming",
        videoKey: "xST3",
        pdfUrl: terranova, 
        telegramUrl: "https://t.me/Xpoll_signals/48324",
        rewardAssetId: COIN_ASSETS.X_ST3,
      },
      {
        id: "stanton",
        title: "Stanton",
        industry: "Real Estate",
        videoKey: "xStanMini",
        pdfUrl: stanton, 
        telegramUrl: "https://t.me/Xpoll_signals/48320",
        rewardAssetId: COIN_ASSETS.X_STAN_MINI,
      },
      {
        id: "bubble",
        title: "Bubble",
        industry: "Education",
        videoKey: "xBCBUBBLE",
        pdfUrl: bubble, 
        telegramUrl: "https://t.me/c/Xpoll_signals/48660",
        rewardAssetId: COIN_ASSETS.X_BCBUBBLE,
      },
      {
        id: "amy",
        title: "AMY Coin",
        industry: "Intelligence",
        videoKey: "xAMBIT",
        pdfUrl: amy, 
        telegramUrl: "https://t.me/Xpoll_signals/48352",
        rewardAssetId: COIN_ASSETS.X_AMBIT,
      }, 
      {
        id: "shelly",
        title: "Shelly",
        industry: "Social",
        videoKey: "xSHELL", 
        pdfUrl: shelly, 
        telegramUrl: "https://t.me/Xpoll_signals/48328",
        rewardAssetId: COIN_ASSETS.X_SHELL,
      },
      {
        id: "term-coin",
        title: "Term",
        industry: "Politics",
        videoKey: "xTerm", 
        pdfUrl: term, 
        telegramUrl: "https://t.me/Xpoll_signals/48328",
        rewardAssetId: COIN_ASSETS.X_TERM_MINI,
      },
      {
        id: "three",
        title: "Three Letter",
        industry: "Policy",
        videoKey: "xThree", 
        pdfUrl: three, 
        telegramUrl: "https://t.me/Xpoll_signals/49167",
        rewardAssetId: COIN_ASSETS.X_THREE_LETTER_MINI,
      },
      {
        id: "mr-t",
        title: "Mr T Coin",
        industry: "Internal Policy",
        videoKey: "xMRT", 
        pdfUrl: t, 
        telegramUrl: "https://t.me/Omnis357",
        rewardAssetId: COIN_ASSETS.X_MR_T_MINI,
      },
      {
        id: "jack",
        title: "Jack",
        industry: "Sports",
        videoKey: "xJack", 
        pdfUrl: jack, 
        telegramUrl: "https://t.me/Xpoll_signals/48318",
        rewardAssetId: COIN_ASSETS.X_JACK_MINI,
      },
    ],
    []
  );

  return (
    <section className="min-h-screen w-full p-2 lg:p-7"> 
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#424141]">
            The XPOLL
          </h1>
          <h2 className="mt-1 text-4xl md:text-5xl font-medium tracking-tight text-[#5B5A5A]">
            Coin <span className="italic font-bold text-[#616161]">Directory</span>
          </h2>
        </header>
 
        <motion.section
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: reduceMotion
                ? { duration: 0 }
                : { staggerChildren: 0.06, delayChildren: 0.06 },
            },
          }}
          className={`mt-10 ${coinGrid}`}
        >
          {COINS?.map((item) => (
            <CoinCardView
              key={item.id}
              item={item}
              reduceMotion={!!reduceMotion}
              onStartPolling={handleStartPolling}
            />
          ))}
        </motion.section> 
    </section>
  );
}