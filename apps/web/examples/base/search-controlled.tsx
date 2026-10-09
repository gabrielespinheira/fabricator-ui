"use client"

import * as React from "react"

import { Search } from "@/styles/base-fabricator/ui/search"

const FRAMEWORKS = ["Next.js", "Remix", "Astro", "Vite", "Gatsby", "Nuxt"]

export function SearchControlled() {
  const [value, setValue] = React.useState("")
  const results = FRAMEWORKS.filter((name) =>
    name.toLowerCase().includes(value.trim().toLowerCase())
  )

  return (
    <div className="flex w-full max-w-xs flex-col items-start gap-3">
      <Search
        value={value}
        onValueChange={setValue}
        placeholder="Filter frameworks"
        width="100%"
      />
      <p className="text-sm text-muted-foreground">
        {value
          ? `${results.length} of ${FRAMEWORKS.length}: ${results.join(", ") || "none"}`
          : `${FRAMEWORKS.length} frameworks`}
      </p>
    </div>
  )
}
