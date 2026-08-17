import { LedgerHistoryList } from "@/components/profile/LedgerHistoryList";
import { useNavigate } from "react-router-dom";

export default function RewardHistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F2F3F5]">
      <header className="sticky top-0 z-10 bg-[#F2F3F5]">
        <div className="flex items-center justify-between py-7 px-3">
          <button
            className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center"
            onClick={() => navigate("/profile")}
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <h1 className="text-[17px] md:text-2xl font-semibold">
            Reward History
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w- mx-auto px-3 pb-10">
        <LedgerHistoryList
          actions={["poll-reward", "trial-reward", "share-reward", "campaign-closure-settlement", "signup-bonus"]}
          emptyText="No rewards yet."
        />
      </main>
    </div>
  );
}
