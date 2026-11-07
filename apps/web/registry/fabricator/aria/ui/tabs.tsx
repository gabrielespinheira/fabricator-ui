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
} from "@/registry/bases/aria/lib/fluid-hover"

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
        "cn-tabs group/tabs flex data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "cn-tabs-list group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "cn-tabs-list-variant-default",
        // Only the active tab shows its label; the others show their icon.
        subtle: "cn-tabs-list-variant-subtle",
        /** @deprecated Kept for compatibility; renders as `default`. */
        line: "cn-tabs-list-variant-default",
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
              className="cn-tabs-selection"
            />
            <FluidHoverHighlight
              hover={fluid.hover}
              className="cn-tabs-highlight"
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
        className="cn-tabs-trigger-label"
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
        "cn-tabs-trigger cn-tabs-trigger-aria relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap text-foreground/65 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
      className={cn("cn-tabs-content flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
