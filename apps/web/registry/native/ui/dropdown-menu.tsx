import * as React from "react"
import {
  CheckIcon,
  ChevronRightIcon,
  IconProvider,
} from "@fabricator-ui/icons-react-native"
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu"
import { useControllableState } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  useFeedback,
  useMountFeedback,
  useSurfaceFeedback,
} from "@/registry/native/lib/feedback"
import {
  FluidHoverScrollList,
  useFluidRemeasure,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { useMotion, useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getFittedSide,
  getMenuAvailableSpace,
  getMenuMaxHeight,
  getMenuMinWidth,
  getSafeInsets,
  getVerticalSide,
  useTriggerOpen,
} from "@/registry/native/lib/overlay-model"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import { DisclosurePanel } from "@/registry/native/ui/collapsible"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type DropdownMenuTriggerRef =
  React.RefObject<DropdownMenuPrimitive.TriggerRef | null>

const DropdownMenuContext = React.createContext<DropdownMenuTriggerRef | null>(
  null
)
// A submenu expands inline, so a portal inside the content is already home.
const DropdownMenuInsideContext = React.createContext(false)
const DropdownMenuRadioContext = React.createContext<{
  value: string | undefined
  onValueChange: (value: string) => void
} | null>(null)

// Letting go over a row after a drag runs this too, with no press to pass on.
type DropdownMenuRowPress = (event?: GestureResponderEvent) => void

const dropdownMenuItemTextVariants = cva("cn-dropdown-menu-item-text", {
  variants: {
    variant: {
      default: "",
      destructive: "cn-dropdown-menu-item-text-variant-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

/** Turns toward the rows it opens, on the disclosure timing. */
function SubmenuChevron({ isOpen }: { isOpen: boolean }) {
  const motion = useMotion("disclosure")
  const turn = useSharedValue(isOpen ? 1 : 0)
  React.useEffect(() => {
    turn.value = withTiming(isOpen ? 1 : 0, {
      duration: motion.isReduced ? 0 : motion.enterMs,
      easing: motion.enterEasing,
    })
  }, [isOpen, motion, turn])
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 90}deg` }],
  }))
  return (
    <Animated.View style={style}>
      <ChevronRightIcon />
    </Animated.View>
  )
}

/** What the primitive does when one of its rows closes the menu. */
function useCloseMenu() {
  const { onOpenChange, setTriggerPosition, setContentLayout } =
    DropdownMenuPrimitive.useRootContext()
  return () => {
    setTriggerPosition(null)
    setContentLayout(null)
    onOpenChange(false)
  }
}

// The primitive's portal renders this only while the menu is open.
function DropdownMenuFeedback() {
  useMountFeedback("popup")
  return null
}

function DropdownMenu({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: Omit<DropdownMenuPrimitive.RootProps, "onOpenChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const trigger = useTriggerOpen<DropdownMenuPrimitive.TriggerRef>({
    open,
    defaultOpen,
    onOpenChange,
  })
  return (
    <DropdownMenuContext value={trigger.triggerRef}>
      <DropdownMenuPrimitive.Root
        data-slot="dropdown-menu"
        onOpenChange={trigger.onOpenChange}
        {...props}
      />
    </DropdownMenuContext>
  )
}

function DropdownMenuPortal({
  children,
  ...props
}: DropdownMenuPrimitive.PortalProps) {
  const isInside = React.use(DropdownMenuInsideContext)
  if (isInside) return children
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props}>
      {children}
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuTrigger({
  render,
  asChild,
  children,
  ...props
}: Omit<DropdownMenuPrimitive.TriggerProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const triggerRef = React.use(DropdownMenuContext)
  const resolved = resolveRender({ render, asChild, children })
  return (
    <DropdownMenuPrimitive.Trigger
      ref={triggerRef}
      data-slot="dropdown-menu-trigger"
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </DropdownMenuPrimitive.Trigger>
  )
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  insets = COLLISION_INSETS,
  className,
  children,
  onLayout,
  ...props
}: Omit<DropdownMenuPrimitive.ContentProps, "side" | "children"> & {
  side?: "top" | "right" | "bottom" | "left"
  children?: React.ReactNode
}) {
  const density = useDensity()
  const { width, height } = useWindowDimensions()
  const safeArea = useSafeAreaInsets()
  const { triggerPosition } = DropdownMenuPrimitive.useRootContext()
  const [contentHeight, setContentHeight] = React.useState<number | null>(null)
  const fittedInsets = getSafeInsets(insets, safeArea)
  const verticalSide = getFittedSide({
    side: getVerticalSide(side),
    triggerY: triggerPosition?.pageY,
    triggerHeight: triggerPosition?.height,
    contentHeight,
    offset: sideOffset,
    windowHeight: height,
    insets: fittedInsets,
  })
  const maxHeight = getMenuMaxHeight(
    height,
    width,
    getMenuAvailableSpace({
      side: verticalSide,
      triggerY: triggerPosition?.pageY,
      triggerHeight: triggerPosition?.height,
      offset: sideOffset,
      windowHeight: height,
      insets: fittedInsets,
    })
  )
  const { entering, exiting, origin } = useSurfaceAnimation("popup", {
    side: verticalSide,
    align,
  })
  return (
    <DropdownMenuPortal>
      <DensityScope density={density}>
        <DropdownMenuPrimitive.Overlay aria-modal className="absolute inset-0">
          <DropdownMenuPrimitive.Content
            align={align}
            alignOffset={alignOffset}
            side={verticalSide}
            sideOffset={sideOffset}
            insets={fittedInsets}
            {...props}
            onLayout={(event) => {
              setContentHeight(event.nativeEvent.layout.height)
              onLayout?.(event)
            }}
          >
            <Animated.View
              data-slot="dropdown-menu-content"
              entering={entering}
              exiting={exiting}
              style={[
                origin,
                { minWidth: getMenuMinWidth(triggerPosition?.width, width) },
              ]}
              className={cn(
                "cn-dropdown-menu-content cn-dropdown-menu-content-logical",
                className
              )}
            >
              <DropdownMenuFeedback />
              <DropdownMenuInsideContext value={true}>
                <TextStyle className="cn-dropdown-menu-text">
                  <FluidHoverScrollList style={{ maxHeight }}>
                    {renderTextChildren(children)}
                  </FluidHoverScrollList>
                </TextStyle>
              </DropdownMenuInsideContext>
            </Animated.View>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Overlay>
      </DensityScope>
    </DropdownMenuPortal>
  )
}

function DropdownMenuGroup(props: DropdownMenuPrimitive.GroupProps) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof Text> & {
  inset?: boolean
}) {
  return (
    <Text
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("cn-dropdown-menu-label", className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  closeOnClick = true,
  render,
  asChild,
  children,
  onPress,
  ...props
}: Omit<DropdownMenuPrimitive.ItemProps, "children" | "onPress"> &
  RenderProps & {
    inset?: boolean
    variant?: "default" | "destructive"
    closeOnClick?: boolean
    onPress?: DropdownMenuRowPress
    children?: React.ReactNode
  }) {
  const resolved = resolveRender({ render, asChild, children })
  const feedback = useFeedback()
  const closeMenu = useCloseMenu()
  const { isLit, rowProps } = useFluidRow({
    ...props,
    onActivate: () => {
      feedback("tick")
      if (closeOnClick) closeMenu()
      onPress?.()
    },
  })
  return (
    // A destructive row stays destructive under the highlight.
    <TextStyle
      eases
      className={
        isLit && variant === "default"
          ? cn("cn-dropdown-menu-item-text-lit")
          : dropdownMenuItemTextVariants({ variant })
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>
        <DropdownMenuPrimitive.Item
          data-slot="dropdown-menu-item"
          data-inset={inset}
          data-variant={variant}
          closeOnPress={closeOnClick}
          className={cn(
            "cn-dropdown-menu-item relative flex-row items-center disabled:opacity-50",
            className
          )}
          onPress={(event) => {
            feedback("tick")
            onPress?.(event)
          }}
          {...props}
          {...rowProps}
          asChild={resolved.asChild}
        >
          {resolved.asChild
            ? resolved.children
            : renderTextChildren(resolved.children)}
        </DropdownMenuPrimitive.Item>
      </IconProvider>
    </TextStyle>
  )
}

function DropdownMenuSub(props: DropdownMenuPrimitive.SubProps) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  onPress,
  ...props
}: Omit<DropdownMenuPrimitive.SubTriggerProps, "children" | "onPress"> & {
  inset?: boolean
  onPress?: DropdownMenuRowPress
  children?: React.ReactNode
}) {
  const { open, onOpenChange } = DropdownMenuPrimitive.useSubContext()
  // Silent, like every trigger: the submenu sounds as it opens.
  const { isLit, rowProps } = useFluidRow({
    ...props,
    onActivate: () => {
      onOpenChange(!open)
      onPress?.()
    },
  })
  return (
    <TextStyle
      eases
      className={
        isLit || open
          ? cn("cn-dropdown-menu-item-text-lit")
          : dropdownMenuItemTextVariants()
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>
        <DropdownMenuPrimitive.SubTrigger
          data-slot="dropdown-menu-sub-trigger"
          data-inset={inset}
          data-state={open ? "open" : "closed"}
          data-lit={isLit}
          className={cn(
            "cn-dropdown-menu-sub-trigger flex-row items-center disabled:opacity-50",
            className
          )}
          onPress={onPress}
          {...props}
          {...rowProps}
        >
          {renderTextChildren(children)}
          <View className="ml-auto">
            <SubmenuChevron isOpen={open} />
          </View>
        </DropdownMenuPrimitive.SubTrigger>
      </IconProvider>
    </TextStyle>
  )
}

function DropdownMenuSubContent({
  align: _align,
  alignOffset: _alignOffset,
  side: _side,
  sideOffset: _sideOffset,
  className,
  children,
  ...props
}: Omit<DropdownMenuPrimitive.SubContentProps, "children"> &
  Pick<
    React.ComponentProps<typeof DropdownMenuContent>,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & { children?: React.ReactNode }) {
  const { open } = DropdownMenuPrimitive.useSubContext()
  const remeasure = useFluidRemeasure()
  useSurfaceFeedback("popup", open)
  // Inline on a phone: the rows open like a disclosure, and those below follow.
  return (
    <DisclosurePanel isOpen={open} onLayout={() => remeasure?.()}>
      <DropdownMenuPrimitive.SubContent
        forceMount
        data-slot="dropdown-menu-sub-content"
        className={cn("cn-dropdown-menu-sub-content", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </DropdownMenuPrimitive.SubContent>
    </DisclosurePanel>
  )
}

// A chosen row reads foreground and semibold; a lit one foreground, with a heavier icon.
function DropdownMenuChoiceText({
  isChecked,
  isLit,
  children,
}: {
  isChecked: boolean
  isLit: boolean
  children?: React.ReactNode
}) {
  return (
    <TextStyle
      eases
      className={
        isChecked
          ? cn(
              "cn-dropdown-menu-choice-text cn-dropdown-menu-choice-text-checked"
            )
          : isLit
            ? cn(
                "cn-dropdown-menu-choice-text cn-dropdown-menu-choice-text-lit"
              )
            : cn("cn-dropdown-menu-choice-text")
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>{children}</IconProvider>
    </TextStyle>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  defaultChecked = false,
  onCheckedChange,
  inset,
  closeOnClick = false,
  onPress,
  ...props
}: Omit<
  DropdownMenuPrimitive.CheckboxItemProps,
  "children" | "checked" | "onCheckedChange" | "onPress"
> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  inset?: boolean
  closeOnClick?: boolean
  onPress?: DropdownMenuRowPress
  children?: React.ReactNode
}) {
  const [isChecked = false, setIsChecked] = useControllableState({
    prop: checked,
    defaultProp: defaultChecked,
    onChange: onCheckedChange,
  })
  const feedback = useFeedback()
  const closeMenu = useCloseMenu()
  const { isLit, rowProps } = useFluidRow({
    ...props,
    onActivate: () => {
      feedback(isChecked ? "uncheck" : "check")
      setIsChecked(!isChecked)
      if (closeOnClick) closeMenu()
      onPress?.()
    },
  })
  return (
    <DropdownMenuChoiceText isChecked={isChecked} isLit={isLit}>
      <DropdownMenuPrimitive.CheckboxItem
        data-slot="dropdown-menu-checkbox-item"
        data-inset={inset}
        data-checked={isChecked}
        checked={isChecked}
        onCheckedChange={setIsChecked}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-dropdown-menu-checkbox-item relative flex-row items-center disabled:opacity-50",
          className
        )}
        onPress={(event) => {
          feedback(isChecked ? "uncheck" : "check")
          onPress?.(event)
        }}
        {...props}
        {...rowProps}
      >
        <View
          data-slot="dropdown-menu-checkbox-item-indicator"
          pointerEvents="none"
          className="cn-dropdown-menu-item-indicator absolute items-center justify-center"
        >
          <TextStyle className="cn-dropdown-menu-item-indicator-text">
            <DropdownMenuPrimitive.ItemIndicator>
              <CheckIcon />
            </DropdownMenuPrimitive.ItemIndicator>
          </TextStyle>
        </View>
        {renderTextChildren(children)}
      </DropdownMenuPrimitive.CheckboxItem>
    </DropdownMenuChoiceText>
  )
}

function DropdownMenuRadioGroup({
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<DropdownMenuPrimitive.RadioGroupProps, "value" | "onValueChange"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [current, setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  return (
    <DropdownMenuRadioContext
      value={{ value: current, onValueChange: setCurrent }}
    >
      <DropdownMenuPrimitive.RadioGroup
        data-slot="dropdown-menu-radio-group"
        value={current}
        onValueChange={setCurrent}
        {...props}
      />
    </DropdownMenuRadioContext>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  value,
  closeOnClick = false,
  onPress,
  ...props
}: Omit<DropdownMenuPrimitive.RadioItemProps, "children" | "onPress"> & {
  inset?: boolean
  closeOnClick?: boolean
  onPress?: DropdownMenuRowPress
  children?: React.ReactNode
}) {
  const radio = React.use(DropdownMenuRadioContext)
  const isChecked = radio?.value === value
  const feedback = useFeedback()
  const closeMenu = useCloseMenu()
  const { isLit, rowProps } = useFluidRow({
    ...props,
    onActivate: () => {
      feedback("pick")
      radio?.onValueChange(value)
      if (closeOnClick) closeMenu()
      onPress?.()
    },
  })
  return (
    <DropdownMenuChoiceText isChecked={isChecked} isLit={isLit}>
      <DropdownMenuPrimitive.RadioItem
        data-slot="dropdown-menu-radio-item"
        data-inset={inset}
        data-checked={isChecked}
        value={value}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-dropdown-menu-radio-item relative flex-row items-center disabled:opacity-50",
          className
        )}
        onPress={(event) => {
          feedback("pick")
          onPress?.(event)
        }}
        {...props}
        {...rowProps}
      >
        <View
          data-slot="dropdown-menu-radio-item-indicator"
          pointerEvents="none"
          className="cn-dropdown-menu-item-indicator absolute items-center justify-center"
        >
          <TextStyle className="cn-dropdown-menu-item-indicator-text">
            <DropdownMenuPrimitive.ItemIndicator>
              <CheckIcon />
            </DropdownMenuPrimitive.ItemIndicator>
          </TextStyle>
        </View>
        {renderTextChildren(children)}
      </DropdownMenuPrimitive.RadioItem>
    </DropdownMenuChoiceText>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuPrimitive.SeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("cn-dropdown-menu-separator", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="dropdown-menu-shortcut"
      className={cn("cn-dropdown-menu-shortcut", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
