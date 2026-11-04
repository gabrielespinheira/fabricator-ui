// A desktop pattern on touch: triggers in a row that scrolls, each opening its menu
// as a popover, or a sheet on phones. The menus come from the dropdown menu, as on
// the website.
import * as React from "react"
import { CheckIcon } from "@fabricator-ui/icons-react-native"
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu"
import { useControllableState } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { ScrollView, View } from "react-native"

import { useIsMobile } from "@/registry/native/hooks/use-mobile"
import { MenuSheet } from "@/registry/native/lib/menu-sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

// Rows in a sheet are already home: a portal inside one has nowhere better to go.
const MenubarSheetContext = React.createContext(false)
const MenubarRadioContext = React.createContext<string | undefined>(undefined)

const menubarListVariants = cva("cn-menubar-list flex-row")

function Menubar({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="menubar"
      role="menubar"
      className={cn("cn-menubar max-w-full self-start", className)}
      {...props}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName={menubarListVariants()}
      >
        {children}
      </ScrollView>
    </View>
  )
}

function MenubarMenu(props: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu data-slot="menubar-menu" {...props} />
}

function MenubarGroup(props: React.ComponentProps<typeof DropdownMenuGroup>) {
  return <DropdownMenuGroup data-slot="menubar-group" {...props} />
}

function MenubarPortal({
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPortal>) {
  const isInSheet = React.use(MenubarSheetContext)
  if (isInSheet) return children
  return (
    <DropdownMenuPortal data-slot="menubar-portal" {...props}>
      {children}
    </DropdownMenuPortal>
  )
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  const { open } = DropdownMenuPrimitive.useRootContext()
  const trigger = (
    <DropdownMenuTrigger
      data-slot="menubar-trigger"
      data-state={open ? "open" : "closed"}
      hitSlop={4}
      className={cn(
        "cn-menubar-trigger flex-row items-center justify-center",
        className
      )}
      {...props}
    />
  )
  return open ? (
    <TextStyle className="cn-menubar-trigger-text cn-menubar-trigger-text-open">
      {trigger}
    </TextStyle>
  ) : (
    <TextStyle className="cn-menubar-trigger-text">{trigger}</TextStyle>
  )
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  const { open, onOpenChange } = DropdownMenuPrimitive.useRootContext()
  const isPhone = useIsMobile()
  if (isPhone) {
    return (
      <MenuSheet
        data-slot="menubar-content"
        open={open}
        onOpenChange={onOpenChange}
      >
        <MenubarSheetContext value={true}>{children}</MenubarSheetContext>
      </MenuSheet>
    )
  }
  return (
    <DropdownMenuContent
      data-slot="menubar-content"
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn("cn-menubar-content cn-menubar-content-logical", className)}
      {...props}
    >
      {children}
    </DropdownMenuContent>
  )
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      data-slot="menubar-item"
      inset={inset}
      variant={variant}
      className={cn("cn-menubar-item", className)}
      {...props}
    />
  )
}

// A chosen row reads foreground and semibold.
function MenubarChoiceText({
  isChecked,
  children,
}: {
  isChecked: boolean
  children?: React.ReactNode
}) {
  return isChecked ? (
    <TextStyle className="cn-menubar-choice-text cn-menubar-choice-text-checked">
      {children}
    </TextStyle>
  ) : (
    <TextStyle className="cn-menubar-choice-text">{children}</TextStyle>
  )
}

function MenubarCheckboxItem({
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
    <MenubarChoiceText isChecked={isChecked}>
      <DropdownMenuPrimitive.CheckboxItem
        data-slot="menubar-checkbox-item"
        data-inset={inset}
        checked={isChecked}
        onCheckedChange={setIsChecked}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-menubar-checkbox-item relative flex-row items-center",
          className
        )}
        {...props}
      >
        <View
          pointerEvents="none"
          className="cn-menubar-checkbox-item-indicator absolute items-center justify-center"
        >
          <DropdownMenuPrimitive.ItemIndicator>
            <CheckIcon />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        {renderTextChildren(children)}
      </DropdownMenuPrimitive.CheckboxItem>
    </MenubarChoiceText>
  )
}

function MenubarRadioGroup({
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
    <MenubarRadioContext value={current}>
      <DropdownMenuPrimitive.RadioGroup
        data-slot="menubar-radio-group"
        value={current}
        onValueChange={setCurrent}
        {...props}
      />
    </MenubarRadioContext>
  )
}

function MenubarRadioItem({
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
  const isChecked = React.use(MenubarRadioContext) === value
  return (
    <MenubarChoiceText isChecked={isChecked}>
      <DropdownMenuPrimitive.RadioItem
        data-slot="menubar-radio-item"
        data-inset={inset}
        value={value}
        closeOnPress={closeOnClick}
        className={cn(
          "cn-menubar-radio-item relative flex-row items-center",
          className
        )}
        {...props}
      >
        <View
          pointerEvents="none"
          className="cn-menubar-radio-item-indicator absolute items-center justify-center"
        >
          <DropdownMenuPrimitive.ItemIndicator>
            <CheckIcon />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        {renderTextChildren(children)}
      </DropdownMenuPrimitive.RadioItem>
    </MenubarChoiceText>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuLabel
      data-slot="menubar-label"
      inset={inset}
      className={cn("cn-menubar-label", className)}
      {...props}
    />
  )
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return (
    <DropdownMenuSeparator
      data-slot="menubar-separator"
      className={cn("cn-menubar-separator", className)}
      {...props}
    />
  )
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) {
  return (
    <DropdownMenuShortcut
      data-slot="menubar-shortcut"
      className={cn("cn-menubar-shortcut", className)}
      {...props}
    />
  )
}

function MenubarSub(props: React.ComponentProps<typeof DropdownMenuSub>) {
  return <DropdownMenuSub data-slot="menubar-sub" {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuSubTrigger
      data-slot="menubar-sub-trigger"
      inset={inset}
      className={cn("cn-menubar-sub-trigger", className)}
      {...props}
    />
  )
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) {
  return (
    <DropdownMenuSubContent
      data-slot="menubar-sub-content"
      className={cn("cn-menubar-sub-content", className)}
      {...props}
    />
  )
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
