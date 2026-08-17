import { useRef } from "react";
import { Base, BaseProps } from "@/components/swipe/Base";
import type { PollType } from "./types";
import { RichTextPreview } from "../commons/editor/preview";

type SelectedMap = Record<string, string>; // pollId -> optionId

export type PollSwipeProps = Omit<BaseProps<PollType>, "ui" | "renderItem"> & {
  /** selection from parent (store or local) */
  selectedMap?: SelectedMap;

  /** selection handler (called immediately on click) */
  onOptionClick: (
    pollId: string,
    optionId: string,
    absoluteIndex: number
  ) => void;

  /** behavior toggles (parent decides – e.g., Trial vs Standalone) */
  requireAnswerToAdvance?: boolean;
  lockSelectionOnceChosen?: boolean;
  lockPastAnswers?: boolean;

  /** styling hooks */
  cardClassName?: string;
};

export default function PollSwipe({
  selectedMap,
  onOptionClick,
  requireAnswerToAdvance = false,
  lockSelectionOnceChosen = false,
  lockPastAnswers = false,
  cardClassName,
  ...baseProps
}: PollSwipeProps) {
  // keep “just-clicked” answers visible before external state/store finishes
  const pendingRef = useRef<SelectedMap>({});

  const getSelectedFor = (pollId: string | undefined | null): string | null => {
    if (!pollId) return null;
    return (
      pendingRef.current[pollId] ??
      (selectedMap && selectedMap[pollId] != null ? selectedMap[pollId] : null)
    );
  };

  // Gate next move here if required
  const onAttemptNext = async (ctx: {
    index: number;
    total: number;
    item?: PollType;
  }) => {
    if (!requireAnswerToAdvance) return ctx.index < ctx.total - 1;
    if (!ctx.item) return false;
    const sel = getSelectedFor(ctx.item.id);
    return sel != null && ctx.index < ctx.total - 1;
  };

  // Allow previous as long as > 0 (parent can override by also passing baseProps.onAttemptPrev)
  const onAttemptPrev =
    baseProps.onAttemptPrev ?? ((ctx: { index: number }) => ctx.index > 0);

  return (
    <Base<PollType>
      {...baseProps}
      onAttemptNext={baseProps.onAttemptNext ?? onAttemptNext}
      onAttemptPrev={onAttemptPrev}
      renderItem={({ item, indexFromTop, displayIndex, total }) => {
        const abs = (baseProps.currIdx ?? 0) + indexFromTop;
        const selectedOptionId = getSelectedFor(item.id);
        const chosen = selectedOptionId != null;

        const optionsLocked =
          (lockPastAnswers && abs < (baseProps.currIdx ?? 0)) ||
          (lockSelectionOnceChosen && chosen);

        const scale = 1 - Math.min(0.04 * indexFromTop, 0.12);
        const translateY = 6 * indexFromTop;

        return (
          <div
            className={
              cardClassName ??
              "absolute inset-0 rounded-2xl bg-neutral-900 text-white shadow-2xl border border-white/10 overflow-hidden"
            }
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              transition: "transform 220ms ease",
            }}
          >
            <div className="p-5 flex flex-col h-full">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-widest text-white/60">
                  Poll {displayIndex} / {total}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold mt-3 leading-snug">
                {item.title}
              </h2>
              {item.description ? (
                <p className="text-white/70 text-sm mt-1">
                  <RichTextPreview content={item.description ?? ""} />
                </p>
              ) : null}

              <div className="mt-5 grid gap-2">
                {item.options.map((opt) => {
                  const active = selectedOptionId === opt._id;
                  return (
                    <button
                      key={opt._id}
                      data-no-drag
                      disabled={optionsLocked}
                      onClick={() => {
                        // if locked because already chosen (trial), do nothing
                        if (optionsLocked) return;
                        // write pending immediately for instant gating
                        pendingRef.current[item.id] = opt._id;
                        onOptionClick(item.id, opt._id, abs);
                      }}
                      className={[
                        "w-full rounded-xl border py-3 px-4 text-left transition",
                        active
                          ? "border-emerald-400/70 bg-emerald-400/10"
                          : "border-white/15 bg-white/5 hover:bg-white/10 active:bg-white/20",
                        optionsLocked ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-6 text-[11px] text-white/50">
                Swipe right/left • Tap an option to select
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
