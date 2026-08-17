// import { useLocation, useNavigate } from "react-router-dom";
// import type { Poll } from "@/components/polling/cards";
// import SummaryBase from "@/components/polling/PollSummaryBase";

// export default function NormalPollSummary() {
//   const nav = useNavigate();
//   const { state } = useLocation() as {
//     state?: { items: Poll[]; answers: Record<string, number> };
//   };

//   if (!state?.items) {
//     return (
//       <div className="min-h-screen grid place-items-center text-white">
//         <div className="space-y-3 text-center">
//           <div>No summary data.</div>
//           <button
//             onClick={() => nav("/polling")}
//             className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
//           >
//             Back to Normal Poll
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <SummaryBase
//       title="Normal Poll Summary"
//       items={state.items}
//       answers={state.answers}
//     />
//   );
// }

// new version
import { useLocation, useNavigate } from "react-router-dom";
import PollSummaryBase from "@/components/polling/PollSummaryBase";
import type { PollType } from "@/components/polling/types";

export default function NormalPollSummary() {
  const nav = useNavigate();
  const { state } = useLocation() as {
    state?: { items: PollType[]; answers: Record<string, string> };
  };

  if (!state?.items) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="space-y-3 text-center">
          <div>No summary data.</div>
          <button
            onClick={() => nav("/polling")}
            className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
          >
            Back to Normal Poll
          </button>
        </div>
      </div>
    );
  }

  return (
    <PollSummaryBase
      title="Normal Poll Summary"
      items={state.items}
      answers={state.answers}
    />
  );
}
