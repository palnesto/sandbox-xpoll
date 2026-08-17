import React, { useEffect, useMemo, useRef, useState } from "react";
import { Option, PollType } from "./generic-poll";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  animate,
} from "framer-motion";
import { extractYouTubeId } from "./generic-trial-poll";
import LockedYouTube from "../youtube-locked-preview/locked-yt";
import { RichTextPreview } from "../commons/editor/preview";
import { EntityLinkings } from "../polling/forwardLink";

function useVoteDisplay(poll: PollType) {
  const votedId = poll.myVote?.optionId || null;

  const model = useMemo(() => {
    const stats = poll.details?.optionStats ?? [];
    const counts = new Map<string, number>();

    for (const s of stats) counts.set(String(s._id), Number(s.numVotes) || 0);
    for (const o of poll.options) if (!counts.has(o._id)) counts.set(o._id, 0);

    let total = 0;
    for (const o of poll.options) total += counts.get(o._id) || 0;

    // optimistic if server returned zeros but we just voted
    if (votedId && total === 0) {
      counts.set(votedId, 1);
      total = 1;
    }

    const rows = poll.options.map((o) => {
      const count = counts.get(o._id) || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        _id: o._id,
        label: o.label,
        value: o.value,
        isMine: votedId === o._id,
        count,
        pct,
      };
    });

    return { votedId, total, rows };
  }, [poll.options, poll.details?.optionStats, votedId]);

  return model;
}

