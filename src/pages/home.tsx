import TopCoins from "@/components/dashboard/TopCoins";
import { ArrowRight } from "lucide-react";
import xPoll from "@/assets/xpoll.webp";
import xOcta from "@/assets/aptos.webp";
import xMYST from "@/assets/sui.webp";
import xDROP from "@/assets/xrp.webp";
import TrialsCarousel from "@/components/dashboard/TrialsCarousel";
import announcement from "@/assets/back2.webp";
import announcement2 from "@/assets/banner.webp";
import announcement3 from "@/assets/banner3.webp";
import announcement4 from "@/assets/banner1.webp";
import announcement5 from "@/assets/banner2.webp";
import announcement6 from "@/assets/banner4.webp";
import announcement7 from "@/assets/banner5.webp";
import announcement8 from "@/assets/banner6.webp";
import announcement9 from "@/assets/banner8.webp";

import { useEffect, useState, useMemo } from "react";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { HomeSkeleton } from "@/components/commons/FullScreenLoader";
import CampaignsCarousel from "@/components/dashboard/CampaignsCarousel";
import HomeExchangeCards from "@/components/dashboard/HomeExchange";
import {
  SignupBonusModal,
  getSignupBonusModalDismissed,
} from "@/components/modals/SignupBonusModal";
import InkdHomeHero from "@/components/inkd/inkd-home";

export const COIN_IMAGES = {
  xPoll,
  xOcta,
  xMYST,
  xDrop: xDROP,
} as const;

const BANNERS = [
  {
    title: "XSHELLY IS LIVE.",
    description: "Build Policy with Proof, Not Noise.",
    bg: announcement4,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/6974dc0d448ae0b1c7fe2ec6",
      );
    },
  },
  {
    title: "XAMY IS LIVE.",
    description: "XPOLL’s native PSY-OPS Coin.",
    bg: announcement5,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/69845c88f888c0c227e6f5a8",
      );
    },
  },
  {
    title: "XTERRANOVA IS LIVE.",
    description: "XPOLL’s founder coin farming the future of RI",
    bg: announcement6,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/698790239c711265166706ea",
      );
    },
  },
  {
    title: "XBUBBLE IS LIVE.",
    description: "XPOLL’s Native University Coin.",
    bg: announcement7,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/697d07d5d30c48d3c4e7bd0f",
      );
    },
  },
  {
    title: "XMETA4 IS LIVE.",
    description:
      "Archetypes, symbolic framing, deep tech, and XPoll’s role in the Agentic Age.",
    bg: announcement8,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/698b3a9fcfad3cd28453a855",
      );
    },
  },
  {
    title: "XMARK IS LIVE.",
    description: "A signal of Unity, Co-operation and Shared Purpose.",
    bg: announcement9,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/698a02f9db98a3a12270b04e",
      );
    },
  },
  {
    title: "XSTRAIN is LIVE",
    description:
      "XPOLL Christmas Signal Drop Is LIVE Show Up Daily. Earn XSTRAIN. Build The Signal.",
    bg: announcement2,
    textColor: "text-white",
    objectFit: "cover",
    onClick: () => {
      window.open("/trial");
    },
  },
  {
    title: "XPOLL is LIVE",
    description:
      "Participate in Poll Bounties. Earn Rewards. Exchange with Stable Tokens.",
    bg: announcement,
    textColor: "text-black/90",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/trial",
        "_blank",
        "noopener,noreferrer",
      );
    },
  },
  {
    title: "",
    description: "",
    bg: announcement3,
    textColor: "",
    objectFit: "cover",
    onClick: () => {
      window.open(
        "https://app.xpoll.io/campaigns/all-campaigns/696546663c7e3625dd903a4f",
        "_blank",
      );
    },
  },
] as const;

export default function Dashboard() {
  const { data: meData, isLoading } = useApiQuery(endpoints.profile.me);


  // signup bonus may be change later===========================================================
  const ledgersUrl = `${endpoints.assets.getLedgers}?page=1&pageSize=10`;
  const { data: ledgersData } = useApiQuery(ledgersUrl, {
    enabled: !!meData,
  });

  const hasSignupBonus = useMemo(() => {
    const root = (ledgersData as any)?.data?.data ?? (ledgersData as any)?.data ?? ledgersData;
    const items = Array.isArray(root?.items) ? root.items : [];
    return items.some((item: { action?: string }) => item.action === "signup-bonus");
  }, [ledgersData]);

  const [signupBonusModalOpen, setSignupBonusModalOpen] = useState(false);
  useEffect(() => {
    if (!meData || !hasSignupBonus) return;
    if (getSignupBonusModalDismissed()) return;
    setSignupBonusModalOpen(true);
  }, [meData, hasSignupBonus]);

  // signup bonus may be change later===========================================================

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const activeBanner = BANNERS[activeBannerIndex];

  useEffect(() => {
    if (BANNERS.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % BANNERS.length);
    }, 6000); // 6s per slide

    return () => window.clearInterval(id);
  }, []);

  if (isLoading && !meData) {
    return <HomeSkeleton />;
  }

  return (
    <main className="py-4 px-2 md:px-4 space-y-8">
      <section className="relative">
        <div
          onClick={activeBanner.onClick}
          style={{ backgroundImage: `url(${activeBanner.bg})` }}
          className={`rounded-2xl cursor-pointer overflow-hidden p-4 h-28 flex items-center justify-between bg-right bg-no-repeat transition-opacity duration-1000 ease-in-out ${activeBanner.objectFit}`}
        >
          <section>
            <h1 className={`text-xl font-semibold ${activeBanner.textColor}`}>
              {activeBanner.title}
            </h1>
            <p className={`mt-1 text-xs max-w-2xl  ${activeBanner.textColor}`}>
              {activeBanner.description}
            </p>
          </section>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // prevent banner onClick
              setActiveBannerIndex((prev) => (prev + 1) % BANNERS.length);
            }}
            className="p-2 rounded-full bg-black text-white hover:opacity-90"
            aria-label="Next banner"
            title="Next"
          >
            <ArrowRight className="h-6 w-6" />
          </button>

        </div>
        {BANNERS.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
            {BANNERS?.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveBannerIndex(idx)}
                className={`h-2 w-2 rounded-full transition-all ${idx === activeBannerIndex
                    ? "w-4 bg-gray-100"
                    : "bg-gray-400 hover:bg-gray-700"
                  }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>
      <TopCoins />
      <CampaignsCarousel />
      <TrialsCarousel />
      <InkdHomeHero />
      <HomeExchangeCards/>
      
      <SignupBonusModal
        open={signupBonusModalOpen}
        onOpenChange={setSignupBonusModalOpen}
      />
    </main>
  );
}
