// import {
//   DEMO_POLLS,
//   PollCard,
//   SwipeableCard,
//   useCountdown,
// } from "@/components/polling/cards";
// import { useCallback, useEffect, useState } from "react";

// const Polling = () => {
//   // Replace DEMO_POLLS with your fetched data
//   const [polls, setPolls] = useState<Poll[]>(DEMO_POLLS);
//   const [topIndex, setTopIndex] = useState(0); // index of current top card in `polls`
//   const [lockSwipe, setLockSwipe] = useState(false); // ensures only one card is swiped at a time

//   const activePoll = polls[topIndex];

//   // Detect "active poll when that poll comes into the view"
//   useEffect(() => {
//     if (!activePoll) return;
//     // Here you can notify your analytics or store that this poll is active
//     // e.g., send an event or set a global state
//     console.log("Active poll:", activePoll.id);
//   }, [activePoll?.id]);

//   // Timer hook for the active card only
//   const { remaining, progress, reset } = useCountdown(
//     activePoll?.durationSec ?? 0,
//     Boolean(activePoll),
//     () => {
//       // Auto-skip when time is up
//       if (!lockSwipe) handleSwiped("left");
//     }
//   );

//   const handleVote = useCallback(
//     (optionIdx: number) => {
//       if (!activePoll) return;
//       if (lockSwipe) return;
//       setLockSwipe(true);
//       // TODO: post vote to server here
//       console.log("Voted", { pollId: activePoll.id, optionIdx });
//       // After vote, advance to next card
//       setTimeout(() => {
//         setTopIndex((i) => i + 1);
//         setLockSwipe(false);
//       }, 160);
//     },
//     [activePoll, lockSwipe]
//   );

//   const handleSwiped = useCallback(
//     (dir: "left" | "right") => {
//       if (lockSwipe) return;
//       setLockSwipe(true);
//       // Optionally log skip direction
//       console.log("Skipped", { pollId: activePoll?.id, dir });
//       setTimeout(() => {
//         setTopIndex((i) => i + 1);
//         setLockSwipe(false);
//       }, 120);
//     },
//     [activePoll?.id, lockSwipe]
//   );

//   // Reset timer whenever the active poll changes
//   useEffect(() => {
//     if (activePoll) reset(activePoll.durationSec);
//   }, [activePoll?.id]);

//   const deckOver = topIndex >= polls.length;

//   return (
//     <div className="min-h-screen w-full bg-neutral-950 text-white flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         <header className="mb-4">
//           <h1 className="text-lg font-semibold">Polling</h1>
//           <p className="text-sm text-white/60">
//             One poll at a time • Tinder-style cards
//           </p>
//         </header>

//         <div className="relative h-[320px]">
//           {deckOver ? (
//             <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-white/5">
//               <div className="text-center">
//                 <div className="text-xl font-semibold">No more polls</div>
//                 <div className="text-white/60 mt-1 text-sm">
//                   Come back later for new ones.
//                 </div>
//               </div>
//             </div>
//           ) : (
//             // Render a small stack (up to 3 cards for perf)
//             polls
//               .slice(topIndex, Math.min(polls.length, topIndex + 3))
//               .map((p, i) => {
//                 const indexFromTop = i; // 0 = top
//                 const isTop = indexFromTop === 0;

//                 const card = (
//                   <PollCard
//                     key={p.id}
//                     poll={p}
//                     indexFromTop={indexFromTop}
//                     total={polls.length}
//                     progress={isTop ? progress : 0}
//                     remaining={isTop ? remaining : p.durationSec}
//                     onOptionClick={isTop ? handleVote : undefined}
//                   />
//                 );

//                 return isTop ? (
//                   <SwipeableCard
//                     key={p.id}
//                     onSwiped={handleSwiped}
//                     disabled={lockSwipe}
//                   >
//                     {card}
//                   </SwipeableCard>
//                 ) : (
//                   <div
//                     key={p.id}
//                     className="absolute inset-0 pointer-events-none"
//                   >
//                     {card}
//                   </div>
//                 );
//               })
//           )}
//         </div>