export function PollCard({
  poll,
  ctx,
  onOptionClick,
}: {
  poll: PollType;
  ctx: { displayIndex: number; total: number };
  onOptionClick?: (pollId: string, optionId: string, option: Option) => void;
  onCommentClick?: (pollId: string) => void;
  onShareClick?: (pollId: string) => void;
}) {
  const display = useVoteDisplay(poll);
  const votedId = display.votedId;

  const firstAsset = poll.details?.resourceAssets?.[0];
  const isImage = firstAsset?.type === "image";
  const isVideo = firstAsset?.type === "youtube";
  // Detect "just voted" (null -> someId). If we arrive with a vote already,
  // shouldAnimate stays false.
  const prevVotedId = useRef<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const voteSfxRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio("/poll.mp3"); // place file at public/sounds/vote.mp3
    a.preload = "auto";
    a.volume = 0.4;
    voteSfxRef.current = a;
    return () => {
      voteSfxRef.current = null;
    };
  }, []);
  function playVoteSfx() {
    const a = voteSfxRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      void a.play();
    } catch {}
  }
  useEffect(() => {
    const was = prevVotedId.current;
    const now = votedId;
    if (was === null && now) {
      setShouldAnimate(true);
    } else {
      setShouldAnimate(false);
    }
    prevVotedId.current = now;
  }, [votedId]);

  return (
    <div className="absolute inset-0 max-w-[36rem] md:mx-auto overflow-auto rounded-2xl border border-black/10 bg-white text-black shadow-2xl m-2">
      <div className="flex h-full flex-col p-5">
        <h2 className="mt-3 text- font-semibold leading-snug sm:text-lg">
          {poll.title}
        </h2>
        {poll.description && (
          <span className="mt-1 text-xs text-black/70 break-all">
            <RichTextPreview content={poll.description ?? ""} />
          </span>
        )}

        <EntityLinkings entityType="poll" entityId={poll._id} />
        {isImage && (
          <img
            src={firstAsset.value}
            alt={poll.title}
            className="mt-3 h-44 w-full rounded-xl border object-cover"
            draggable="false"
          />
        )}
        {isVideo && (
          <div className="mt-3 h-44 md:h-60 w-full overflow-hidden rounded-xl border">
            <LockedYouTube
              videoId={extractYouTubeId(firstAsset.value) ?? firstAsset.value}
              className="w-full h-full"
            />
          </div>
        )}

        {/* SAFE EDIT ZONE */}
        <div className="grid gap-2 flex-1 min-h-0 mt-4">
          {votedId ? (
            shouldAnimate ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="results-animated"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <ResultsUI rows={display.rows} animate />
                </motion.div>
              </AnimatePresence>
            ) : (
              <ResultsUI rows={display.rows} animate={false} />
            )
          ) : (
            <motion.div
              key="options-static"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <span className="text-[11px] text-black/70">Options :</span>
              <OptionsUI
                rows={display.rows}
                onOptionClick={(optionId) => {
                  playVoteSfx();
                  const opt = poll.options.find((o) => o._id === optionId)!;
                  onOptionClick?.(poll._id, optionId, opt);
                }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

type DisplayRow = {
  _id: string;
  label: string;
  value: string;
  isMine: boolean;
  count: number;
  pct: number;
};

function useCountUp(target: number, deps: React.DependencyList = []) {
  const mv = useMotionValue(0);
  const [value, setValue] = React.useState(0);

  useEffect(() => {
    const controls = animate(mv, target, {
      type: "spring",
      stiffness: 120,
      damping: 20,
      mass: 0.6,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, deps);

  return value;
}

const ResultsUI = React.memo(function ResultsUI({
  rows,
  animate: animateRows,
}: {
  rows: DisplayRow[];
  animate?: boolean;
}) {
  const playedRef = useRef(false);
  useEffect(() => {
    if (animateRows && !playedRef.current) {
      playedRef.current = true;
      try {
        const audio = new Audio(voteSfxUrl);
        audio.volume = 0.3;
        void audio.play();
      } catch {}
    }
  }, [animateRows]);

  if (!animateRows) {
    // STATIC (pre-voted load) — no motion, no count-up
    return (
      <div className="mt-5 grid gap-2">
        {rows.map((r) => (
          <div
            key={r._id}
            className={`w-full rounded-xl border py-3 px-4 border-black/15 bg-black/5 ${
              r.isMine ? "ring-1 ring-black/20" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-medium flex items-center gap-2">
                {r.label}
                {r.isMine && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/80 text-white">
                    You voted
                  </span>
                )}
              </div>
              <div className="text-[12px] tabular-nums">{r.pct}%</div>
            </div>
            <div className="mt-2 h-2 rounded bg-black/10 overflow-hidden">
              <div
                className="h-2 rounded"
                style={{ width: `${r.pct}%`, background: "black" }}
              />
            </div>
          </div>
        ))}
        <div className="text-[11px] text-black/50 mt-2">
          Results include your vote.
        </div>
      </div>
    );
  }

  // ANIMATED (just voted)
  return (
    <motion.div
      className="mt-5 grid gap-2"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {rows.map((r, idx) => (
        <motion.div
          key={r._id}
          className={`w-full rounded-xl border py-3 px-4 border-black/15 bg-black/5 ${
            r.isMine ? "ring-1 ring-black/20" : ""
          }`}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 18,
            delay: idx * 0.02,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-[13px] font-medium flex items-center gap-2">
              {r.label}
              {r.isMine && (
                <motion.span
                  className="text-[10px] px-1.5 py-0.5 rounded bg-black/80 text-white"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  You voted
                </motion.span>
              )}
            </div>
            <Percent value={r.pct} />
          </div>

          <div className="mt-2 h-2 rounded bg-black/10 overflow-hidden">
            <motion.div
              className="h-2 rounded"
              style={{ background: "black" }}
              initial={{ width: 0 }}
              animate={{ width: `${r.pct}%` }}
              transition={{
                type: "spring",
                stiffness: 160,
                damping: 20,
                mass: 0.7,
              }}
            />
          </div>
        </motion.div>
      ))}
      <div className="text-[11px] text-black/50 mt-2">
        Results include your vote.
      </div>
    </motion.div>
  );
});

function Percent({ value }: { value: number }) {
  const v = useCountUp(value, [value]);
  return <div className="text-[12px] tabular-nums">{v}%</div>;
}

const OptionsUI = React.memo(function OptionsUI({
  rows,
  onOptionClick,
}: {
  rows: DisplayRow[];
  onOptionClick: (optionId: string) => void;
}) {
  return (
    <div className="mt-2 grid gap-2">
      {rows.map((r) => (
        <motion.button
          key={r._id}
          className="w-full rounded-xl border py-3 px-4 text-left transition border-black/15 bg-black/5 hover:bg-black/10 active:bg-black/20"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOptionClick(r._id);
          }}
          whileHover={{ translateY: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="text-[13px] font-medium">{r.value}</div>
        </motion.button>
      ))}
    </div>
  );
});
