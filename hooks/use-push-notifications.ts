import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "./use-auth";

function base64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const { sessionId } = useAuth();

    const [isSupported, setIsSupported] = useState(false);
    const [masterEnabledLocal, setMasterEnabledLocal] = useState(false);
    const [channelsLocal, setChannelsLocal] = useState<Record<string, boolean>>({});

    const setMasterPushEnabled = useMutation(api.push.setMasterPushEnabled);
    const savePushSubscription = useMutation(api.push.savePushSubscription);
    const removePushSubscription = useMutation(api.push.removePushSubscription);
    const setChannelPushEnabled = useMutation(api.push.setChannelPushEnabled);
    const sendTestPushMutation = useMutation(api.push.runPushTest);

    // We should pull from Convex if possible, or just let components wrap it.
    const settings = useQuery(api.push.getMyPushSettings, sessionId ? { sessionId } : "skip");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
            setIsSupported(supported);
        }
    }, []);

    useEffect(() => {
        if (settings) {
            setMasterEnabledLocal(settings.masterEnabled);
            setChannelsLocal(settings.channels);
        }
    }, [settings]);

    const getDeviceId = () => {
        let devId = localStorage.getItem("vts_device_id");
        if (!devId) {
            devId = crypto.randomUUID();
            localStorage.setItem("vts_device_id", devId);
        }
        return devId;
    };

    const subscribeMaster = useCallback(async () => {
        if (!sessionId || !isSupported) return;

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                throw new Error("Permission denied for notifications");
            }

            await setMasterPushEnabled({ sessionId, enabled: true });

            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.error("VAPID Key not found");
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: base64ToUint8Array(vapidPublicKey)
            });

            const subObj = JSON.parse(JSON.stringify(subscription));

            await savePushSubscription({
                sessionId,
                deviceId: getDeviceId(),
                subscription: {
                    endpoint: subObj.endpoint,
                    expirationTime: subObj.expirationTime,
                    keys: {
                        p256dh: subObj.keys.p256dh,
                        auth: subObj.keys.auth
                    }
                }
            });

        } catch (e) {
            console.error(e);
            // Revert if problem occurred
            await setMasterPushEnabled({ sessionId, enabled: false }).catch(() => { });
        }
    }, [sessionId, isSupported, setMasterPushEnabled, savePushSubscription]);

    const unsubscribeMaster = useCallback(async () => {
        if (!sessionId || !isSupported) return;

        try {
            await setMasterPushEnabled({ sessionId, enabled: false });

            const registration = await navigator.serviceWorker.getRegistration("/sw.js");
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                }
            }

            await removePushSubscription({
                sessionId,
                deviceId: getDeviceId(),
            });

        } catch (e) {
            console.error(e);
        }
    }, [sessionId, isSupported, setMasterPushEnabled, removePushSubscription]);

    const toggleMaster = useCallback(async (enabled: boolean) => {
        if (enabled) {
            await subscribeMaster();
        } else {
            await unsubscribeMaster();
        }
    }, [subscribeMaster, unsubscribeMaster]);

    const toggleChannel = useCallback(async (channelId: Id<"channels">, enabled: boolean) => {
        if (!sessionId) return;
        try {
            await setChannelPushEnabled({ sessionId, channelId, enabled });
        } catch (e) {
            console.error("Toggle channel error", e);
        }
    }, [sessionId, setChannelPushEnabled]);

    const sendTestPush = useCallback(async () => {
        if (!sessionId) return;
        try {
            await sendTestPushMutation({ sessionId });
        } catch (e) {
            console.error("Test push error", e);
            throw e;
        }
    }, [sessionId, sendTestPushMutation]);

    return {
        isSupported,
        masterEnabled: masterEnabledLocal,
        channelSettings: channelsLocal,
        toggleMaster,
        toggleChannel,
        sendTestPush,
    };
}
