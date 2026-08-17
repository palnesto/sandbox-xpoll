import { endpoints } from "@/api/endpoints";
import BackButton from "@/components/commons/back-button";
import { buildRewardTable } from "@/config/civic-logic2";
import { LEVELS } from "@/config/levelConfig";
import { useApiQuery } from "@/hooks/useApiQuery";
import { CircleCheckBig, Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function LevelProgressPage() {
  const { data: profile, isLoading } = useApiQuery(endpoints.profile.me);
  const filteredProfile = profile?.data?.data ?? null;
  const profileData = useMemo(
    () => filteredProfile?.profile ?? {},
    [filteredProfile]
  );
  const CURRENT_LEVEL = profileData?.level ?? 0;

  const rewards = useMemo(
    () =>
      buildRewardTable({
        totalLevels: 10,
        rewardType: "max",
        perUserReward: 100000n,
      }),
    []
  );

  const idx = Math.max(
    0,
    LEVELS.findIndex((l) => l.id === CURRENT_LEVEL)
  );
  const current = LEVELS[idx] ?? LEVELS[0];
  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin" />;
  }
  return (
    <main className="relative pb-6 lg:pb-6 flex flex-col items-center justify-center w-full bg-white lg:bg-transparent">
      <header className="sticky top-0 z-20 bg-white text-center w-full pb-4 lg:pb-0">
        <section
          className="hidden relative lg:flex h-[400px] w-full overflow-hidden bg-center bg-cover"
          style={{ backgroundImage: `url(${current.bg})` }}
        >
          <section className="flex flex-col text-center mx-auto text-white pt-4">
            <h1 className="text-[3rem] font-extrabold">
              {profileData?.apps?.xpoll?.username ?? "User"}
            </h1>
            <p className="font-bold text-2xl">Level : {CURRENT_LEVEL}</p>
          </section>
          <img
            src={profileData.apps?.xpoll?.avatar?.imageUrl}
            alt={current.title}
            className="h-80 -bottom-16 left-1/2 -translate-x-1/2 absolute"
          />
        </section>
        <section className="lg:hidden flex items-center px-10 pt-6">
          <BackButton
            className="w-10 absolute left-4 top-4"
            to="/profile/civic-score"
          />
          <h1 className="text-xl flex-1">
            {profileData?.apps?.xpoll?.username ?? "User"}
          </h1>
        </section>
        <p className="font-semibold text-sm text-gray-500 lg:hidden">
          Level : {CURRENT_LEVEL}
        </p>
      </header>

      {/* Timeline */}
      <ol className="relative z-0 border-s border-dashed border-black mt-8 w-full max-w-[15rem] mx-auto">
        {LEVELS.filter((level) => !level.isHidden).map((level) => {
          const isCompleted = level.id < CURRENT_LEVEL;
          const isCurrent = level.id === CURRENT_LEVEL;

          return (
            <li
              key={level.id}
              className={`mb-16 ms-6 relative w-full ${
                isCurrent ? "bg-[#FAF5FF] p-7 rounded-lg" : ""
              }`}
            >
              <span
                className={`absolute z-20 -top-2 flex items-center justify-center  ${
                  isCurrent ? "-start-20" : "-start-16"
                }`}
              >
                <img
                  src={level.image}
                  alt={level.title}
                  className={`${isCurrent ? "h-28 w-28" : "h-20 w-20"} ${
                    isCompleted
                      ? "border-2 border-green-500 rounded-full"
                      : !isCurrent
                      ? ""
                      : ""
                  }`}
                />
              </span>

              <div className={`${isCurrent ? "ml-6" : "ml-14"}`}>
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  {level.title}
                  {isCurrent && (
                    <span className="ml-1 text-xs text-purple-600 border border-purple-300 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {isCompleted && (
                    <CircleCheckBig className="ml-1 w-4 h-4 text-green-500" />
                  )}
                </h3>
                <p className="text-sm text-gray-500">
                  {rewards?.[level.id - 1]?.reward.toString()} points required
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
