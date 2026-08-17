// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { Poll, PollCard, SwipeableCard, SwipeDir, SwipeHandle } from "./cards";

// export type BasePollItem = Poll & { description?: string };

// export type ItemRenderProps = {
//   poll: BasePollItem;
//   indexFromTop: number;
//   displayIndex: number;
//   total: number;
//   selectedIndex: number | null;
//   onSelect: (optionIdx: number) => void;
//   optionsLocked: boolean;
// };

// export type PollBaseControls = {
//   index: number;
//   total: number;
//   canPrev: boolean;
//   canNext: boolean;
//   requestPrev: () => Promise<boolean>;
//   requestNext: () => Promise<boolean>;
// };

// type AttemptCtx = {
//   index: number;
//   total: number;
//   poll: BasePollItem | undefined;
//   selectedIndex: number | null;
//   answers: Record<string, number>;
// };

// export type PollBaseProps = {
//   arr: BasePollItem[];

//   enablePrev?: boolean;
//   enableNext?: boolean;

//   /** Trial behavior knobs */
//   lockSelectionOnceChosen?: boolean;
//   lockPastAnswers?: boolean;

//   /** controlled index (supports alias currIdx) */
//   index?: number;
//   currIdx?: number;
//   onIndexChange?: (next: number) => void;

//   /** controlled answers */
//   selectedMap?: Record<string, number>;
//   onOptionSelect?: (
//     pollId: string,
//     optionIndex: number,
//     absoluteIndex: number
//   ) => void;

//   /** gating handlers — page decides if a move is allowed */
//   onAttemptNext?: (ctx: AttemptCtx) => boolean | Promise<boolean>;
//   onAttemptPrev?: (ctx: AttemptCtx) => boolean | Promise<boolean>;

//   controlsRef?: React.MutableRefObject<PollBaseControls | null>;

//   renderItem?: (props: ItemRenderProps) => React.ReactNode;

//   onNext?: (nextIdx: number) => void;
//   onPrev?: (prevIdx: number) => void;

//   className?: string;
// };

// export function PollBase({
//   arr,
//   enablePrev = true,
//   enableNext = true,
//   lockSelectionOnceChosen = false,
//   lockPastAnswers = false,
//   index,
//   currIdx,
//   onIndexChange,
//   selectedMap,
//   onOptionSelect,
//   onAttemptNext,
//   onAttemptPrev,
//   controlsRef,
//   renderItem,
//   onNext,
//   onPrev,
//   className,
// }: PollBaseProps) {
//   const total = arr.length;

//   // ---------- controlled/uncontrolled index ----------
//   const controlledIdx = typeof currIdx === "number" ? currIdx : index;
//   const isControlled = typeof controlledIdx === "number";
//   const [internalIdx, setInternalIdx] = useState(0);
//   useEffect(() => {
//     if (isControlled) setInternalIdx(controlledIdx!);
//   }, [isControlled, controlledIdx]);
//   const idx = isControlled ? (controlledIdx as number) : internalIdx;
//   const setIndex = (next: number) => {
//     if (isControlled) onIndexChange?.(next);
//     else setInternalIdx(next);
//   };

//   const active = arr[idx];

//   // ---------- answers (controlled/uncontrolled) ----------
//   const [localSel, setLocalSel] = useState<Record<string, number>>({});
//   const answers = selectedMap ?? localSel;

//   // IMPORTANT: capture the most recent selection immediately (for same-tick button presses)
//   const lastSelRef = useRef<Record<string, number>>({});
//   const getEffectiveSelected = (pollId?: string | null): number | null => {
//     if (!pollId) return null;
//     const fromProps = answers[pollId];
//     if (fromProps != null) return Number(fromProps);
//     const fromRef = lastSelRef.current[pollId];
//     return fromRef != null ? Number(fromRef) : null;
//   };
//   const currentSelected = getEffectiveSelected(active?.id);

//   const canPrev = enablePrev && idx > 0;
//   const canNext = enableNext && idx < total - 1;

//   // ---------- swipe plumbing ----------
//   const topCardRef = useRef<SwipeHandle | null>(null);
//   const [restoreFrom, setRestoreFrom] = useState<SwipeDir | null>(null);
//   const [lock, setLock] = useState(false);

//   const setSelected = (pollId: string, optionIdx: number, absIndex: number) => {
//     const already = answers[pollId] != null;
//     const lockedForThisPoll = lockSelectionOnceChosen && already;
//     if (lockedForThisPoll) return; // trial: cannot change once chosen

//     // remember immediately
//     lastSelRef.current[pollId] = optionIdx;

//     if (!selectedMap) {
//       setLocalSel((m) =>
//         m[pollId] === optionIdx ? m : { ...m, [pollId]: optionIdx }
//       );
//     }
//     onOptionSelect?.(pollId, optionIdx, absIndex);
//   };