//         {/* Actions (optional) */}
//         {!deckOver && (
//           <div className="mt-4 flex items-center justify-center gap-3">
//             <button
//               onClick={() => !lockSwipe && handleSwiped("left")}
//               className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
//               disabled={lockSwipe}
//             >
//               Skip Left
//             </button>
//             <button
//               onClick={() => !lockSwipe && handleSwiped("right")}
//               className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
//               disabled={lockSwipe}
//             >
//               Skip Right
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Polling;
// import {
//   DEMO_POLLS,
//   PollCard,
//   SwipeableCard,
// } from "@/components/polling/cards";
// import type { Poll } from "@/components/polling/cards";
// import { useCallback, useEffect, useState } from "react";

// type Dir = "left" | "right";

// const Polling = () => {
//   const [polls] = useState<Poll[]>(DEMO_POLLS);

//   // index of current top card in `polls`
//   const [topIndex, setTopIndex] = useState(0);

//   // ensures only one action (swipe/restore) at a time
//   const [lock, setLock] = useState(false);

//   // history of swipes for Undo (stack)
//   const [history, setHistory] = useState<Array<{ id: string; dir: Dir }>>([]);

//   // when undoing, we animate the restored card from this direction
//   const [restoreFrom, setRestoreFrom] = useState<Dir | null>(null);

//   const activePoll = polls[topIndex];
//   const deckOver = topIndex >= polls.length;

//   // Timestamp when a poll becomes active (top)
//   useEffect(() => {
//     if (!activePoll) return;
//     const ts = new Date().toISOString();
//     console.log(`Active poll ${activePoll.id} entered at ${ts}`);
//   }, [activePoll?.id]);

//   const handleVote = useCallback(
//     (optionIdx: number) => {
//       if (!activePoll || lock) return;
//       setLock(true);
//       // TODO: post vote to server here
//       console.log("Voted", { pollId: activePoll.id, optionIdx });
//       // auto-advance (treat like a right swipe, or choose what you want)
//       setTimeout(() => {
//         setHistory((h) => [...h, { id: activePoll.id, dir: "right" }]);
//         setTopIndex((i) => i + 1);
//         setLock(false);
//       }, 160);
//     },
//     [activePoll, lock]
//   );

//   const handleSwiped = useCallback(
//     (dir: Dir) => {
//       if (lock) return;
//       // record for undo
//       if (activePoll) {
//         setHistory((h) => [...h, { id: activePoll.id, dir }]);
//       }
//       // advance
//       setTopIndex((i) => i + 1);
//     },
//     [activePoll, lock]
//   );

//   const undo = useCallback(() => {
//     if (lock) return;
//     if (history.length === 0 || topIndex === 0) return;

//     const last = history[history.length - 1];
//     setLock(true);
//     setRestoreFrom(last.dir); // animate back from same direction

//     // move deck back one
//     setTopIndex((i) => Math.max(0, i - 1));
//     setHistory((h) => h.slice(0, -1));
//   }, [history, topIndex, lock]);

//   // Clear lock after "restore" animation completes
//   const onRestoreEnd = useCallback(() => {
//     setRestoreFrom(null);
//     setLock(false);
//   }, []);

//   return (
//     <div className="min-h-screen w-full bg-neutral-950 text-white flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         <header className="mb-4">
//           <h1 className="text-lg font-semibold">Polling</h1>
//           <p className="text-sm text-white/60">
//             One poll at a time • Tinder-style cards
//           </p>
//         </header>

