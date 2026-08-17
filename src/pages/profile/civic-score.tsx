import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LEVELS } from "@/config/levelConfig";

import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";

import BackButton from "@/components/commons/back-button";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Recycle, Clock } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const fmtTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

type LedgerEntry = {
  _id: string;
  createdAt?: string;
  civicScore?: number;
  meta: {
    action: "init" | "add" | "subtract" | "set";
    delta?: number;
    seed?: number;
    setTo?: number;
  };
};

function LedgerRow({ e }: { e: LedgerEntry }) {
  const a = e.meta?.action;
  const isMinus = a === "subtract";
  const isSet = a === "set";
  const Icon = isMinus ? Minus : isSet ? Recycle : Plus;

  let amount = 0;
  if (a === "add" || a === "subtract") amount = Math.abs(e.meta?.delta ?? 0);
  if (a === "init") amount = Math.abs(e.meta?.seed ?? 0);
  if (a === "set") amount = Math.abs(e.meta?.setTo ?? 0);

  const tone =
    a === "subtract"
      ? "text-rose-500"
      : a === "set"
        ? "text-violet-600"
        : "text-emerald-600";

  const chipBg =
    a === "subtract"
      ? "bg-rose-50"
      : a === "set"
        ? "bg-violet-50"
        : "bg-emerald-50";

  return (
    <div className="rounded-xl w-full flex flex-col bg-white shadow-sm py-3 px-3 gap-3">
      <li className="flex items-center">
        <div
          className={`mr-3 grid h-8 w-8 place-items-center rounded-lg ${chipBg}`}
        >
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>

        <div className={`text-sm font-semibold flex-1 ${tone}`}>
          {isSet ? "= " : isMinus ? "- " : "+ "}
          {amount} Points
        </div>

        <div className="flex items-center gap-1 text-xs text-black/60">
          <Clock className="h-4 w-4" />
          {fmtTime(e.createdAt)}
        </div>
      </li>
      {isMinus && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm px-4 py-1 bg-red-200 mx-2 w-full text-red-500 rounded-md line-clamp-2">
                Bot-like activity detected
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="text-sm max-w-96 bg-white text-black border border-black"
            >
               Bot-like activity detected
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isSet && e?.meta?.message && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm px-4 py-1 bg-red-200 mx-2 w-full text-red-500 rounded-md line-clamp-2">
                {e?.meta?.message}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="text-sm max-w-96 bg-white text-black border border-black"
            >
              {e?.meta?.message}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default function CivicScorePage() {
  const navigate = useNavigate();

  const { data: meRaw, isLoading: profileLoading } = useApiQuery(
    endpoints.profile.me,
  );
  const profile = useMemo(() => meRaw?.data?.data?.profile ?? {}, [meRaw]);

  const levelId: number = profile?.level ?? 1;
  const civicScore: number = Number(profile?.civicScore ?? 0);

  const idx = Math.max(
    0,
    LEVELS.findIndex((l) => l.id === levelId),
  );
  const current = LEVELS[idx] ?? LEVELS[0];
  const next = LEVELS[idx + 1];

  const denom = (next ? next.points : current.points) - current.points || 1;
  const progress = clamp01((civicScore - current.points) / denom) * 100;

  const ledgerUrl = `/external/profile/civic/ledger?page=1&pageSize=20`;
  const { data: ledgerRaw, isLoading: ledgerLoading } = useApiQuery(ledgerUrl);
  const entries: LedgerEntry[] = useMemo(() => {
    const root = ledgerRaw?.data?.data ?? {};
    return (root.entries ?? []) as LedgerEntry[];
  }, [ledgerRaw]);
  const loading = profileLoading || ledgerLoading;

  if (loading) {
    return (
      <main className="min-h-screen pb-5 animate-pulse">
        {/* Hero section */}
        <section className="relative h-[600px]">
          <section className="h-[400px] w-full bg-gray-200" />

          <div className="absolute top-60 left-1/2 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-lg text-center max-w-[21rem] md:max-w-[24rem] w-full">
            <section className="h-5 w-32 mx-auto rounded bg-gray-200" />
            <section className="mt-2 h-3 w-16 mx-auto rounded bg-gray-200" />

            <section className="mt-3 flex justify-center">
              <section className="h-16 w-16 rounded-full bg-gray-200" />
            </section>
            <section className="mt-2 h-4 w-20 mx-auto rounded bg-gray-200" />

            <p className="mx-auto mt-2 h-3 w-40 rounded bg-gray-200" />

            {/* Progress bar placeholder */}
            <section className="mt-4 flex items-center gap-3">
              <section className="h-6 w-6 rounded-full bg-gray-200" />
              <section className="h-2 flex-1 rounded bg-gray-200" />
              <section className="h-6 w-6 rounded-full bg-gray-200" />
            </section>

            <div className="mt-4 h-9 w-full rounded-full bg-gray-200" />
          </div>
        </section>

        {/* Civic Score number */}
        <section className="relative mx-auto mt-6 w-full max-w-md px-4 text-center">
          <section className="h-10 w-24 mx-auto rounded bg-gray-200" />
          <section className="mt-2 h-3 w-20 mx-auto rounded bg-gray-200" />
        </section>

        {/* Ledger list */}
        <section className="mx-auto mt-6 w-full max-w-md px-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <section key={i} className="h-12 rounded-xl bg-gray-200" />
          ))}
        </section>
      </main>
    );
  }
  return (
    <main className="min-h-screen pb-5">
      {/* Top hero with dynamic level background */}
      <section className="relative h-[600px]">
        <section
          className="h-[400px] w-full overflow-hidden bg-center bg-cover"
          style={{ backgroundImage: `url(${current.bg})` }}
        >
          <BackButton className="absolute left-3 top-3" to="/profile" />
          <img
            src={profile?.apps?.xpoll?.avatar?.imageUrl}
            alt={current.title}
            className="h-80 top-16 left-1/2 -translate-x-1/2 absolute"
          />
        </section>

        <section className="absolute top-60 left-1/2 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-lg text-center max-w-[21rem] md:max-w-[24rem] w-full">
          <h2 className="text-xl">
            {profile?.apps?.xpoll?.username ?? "Unknown User"}
          </h2>
          <p className="mt-1 text-xs">Level : {current.id}</p>

          <div className="mt-2 grid place-items-center gap-2">
            <img
              src={current.image}
              alt={current.title}
              className="h-16 w-16 object-contain"
              draggable={false}
            />
            <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">
              {current.title}
            </span>
          </div>

          {/* description */}
          <p className="mx-auto mt-2 max-w-60 text-[12px] text-black/70">
            {current.desc}
          </p>

          <section className="pt-6 flex gap-3 text-xs text-black/70">
            <span className="font-semibold flex flex-col items-center">
              <img src={current.image} alt="" className="w-6" />
              {current.id}
            </span>
            <Progress
              value={progress}
              className="h-2 [&>div]:bg-[#22E7D4] mt-1"
            />
            <span className="font-semibold flex flex-col items-center">
              <img src={next.image} alt="" className="w-6" />
              {next ? `${next.id}` : "MAX"}
            </span>
          </section>

          <Button
            className="mt-4 w-full rounded-full bg-[#22E7D4] text-black hover:bg-[#1dd1c0]"
            variant="default"
            onClick={() => navigate("/profile/level-progress")}
          >
            Level Progress
          </Button>
        </section>
      </section>

      <section className="relative mx-auto mt-6 w-full max-w-md px-4 text-center">
        <h1 className="text-5xl font-bold leading-none">{civicScore}</h1>
        <p className="mt-1 text-sm text-black/60">Civic score</p>
      </section>

      <section className="mx-auto mt-5 w-full max-w-md px-3">
        {/* Ledger list */}
        <ul className="space-y-2">
          {loading && entries.length === 0 && (
            <div className="py-8 text-center text-sm text-black/50">
              No ledger entries yet.
            </div>
          )}

          {entries.map((e) => (
            <LedgerRow key={e._id} e={e} />
          ))}
        </ul>
      </section>
    </main>
  );
}
