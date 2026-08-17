import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommonButton from "@/components/commons/CommonButton";

type TrialAccessBlockedProps = {
  message: string;
  onBackToTrials: () => void;
  onGoHome?: () => void;
};

export default function TrialAccessBlocked({
  message,
  onBackToTrials,
  onGoHome,
}: TrialAccessBlockedProps) {
  return (
    <div className="min-h-[60vh] px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <TriangleAlert className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-semibold text-black">Trail not available</h1>
        <p className="mt-2 text-sm leading-6 text-black/65">{message}</p>

        <div className="mt-6 space-y-3">
          <CommonButton text="Back To Trails" onClick={onBackToTrials} />
          {onGoHome ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={onGoHome}
            >
              Go Home
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
