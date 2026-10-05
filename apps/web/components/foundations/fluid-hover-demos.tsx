"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/styles/base-fabricator/lib/fluid-hover"

const FOLDERS = ["Inbox", "Drafts", "Sent", "Archive", "Trash"]

const ITEM =
  "flex h-9 w-full items-center rounded-lg px-3 text-start text-[13px] text-muted-foreground outline-none select-none transition-colors duration-80"

function PlainList() {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface-3 p-1 shadow-surface-3">
      {FOLDERS.map((folder) => (
        <button
          key={folder}
          type="button"
          className={cn(
            ITEM,
            "hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          {folder}
        </button>
      ))}
    </div>
  )
}

function FluidList({
  items = FOLDERS,
  disabled = [],
  className,
}: {
  items?: string[]
  disabled?: string[]
  className?: string
}) {
  const fluid = useFluidHover<HTMLDivElement>({ items: "[data-item]" })
  const ref = useMergedRef(fluid.attach)
  return (
    <div
      ref={ref}
      {...fluid.props}
      className={cn(
        "relative isolate flex flex-col gap-1 rounded-xl bg-surface-3 p-1 shadow-surface-3",
        className
      )}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {items.map((item) => (
        <button
          key={item}
          type="button"
          data-item=""
          disabled={disabled.includes(item)}
          className={cn(
            ITEM,
            "focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 data-fluid-hover-active:text-foreground"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

/** A plain :hover list next to a fluid hover list. */
export function FluidHoverCompare() {
  return (
    <DemoFrame
      className="items-start"
      caption="Move the pointer down both lists, slowly. Then Tab into the list on the right: keyboard focus lights the same highlight."
    >
      <DemoColumn label="Plain :hover" note="Goes dark in every gap">
        <PlainList />
      </DemoColumn>
      <DemoColumn
        label="Fluid hover"
        note="One highlight, always on the nearest item"
      >
        <FluidList />
      </DemoColumn>
    </DemoFrame>
  )
}

const TABS = ["Library", "Recents", "Favorites", "Settings"]

function FluidTabs() {
  const [active, setActive] = React.useState(TABS[0])
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="tab"]',
    selected: '[aria-selected="true"]',
    axis: "x",
  })
  const ref = useMergedRef(fluid.attach)
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Library sections"
      {...fluid.props}
      className="relative isolate flex rounded-xl bg-muted p-1"
    >
      <FluidHoverSelection
        selection={fluid.selection}
        className="bg-surface-4 shadow-surface-4"
      />
      <FluidHoverHighlight hover={fluid.hover} />
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          onClick={() => setActive(tab)}
          className="flex h-7 items-center rounded-lg px-3 text-[13px] text-muted-foreground transition-colors duration-80 outline-none select-none focus-visible:ring-1 focus-visible:ring-ring aria-selected:text-foreground data-fluid-hover-active:text-foreground"
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

const CARDS = [
  { title: "Inbox", text: "Everything new lands here." },
  { title: "Drafts", text: "Unsent, saved as you type." },
  { title: "Sent", text: "Delivered and archived." },
  { title: "Trash", text: "Emptied after 30 days." },
]

function FluidGrid() {
  const fluid = useFluidHover<HTMLDivElement>({
    items: "[data-item]",
    axis: "xy",
  })
  const ref = useMergedRef(fluid.attach)
  return (
    <div
      ref={ref}
      {...fluid.props}
      className="relative isolate grid grid-cols-2 gap-2 rounded-xl bg-surface-3 p-1 shadow-surface-3"
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {CARDS.map((card) => (
        <button
          key={card.title}
          type="button"
          data-item=""
          className="group/card flex w-32 flex-col gap-0.5 rounded-lg p-3 text-start outline-none select-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="text-[13px] font-medium text-foreground">
            {card.title}
          </span>
          <span className="text-[12px] text-muted-foreground">{card.text}</span>
        </button>
      ))}
    </div>
  )
}

/** The three axes: strips (x), lists (y) and grids (xy). */
export function FluidHoverAxes() {
  return (
    <DemoFrame className="flex-col items-center gap-10">
      <DemoColumn
        label='axis="x"'
        note="Strips: tabs, toggle groups"
        className="w-auto items-center text-center"
      >
        <FluidTabs />
      </DemoColumn>
      <DemoColumn
        label='axis="y"'
        note="Lists: menus, tables, radios"
        className="items-center text-center"
      >
        <FluidList />
      </DemoColumn>
      <DemoColumn
        label='axis="xy"'
        note="Grids: card groups"
        className="w-auto items-center text-center"
      >
        <FluidGrid />
      </DemoColumn>
    </DemoFrame>
  )
}

/** Separate containers, and disabled items that are passed over. */
export function FluidHoverGroups() {
  return (
    <DemoFrame caption="The divider splits two containers, so the highlight never crosses it. The disabled row is skipped: hovering it lights its nearest neighbour.">
      <div className="flex w-56 flex-col rounded-xl bg-surface-3 p-1 shadow-surface-3">
        <FluidList
          items={["Profile", "Billing", "Members", "Integrations"]}
          disabled={["Members"]}
          className="bg-transparent p-0 shadow-none"
        />
        <div className="mx-2 my-1 h-px bg-border/60" />
        <FluidList
          items={["Help", "Log out"]}
          className="bg-transparent p-0 shadow-none"
        />
      </div>
    </DemoFrame>
  )
}
