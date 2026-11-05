import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  IconProvider,
} from "@fabricator-ui/icons-react-native"
import * as ContextMenuPrimitive from "@rn-primitives/context-menu"
import { useControllableState } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from "react-native"
import Animated from "react-native-reanimated"

import {
  useFeedback,
  useMountFeedback,
  useSurfaceFeedback,
} from "@/registry/native/lib/feedback"
import {
  FluidHoverScrollList,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  COLLISION_INSETS,
  getMenuMaxHeight,
  getVerticalSide,
  useTriggerOpen,
} from "@/registry/native/lib/overlay-model"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type ContextMenuTriggerRef =
  React.RefObject<ContextMenuPrimitive.TriggerRef | null>

const ContextMenuContext = React.createContext<ContextMenuTriggerRef | null>(
  null
)
// A submenu expands inline, so a portal inside the content is already home.
const ContextMenuInsideContext = React.createContext(false)
const ContextMenuRadioContext = React.createContext<{
  value: string | undefined
  onValueChange: (value: string) => void
} | null>(null)

// Letting go over a row after a drag runs this too, with no press to pass on.
type ContextMenuRowPress = (event?: GestureResponderEvent) => void

const contextMenuItemTextVariants = cva("cn-context-menu-item-text", {
  variants: {
    variant: {
      default: "",
      destructive: "cn-context-menu-item-text-variant-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

/** What the primitive does when one of its rows closes the menu. */
function useCloseMenu() {
  const { onOpenChange, setPressPosition, setContentLayout } =
    ContextMenuPrimitive.useRootContext()
  return () => {
    setPressPosition(null)
    setContentLayout(null)
    onOpenChange(false)
  }
}

// The primitive's portal renders this only while the menu is open.
function ContextMenuFeedback() {
  useMountFeedback("popup")
  return null
}

function ContextMenu({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: Omit<ContextMenuPrimitive.RootProps, "onOpenChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const trigger = useTriggerOpen<ContextMenuPrimitive.TriggerRef>({
    open,
    defaultOpen,
    onOpenChange,
  })
  return (
    <ContextMenuContext value={trigger.triggerRef}>
      <ContextMenuPrimitive.Root
        data-slot="context-menu"
        onOpenChange={trigger.onOpenChange}
        {...props}
      />
    </ContextMenuContext>
  )
}

function ContextMenuPortal({
  children,
  ...props
}: ContextMenuPrimitive.PortalProps) {
  const isInside = React.use(ContextMenuInsideContext)
  if (isInside) return children
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props}>
      {children}
    </ContextMenuPrimitive.Portal>
  )
}

/** A long press opens it, where a right click does on the website. */
function ContextMenuTrigger({
  className,
  render,
  asChild,
  children,
  ...props
}: Omit<ContextMenuPrimitive.TriggerProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const triggerRef = React.use(ContextMenuContext)
  const resolved = resolveRender({ render, asChild, children })
  return (
    <ContextMenuPrimitive.Trigger
      ref={triggerRef}
      data-slot="context-menu-trigger"
      className={cn("cn-context-menu-trigger", className)}
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </ContextMenuPrimitive.Trigger>
  )
}

function ContextMenuContent({
  className,
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  insets = COLLISION_INSETS,
  children,
  ...props
}: Omit<ContextMenuPrimitive.ContentProps, "side"> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const density = useDensity()
  const verticalSide = getVerticalSide(side)
  const { entering, exiting, origin } = useSurfaceAnimation("popup", {
    side: verticalSide,
    align,
  })
  const { height } = useWindowDimensions()
  return (
    <ContextMenuPortal>
      <DensityScope density={density}>
        <ContextMenuPrimitive.Overlay aria-modal className="absolute inset-0">
          <ContextMenuPrimitive.Content
            align={align}
            alignOffset={alignOffset}
            side={verticalSide}
            sideOffset={sideOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="context-menu-content"
              entering={entering}
              exiting={exiting}
              style={origin}
              className={cn(
                "cn-context-menu-content cn-context-menu-content-logical",
                className
              )}
            >
              <ContextMenuFeedback />
              <ContextMenuInsideContext value={true}>
                <TextStyle className="cn-context-menu-text">
                  <FluidHoverScrollList
                    style={{ maxHeight: getMenuMaxHeight(height) }}
                  >
                    {renderTextChildren(children)}
                  </FluidHoverScrollList>
                </TextStyle>
              </ContextMenuInsideContext>
            </Animated.View>
          </ContextMenuPrimitive.Content>
        </ContextMenuPrimitive.Overlay>
      </DensityScope>
    </ContextMenuPortal>
  )
}

function ContextMenuGroup(props: ContextMenuPrimitive.GroupProps) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof Text> & {
  inset?: boolean
}) {
  return (
    <Text
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn("cn-context-menu-label", className)}
      {...props}
    />
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  closeOnClick = true,
  render,
  asChild,
  children,
  onPress,
  ...props
}: Omit<ContextMenuPrimitive.ItemProps, "children" | "onPress"> &
  RenderProps & {
    inset?: boolean
    variant?: "default" | "destructive"
    closeOnClick?: boolean
    onPress?: ContextMenuRowPress
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
          ? cn("cn-context-menu-item-text-lit")
          : contextMenuItemTextVariants({ variant })
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>
        <ContextMenuPrimitive.Item
          data-slot="context-menu-item"
          data-inset={inset}
          data-variant={variant}
          closeOnPress={closeOnClick}
          className={cn(
            "cn-context-menu-item relative flex-row items-center disabled:opacity-50",
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
        </ContextMenuPrimitive.Item>
      </IconProvider>
    </TextStyle>
  )
}

function ContextMenuSub(props: ContextMenuPrimitive.SubProps) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  onPress,
  ...props
}: Omit<ContextMenuPrimitive.SubTriggerProps, "children" | "onPress"> & {
  inset?: boolean
  onPress?: ContextMenuRowPress
  children?: React.ReactNode
}) {
  const { open, onOpenChange } = ContextMenuPrimitive.useSubContext()
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
          ? cn("cn-context-menu-item-text-lit")
          : contextMenuItemTextVariants()
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>
        <ContextMenuPrimitive.SubTrigger
          data-slot="context-menu-sub-trigger"
          data-inset={inset}
          data-state={open ? "open" : "closed"}
          data-lit={isLit}
          className={cn(
            "cn-context-menu-sub-trigger flex-row items-center disabled:opacity-50",
            className
          )}
          onPress={onPress}
          {...props}
          {...rowProps}
        >
          {renderTextChildren(children)}
          <View className="ml-auto">
            {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </View>
        </ContextMenuPrimitive.SubTrigger>
      </IconProvider>
    </TextStyle>
  )
}

