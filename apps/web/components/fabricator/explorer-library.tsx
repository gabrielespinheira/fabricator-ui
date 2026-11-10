"use client"

import * as React from "react"

import {
  filterExplorerComponents,
  type ExplorerComponent,
} from "@/lib/component-explorer"
import { COMPONENT_GROUPS } from "@/lib/component-groups"
import { AppShellPageTitle } from "@/styles/base-fabricator/ui/app-shell"
import { Input } from "@/styles/base-fabricator/ui/input"
import { Item, ItemContent, ItemTitle } from "@/styles/base-fabricator/ui/item"

export function ExplorerLibrary({
  components,
  renderLink,
}: {
  components: ExplorerComponent[]
  renderLink: (component: ExplorerComponent) => React.ReactElement
}) {
  const [query, setQuery] = React.useState("")
  const matches = React.useMemo(
    () => filterExplorerComponents(components, query),
    [components, query]
  )
  return (
    <div className="flex flex-col gap-6">
      <AppShellPageTitle>Library</AppShellPageTitle>
      <Input
        aria-label="Search components"
        placeholder={`Search ${components.length} components`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {COMPONENT_GROUPS.map((group) => {
        const rows = matches.filter((component) => component.group === group)
        if (!rows.length) return null
        return (
          <section key={group} className="flex flex-col gap-2">
            <h2 className="text-xs font-medium text-muted-foreground">
              {group}
            </h2>
            <div className="rounded-xl bg-card p-1 shadow-surface-2">
              {rows.map((component) => (
                <Item key={component.slug} render={renderLink(component)}>
                  <ItemContent>
                    <ItemTitle>{component.title}</ItemTitle>
                  </ItemContent>
                </Item>
              ))}
            </div>
          </section>
        )
      })}
      {matches.length === 0 && (
        <p role="status" className="text-muted-foreground">
          No components found.
        </p>
      )}
    </div>
  )
}
