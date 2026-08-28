"use client"

import { useEffect } from "react"

/**
 * Registers the push service worker once, app-wide, from the root layout.
 *
 * It used to be registered lazily by the settings page when a user toggled push
 * on. That still worked for delivery, but it left the worker absent for anyone
 * who had not visited settings — and Chrome requires an active service worker
 * before it will offer "Install app", which is the step iOS needs before it
 * will grant notification permission at all.
 *
 * Renders nothing, and stays deliberately quiet: a failed registration (private
 * browsing, an insecure origin, a locked-down browser) must not surface as an
 * error, because the settings page already reports push support properly.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let cancelled = false

    // Defer past first paint — registration competes with hydration otherwise.
    const timer = window.setTimeout(() => {
      if (cancelled) return
      navigator.serviceWorker.register("/notifications-sw.js").catch(() => {
        // Intentionally ignored; see above.
      })
    }, 1_000)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
