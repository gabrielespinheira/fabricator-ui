"use client"

import * as React from "react"
import { cn } from "cn"

export type SettingsIndexItem = { id: string; label: string }

/** The sections of a long page, beside it when there is room. */
export function SettingsIndex({
  items,
  className,
}: {
  items: SettingsIndexItem[]
  className?: string
}) {
  const currentId = useCurrentSection(items)

  return (
    <nav aria-label="On this page" className={className}>
      <ul className="flex flex-col gap-(--density-2)">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={item.id === currentId ? "location" : undefined}
              className={cn(
                "flex min-h-(--density-28) items-center rounded-(--radius-inner) text-(length:--density-text-13) text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
                item.id === currentId && "font-medium text-foreground"
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// The last section whose top has passed the upper third of the scroller; the
// last one of all once the page can't scroll further.
function useCurrentSection(items: SettingsIndexItem[]) {
  const [currentId, setCurrentId] = React.useState(items[0]?.id)

  React.useEffect(() => {
    const first = items[0] && document.getElementById(items[0].id)
    const root = first?.closest<HTMLElement>("[data-slot=app-shell-content]")
    if (!root) return
    const update = () => {
      const { top, height } = root.getBoundingClientRect()
      const isAtEnd =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 2
      const passed = items.filter(({ id }) => {
        const section = document.getElementById(id)
        return (
          section && section.getBoundingClientRect().top <= top + height / 3
        )
      })
      setCurrentId((isAtEnd ? items : passed).at(-1)?.id ?? items[0]?.id)
    }
    update()
    root.addEventListener("scroll", update, { passive: true })
    return () => root.removeEventListener("scroll", update)
  }, [items])

  return currentId
}
