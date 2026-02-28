self.addEventListener("push", (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const title = data.title || "VTS Chat";
    const body = data.body || "New message received";
    const icon = "/icon-192.png";
    const badge = "/icon-192.png";
    const url = data.url || "/";

    const options = {
        body,
        icon,
        badge,
        data: { url },
        vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (const client of windowClients) {
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            // Check if any window is open to at least origin (optional but aggressive focus)
            // for (let client of windowClients) {
            //     if (client.url.startsWith(self.location.origin) && "focus" in client) {
            //         client.navigate(urlToOpen);
            //         return client.focus();
            //     }
            // }
            // If no suitable window is found, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
