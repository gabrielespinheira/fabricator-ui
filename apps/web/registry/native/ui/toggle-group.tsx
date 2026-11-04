import * as React from "react"
import { useControllableState } from "@rn-primitives/hooks"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
} from "@/registry/native/lib/fluid-hover"
import { Toggle, toggleVariants } from "@/registry/native/ui/toggle"

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  value: string[]
  toggle: (value: string, pressed: boolean) => void
  isSingle: boolean
  isDisabled: boolean
  spacing: number
  orientation: "horizontal" | "vertical"
  getItemProps: ReturnType<typeof useFluidHover>["getItemProps"]
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null
)

// `first-of-type` doesn't exist here: a joined group's items read their place.
const ToggleGroupIndexContext = React.createContext(0)

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  disabled = false,
  style,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
    value?: string[]
    defaultValue?: string[]
    onValueChange?: (value: string[]) => void
    multiple?: boolean
    disabled?: boolean
    children?: React.ReactNode
  }) {
  const [current = [], setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const isSingle = !multiple
  const fluid = useFluidHover({
    selected: isSingle ? current[0] : undefined,
  })

  const context: ToggleGroupContextValue = {
    variant,
    size,
    spacing,
    orientation,
    isSingle,
    isDisabled: disabled,
    value: current,
    getItemProps: fluid.getItemProps,
    toggle: (item, pressed) => {
      if (isSingle) setCurrent(pressed ? [item] : [])
      else if (pressed) setCurrent([...current, item])
      else setCurrent(current.filter((entry) => entry !== item))
    },
  }

  return (
    <View
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={String(spacing)}
      data-orientation={orientation}
      data-multiple={multiple}
      role="group"
      aria-disabled={disabled}
      className={cn(
        "cn-toggle-group flex-row items-center self-start data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className
      )}
      style={[{ gap: spacing * 4 }, style]}
      {...props}
    >
      {isSingle && (
        <FluidHoverSelection
          data-spacing={String(spacing)}
          selection={fluid.selection}
          className="cn-toggle-group-selection"
        />
      )}
      <FluidHoverHighlight
        data-spacing={String(spacing)}
        hover={fluid.hover}
        className="cn-toggle-group-highlight"
      />
      <ToggleGroupContext value={context}>
        {React.Children.toArray(children).map((child, index) => (
          <ToggleGroupIndexContext
            key={React.isValidElement(child) ? child.key : index}
            value={index}
          >
            {child}
          </ToggleGroupIndexContext>
        ))}
      </ToggleGroupContext>
    </View>
  )
}

function ToggleGroupItem({
  className,
  value,
  children,
  variant = "default",
  size = "default",
  disabled,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onLayout,
  ...props
}: React.ComponentProps<typeof Toggle> & { value: string }) {
  const group = React.use(ToggleGroupContext)
  const index = React.use(ToggleGroupIndexContext)
  const resolvedVariant = group?.variant || variant
  const resolvedSize = group?.size || size
  const fluid = group?.getItemProps(value)
  return (
    <Toggle
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-spacing={String(group?.spacing)}
      data-orientation={group?.orientation}
      data-single={group?.isSingle}
      data-first={index === 0}
      variant={resolvedVariant}
      size={resolvedSize}
      pressed={group?.value.includes(value) ?? false}
      onPressedChange={(pressed) => group?.toggle(value, pressed)}
      disabled={disabled ?? group?.isDisabled}
      className={cn("cn-toggle-group-item shrink-0", className)}
      onLayout={(event) => {
        fluid?.onLayout(event)
        onLayout?.(event)
      }}
      onPressIn={(event) => {
        fluid?.onPressIn()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        fluid?.onPressOut()
        onPressOut?.(event)
      }}
      onHoverIn={(event) => {
        fluid?.onHoverIn()
        onHoverIn?.(event)
      }}
      onHoverOut={(event) => {
        fluid?.onHoverOut()
        onHoverOut?.(event)
      }}
      {...props}
    >
      {children}
    </Toggle>
  )
}

export { ToggleGroup, ToggleGroupItem }
