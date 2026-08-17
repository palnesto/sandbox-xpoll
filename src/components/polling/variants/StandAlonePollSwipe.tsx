import PollSwipe, { PollSwipeProps } from "../PollSwipe";

/** Normal poll: skipping allowed, can change choices */
export type StandAlonePollSwipeProps = Omit<
  PollSwipeProps,
  "requireAnswerToAdvance" | "lockSelectionOnceChosen" | "lockPastAnswers"
>;

export default function StandAlonePollSwipe(props: StandAlonePollSwipeProps) {
  return (
    <PollSwipe
      {...props}
      requireAnswerToAdvance={false}
      lockSelectionOnceChosen={false}
      lockPastAnswers={false}
    />
  );
}