//   const isOptionsLocked = (absIndex: number, pollId: string) => {
//     if (lockPastAnswers && absIndex < idx) return true;
//     if (lockSelectionOnceChosen && answers[pollId] != null) return true;
//     return false;
//   };

//   const makeCtx = (): AttemptCtx => ({
//     index: idx,
//     total,
//     poll: active,
//     selectedIndex: getEffectiveSelected(active?.id),
//     answers,
//   });

//   const attempt = async (dir: SwipeDir): Promise<boolean> => {
//     const ctx = makeCtx();
//     if (dir === "left") {
//       if (!canNext) return false;
//       return (await onAttemptNext?.(ctx)) ?? true;
//     } else {
//       if (!canPrev) return false;
//       return (await onAttemptPrev?.(ctx)) ?? true;
//     }
//   };

//   // programmatic (buttons)
//   const requestPrev = async (): Promise<boolean> => {
//     const ok = await attempt("right");
//     if (!ok) {
//       setRestoreFrom("right");
//       return false;
//     }
//     topCardRef.current?.swipe("right");
//     return true;
//   };
//   const requestNext = async (): Promise<boolean> => {
//     const ok = await attempt("left");
//     if (!ok) {
//       setRestoreFrom("left");
//       return false;
//     }
//     topCardRef.current?.swipe("left");
//     return true;
//   };

//   // gestures (already animated by SwipeableCard)
//   const onSwiped = async (dir: SwipeDir) => {
//     if (lock) return;
//     setLock(true);

//     const ok = await attempt(dir);
//     if (!ok) {
//       setRestoreFrom(dir);
//       setLock(false);
//       return;
//     }

//     if (dir === "left") {
//       const next = Math.min(idx + 1, total - 1);
//       if (next !== idx) {
//         setIndex(next);
//         onNext?.(next);
//       }
//     } else {
//       const prev = Math.max(idx - 1, 0);
//       if (prev !== idx) {
//         setIndex(prev);
//         onPrev?.(prev);
//       }
//     }
//     requestAnimationFrame(() => setLock(false));
//   };

//   const onRestoreEnd = () => {
//     setLock(false);
//     setRestoreFrom(null);
//   };

//   useEffect(() => {
//     if (!controlsRef) return;
//     controlsRef.current = {
//       index: idx,
//       total,
//       canPrev,
//       canNext,
//       requestPrev,
//       requestNext,
//     };
//   }, [controlsRef, idx, total, canPrev, canNext]); // eslint-disable-line

//   const windowCards = useMemo(() => {
//     const end = Math.min(total, idx + 3);
//     return arr.slice(idx, end).map((p, i) => ({ poll: p, stackIndex: i }));
//   }, [arr, idx, total]);

//   return (
//     <div className={className}>
//       <div className="relative h-[520px]">
//         {!active ? (
//           <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-white/5">
//             <div className="text-center">
//               <div className="text-xl font-semibold">No more polls</div>
//               <div className="text-white/60 mt-1 text-sm">
//                 You’ve reached the end.
//               </div>
//             </div>
//           </div>
//         ) : (
//           windowCards
//             .slice()
//             .reverse()
//             .map(({ poll, stackIndex }) => {
//               const abs = idx + stackIndex;
//               const selectedIndex = getEffectiveSelected(poll.id);
//               const locked = isOptionsLocked(abs, poll.id);

//               const card = renderItem?.({
//                 poll,
//                 indexFromTop: stackIndex,
//                 displayIndex: abs + 1,
//                 total,
//                 selectedIndex,
//                 onSelect: (optIdx) => setSelected(poll.id, optIdx, abs),
//                 optionsLocked: locked,
//               }) ?? (
//                 <PollCard
//                   poll={poll}
//                   indexFromTop={stackIndex}
//                   displayIndex={abs + 1}
//                   total={total}
//                   onOptionClick={(optIdx) => setSelected(poll.id, optIdx, abs)}
//                   selectedIndex={selectedIndex}
//                   optionsLocked={locked}
//                 />
//               );

//               const isTop = stackIndex === 0;
//               return isTop ? (
//                 <SwipeableCard
//                   key={poll.id}
//                   onSwiped={onSwiped}
//                   disabled={lock}
//                   restoreFrom={restoreFrom}
//                   onRestoreEnd={onRestoreEnd}
//                   externalRef={topCardRef}
//                 >
//                   {card}
//                 </SwipeableCard>
//               ) : (
//                 <div
//                   key={poll.id}
//                   className="absolute inset-0 pointer-events-none"
//                 >
//                   {card}
//                 </div>
//               );
//             })
//         )}
//       </div>
//     </div>
//   );
// }