//         <div className="relative h-[520px]">
//           {deckOver ? (
//             <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-white/5">
//               <div className="text-center">
//                 <div className="text-xl font-semibold">No more polls</div>
//                 <div className="text-white/60 mt-1 text-sm">
//                   Come back later for new ones.
//                 </div>
//               </div>
//             </div>
//           ) : (
//             // Render a small stack (up to 3 cards for perf), bottom-first so top card is last in DOM
//             (() => {
//               const windowCards = polls
//                 .slice(topIndex, Math.min(polls.length, topIndex + 3))
//                 .map((p, i) => ({ p, stackIndex: i })); // 0 = top

//               return windowCards
//                 .slice()
//                 .reverse()
//                 .map(({ p, stackIndex }) => {
//                   const isTop = stackIndex === 0;
//                   const displayIndex = topIndex + stackIndex + 1;

//                   const card = (
//                     <PollCard
//                       poll={p}
//                       indexFromTop={stackIndex}
//                       displayIndex={displayIndex}
//                       total={polls.length}
//                       onOptionClick={isTop ? handleVote : undefined}
//                     />
//                   );

//                   return isTop ? (
//                     <SwipeableCard
//                       key={p.id}
//                       onSwiped={handleSwiped}
//                       disabled={lock}
//                       restoreFrom={restoreFrom}
//                       onRestoreEnd={onRestoreEnd}
//                     >
//                       {card}
//                     </SwipeableCard>
//                   ) : (
//                     <div
//                       key={p.id}
//                       className="absolute inset-0 pointer-events-none"
//                     >
//                       {card}
//                     </div>
//                   );
//                 });
//             })()
//           )}
//         </div>

//         {/* Actions */}
//         <div className="mt-4 flex items-center justify-center gap-3">
//           {!deckOver && (
//             <>
//               <button
//                 onClick={() => !lock && handleSwiped("left")}
//                 className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
//                 disabled={lock}
//               >
//                 Skip Left
//               </button>
//               <button
//                 onClick={() => !lock && handleSwiped("right")}
//                 className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
//                 disabled={lock}
//               >
//                 Skip Right
//               </button>
//             </>
//           )}

//           <button
//             onClick={undo}
//             className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
//             disabled={lock || history.length === 0 || topIndex === 0}
//           >
//             Undo
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Polling;

// import { useCallback, useEffect, useState } from "react";

// type Dir = "left" | "right";

// function generateMorePolls(startAt: number, count = 10): Poll[] {
//   return Array.from({ length: count }, (_, i) => {
//     const n = startAt + i + 1;
//     return {
//       id: `auto-${Date.now()}-${n}-${Math.random().toString(36).slice(2, 7)}`,
//       question: `Generated poll #${n}: pick one`,
//       options: ["Option A", "Option B", "Option C"],
//       durationSec: 12,
//     };
//   });
// }

// const Polling = () => {
//   const [polls, setPolls] = useState<Poll[]>(DEMO_POLLS);

//   // index of current top card in `polls`
//   const [topIndex, setTopIndex] = useState(0);

//   // ensures only one action (swipe/restore) at a time
//   const [lock, setLock] = useState(false);

//   // history of swipes for Undo (stack)
//   const [history, setHistory] = useState<Array<{ id: string; dir: Dir }>>([]);

//   // when undoing, we animate the restored card from this direction
//   const [restoreFrom, setRestoreFrom] = useState<Dir | null>(null);

//   const activePoll = polls[topIndex];
//   const deckOver = topIndex >= polls.length;

//   // Timestamp when a poll becomes active (top)
//   useEffect(() => {
//     if (!activePoll) return;
//     const ts = new Date().toISOString();
//     console.log(`Active poll ${activePoll.id} entered at ${ts}`);
//   }, [activePoll?.id]);

//   const handleVote = useCallback(
//     (optionIdx: number) => {
//       if (!activePoll || lock) return;
//       setLock(true);
//       // TODO: post vote to server here
//       console.log("Voted", { pollId: activePoll.id, optionIdx });
//       // auto-advance (treat like a right swipe, or choose what you want)
//       setTimeout(() => {
//         setHistory((h) => [...h, { id: activePoll.id, dir: "right" }]);
//         setTopIndex((i) => i + 1);
//         setLock(false);
//       }, 160);
//     },
//     [activePoll, lock]
//   );

