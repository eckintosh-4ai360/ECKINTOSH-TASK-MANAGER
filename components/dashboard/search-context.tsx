"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface SearchContextValue {
  query: string
  setQuery: (q: string) => void
  /** Returns true if the search query matches any of the provided fields */
  matches: (...fields: (string | null | undefined)[]) => boolean
  /** True when there's an active search */
  isSearching: boolean
}

const SearchContext = createContext<SearchContextValue>({
  query: "",
  setQuery: () => {},
  matches: () => true,
  isSearching: false,
})

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("")

  const isSearching = query.trim().length > 0

  const matches = useCallback(
    (...fields: (string | null | undefined)[]) => {
      if (!isSearching) return true
      const q = query.toLowerCase()
      return fields.some((f) => f?.toLowerCase().includes(q))
    },
    [query, isSearching]
  )

  return (
    <SearchContext.Provider value={{ query, setQuery, matches, isSearching }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  return useContext(SearchContext)
}
