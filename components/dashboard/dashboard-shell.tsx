"use client"

import { SearchProvider } from "@/components/dashboard/search-context"
import type { ReactNode } from "react"

/**
 * Client-side wrapper that provides the SearchContext to the entire dashboard.
 * The Header search bar writes to this context, and every dashboard section
 * reads from it to filter its items in real time.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return <SearchProvider>{children}</SearchProvider>
}
