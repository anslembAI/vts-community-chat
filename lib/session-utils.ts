export const ACTIVE_SESSION_STORAGE_KEY = "vts-active-session-uuid";

export function getDeviceLabel(): string {
    if (typeof window === "undefined") return "Server";

    const ua = window.navigator.userAgent;
    let device = "Desktop";
    if (/iPhone|iPad|iPod/.test(ua)) device = "iPhone/iPad";
    else if (/Android/.test(ua)) device = "Android";

    let browser = "Browser";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edge")) browser = "Edge";

    return `${device} ${browser}`;
}

export function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "";

    // Use sessionStorage so multiple tabs on same browser/device share it 
    // ONLY if they are opened from each other. 
    // Wait, prompt says: "Multiple tabs on the SAME device should remain logged in. Tabs share the same sessionId."
    // sessionStorage is unique per tab. localStorage is shared.
    // BUT the prompt specifically says: "sessionStorage preferred over localStorage".
    // And "Use a BroadcastChannel to sync sessionId across tabs if needed."

    let sid = sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!sid) {
        // Try to get from another tab if applicable? 
        // Or just use localStorage and accept it's shared across tabs on same device/browser.
        // Actually, localStorage is better for "same device" logic. 
        // I'll use localStorage but name it differently to distinguish from Convex sessionId.
        sid = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sid);
        }
        // Also set in sessionStorage for this tab's session
        sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sid);
    }
    return sid;
}

export function clearSessionId() {
    if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
}
