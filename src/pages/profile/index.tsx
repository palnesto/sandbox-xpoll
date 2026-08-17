import { useNavigate } from "react-router-dom";
import { LEVELS } from "@/config/levelConfig";
import walletCardImg from "@/assets/wallet.webp";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useMemo } from "react";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import TopCoins from "@/components/dashboard/TopCoins";
import Settings from "@/components/profile/settings";
import SoulboundSubscriptionPanel from "@/components/profile/soulbound-subscription-panel";
import InvitedEventsSection from "@/components/profile/InvitedEventsSection";
import { ChartNoAxesColumn } from "lucide-react";
import { ProfilePageSkeleton } from "@/components/commons/FullScreenLoader";
import { flagUrlFromIso2, pickIso2 } from "@/utils/flag";
import tick from "@/assets/tick.webp";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data: polldata, isLoading } = useApiQuery(
    endpoints.poll.myPolls.getMyPollsStats,
  );
  const filteredPolldata = useMemo(
    () => polldata?.data?.data ?? [],
    [polldata],
  );

  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useApiQuery(endpoints.profile.me);
  const filteredProfile = useMemo(() => profile?.data?.data ?? [], [profile]);

  const iso2 = pickIso2(filteredProfile);
  const flagSrc = flagUrlFromIso2(iso2, 320);

  const currentLevel = LEVELS.find(
    (lvl) => lvl.id === filteredProfile?.profile?.level,
  )!;

  const isSoulboundActive = Boolean(filteredProfile?.soulbound?.isActive);
  if (isProfileLoading || isLoading) {
    return <ProfilePageSkeleton />;
  }
  return (
    <main className="px-2 pb-6 space-y-10 max-w-[620px] mx-auto">
      <section>
        <header className="flex items-center justify-between py-4">
          <h1 className="text-3xl font-semibold">Profile</h1>
          <button
            type="button"
            className="rounded-full border border-black px-4 py-2 text-sm font-medium hover:bg-gray-100"
            onClick={() => navigate("/profile/exchange-history")}
          >
            Exchange history
          </button>
        </header>

        <section className="relative mx-auto w-full">
          <div className="pointer-events-none absolute left-0 right-0 -bottom-14 md:-bottom-20 h-20 md:h-24 rounded-b-2xl bg-[#25FBEC]" />

          <section className="relative w-full">
            <img
              src={walletCardImg}
              alt="Wallet"
              className="w-full h-full"
              draggable={false}
            />

            <div className="absolute left-[1.5rem] right-[2rem] md:left-[1.7rem] md:right-[3rem] top-[1.2rem] md:top-[1.7rem] flex items-center justify-between">
              <img
                src={filteredProfile?.profile?.apps?.xpoll?.avatar?.imageUrl}
                alt="Avatar"
                className="h-9 w-9 md:w-14 md:h-14 rounded-full border border-black/10 object-cover object-top"
              />

              {flagSrc && (
                <img
                  src={flagSrc}
                  alt={iso2 ?? "country flag"}
                  className="h-5 w-7 md:h-7 md:w-10 rounded-sm object-fill"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div className="absolute top-[4rem] md:top-[6rem] 2xl:top-[7rem] left-[2rem] flex items-center gap-2">
              <p className="text-[19px] md:text-2xl font-semibold leading-tight">
                {filteredProfile?.profile?.apps?.xpoll?.username}
              </p>

              {isSoulboundActive && (
                <img
                  src={tick}
                  alt="Verified"
                  className="h-5 w-5 md:h-9 md:w-9 object-contain"
                  draggable={false}
                />
              )}
            </div>

            {/* Bottom-left: current level coin + text */}
            <div className="absolute bottom-10 md:bottom-16 left-[1.5rem] flex items-center gap-4 text-white">
              <img
                src={currentLevel?.image}
                alt={currentLevel?.title}
                className="h-20 md:h-32 object-contain"
                draggable={false}
              />
              <section>
                <h2 className="text-2xl font-semibold tracking-wide uppercase">
                  {currentLevel?.title}
                </h2>
                <p className="mt-1 text-sm/5 text-white/70">
                  LEVEL {filteredProfile?.profile?.level}
                </p>
              </section>
            </div>
          </section>
        </section>

        <section className="mx-auto w-full max-w-[500px] px-4 pt-2 md:pt-4 flex items-center justify-between relative">
          <div
            className="flex max-w-[75%] gap-1 overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {LEVELS.map((lvl) => (
              <img
                key={lvl.id}
                src={lvl.image}
                alt={lvl.title}
                title={lvl.title}
                className={`h-6 md:h-10 md:w-10 flex-shrink-0 object-contain ${
                  lvl.id === filteredProfile?.profile?.level
                    ? "scale-[1.12]"
                    : ""
                }`}
                draggable={false}
              />
            ))}
          </div>

          <Button
            variant={"secondary"}
            onClick={() => navigate("/profile/civic-score")}
            className="ml-3 md:py-5 rounded-full text-[9px] md:text-[13px] shadow hover:[#0DACAD] hover:bg-[#29d8d8] disabled:opacity-95 disabled:cursor-not-allowed"
          >
            CIVIC SCORE <span aria-hidden>↗</span>
          </Button>
        </section>
      </section>
      <section className="grid grid-cols-2 gap-2">
        <Button
          className="bg-[#25fbec] hover:bg-[#b8d8d8] text-black rounded-full w-full py-6 disabled:opacity-95 disabled:cursor-not-allowed"
          onClick={() => navigate("/profile/reward-history")}
        >
          Reward History
        </Button>
        <Button
          className="bg-[#25fbec] hover:bg-[#b8d8d8] text-black rounded-full w-full py-6 disabled:opacity-95 disabled:cursor-not-allowed"
          onClick={() => navigate("/profile/donation-history")}
        >
          Donation History
        </Button>
        <Button
          className="bg-[#25fbec] hover:bg-[#b8d8d8] text-black rounded-full w-full py-6 disabled:opacity-95 disabled:cursor-not-allowed"
          onClick={() => navigate("/profile/pledged-tokens")}
        >
          Pledged History
        </Button>
        <Button
          className="bg-[#25fbec] hover:bg-[#b8d8d8] text-black rounded-full w-full py-6 disabled:opacity-95 disabled:cursor-not-allowed"
          onClick={() => navigate("/profile/payment")}
        >
          Payment History
        </Button>
      </section>
      <TopCoins />

      <InvitedEventsSection />

      <section className="bg-white p-3 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center text-sm gap-1">
            <ChartNoAxesColumn /> Your Polls at a Glance
          </p>
          <Button
            variant={"secondary"}
            onClick={() => navigate("/my-polls")}
            className="md:py-5 rounded-full text-[9px] md:text-[13px] shadow uppercase"
          >
            View all polls
            <p aria-hidden className="text-sm">
              ↗
            </p>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <span className="bg-[#F7F7F8] p-3 rounded-lg">
            <h2>{filteredPolldata?.allPolls ?? 0}</h2>
            <p className="text-xs">Total Polls</p>
          </span>
          <span className="bg-[#F7F7F8] p-3 rounded-lg">
            <h2>
              {filteredPolldata?.totals?.votes?.archivedPollsIncluded ?? 0}
            </h2>
            <p className="text-xs">Total Votes</p>
          </span>
          <span className="bg-[#F7F7F8] p-3 rounded-lg">
            <h2>{filteredPolldata?.unarchivedPolls ?? 0}</h2>
            <p className="text-xs">Active Polls</p>
          </span>
        </div>
      </section>
      <Settings />
      <SoulboundSubscriptionPanel
        profileData={filteredProfile}
        refetchProfile={refetchProfile}
      />
    </main>
  );
}
