"use client"

import { Search } from "@/styles/radix-fabricator/ui/search"

export function SearchAlwaysOpen() {
  return (
    <form
      role="search"
      className="w-full max-w-xs"
      onSubmit={(event) => event.preventDefault()}
    >
      <Search
        collapsible={false}
        name="q"
        width="100%"
        placeholder="Search the docs"
        className="w-full"
      />
    </form>
  )
}
