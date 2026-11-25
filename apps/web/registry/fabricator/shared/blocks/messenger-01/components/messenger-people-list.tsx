"use client"

import * as React from "react"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import { SearchIcon } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  getAdjacentId,
  type Person,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"

/** Who a new message goes to: ↑ and ↓ move, Enter or a press picks. */
export function MessengerPeopleList({
  people,
  query,
  onPick,
  onClearQuery,
}: {
  people: Person[]
  query: string
  onPick: (person: Person) => void
  onClearQuery: () => void
}) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = React.useState<string>()
  const fluid = useFluidHover<HTMLDivElement>({
    items: "[data-person]",
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, listRef)
  const ids = people.map(({ id }) => id)
  const tabStopId = activeId && ids.includes(activeId) ? activeId : ids[0]

  if (people.length === 0) {
    return (
      <Empty className="p-(--density-24)">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchIcon />
          </EmptyMedia>
          <EmptyTitle>Nobody found</EmptyTitle>
          <EmptyDescription>
            No name or role matches “{query.trim()}”.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onClearQuery}>
            Clear search
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div
      ref={mergedRef}
      role="listbox"
      aria-label="People"
      {...fluid.props}
      onKeyDown={(event) => {
        if (!tabStopId) return
        const move =
          event.key === "ArrowDown"
            ? "next"
            : event.key === "ArrowUp"
              ? "previous"
              : null
        if (!move) return
        event.preventDefault()
        const nextId = getAdjacentId(ids, tabStopId, move)
        if (!nextId) return
        setActiveId(nextId)
        listRef.current
          ?.querySelector<HTMLElement>(`[data-person="${nextId}"]`)
          ?.focus()
      }}
      className="relative isolate flex flex-col gap-px px-(--density-8) pb-(--density-12)"
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {people.map((person) => (
        <Item
          key={person.id}
          size="sm"
          role="option"
          aria-selected={false}
          data-person={person.id}
          tabIndex={person.id === tabStopId ? 0 : -1}
          onFocus={() => setActiveId(person.id)}
          onClick={() => onPick(person)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return
            event.preventDefault()
            onPick(person)
          }}
          className="cursor-default flex-nowrap gap-(--density-10) px-(--density-8) focus-visible:ring-inset"
        >
          <ItemMedia aria-hidden>
            <MessengerAvatar
              name={person.name}
              src={person.avatar}
              isOnline={person.presence.kind === "online"}
              size="lg"
            />
          </ItemMedia>
          <ItemContent className="min-w-0 gap-0">
            <ItemTitle className="font-normal">{person.name}</ItemTitle>
            {person.role && (
              <ItemDescription className="line-clamp-1">
                {person.role}
              </ItemDescription>
            )}
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
