"use client"

import { cn } from "cn"

import {
  MultiSelect,
  MultiSelectCollection,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectGroup,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectList,
  MultiSelectSeparator,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/styles/radix-fabricator/ui/multi-select"

type Team = { value: string; label: string; dot: string }

const design: Team = { value: "design", label: "Design", dot: "bg-destructive" }
const engineering: Team = {
  value: "engineering",
  label: "Engineering",
  dot: "bg-info",
}

const groups = [
  {
    value: "Product teams",
    items: [
      design,
      engineering,
      { value: "product", label: "Product", dot: "bg-warning" },
      { value: "research", label: "Research", dot: "bg-primary" },
    ],
  },
  {
    value: "Business teams",
    items: [
      { value: "marketing", label: "Marketing", dot: "bg-success" },
      { value: "operations", label: "Operations", dot: "bg-muted-foreground" },
    ],
  },
]

export function MultiSelectDemo() {
  return (
    <MultiSelect items={groups} defaultValue={[design, engineering]}>
      <MultiSelectTrigger className="max-w-sm">
        <MultiSelectValue />
        <MultiSelectInput aria-label="Teams" placeholder="Choose teams" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectEmpty>No teams found.</MultiSelectEmpty>
        <MultiSelectList>
          {(group: (typeof groups)[number], index: number) => (
            <MultiSelectGroup key={group.value} items={group.items}>
              <MultiSelectLabel>{group.value}</MultiSelectLabel>
              <MultiSelectCollection>
                {(team: Team) => (
                  <MultiSelectItem key={team.value} value={team}>
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", team.dot)}
                    />
                    {team.label}
                  </MultiSelectItem>
                )}
              </MultiSelectCollection>
              {index < groups.length - 1 && <MultiSelectSeparator />}
            </MultiSelectGroup>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}
