import { Button } from "../ui/button";
import { cn } from "@/lib/utils"; // utility for merging classNames (optional)

interface CommonButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  text: string;
  disabled?: boolean;
  className?: string; // <-- allow user to pass Tailwind classes
}

const CommonButton = ({
  onClick,
  text,
  disabled,
  className,
}: CommonButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "max-w-[25rem] p-7 mx-auto w-full rounded-full text-[15px] font-semibold text-white bg-[#0DACAD] hover:bg-[#29d8d8] text-center disabled:opacity-95 disabled:cursor-not-allowed",
        className
      )}
    >
      {text}
    </Button>
  );
};

export default CommonButton;
