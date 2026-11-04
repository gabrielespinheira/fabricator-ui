import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu"
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

type DropdownMenuTriggerRef =
  React.RefObject<DropdownMenuPrimitive.TriggerRef | null>

const DropdownMenuContext = React.createContext<DropdownMenuTriggerRef | null>(
  null
)
// A submenu expands inline, so a portal inside the content is already home.
const DropdownMenuInsideContext = React.createContext(false)
const DropdownMenuRadioContext = React.createContext<string | undefined>(
  undefined
)

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
  ...props
}: Omit<DropdownMenuPrimitive.ContentProps, "side" | "children"> & {
  side?: "top" | "right" | "bottom" | "left"
  children?: React.ReactNode
}) {
  const density = useDensity()
  const { entering, exiting } = useSurfaceAnimation("popup")
  const { height } = useWindowDimensions()
  const { triggerPosition } = DropdownMenuPrimitive.useRootContext()
  return (
    <DropdownMenuPortal>
      <DensityScope density={density}>
        <DropdownMenuPrimitive.Overlay aria-modal className="absolute inset-0">
          <DropdownMenuPrimitive.Content
            align={align}
            alignOffset={alignOffset}
            side={getVerticalSide(side)}
            sideOffset={sideOffset}
            insets={insets}
            {...props}
          >
            <Animated.View
              data-slot="dropdown-menu-content"
              entering={entering}
              exiting={exiting}
              className={cn(
                "cn-dropdown-menu-content cn-dropdown-menu-content-logical",
                className
              )}
            >
              <DropdownMenuInsideContext value={true}>
                <TextStyle className="cn-dropdown-menu-text">
                  <ScrollView
                    alwaysBounceVertical={false}
                    keyboardShouldPersistTaps="handled"
                    style={{
                      maxHeight: getMenuMaxHeight(height),
                      minWidth: triggerPosition?.width,
                    }}
                  >
                    {renderTextChildren(children)}
                  </ScrollView>
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
  ...props
}: Omit<DropdownMenuPrimitive.ItemProps, "children"> &
  RenderProps & {
    inset?: boolean
    variant?: "default" | "destructive"
    closeOnClick?: boolean
    children?: React.ReactNode
  }) {
  const resolved = resolveRender({ render, asChild, children })
  return (
    <TextStyle className={dropdownMenuItemTextVariants({ variant })}>
      <DropdownMenuPrimitive.Item
        data-slot="dropdown-menu-item"
        data-inset={inset}
        data-variant={variant}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-dropdown-menu-item relative flex-row items-center disabled:opacity-50",
          className
        )}
        {...props}
        asChild={resolved.asChild}
      >
        {resolved.asChild
          ? resolved.children
          : renderTextChildren(resolved.children)}
      </DropdownMenuPrimitive.Item>
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
  ...props
}: Omit<DropdownMenuPrimitive.SubTriggerProps, "children"> & {
  inset?: boolean
  children?: React.ReactNode
}) {
  const { open } = DropdownMenuPrimitive.useSubContext()
  return (
    <TextStyle className={dropdownMenuItemTextVariants()}>
      <DropdownMenuPrimitive.SubTrigger
        data-slot="dropdown-menu-sub-trigger"
        data-inset={inset}
        data-state={open ? "open" : "closed"}
        className={cn(
          "cn-dropdown-menu-sub-trigger flex-row items-center disabled:opacity-50",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
        <View className="ml-auto">
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </View>
      </DropdownMenuPrimitive.SubTrigger>
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
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn("cn-dropdown-menu-sub-content", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </DropdownMenuPrimitive.SubContent>
  )
}

// A chosen row reads foreground and semibold.
function DropdownMenuChoiceText({
  isChecked,
  children,
}: {
  isChecked: boolean
  children?: React.ReactNode
}) {
  if (!isChecked) {
    return (
      <TextStyle className="cn-dropdown-menu-choice-text">{children}</TextStyle>
    )
  }
  return (
    <TextStyle className="cn-dropdown-menu-choice-text cn-dropdown-menu-choice-text-checked">
      {children}
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
  ...props
}: Omit<
  DropdownMenuPrimitive.CheckboxItemProps,
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
    <DropdownMenuChoiceText isChecked={isChecked}>
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
        {...props}
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
    <DropdownMenuRadioContext value={current}>
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
  ...props
}: Omit<DropdownMenuPrimitive.RadioItemProps, "children"> & {
  inset?: boolean
  closeOnClick?: boolean
  children?: React.ReactNode
}) {
  const isChecked = React.use(DropdownMenuRadioContext) === value
  return (
    <DropdownMenuChoiceText isChecked={isChecked}>
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
        {...props}
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