//   const handleSwiped = useCallback(
//     (dir: Dir) => {
//       if (lock) return;
//       if (activePoll) {
//         setHistory((h) => [...h, { id: activePoll.id, dir }]);
//       }
//       setTopIndex((i) => i + 1);
//     },
//     [activePoll, lock]
//   );

//   const undo = useCallback(() => {
//     if (lock) return;
//     if (history.length === 0 || topIndex === 0) return;

//     const last = history[history.length - 1];
//     setLock(true);
//     setRestoreFrom(last.dir); // animate back from same direction

//     setTopIndex((i) => Math.max(0, i - 1));
//     setHistory((h) => h.slice(0, -1));
//   }, [history, topIndex, lock]);

//   // Clear lock after "restore" animation completes
//   const onRestoreEnd = useCallback(() => {
//     setRestoreFrom(null);
//     setLock(false);
//   }, []);

//   const addTenPolls = useCallback(() => {
//     // avoid doing it mid-animation just to keep UX clean
//     if (lock) return;
//     setPolls((prev) => [...prev, ...generateMorePolls(prev.length, 10)]);
//   }, [lock]);

//   return (
//     <div className="min-h-screen w-full text-white flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         <header className="mb-4">
//           <h1 className="text-lg font-semibold">Polling</h1>
//           <p className="text-sm text-white/60">
//             One poll at a time • Tinder-style cards
//           </p>
//         </header>

//         <div className="relative h-[520px]">
//           {deckOver ? (
//             <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-white/5">
//               <div className="text-center">
//                 <div className="text-xl font-semibold">No more polls</div>
//                 <div className="text-white/60 mt-1 text-sm">
//                   Come back later for new ones — or add more now.
//                 </div>
//               </div>
//             </div>
//           ) : (
//             // Render a small stack (up to 3 cards for perf), bottom-first so top card is last in DOM
//             (() => {
//               const windowCards = polls
//                 .slice(topIndex, Math.min(polls.length, topIndex + 3))
//                 .map((p, i) => ({ p, stackIndex: i })); // 0 = top

//               return windowCards
//                 .slice()
//                 .reverse()
//                 .map(({ p, stackIndex }) => {
//                   const isTop = stackIndex === 0;
//                   const displayIndex = topIndex + stackIndex + 1;

//                   const card = (
//                     <PollCard
//                       poll={p}
//                       indexFromTop={stackIndex}
//                       displayIndex={displayIndex}
//                       total={polls.length}
//                       onOptionClick={isTop ? handleVote : undefined}
//                     />
//                   );

//                   return isTop ? (
//                     <SwipeableCard
//                       key={p.id}
//                       onSwiped={handleSwiped}
//                       disabled={lock}
//                       restoreFrom={restoreFrom}
//                       onRestoreEnd={onRestoreEnd}
//                     >
//                       {card}
//                     </SwipeableCard>
//                   ) : (
//                     <div
//                       key={p.id}
//                       className="absolute inset-0 pointer-events-none"
//                     >
//                       {card}
//                     </div>
//                   );
//                 });
//             })()
//           )}
//         </div>

//         {/* Actions */}
//         <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
//           {!deckOver && (
//             <>
//               <button
//                 onClick={() => !lock && handleSwiped("left")}
//                 className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
//                 disabled={lock}
//               >
//                 Skip Left
//               </button>
//               <button
//                 onClick={() => !lock && handleSwiped("right")}
//                 className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
//                 disabled={lock}
//               >
//                 Skip Right
//               </button>
//             </>
//           )}

//           <button
//             onClick={undo}
//             className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
//             disabled={lock || history.length === 0 || topIndex === 0}
//           >
//             Undo
//           </button>

//           <button
//             onClick={addTenPolls}
//             className="px-4 py-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50"
//             disabled={lock}
//           >
//             Add 10 polls
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Polling;
