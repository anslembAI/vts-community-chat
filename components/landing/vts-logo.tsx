"use client";

import Image from "next/image";

export function VTSLogo({ className = "h-14 w-auto" }: { className?: string }) {
    return (
        <Image
            src="/vts-logo-brand.png"
            alt="VTS Chat Logo"
            width={200}
            height={60}
            className={`${className} transition-all duration-300`}
            priority
        />
    );
}
