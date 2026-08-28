import type { MetadataRoute } from "next"

/**
 * Web app manifest, served at /manifest.webmanifest and linked automatically
 * by Next from the root layout.
 *
 * This is what makes push reach a phone. Android/Chrome will deliver Web Push
 * to the installed or plain browser tab, but iOS (16.4+) only grants
 * `Notification.requestPermission()` to a site that has been added to the Home
 * Screen — which requires this manifest with `display: "standalone"`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spagad – SRAD",
    short_name: "Spagad",
    description:
      "Developer team operations hub: sprints, standups, deployments and projects — powered by Spagad SRAD.",
    start_url: "/tasks",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#04111f",
    theme_color: "#04111f",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed copy so Android can crop to its own mask without clipping the mark.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My tasks", url: "/tasks" },
      { name: "Calendar", url: "/calendar" },
      { name: "Notification settings", url: "/settings" },
    ],
  }
}
