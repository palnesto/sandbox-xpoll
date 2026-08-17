import { ArrowLeft, LucideProps } from "lucide-react";
import { memo } from "react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  top?: boolean;
  to?: string; // ✅ optional target route
  Icon?: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
}

const MemoBackButton = ({
  onClick,
  className,
  top,
  to,
  Icon,
}: BackButtonProps) => {
  const navigate = useNavigate();

  const onBack = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      // ✅ navigates to a specific route and replaces current page in history
      navigate(to, { replace: true });
    } else {
      // ✅ fallback: just go back one step in history
      navigate(-1);
    }
  };

  return (
    <Button
      type="button"
      onClick={onBack}
      className={cn(
        "bg-[#EEEFF133] cursor-pointer rounded-3xl px-4 py-1 focus:bg-[#EEEFF133] hover:bg-gray-50 border border-[#EAECF0] shadow-inner backdrop-blur-lg text-black",
        top ? "top-4" : "top-0",
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
    </Button>
  );
};

const BackButton = memo(MemoBackButton);
export default BackButton;
