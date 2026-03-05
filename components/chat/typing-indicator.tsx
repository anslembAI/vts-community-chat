"use client";

interface TypingIndicatorProps {
    typingUsers: { userId: string; username: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const text = formatTypingText(typingUsers);

    return (
        <div className="flex items-center gap-2 px-5 py-1.5 text-xs text-[#6A6A6A] select-none">
            {/* Animated bouncing dots */}
            <span className="flex items-center gap-[3px]">
                <span
                    className="inline-block h-[5px] w-[5px] rounded-full bg-[#8B7760]"
                    style={{ animation: "typingBounce 1.4s ease-in-out infinite", animationDelay: "0s" }}
                />
                <span
                    className="inline-block h-[5px] w-[5px] rounded-full bg-[#8B7760]"
                    style={{ animation: "typingBounce 1.4s ease-in-out infinite", animationDelay: "0.2s" }}
                />
                <span
                    className="inline-block h-[5px] w-[5px] rounded-full bg-[#8B7760]"
                    style={{ animation: "typingBounce 1.4s ease-in-out infinite", animationDelay: "0.4s" }}
                />
            </span>
            <span className="italic truncate max-w-[280px]">{text}</span>
        </div>
    );
}

function formatTypingText(users: { username: string }[]): string {
    if (users.length === 1) {
        return `${users[0].username} is typing…`;
    }
    if (users.length === 2) {
        return `${users[0].username} and ${users[1].username} are typing…`;
    }
    if (users.length === 3) {
        return `${users[0].username}, ${users[1].username}, and ${users[2].username} are typing…`;
    }
    return `${users[0].username}, ${users[1].username}, and ${users.length - 2} others are typing…`;
}
