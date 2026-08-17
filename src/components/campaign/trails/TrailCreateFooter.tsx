import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

export function TrailCreateFooter({
  onViewAllTrails,
  onSaveTrail,
  canEdit,
  busy,
  formInvalid,
  isSubmitting,
  saveButtonLabel = "SAVE TRAIL",
  secondaryButtonLabel,
  onSecondaryClick,
  secondaryButtonAlwaysEnabled,
  secondaryButtonBusy,
  saveButtonIgnoreInvalid,
  hidePrimaryButton,
  hideOverviewMessage = false,
}: {
  onViewAllTrails: () => void;
  onSaveTrail: () => void;
  canEdit: boolean;
  busy: boolean;
  formInvalid: boolean;
  isSubmitting: boolean;
  saveButtonLabel?: string;
  secondaryButtonLabel?: string;
  onSecondaryClick?: () => void;
  secondaryButtonAlwaysEnabled?: boolean;
  secondaryButtonBusy?: boolean;
  saveButtonIgnoreInvalid?: boolean;
  /** When true, primary (Save) button is not rendered (e.g. when Save is in the page header) */
  hidePrimaryButton?: boolean;
  /** When true, hide "To save draft or to publish go to overview dashboard" (e.g. standalone trails) */
  hideOverviewMessage?: boolean;
}) {
  const secondaryDisabled = secondaryButtonAlwaysEnabled
    ? busy
    : !canEdit || busy || formInvalid || isSubmitting;
  const primaryBusy = isSubmitting || (busy && !secondaryButtonBusy);
  const secondaryLabel = secondaryButtonBusy ? "Loading" : secondaryButtonLabel;
  const primaryDisabled = saveButtonIgnoreInvalid
    ? !canEdit || isSubmitting
    : !canEdit || busy || formInvalid || isSubmitting;
  return (
    <footer className="mt-6 flex items-center justify-between">
      {!hideOverviewMessage && (
        <div className="flex items-center gap-2 font-medium text-[#ED0C1D]">
          <TriangleAlert className="h-4 w-4" />
          <span>To save draft or to publish go to overview dashboard</span>
        </div>
      )}

      <div className={cn("flex items-center gap-3", !hideOverviewMessage && "flex-1 justify-end")}>
        <button
          type="button"
          onClick={onViewAllTrails}
          className="min-w-[200px] rounded-full border border-[#24B3B3] text-[#24B3B3] bg-[#E8FBFB] px-6 py-3 font-semibold tracking-wide"
        >
          VIEW ALL TRAILS
        </button>

        {secondaryButtonLabel && onSecondaryClick && (
          <button
            type="button"
            onClick={onSecondaryClick}
            disabled={secondaryDisabled}
            className={cn(
              "min-w-[160px] rounded-full border border-[#24B3B3] text-[#24B3B3] bg-[#E8FBFB] px-6 py-3 font-semibold tracking-wide",
              secondaryDisabled && "opacity-70 cursor-not-allowed",
            )}
          >
            {secondaryLabel}
          </button>
        )}

        {!hidePrimaryButton && (
          <button
            type="button"
            onClick={onSaveTrail}
            disabled={primaryDisabled}
            className={cn(
              "min-w-[180px] rounded-full bg-[#0EA5A5] text-white px-6 py-3 font-semibold tracking-wide",
              primaryDisabled
                ? "opacity-70 cursor-not-allowed"
                : "",
            )}
          >
            {primaryBusy ? "SAVING..." : saveButtonLabel}
          </button>
        )}
      </div>
    </footer>
  );
}
