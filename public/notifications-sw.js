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
