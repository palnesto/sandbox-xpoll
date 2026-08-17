// import type { Poll } from "./cards";

// export default function SummaryBase({
//   items,
//   answers,
//   title,
// }: {
//   items: Poll[];
//   answers: Record<string, number>;
//   title: string;
// }) {
//   return (
//     <div className="min-h-screen w-full text-white flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         <header className="mb-4">
//           <h1 className="text-lg font-semibold">{title}</h1>
//           <p className="text-sm text-white/60">Here’s what you selected.</p>
//         </header>

//         <div className="space-y-3">
//           {items.map((p, idx) => {
//             const ansIdx = answers[p.id];
//             return (
//               <div
//                 key={p.id}
//                 className="rounded-xl border border-white/15 bg-white/5 p-4"
//               >
//                 <div className="text-xs text-white/60 mb-1">
//                   Poll {idx + 1} / {items.length}
//                 </div>
//                 <div className="font-medium">{p.question}</div>
//                 <div className="mt-2 text-sm">
//                   {ansIdx != null ? (
//                     <span className="text-emerald-300">
//                       Your answer: {p.options[ansIdx]}
//                     </span>
//                   ) : (
//                     <span className="text-white/50 italic">No answer</span>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

// new version
import type { PollType } from "./types";

export default function PollSummaryBase({
  items,
  answers, // pollId -> optionId
  title,
}: {
  items: PollType[];
  answers: Record<string, string>;
  title: string;
}) {
  return (
    <div className="min-h-screen w-full text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-white/60">Here’s what you selected.</p>
        </header>

        <div className="space-y-3">
          {items.map((p, idx) => {
            const ansId = answers[p.id];
            const selected = p.options.find((o) => o._id === ansId);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-white/15 bg-white/5 p-4"
              >
                <div className="text-xs text-white/60 mb-1">
                  Poll {idx + 1} / {items.length}
                </div>
                <div className="font-medium">{p.title}</div>
                <div className="mt-2 text-sm">
                  {selected ? (
                    <span className="text-emerald-300">
                      Your answer: {selected.label}
                    </span>
                  ) : (
                    <span className="text-white/50 italic">No answer</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
