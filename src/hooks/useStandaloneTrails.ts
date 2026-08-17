import { useEffect, useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import type { ApiTrial } from "@/types/campaigns";
import { mapTrialToCard } from "@/components/campaign/trails/trails-manage-shared";
import type { TrailCard } from "@/types/campaigns";

function pickDataRoot(resp: unknown) {
  return (resp as any)?.data?.data ?? (resp as any)?.data ?? resp ?? null;
}

/** Extract trials from standaloneTrail.getAll response (my-trials) */
export function getStandaloneTrials(raw: unknown): ApiTrial[] {
  const d = pickDataRoot(raw) ?? (raw as any) ?? {};
  const trials = d?.trials ?? d?.entries ?? d?.items ?? d?.results ?? d?.list ?? d?.activeTrials;
  return Array.isArray(trials) ? (trials as ApiTrial[]) : [];
}

export function useStandaloneTrails() {
  const listingRoute = endpoints.standaloneTrail.getAll;
  const { data: listingData, isLoading, isError } = useApiQuery(listingRoute, {
    queryKey: [listingRoute],
    enabled: true,
  });

  const apiTrials = useMemo(
    () => getStandaloneTrials(listingData),
    [listingData],
  );

  const [cards, setCards] = useState<TrailCard[]>([]);
  useEffect(() => {
    setCards(apiTrials.map(mapTrialToCard));
  }, [apiTrials]);

  return {
    listingRoute,
    cards,
    setCards,
    isLoading,
    isError,
  };
}
