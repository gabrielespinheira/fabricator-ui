"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/radix-fabricator/lib/fluid-hover"
import { toggleVariants } from "@/registry/radix-fabricator/ui/toggle"

// Fabricator override of the upstream toggle group: the group is a fluid
// hover container. One highlight glides between items, and in a single-select
// group the pressed item's background slides between items.
const ITEM = '[data-slot="toggle-group-item"]'

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ref,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }) {
  const single = props.type === "single"
  const fluid = useFluidHover<HTMLDivElement>({
    items: ITEM,
    selected: single ? `${ITEM}[data-state="on"]` : undefined,
    axis: orientation === "vertical" ? "y" : "x",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      data-multiple={single ? undefined : ""}
      ref={mergedRef}
      {...fluid.props}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group relative isolate flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-lg data-[spacing=0]:overflow-hidden data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      {single && (
        <FluidHoverSelection
          selection={fluid.selection}
          className="group-data-[spacing=0]/toggle-group:rounded-none"
        />
      )}
      <FluidHoverHighlight
        hover={fluid.hover}
        className="group-data-[spacing=0]/toggle-group:rounded-none"
      />
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 cursor-pointer group-data-[spacing=0]/toggle-group:rounded-none group-data-[fluid-hover]/toggle-group:hover:bg-transparent! focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:focus-visible:ring-inset group-[[data-fluid-hover]:not([data-multiple])]/toggle-group:aria-pressed:bg-transparent! data-fluid-hover-active:text-foreground group-[[data-fluid-hover]:not([data-multiple])]/toggle-group:data-pressed:bg-transparent! data-[size=default]:h-(--density-36) data-[size=default]:min-w-(--density-36) data-[size=default]:px-(--density-12) data-[size=sm]:h-(--density-36) data-[size=sm]:min-w-(--density-36) data-[size=sm]:px-(--density-12) data-[size=sm]:density-compact group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-e-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:first-of-type:rounded-s-lg group-data-vertical/toggle-group:data-[spacing=0]:first-of-type:rounded-t-lg group-[[data-fluid-hover]:not([data-multiple])]/toggle-group:data-[state=on]:bg-transparent! group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first-of-type:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first-of-type:border-t group-[[data-fluid-hover]:not([data-multiple])]/toggle-group:data-selected:bg-transparent! data-fluid-hover-active:[&_svg]:stroke-2",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
