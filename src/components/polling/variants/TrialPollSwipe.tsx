import PollSwipe, { PollSwipeProps } from "../PollSwipe";

/** Trial poll: must answer to go next, cannot change answer, past cards read-only */
export type TrialPollSwipeProps = Omit<
  PollSwipeProps,
  "requireAnswerToAdvance" | "lockSelectionOnceChosen" | "lockPastAnswers"
>;

export default function TrialPollSwipe(props: TrialPollSwipeProps) {
  return (
    <PollSwipe
      {...props}
      requireAnswerToAdvance={true}
      lockSelectionOnceChosen={true}
      lockPastAnswers={true}
    />
  );
}
