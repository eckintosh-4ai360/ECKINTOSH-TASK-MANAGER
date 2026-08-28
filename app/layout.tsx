import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spagad – SRAD (Spagad Rapid Application Development)",
  description: "Developer team operations hub: sprints, standups, deployments and projects — powered by Spagad SRAD.",
  generator: "Spagad SRAD",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  // Lets iOS run the Home Screen install chrome-free, which is the only mode
  // in which Safari will hand out push permission.
  appleWebApp: {
    capable: true,
    title: "Spagad",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#04111f",
  // Home Screen installs render under the notch; let the app paint there.
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className={`font-sans antialiased bg-background futuristic-grid`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="spagad-theme">
          {children}
        </ThemeProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  )
}
