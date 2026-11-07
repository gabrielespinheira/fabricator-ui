"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/base/lib/fluid-hover"

// Fabricator override of the upstream tabs: the list is a fluid hover
// container. The selected tab's pill slides between tabs, and a softer hover
// pill previews the tab under the pointer.
const TAB = '[role="tab"]'

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      // Upstream reads `orientation` for styling only; the primitive needs it
      // too, for up/down arrow keys and the list's orientation.
      orientation={orientation}
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
  children,
  ref,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: TAB,
    selected: `${TAB}[aria-selected="true"]`,
    // Follows the list's orientation, set from the root.
    axis: "auto",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant === "line" ? "default" : variant}
      className={cn(tabsListVariants({ variant }), className)}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      <FluidHoverSelection
        selection={fluid.selection}
        className="cn-tabs-selection"
      />
      <FluidHoverHighlight hover={fluid.hover} className="cn-tabs-highlight" />
      {children}
    </TabsPrimitive.List>
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
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "cn-tabs-trigger relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap text-foreground/65 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        className
      )}
      {...props}
    >
      {wrapLabels(children)}
    </TabsPrimitive.Tab>
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("cn-tabs-content flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
