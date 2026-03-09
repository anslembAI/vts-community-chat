
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumPlusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: "sm" | "md" | "lg";
}

export function PremiumPlusButton({ className, size = "md", ...props }: PremiumPlusButtonProps) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
    };

    const iconSizes = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
    };

    return (
        <button
            className={cn(
                // Shape and Base
                "group relative flex items-center justify-center rounded-full",
                sizeClasses[size],

                // Shared shell styling
                "bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(241,246,249,0.48))]",
                "border border-white/55",
                "backdrop-blur-xl",
                "shadow-[0_12px_28px_rgba(120,140,154,0.14)]",
                "hover:shadow-[0_16px_36px_rgba(120,140,154,0.18)]",

                // Transitions
                "transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 hover:scale-105",
                "active:scale-95 active:translate-y-0",

                className
            )}
            {...props}
        >
            {/* Inner aesthetic ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/45 to-transparent opacity-70" />

            {/* The Plus Icon */}
            <Plus
                className={cn(
                    "text-[#2c3034]",
                    "transition-transform duration-500 group-hover:rotate-90",
                    iconSizes[size]
                )}
                strokeWidth={2.5}
            />
        </button>
    );
}
