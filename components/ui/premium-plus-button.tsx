
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

                // Glassmorphism & Gradient Background
                "bg-gradient-to-br from-slate-800 via-slate-900 to-black",
                "border border-white/10",
                "backdrop-blur-xl",

                // Outer Glow (Electric Blue)
                "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
                "hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]",

                // Transitions
                "transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 hover:scale-105",
                "active:scale-95 active:translate-y-0",

                className
            )}
            {...props}
        >
            {/* Inner aesthetic ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent opacity-50" />

            {/* The Plus Icon */}
            <Plus
                className={cn(
                    "text-white/90 drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]",
                    "transition-transform duration-500 group-hover:rotate-90",
                    iconSizes[size]
                )}
                strokeWidth={2.5}
            />
        </button>
    );
}
