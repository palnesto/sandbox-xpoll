import { useEffect } from "react";
import AddPollModal from "@/components/modals/add-poll-modal";
import AddTrailRewardsModal from "@/components/modals/add-reward-modal";
import type { TrailPoll, TrailReward } from "@/stores/create-campaign.store";
import type { RewardsForm } from "@/schema/create-user-poll";

export type TrailModalKey = "ADD_POLL" | "ADD_REWARD" | null;

export type TrailModalsProps = {
  active: TrailModalKey;
  onClose: () => void;
  onPollSaved: (poll: any) => void;
  onRewardsSaved: (v: {
    rewards: TrailReward[];
    expireRewardAt?: string;
  }) => void;
  rewardModalInit?: {
    initialRewards?: RewardsForm["rewards"];
  };
  initialPoll?: TrailPoll | null;
  mediaOnlyPoll?: boolean;
  pollMediaSaving?: boolean;
};

export default function TrailModals(props: TrailModalsProps) {
  const {
    active,
    onClose,
    onPollSaved,
    onRewardsSaved,
    rewardModalInit,
    initialPoll,
    mediaOnlyPoll = false,
    pollMediaSaving = false,
  } = props;
  const open = !!active;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-scroll"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {active === "ADD_POLL" ? (
        <AddPollModal
          onClose={onClose}
          onSaved={onPollSaved}
          initialPoll={initialPoll ?? undefined}
          mediaOnly={mediaOnlyPoll}
          saving={pollMediaSaving}
        />
      ) : (
        <AddTrailRewardsModal
          onClose={onClose}
          onSaved={onRewardsSaved}
          initialRewards={rewardModalInit?.initialRewards}
        />
      )}
    </div>
  );
}
