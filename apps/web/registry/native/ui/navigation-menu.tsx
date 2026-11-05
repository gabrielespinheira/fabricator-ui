// A desktop pattern on touch: triggers in a row that scrolls, each opening its panel
// in a popover, or a sheet on phones. A link pressed inside a panel closes it.
import * as React from "react"
import {
  ChevronDownIcon,
  IconProvider,
} from "@fabricator-ui/icons-react-native"
import { useComposedRefs, useControllableState } from "@rn-primitives/hooks"
import * as NavigationMenuPrimitive from "@rn-primitives/navigation-menu"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  View,
  type GestureResponderEvent,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useIsMobile } from "@/registry/native/hooks/use-mobile"
import { useFeedback, useMountFeedback } from "@/registry/native/lib/feedback"
import {
  FluidHoverHighlight,
  FluidHoverList,
  FluidHoverProvider,
  useFluidHover,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { useMotion, useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getVerticalSide,
} from "@/registry/native/lib/overlay-model"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import {
  SheetSurface,
  SheetSurfaceScrollView,
} from "@/registry/native/lib/sheet-surface"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

type NavigationMenuAlign = "start" | "center" | "end"

type NavigationMenuContextValue = {
  align: NavigationMenuAlign
  close: () => void
}

const NavigationMenuContext =
  React.createContext<NavigationMenuContextValue | null>(null)

function useNavigationMenu() {
  const context = React.use(NavigationMenuContext)
  if (!context) {
    throw new Error(
      "NavigationMenu parts must be used within a NavigationMenu."
    )
  }
  return context
}

function NavigationMenu({
  align = "start",
  className,
  value,
  defaultValue = "",
  onValueChange,
  children,
  ...props
}: Omit<NavigationMenuPrimitive.RootProps, "value" | "onValueChange"> & {
  /** Where a panel lines up with its trigger. */
  align?: NavigationMenuAlign
  /** The open item, or "" with none open. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [current = "", setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next)
    },
  })
  const context = React.useMemo(
    () => ({ align, close: () => setCurrent("") }),
    [align, setCurrent]
  )
  return (
    <NavigationMenuContext value={context}>
      <NavigationMenuPrimitive.Root
        data-slot="navigation-menu"
        value={current}
        onValueChange={(next) => setCurrent(next ?? "")}
        className={cn("cn-navigation-menu relative", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </NavigationMenuPrimitive.Root>
    </NavigationMenuContext>
  )
}

function NavigationMenuList({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.ListProps) {
  // The strip scrolls sideways, so a drag there stays a scroll: a press lights a
  // trigger, and glides from the last one.
  const fluid = useFluidHover({ axis: "x" })
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className="grow-0"
    >
      <FluidHoverProvider fluid={fluid}>
        <NavigationMenuPrimitive.List
          ref={fluid.attach}
          data-slot="navigation-menu-list"
          className={cn(
            "cn-navigation-menu-list relative flex-row items-center",
            className
          )}
          {...props}
        >
          <FluidHoverHighlight hover={fluid.hover} />
          {renderTextChildren(children)}
        </NavigationMenuPrimitive.List>
      </FluidHoverProvider>
    </ScrollView>
  )
}

function NavigationMenuItem({
  className,
  value,
  children,
  ...props
}: Omit<NavigationMenuPrimitive.ItemProps, "value"> & { value?: string }) {
  const fallback = React.useId()
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      value={value ?? fallback}
      className={cn("cn-navigation-menu-item relative", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </NavigationMenuPrimitive.Item>
  )
}

const navigationMenuTriggerStyle = cva(
  "cn-navigation-menu-trigger shrink-0 flex-row items-center justify-center"
)

function NavigationMenuTrigger({
  className,
  children,
  ref,
  ...props
}: Omit<NavigationMenuPrimitive.TriggerProps, "children"> & {
  children?: React.ReactNode
  ref?: React.Ref<NavigationMenuPrimitive.TriggerRef>
}) {
  const { value, triggerPosition, setTriggerPosition } =
    NavigationMenuPrimitive.useRootContext()
  const { value: itemValue } = NavigationMenuPrimitive.useItemContext()
  const motion = useMotion("popup")
  const isOpen = value === itemValue
  const triggerRef = React.useRef<NavigationMenuPrimitive.TriggerRef>(null)
  const composedRef = useComposedRefs(triggerRef, ref)
  const { isLit, rowProps } = useFluidRow(props)

  // Opened from state, no press has measured it, and a popover needs its anchor.
  React.useEffect(() => {
    if (!isOpen || triggerPosition) return
    triggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setTriggerPosition({ width, pageX, pageY, height })
    })
  }, [isOpen, setTriggerPosition, triggerPosition])

  const rotation = useSharedValue(isOpen ? 180 : 0)
  React.useEffect(() => {
    rotation.value = withTiming(isOpen ? 180 : 0, {
      duration: motion.isReduced ? 0 : motion.enterMs,
      easing: motion.enterEasing,
    })
  }, [isOpen, motion, rotation])
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))
  return (
    <TextStyle
      className={
        isOpen || isLit
          ? cn(
              "cn-navigation-menu-trigger-text cn-navigation-menu-trigger-text-open"
            )
          : cn("cn-navigation-menu-trigger-text")
      }
    >
      <NavigationMenuPrimitive.Trigger
        ref={composedRef}
        data-slot="navigation-menu-trigger"
        data-state={isOpen ? "open" : "closed"}
        hitSlop={4}
        className={cn(navigationMenuTriggerStyle(), className)}
        {...props}
        {...rowProps}
      >
        {renderTextChildren(children)}
        <Animated.View
          className="cn-navigation-menu-trigger-icon items-center justify-center"
          style={iconStyle}
        >
          <ChevronDownIcon size={12} />
        </Animated.View>
      </NavigationMenuPrimitive.Trigger>
    </TextStyle>
  )
}

/** A panel: a popover on tablets, a sheet on phones. */
function NavigationMenuContent({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.ContentProps) {
  // On a phone the panel scrolls in its sheet, so a flick has to stay a scroll.
  const isPhone = useIsMobile()
  return (
    <NavigationMenuPositioner>
      <FluidHoverList
        axis="xy"
        track={isPhone ? "hold" : "drag"}
        data-slot="navigation-menu-content"
        className={cn("cn-navigation-menu-content flex-col", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </FluidHoverList>
    </NavigationMenuPositioner>
  )
}

// The primitive's portal renders this only while the panel is open.
function NavigationMenuFeedback() {
  useMountFeedback("popup")
  return null
}

/**
 * Where a panel opens. The website's panels share one popup that moves between
 * triggers; each panel here has its own, and they're modal, so only one shows.
 */
function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align,
  alignOffset = 0,
  insets = COLLISION_INSETS,
  children,
  ...props
}: Omit<NavigationMenuPrimitive.ContentProps, "side" | "align"> & {
  side?: "top" | "right" | "bottom" | "left"
  align?: NavigationMenuAlign
}) {
  const menu = useNavigationMenu()
  const root = NavigationMenuPrimitive.useRootContext()
  const { value: itemValue } = NavigationMenuPrimitive.useItemContext()
  const isPhone = useIsMobile()
  const density = useDensity()
  const verticalSide = getVerticalSide(side)
  const { entering, exiting, origin } = useSurfaceAnimation("popup", {
    side: verticalSide,
    align: align ?? menu.align,
  })
  const close = () => {
    root.setTriggerPosition(null)
    root.setContentLayout(null)
    menu.close()
  }
  // A portal leaves the React tree, and links close the panel from inside it.
  const panel = { align: menu.align, close }

  if (isPhone) {
    return (
      <SheetSurface
        data-slot="navigation-menu-popup"
        data-presentation="sheet"
        open={root.value === itemValue}
        onOpenChange={(next) => {
          if (!next) close()
        }}
        side="bottom"
        className="cn-navigation-menu-popup"
      >
        <NavigationMenuContext value={panel}>
          <TextStyle className="cn-navigation-menu-popup-text">
            <View className="cn-navigation-menu-sheet-handle items-center">
              <View className="cn-navigation-menu-sheet-handle-bar" />
            </View>
            <SheetSurfaceScrollView>{children}</SheetSurfaceScrollView>
          </TextStyle>
        </NavigationMenuContext>
      </SheetSurface>
    )
  }

  return (
    <NavigationMenuPrimitive.Portal>
      <DensityScope density={density}>
        <Pressable
          aria-modal
          accessible={false}
          className="absolute inset-0"
          onPress={close}
        >
          <NavigationMenuPrimitive.Content
            side={verticalSide}
            sideOffset={sideOffset}
            align={align ?? menu.align}
            alignOffset={alignOffset}
            insets={insets}
            className={cn("cn-navigation-menu-positioner", className)}
            {...props}
          >
            <Animated.View
              data-presentation="popover"
              entering={entering}
              exiting={exiting}
              style={origin}
              className="cn-navigation-menu-popup"
            >
              <NavigationMenuFeedback />
              <NavigationMenuContext value={panel}>
                <TextStyle className="cn-navigation-menu-popup-text">
                  {children}
                </TextStyle>
              </NavigationMenuContext>
            </Animated.View>
          </NavigationMenuPrimitive.Content>
        </Pressable>
      </DensityScope>
    </NavigationMenuPrimitive.Portal>
  )
}

function NavigationMenuLink({
  className,
  active = false,
  render,
  asChild,
  children,
  onPress,
  ...props
}: Omit<NavigationMenuPrimitive.LinkProps, "children" | "onPress"> &
  RenderProps & {
    /** After a drag, letting go over the link runs this with no press to pass on. */
    onPress?: (event?: GestureResponderEvent) => void
    children?: React.ReactNode
  }) {
  const menu = useNavigationMenu()
  const feedback = useFeedback()
  const resolved = resolveRender({ render, asChild, children })
  const { isLit, rowProps } = useFluidRow({
    ...props,
    onActivate: () => {
      feedback("tick")
      onPress?.()
      menu.close()
    },
  })
  return (
    <TextStyle
      className={
        active || isLit
          ? cn(
              "cn-navigation-menu-link-text cn-navigation-menu-link-text-active"
            )
          : cn("cn-navigation-menu-link-text")
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>
        <NavigationMenuPrimitive.Link
          data-slot="navigation-menu-link"
          data-active={active}
          accessibilityState={{ selected: active }}
          className={cn(
            "cn-navigation-menu-link flex-row items-center",
            className
          )}
          onPress={(event) => {
            feedback("tick")
            onPress?.(event)
            menu.close()
          }}
          {...props}
          {...rowProps}
          asChild={resolved.asChild}
        >
          {resolved.asChild
            ? resolved.children
            : renderTextChildren(resolved.children)}
        </NavigationMenuPrimitive.Link>
      </IconProvider>
    </TextStyle>
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: NavigationMenuPrimitive.IndicatorProps) {
  const root = NavigationMenuPrimitive.useRootContext()
  const { value: itemValue } = NavigationMenuPrimitive.useItemContext()
  if (root.value !== itemValue) return null
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "cn-navigation-menu-indicator absolute inset-x-0 top-full z-1",
        className
      )}
      {...props}
    >
      <View className="cn-navigation-menu-indicator-arrow relative" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
}
