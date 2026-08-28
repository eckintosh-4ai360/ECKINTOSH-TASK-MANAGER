// Push service worker. Registered app-wide by components/service-worker-registrar.tsx.

// Take over immediately on update, so a redeploy doesn't leave phones running
// last week's copy until every tab is closed.
self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Chrome requires a registered fetch handler before it will treat the site as
// installable. Deliberately does not call respondWith — every request falls
// through to the network exactly as it would without a worker.
self.addEventListener("fetch", () => {})

self.addEventListener("push", (event) => {
  let payload = {
    title: "Spagad",
    body: "A new workspace alert is ready.",
    url: "/settings",
    tag: "workspace-alert",
  }

  if (event.data) {
    try {
      const data = event.data.json()
      payload = {
        ...payload,
        ...data,
      }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // A re-sent reminder for the same task reuses its tag; renotify makes the
      // device alert again instead of silently replacing the existing banner.
      renotify: true,
      timestamp: Date.now(),
      data: {
        url: payload.url,
      },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification.data?.url || "/settings"
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})
