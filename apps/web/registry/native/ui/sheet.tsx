import * as React from "react"
import { XIcon } from "@fabricator-ui/icons-react-native"
import {
  useComposedRefs,
  useControllableState,
  useRestoreAccessibilityFocus,
} from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, View, type GestureResponderEvent } from "react-native"
import type Animated from "react-native-reanimated"

import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import type { SheetSide } from "@/registry/native/lib/sheet-model"
import {
  SheetSurface,
  SheetSurfaceOverlay,
} from "@/registry/native/lib/sheet-surface"
import { Button } from "@/registry/native/ui/button"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type SheetContextValue = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  modal: boolean
  disablePointerDismissal: boolean
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheet() {
  const context = React.use(SheetContext)
  if (!context) throw new Error("useSheet must be used within a Sheet.")
  return context
}

type PressablePartProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "children"
> &
  RenderProps & { children?: React.ReactNode }

function Sheet({
  open,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  disablePointerDismissal = false,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  disablePointerDismissal?: boolean
}) {
  const [isOpen = false, setIsOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const context = React.useMemo(
    () => ({ isOpen, setIsOpen, modal, disablePointerDismissal }),
    [disablePointerDismissal, isOpen, modal, setIsOpen]
  )
  return (
    <SheetContext value={context}>
      <View data-slot="sheet" {...props}>
        {children}
      </View>
    </SheetContext>
  )
}

function SheetTrigger({
  render,
  asChild,
  children,
  onPress,
  ref,
  ...props
}: PressablePartProps) {
  const { isOpen, setIsOpen } = useSheet()
  const triggerRef = React.useRef<React.ComponentRef<typeof View>>(null)
  useRestoreAccessibilityFocus(isOpen, triggerRef)
  const composedRef = useComposedRefs(triggerRef, ref)
  const shared = {
    "data-slot": "sheet-trigger",
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

function SheetClose({
  render,
  asChild,
  children,
  onPress,
  ...props
}: PressablePartProps) {
  const { setIsOpen } = useSheet()
  const shared = {
    "data-slot": "sheet-close",
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

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  return (
    <SheetSurfaceOverlay
      data-slot="sheet-overlay"
      className={cn("cn-sheet-overlay", className)}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Omit<
  React.ComponentProps<typeof SheetSurface>,
  "open" | "onOpenChange" | "side"
> & {
  side?: SheetSide
  showCloseButton?: boolean
}) {
  const sheet = useSheet()
  return (
    <SheetSurface
      data-slot="sheet-content"
      data-side={side}
      rootProps={{ "data-slot": "sheet-portal" }}
      open={sheet.isOpen}
      onOpenChange={sheet.setIsOpen}
      side={side}
      modal={sheet.modal}
      dismissible={!sheet.disablePointerDismissal}
      overlay={<SheetOverlay />}
      className={cn("cn-sheet-content flex-col", className)}
      {...props}
    >
      <SheetContext value={sheet}>
        <TextStyle className="cn-sheet-text">
          {renderTextChildren(children)}
          {showCloseButton && (
            <SheetClose
              accessibilityLabel="Close"
              render={
                <Button
                  data-side={side}
                  variant="ghost"
                  size="icon-sm"
                  className="cn-sheet-close absolute"
                />
              }
            >
              <XIcon />
            </SheetClose>
          )}
        </TextStyle>
      </SheetContext>
    </SheetSurface>
  )
}

function SheetHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="sheet-header"
      className={cn("cn-sheet-header flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function SheetFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="sheet-footer"
      className={cn("cn-sheet-footer mt-auto flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="sheet-title"
      role="heading"
      className={cn("cn-sheet-title", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="sheet-description"
      className={cn("cn-sheet-description", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetTrigger,
}
