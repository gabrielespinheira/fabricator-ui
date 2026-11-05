import * as React from "react"
import {
  useComposedRefs,
  useControllableState,
  useRestoreAccessibilityFocus,
} from "@rn-primitives/hooks"
import { Portal } from "@rn-primitives/portal"
import { cn } from "cn"
import { Pressable, View, type GestureResponderEvent } from "react-native"
import type Animated from "react-native-reanimated"

import { NO_LAYOUT } from "@/registry/native/lib/overlay-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import {
  getSideForSwipe,
  getSwipeAxis,
  type SwipeDirection,
} from "@/registry/native/lib/sheet-model"
import {
  SheetSurface,
  SheetSurfaceOverlay,
} from "@/registry/native/lib/sheet-surface"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type DrawerContextProps = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  modal: boolean
  disablePointerDismissal: boolean
  showSwipeHandle: boolean
  swipeDirection: SwipeDirection
  swipeAxis: "x" | "y"
}

const DrawerContext = React.createContext<DrawerContextProps | null>(null)

function useDrawer() {
  const context = React.use(DrawerContext)
  if (!context) throw new Error("useDrawer must be used within a Drawer.")
  return context
}

type PressablePartProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "children"
> &
  RenderProps & { children?: React.ReactNode }

function Drawer({
  open,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  disablePointerDismissal = false,
  showSwipeHandle = false,
  snapPoints: _snapPoints,
  swipeDirection = "down",
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  disablePointerDismissal?: boolean
  showSwipeHandle?: boolean
  /** Kept so code from the website compiles. It opens at its content's height. */
  snapPoints?: readonly (number | string)[]
  swipeDirection?: SwipeDirection
}) {
  const [isOpen = false, setIsOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const context = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      modal,
      disablePointerDismissal,
      showSwipeHandle,
      swipeDirection,
      swipeAxis: getSwipeAxis(getSideForSwipe(swipeDirection)),
    }),
    [
      disablePointerDismissal,
      isOpen,
      modal,
      setIsOpen,
      showSwipeHandle,
      swipeDirection,
    ]
  )
  return (
    <DrawerContext value={context}>
      <View data-slot="drawer" style={NO_LAYOUT} {...props}>
        {children}
      </View>
    </DrawerContext>
  )
}

function DrawerTrigger({
  render,
  asChild,
  children,
  onPress,
  ref,
  ...props
}: PressablePartProps) {
  const { isOpen, setIsOpen } = useDrawer()
  const triggerRef = React.useRef<React.ComponentRef<typeof View>>(null)
  useRestoreAccessibilityFocus(isOpen, triggerRef)
  const composedRef = useComposedRefs(triggerRef, ref)
  const shared = {
    "data-slot": "drawer-trigger",
    role: "button" as const,
    "aria-expanded": isOpen,
    ref: composedRef,
    onPress: (event: GestureResponderEvent) => {
      setIsOpen(!isOpen)
      onPress?.(event)
    },
    ...props,
  }
  return (
    renderSlot({ render, asChild }, shared, children) ?? (
      <Pressable {...shared}>{renderTextChildren(children)}</Pressable>
    )
  )
}

function DrawerPortal({
  hostName,
  children,
}: {
  hostName?: string
  children?: React.ReactNode
}) {
  const name = React.useId()
  return (
    <Portal data-slot="drawer-portal" name={name} hostName={hostName}>
      <React.Fragment key={name}>{children}</React.Fragment>
    </Portal>
  )
}

function DrawerClose({
  render,
  asChild,
  children,
  onPress,
  ...props
}: PressablePartProps) {
  const { setIsOpen } = useDrawer()
  const shared = {
    "data-slot": "drawer-close",
    role: "button" as const,
    onPress: (event: GestureResponderEvent) => {
      setIsOpen(false)
      onPress?.(event)
    },
    ...props,
  }
  return (
    renderSlot({ render, asChild }, shared, children) ?? (
      <Pressable {...shared}>{renderTextChildren(children)}</Pressable>
    )
  )
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  return (
    <SheetSurfaceOverlay
      data-slot="drawer-overlay"
      className={cn("cn-drawer-overlay", className)}
      {...props}
    />
  )
}

function DrawerSwipeHandle({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const { swipeAxis } = useDrawer()
  return (
    <View
      data-slot="drawer-swipe-handle"
      data-swipe-axis={swipeAxis}
      aria-hidden
      className={cn(
        "cn-drawer-swipe-handle shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      <View
        data-swipe-axis={swipeAxis}
        className="cn-drawer-swipe-handle-bar shrink-0"
      />
    </View>
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof SheetSurface>,
  "open" | "onOpenChange" | "side"
>) {
  const drawer = useDrawer()
  const { swipeAxis, swipeDirection } = drawer
  const handle = drawer.showSwipeHandle ? <DrawerSwipeHandle /> : null
  // The handle sits on the edge away from the one it swipes toward.
  const isHandleLast = swipeDirection === "up" || swipeDirection === "left"
  return (
    <SheetSurface
      data-slot="drawer-popup"
      data-swipe-axis={swipeAxis}
      data-swipe-direction={swipeDirection}
      rootProps={{ "data-slot": "drawer-portal" }}
      viewportProps={{ "data-slot": "drawer-viewport" }}
      open={drawer.isOpen}
      onOpenChange={drawer.setIsOpen}
      side={getSideForSwipe(swipeDirection)}
      modal={drawer.modal}
      dismissible={!drawer.disablePointerDismissal}
      overlay={<DrawerOverlay />}
      className={cn("cn-drawer-popup", className)}
      {...props}
    >
      <DrawerContext value={drawer}>
        <TextStyle className="cn-drawer-text">
          {isHandleLast ? null : handle}
          <View
            data-slot="drawer-content"
            data-swipe-axis={swipeAxis}
            className="cn-drawer-content-base shrink grow flex-col overflow-hidden"
          >
            {renderTextChildren(children)}
          </View>
          {isHandleLast ? handle : null}
        </TextStyle>
      </DrawerContext>
    </SheetSurface>
  )
}

function DrawerHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="drawer-header"
      className={cn("cn-drawer-header-base shrink-0 flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function DrawerFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="drawer-footer"
      className={cn(
        "cn-drawer-footer-base mt-auto shrink-0 flex-col",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { swipeAxis } = useDrawer()
  return (
    <Text
      data-slot="drawer-title"
      data-swipe-axis={swipeAxis}
      role="heading"
      className={cn("cn-drawer-title", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { swipeAxis } = useDrawer()
  return (
    <Text
      data-slot="drawer-description"
      data-swipe-axis={swipeAxis}
      className={cn("cn-drawer-description", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
}
