self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = {}; }
  const title = String(payload.title || "Purohith Connect");
  const body = String(payload.body || "You have a new update.");
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.data?.campaignId || payload.data?.bookingId || payload.data?.requestId || undefined,
      data: { url: "/notifications" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const destination = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      await existing.navigate(destination);
    } else await self.clients.openWindow(destination);
  })());
});
