import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlarmClockPlus, ArrowRight } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset"; // adjust path if needed
import BackButton from "@/components/commons/back-button";
import { useNavigate } from "react-router";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { PollCardSkeleton } from "@/components/commons/FullScreenLoader";
import { useCountdown } from "@/hooks/countdown";
import { extractYouTubeId } from "@/types/petition";

type Reward = {
  assetId: AssetType;
  amount: number;
  computedReward: string;
};

type Trial = {
  _id: string;
  title: string;
  description?: string;
  resourceAssets: { type: string; value: string }[];
  rewards: Reward[];
  expireRewardAt?: string | null;
  externalAuthor?: unknown;
};

function TrialCard({ trial }: { trial: Trial }) {
  const navigate = useNavigate();
  const assets = trial?.resourceAssets ?? [];
  const firstImage = assets.find((r) => r.type === "image")?.value;
  const firstVideo = assets.find((r) => r.type === "video")?.value;
  const firstYoutube = assets.find((r) => r.type === "youtube")?.value;
  const youtubeId = firstYoutube
    ? extractYouTubeId(firstYoutube) ?? firstYoutube
    : null;
  const placeholder = "/images/placeholder.png";

  const timeLeft = useCountdown(trial?.expireRewardAt);
  const isUserTrail = !!(trial as any)?.externalAuthor;
  const trailOwnerLabel = isUserTrail ? "User trail" : "Admin trail";

  const renderBanner = () => {
    if (firstImage) {
      return (
        <img
          src={firstImage}
          alt={trial?.title}
          className="w-full h-60 rounded-t-xl border object-cover"
        />
      );
    }
    if (firstVideo) {
      return (
        <video
          src={firstVideo}
          className="w-full h-60 rounded-t-xl border object-cover"
          muted
          playsInline
          loop
          preload="metadata"
        />
      );
    }
    if (youtubeId) {
      return (
        <div className="w-full h-60 rounded-t-xl border overflow-hidden bg-black flex items-center justify-center">
          <iframe
            title="YouTube"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1&modestbranding=1&rel=0`}
            className="w-full h-full pointer-events-none"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <img
        src={placeholder}
        alt={trial?.title}
        className="w-full h-60 rounded-t-xl border object-cover"
      />
    );
  };

  return (
    <Card
      onClick={() => navigate(`/trial/${trial._id}`)}
      className="rounded-xl overflow-hidden shadow-md"
    >
      {/* Banner */}
      <div className="relative flex">
        {renderBanner()}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <span className="bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
            {trailOwnerLabel}
          </span>
          {trial?.expireRewardAt && (
            <section className="flex flex-row gap-1 bg-gray-100 text-xs px-2 py-1 rounded-full">
              <AlarmClockPlus className="w-4 h-4" />
              {timeLeft}
            </section>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{trial?.title}</h3>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="mt-2 text-xs text-gray-500 font-medium">
          REWARDS UPTO
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {trial?.rewards?.map((r, idx) => {
            const spec = assetSpecs[r.assetId];
            if (!spec) return null;
            const formatted = unwrapString(
              amount({
                op: "toParent",
                assetId: r.assetId,
                value: r.amount,
                output: "string",
                trim: true,
                group: false,
              }),
            );
            return (
              <div
                key={idx}
                className="flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-1"
              >
                <img src={spec.img} alt={spec.name} className="w-4 h-4" />
                <span className="font-semibold">{formatted}</span>
                <span>{spec.parent}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function TrialPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useApiQuery(
    endpoints.trial.getAllTrials,
  );
  const entries: Trial[] = useMemo(() => data?.data?.data ?? [], [data]);
  if (isLoading) {
    return <PollCardSkeleton />;
  }

  if (isError) {
    return (
      <p className="text-center text-red-500 m-auto">Failed to load trials.</p>
    );
  }

  if (!entries.length) {
    return (
      <p className="text-center text-gray-500 m-auto">No trials available.</p>
    );
  }

  return (
    <div className="grid gap-4 p-4">
      <header className="flex items-center justify-between">
        <section className="flex items-center gap-2">
        <BackButton onClick={() => navigate("/")}/>
        <h1 className="text-2xl font-semibold">Trails</h1>
        </section>
        <button onClick={() => navigate("/standalone-trails")} className="border-blue border rounded-full px-4 py-2 text-blue">
          My Trails
        </button>
      </header>
      {entries?.map((trial) => (
        <TrialCard key={trial._id} trial={trial} />
      ))}
    </div>
  );
}
