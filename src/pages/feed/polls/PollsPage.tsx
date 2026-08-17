import { useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import PollDeck from "@/components/PollDeck";

const DBG = true;
const now = () => new Date().toISOString().split("T")[1]!.replace("Z", "");
const log = (...args: any[]) =>
  DBG && console.log(`[PollsPage ${now()}]`, ...args);

export default function PollsPage() {
  const { pollId } = useParams<{ pollId?: string }>();
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 8));

  const initialPinnedIdRef = useRef<string | undefined>(undefined);
  if (initialPinnedIdRef.current === undefined) {
    initialPinnedIdRef.current = pollId;
    log("INIT pinnedPollId", {
      mountId: mountIdRef.current,
      pinnedPollId: initialPinnedIdRef.current,
    });
  }

  const filters = useMemo(
    () =>
      initialPinnedIdRef.current
        ? { pinnedPollId: initialPinnedIdRef.current }
        : {},
    [],
  );

  return (
    <PollDeck
      className="h-[600px] max-h-auto"
      filters={filters}
      pageSize={12}
      prefetchThreshold={5}
      enableAds={true}
    />
  );
}
