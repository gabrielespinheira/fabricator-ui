"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  ToggleButtonGroup as ToggleGroupPrimitive,
  ToggleButton as TogglePrimitive,
  type ToggleButtonGroupProps,
  type ToggleButtonProps,
} from "react-aria-components"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/aria/lib/fluid-hover"
import { toggleVariants } from "@/registry/bases/aria/ui/toggle"

// Fabricator override of the upstream toggle group: the group is a fluid
// hover container. One highlight glides between items, and in a single-select
// group the selected item's background slides between items.
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
}: Omit<ToggleButtonGroupProps, "children"> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
    children?: React.ReactNode
    ref?: React.Ref<HTMLDivElement>
  }) {
  // React Aria groups are single-select unless selectionMode is "multiple".
  const single = props.selectionMode !== "multiple"
  const fluid = useFluidHover<HTMLDivElement>({
    items: ITEM,
    selected: single ? `${ITEM}[data-selected]` : undefined,
    axis: orientation === "vertical" ? "y" : "x",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      orientation={orientation}
      style={
        { "--gap": `calc(var(--spacing) * ${spacing})` } as React.CSSProperties
      }
      className={cn(
        "cn-toggle-group group/toggle-group flex w-fit flex-row items-center gap-(--gap) data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      data-multiple={single ? undefined : ""}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      {single && (
        <FluidHoverSelection
          selection={fluid.selection}
          className="cn-toggle-group-selection"
        />
      )}
      <FluidHoverHighlight
        hover={fluid.hover}
        className="cn-toggle-group-highlight"
      />
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: ToggleButtonProps & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "cn-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  )
}

export { ToggleGroup, ToggleGroupItem }
