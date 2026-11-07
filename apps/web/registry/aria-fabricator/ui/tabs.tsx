"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  TabList as TabListPrimitive,
  TabPanel as TabPanelPrimitive,
  Tab as TabPrimitive,
  Tabs as TabsPrimitive,
} from "react-aria-components"
import { createPortal } from "react-dom"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/aria-fabricator/lib/fluid-hover"

// Fabricator override of the upstream tabs: the list is a fluid hover
// container. The selected tab's pill slides between tabs, and a softer hover
// pill previews the tab under the pointer.
const TAB = '[role="tab"]'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive>) {
  return (
    <TabsPrimitive
      data-slot="tabs"
      className={cn(
        "group/tabs flex gap-(--density-8) data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center justify-center rounded-xl p-(--density-4) text-muted-foreground group-data-horizontal/tabs:h-(--density-36) group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:gap-(--density-4)",
  {
    variants: {
      variant: {
        default: "bg-foreground/[0.05]",
        // Only the active tab shows its label; the others show their icon.
        subtle: "bg-transparent",
        /** @deprecated Kept for compatibility; renders as `default`. */
        line: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ref,
  ...props
}: React.ComponentProps<typeof TabListPrimitive> &
  VariantProps<typeof tabsListVariants>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: TAB,
    selected: `${TAB}[aria-selected="true"]`,
    // Follows the list's orientation, set from the root.
    axis: "auto",
  })
  // The tab list renders only its tabs, so the overlays are portalled into it
  // once it mounts.
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(fluid.attach, setList, ref)

  return (
    <>
      <TabListPrimitive
        data-slot="tabs-list"
        data-variant={variant === "line" ? "default" : variant}
        className={cn(tabsListVariants({ variant }), className)}
        ref={mergedRef}
        {...fluid.props}
        {...props}
      />
      {list &&
        createPortal(
          <>
            <FluidHoverSelection
              selection={fluid.selection}
              className="rounded-lg bg-surface-4 shadow-surface-4 dark:bg-foreground/14 [:has(>[role=tab][data-fluid-hover-active]:not([aria-selected=true]))>&]:opacity-85"
            />
            <FluidHoverHighlight
              hover={fluid.hover}
              className="rounded-lg bg-hover/60 [:has(>[role=tab][data-fluid-hover-active][aria-selected=true])>&]:opacity-0"
            />
          </>,
          list
        )}
    </>
  )
}

// Each run of text becomes a label, so the subtle list can hide every label
// but the active tab's and keep the icons. `Files {count}` stays one label.
function wrapLabels(children: React.ReactNode) {
  const output: React.ReactNode[] = []
  let text = ""
  const flush = () => {
    if (text === "") return
    output.push(
      <span
        key={`label-${output.length}`}
        data-slot="tabs-trigger-label"
        className="duration-move ease-move group-data-[variant=subtle]/tabs-list:pe-(--density-4) group-data-[variant=subtle]/tabs-list:not-in-aria-selected:sr-only motion-safe:group-data-[variant=subtle]/tabs-list:in-aria-selected:animate-in motion-safe:group-data-[variant=subtle]/tabs-list:in-aria-selected:fade-in-0"
      >
        {text}
      </span>
    )
    text = ""
  }
  for (const child of React.Children.toArray(children)) {
    if (typeof child === "string" || typeof child === "number") {
      text += String(child)
      continue
    }
    flush()
    output.push(child)
  }
  flush()
  return output
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabPrimitive>) {
  return (
    <TabPrimitive
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-(--density-6) rounded-lg px-(--density-12) text-(length:--density-text-13) font-normal whitespace-nowrap text-foreground/65 transition-all duration-feedback ease-feedback group-data-[variant=subtle]/tabs-list:flex-none group-data-[variant=subtle]/tabs-list:px-(--density-8) group-data-vertical/tabs:w-full group-data-vertical/tabs:flex-none group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 in-data-[slot=tabs-list]:h-(--density-28) group-data-vertical/tabs:in-data-[slot=tabs-list]:h-(--density-32) in-data-[slot=tabs-list]:focus-visible:ring-0 has-data-[icon=inline-end]:pe-(--density-10) has-data-[icon=inline-start]:ps-(--density-10) group-data-[variant=subtle]/tabs-list:aria-selected:ps-(--density-10) data-fluid-hover-active:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-selected:bg-surface-4 group-data-[variant=default]/tabs-list:data-selected:shadow-surface-4 in-data-[fluid-hover]:group-data-[variant=default]/tabs-list:data-selected:bg-transparent in-data-[fluid-hover]:group-data-[variant=default]/tabs-list:data-selected:shadow-none dark:group-data-[variant=default]/tabs-list:data-selected:bg-foreground/14 dark:in-data-[fluid-hover]:group-data-[variant=default]/tabs-list:data-selected:bg-transparent group-data-[variant=default]/tabs-list:data-active:bg-surface-4 group-data-[variant=default]/tabs-list:data-active:shadow-surface-4 in-data-[fluid-hover]:group-data-[variant=default]/tabs-list:data-active:bg-transparent in-data-[fluid-hover]:group-data-[variant=default]/tabs-list:data-active:shadow-none dark:group-data-[variant=default]/tabs-list:data-active:bg-foreground/14 dark:in-data-[fluid-hover]:group-data-[variant=default]/tabs-list:data-active:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] hover:[&_svg]:stroke-2 data-fluid-hover-active:[&_svg]:stroke-2 data-selected:[&_svg]:stroke-2 data-active:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        "data-selected:bg-background data-selected:text-foreground dark:data-selected:border-input dark:data-selected:bg-input/30 dark:data-selected:text-foreground",
        className
      )}
      {...props}
    >
      {typeof children === "function"
        ? (values) => wrapLabels(children(values))
        : wrapLabels(children)}
    </TabPrimitive>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabPanelPrimitive>) {
  return (
    <TabPanelPrimitive
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-(length:--density-text-13) outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
