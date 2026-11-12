"use client"

import { cn } from "cn"

import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/aria-fabricator/ui/multi-select"

// Flat on React Aria: sections freeze filtering under React 19.2 in
// development (react/react#35126).
const teams = [
  { value: "design", label: "Design", dot: "bg-destructive" },
  { value: "engineering", label: "Engineering", dot: "bg-info" },
  { value: "product", label: "Product", dot: "bg-warning" },
  { value: "research", label: "Research", dot: "bg-primary" },
  { value: "marketing", label: "Marketing", dot: "bg-success" },
  { value: "operations", label: "Operations", dot: "bg-muted-foreground" },
]

export function MultiSelectDemo() {
  return (
    <MultiSelect
      aria-label="Teams"
      defaultValue={["design", "engineering"]}
      className="max-w-sm"
    >
      <MultiSelectTrigger>
        <MultiSelectValue />
        <MultiSelectInput placeholder="Choose teams" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectList
          renderEmptyState={() => (
            <MultiSelectEmpty>No teams found.</MultiSelectEmpty>
          )}
        >
          {teams.map((team) => (
            <MultiSelectItem
              key={team.value}
              id={team.value}
              textValue={team.label}
            >
              <span
                aria-hidden
                className={cn("size-2 rounded-full", team.dot)}
              />
              {team.label}
            </MultiSelectItem>
          ))}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}
