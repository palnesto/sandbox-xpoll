import { cn } from "@/lib/utils";

type GlowCircleProps = {
    img: string;
    onClick?: () => void;
    size?: "sm" | "md" | "lg";
    className?: string;
};

export const GlowCircle = ({
    img,
    onClick,
    size = "md",
    className,
}: GlowCircleProps) => {
    const sizeClasses = {
        sm: "h-10 xl:h-12 p-2 xl:p-3",  
        md: "h-20 p-4", 
        lg: "h-28 p-6", // ~112px
    }[size];

    return (
        <div
            className={cn(
                `glow-circle aspect-square ${sizeClasses} overflow-hidden cursor-pointer rounded-full bg-blue`,
                className
            )}
            onClick={onClick}
        >
            <img
                src={img}
                alt="glow-icon"
                className="h-full w-full object-contain transition-transform duration-500 hover:scale-110"
            />
        </div>
    );
};