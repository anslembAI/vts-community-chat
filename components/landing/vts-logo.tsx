"use client";

import Image from "next/image";

export function VTSLogo({ className = "h-16 w-auto" }: { className?: string }) {
    return (
        <Image
            src="/vts-logo-brand.png"
            alt="VTS Chat Logo"
            width={240}
            height={80}
            className={`${className} transition-all duration-300`}
            priority
        />
    );
}
