import { ReactNode, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import BackButton from "@/components/commons/back-button";
import CommonButton from "@/components/commons/CommonButton";
import { useLocation } from "react-router";
import { heightStyles } from "@/styles";

type CreatePollLayoutProps = {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
  nextLabel?: string;
  nextDisabled?: boolean;
  onNext?: () => void;
  title?: string;
};

export default function CreatePollLayout({
  children,
  currentStep = 1,
  totalSteps = 3,
  nextLabel = "Next",
  nextDisabled = false,
  onNext,
  title = "Creating poll",
}: CreatePollLayoutProps) {
  const { pathname } = useLocation();
  const progressPct = useMemo(() => {
    if (totalSteps <= 0) return 0;
    const pct = (currentStep / totalSteps) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [currentStep, totalSteps]);

  const handleNext = () => {
    if (nextDisabled) return;
    onNext?.();
  };
  const backTo = useMemo(() => {
    if (pathname === "/add-polls/basic-info") {
      return "/add-campaign";
    } else if (pathname === "/add-polls/add-options") {
      return "/add-polls/basic-info";
    } else if (pathname === "/add-polls/add-rewards") {
      return "/add-polls/add-options";
    }
    return undefined;
  }, [pathname]);

  return (
    <div
      style={heightStyles}
      className="flex h-full max-h-screen flex-col bg-[#F2F3F5] relative max-w-2xl mx-auto"
    >
      <header className="bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-3">
          <BackButton to={backTo} />
          <h1 className="flex-1 text-base font-semibold sm:text-lg">{title}</h1>
          <span className="text-sm font-medium">
            {currentStep}/{totalSteps}
          </span>
        </div>

        <Progress
          value={progressPct}
          className="h-1 rounded-none bg-gray-200 [&>div]:bg-red-500"
        />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-2 lg:py-7 max-w-xl w-full mx-auto">
        {children}
      </main>

      <CommonButton
        text={nextLabel}
        type="button"
        onClick={handleNext}
        disabled={nextDisabled}
        aria-disabled={nextDisabled}
        className="mb-3 lg:mb-7 w-80 md:w-2/3 max-w-7xl disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