function ContextMenuSubContent({
  align: _align,
  alignOffset: _alignOffset,
  side: _side,
  sideOffset: _sideOffset,
  className,
  children,
  ...props
}: Omit<ContextMenuPrimitive.SubContentProps, "children"> &
  Pick<
    React.ComponentProps<typeof ContextMenuContent>,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & { children?: React.ReactNode }) {
  const { open } = ContextMenuPrimitive.useSubContext()
  useSurfaceFeedback("popup", open)
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      className={cn("cn-context-menu-subcontent", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </ContextMenuPrimitive.SubContent>
  )
}

// A chosen row reads foreground and semibold; a lit one foreground, with a heavier icon.
function ContextMenuChoiceText({
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
              "cn-context-menu-choice-text cn-context-menu-choice-text-checked"
            )
          : isLit
            ? cn("cn-context-menu-choice-text cn-context-menu-choice-text-lit")
            : cn("cn-context-menu-choice-text")
      }
    >
      <IconProvider strokeWidth={isLit ? 2 : 1.5}>{children}</IconProvider>
    </TextStyle>
  )
}

function ContextMenuCheckboxItem({
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
  ContextMenuPrimitive.CheckboxItemProps,
  "children" | "checked" | "onCheckedChange" | "onPress"
> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  inset?: boolean
  closeOnClick?: boolean
  onPress?: ContextMenuRowPress
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
    <ContextMenuChoiceText isChecked={isChecked} isLit={isLit}>
      <ContextMenuPrimitive.CheckboxItem
        data-slot="context-menu-checkbox-item"
        data-inset={inset}
        data-checked={isChecked}
        checked={isChecked}
        onCheckedChange={setIsChecked}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-context-menu-checkbox-item relative flex-row items-center disabled:opacity-50",
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
          pointerEvents="none"
          className="cn-context-menu-item-indicator absolute items-center justify-center"
        >
          <TextStyle className="cn-context-menu-item-indicator-text">
            <ContextMenuPrimitive.ItemIndicator>
              <CheckIcon />
            </ContextMenuPrimitive.ItemIndicator>
          </TextStyle>
        </View>
        {renderTextChildren(children)}
      </ContextMenuPrimitive.CheckboxItem>
    </ContextMenuChoiceText>
  )
}

function ContextMenuRadioGroup({
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<ContextMenuPrimitive.RadioGroupProps, "value" | "onValueChange"> & {
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
    <ContextMenuRadioContext
      value={{ value: current, onValueChange: setCurrent }}
    >
      <ContextMenuPrimitive.RadioGroup
        data-slot="context-menu-radio-group"
        value={current}
        onValueChange={setCurrent}
        {...props}
      />
    </ContextMenuRadioContext>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  inset,
  value,
  closeOnClick = false,
  onPress,
  ...props
}: Omit<ContextMenuPrimitive.RadioItemProps, "children" | "onPress"> & {
  inset?: boolean
  closeOnClick?: boolean
  onPress?: ContextMenuRowPress
  children?: React.ReactNode
}) {
  const radio = React.use(ContextMenuRadioContext)
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
    <ContextMenuChoiceText isChecked={isChecked} isLit={isLit}>
      <ContextMenuPrimitive.RadioItem
        data-slot="context-menu-radio-item"
        data-inset={inset}
        data-checked={isChecked}
        value={value}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-context-menu-radio-item relative flex-row items-center disabled:opacity-50",
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
          pointerEvents="none"
          className="cn-context-menu-item-indicator absolute items-center justify-center"
        >
          <TextStyle className="cn-context-menu-item-indicator-text">
            <ContextMenuPrimitive.ItemIndicator>
              <CheckIcon />
            </ContextMenuPrimitive.ItemIndicator>
          </TextStyle>
        </View>
        {renderTextChildren(children)}
      </ContextMenuPrimitive.RadioItem>
    </ContextMenuChoiceText>
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuPrimitive.SeparatorProps) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("cn-context-menu-separator", className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="context-menu-shortcut"
      className={cn("cn-context-menu-shortcut", className)}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
}
