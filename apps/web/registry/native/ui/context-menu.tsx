import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import * as ContextMenuPrimitive from "@rn-primitives/context-menu"
import { useControllableState } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { ScrollView, useWindowDimensions, View } from "react-native"
import Animated from "react-native-reanimated"

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
const ContextMenuRadioContext = React.createContext<string | undefined>(
  undefined
)

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
  const { entering, exiting } = useSurfaceAnimation("popup")
  const { height } = useWindowDimensions()
  return (
    <ContextMenuPortal>
      <DensityScope density={density}>
        <ContextMenuPrimitive.Overlay aria-modal className="absolute inset-0">
          <ContextMenuPrimitive.Content
            align={align}
            alignOffset={alignOffset}
            side={getVerticalSide(side)}
            sideOffset={sideOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="context-menu-content"
              entering={entering}
              exiting={exiting}
              className={cn(
                "cn-context-menu-content cn-context-menu-content-logical",
                className
              )}
            >
              <ContextMenuInsideContext value={true}>
                <TextStyle className="cn-context-menu-text">
                  <ScrollView
                    alwaysBounceVertical={false}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: getMenuMaxHeight(height) }}
                  >
                    {renderTextChildren(children)}
                  </ScrollView>
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
  ...props
}: Omit<ContextMenuPrimitive.ItemProps, "children"> &
  RenderProps & {
    inset?: boolean
    variant?: "default" | "destructive"
    closeOnClick?: boolean
    children?: React.ReactNode
  }) {
  const resolved = resolveRender({ render, asChild, children })
  return (
    <TextStyle className={contextMenuItemTextVariants({ variant })}>
      <ContextMenuPrimitive.Item
        data-slot="context-menu-item"
        data-inset={inset}
        data-variant={variant}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-context-menu-item relative flex-row items-center disabled:opacity-50",
          className
        )}
        {...props}
        asChild={resolved.asChild}
      >
        {resolved.asChild
          ? resolved.children
          : renderTextChildren(resolved.children)}
      </ContextMenuPrimitive.Item>
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
  ...props
}: Omit<ContextMenuPrimitive.SubTriggerProps, "children"> & {
  inset?: boolean
  children?: React.ReactNode
}) {
  const { open } = ContextMenuPrimitive.useSubContext()
  return (
    <TextStyle className={contextMenuItemTextVariants()}>
      <ContextMenuPrimitive.SubTrigger
        data-slot="context-menu-sub-trigger"
        data-inset={inset}
        data-state={open ? "open" : "closed"}
        className={cn(
          "cn-context-menu-sub-trigger flex-row items-center disabled:opacity-50",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
        <View className="ml-auto">
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </View>
      </ContextMenuPrimitive.SubTrigger>
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

// A chosen row reads foreground and semibold.
function ContextMenuChoiceText({
  isChecked,
  children,
}: {
  isChecked: boolean
  children?: React.ReactNode
}) {
  if (!isChecked) {
    return (
      <TextStyle className="cn-context-menu-choice-text">{children}</TextStyle>
    )
  }
  return (
    <TextStyle className="cn-context-menu-choice-text cn-context-menu-choice-text-checked">
      {children}
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
  ...props
}: Omit<
  ContextMenuPrimitive.CheckboxItemProps,
  "children" | "checked" | "onCheckedChange"
> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  inset?: boolean
  closeOnClick?: boolean
  children?: React.ReactNode
}) {
  const [isChecked = false, setIsChecked] = useControllableState({
    prop: checked,
    defaultProp: defaultChecked,
    onChange: onCheckedChange,
  })
  return (
    <ContextMenuChoiceText isChecked={isChecked}>
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
        {...props}
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
    <ContextMenuRadioContext value={current}>
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
  ...props
}: Omit<ContextMenuPrimitive.RadioItemProps, "children"> & {
  inset?: boolean
  closeOnClick?: boolean
  children?: React.ReactNode
}) {
  const isChecked = React.use(ContextMenuRadioContext) === value
  return (
    <ContextMenuChoiceText isChecked={isChecked}>
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
        {...props}
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
