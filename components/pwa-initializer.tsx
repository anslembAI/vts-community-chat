"use client";

import { useEffect } from "react";

export function PWAInitializer() {
    useEffect(() => {
        // Detect if mobile/touch device
        const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 768;

        // Detect if running as standalone PWA
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            ("standalone" in navigator && (navigator as any).standalone === true);

        if (isMobile) {
            document.documentElement.classList.add("is-mobile");
            document.body.classList.add("is-mobile");

            // Programmatically update viewport for mobile only
            let viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) {
                viewportMeta = document.createElement("meta");
                viewportMeta.setAttribute("name", "viewport");
                document.head.appendChild(viewportMeta);
            }
            viewportMeta.setAttribute(
                "content",
                "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
            );
        }

        if (isStandalone) {
            document.documentElement.classList.add("is-standalone");
            document.body.classList.add("is-standalone");
        }
    }, []);

    return null;
}
