"use client"

import * as React from "react"
import { cn } from "cn"
import {
  Autocomplete,
  Collection,
  composeRenderProps,
  Header,
  Input,
  Menu,
  MenuItem,
  MenuSection,
  SearchField,
  Separator,
  useFilter,
  type AutocompleteProps,
  type InputProps,
  type MenuItemProps,
  type MenuProps,
  type MenuSectionProps,
  type SeparatorProps,
} from "react-aria-components"
import { createPortal } from "react-dom"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/aria-fabricator/lib/fluid-hover"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/aria-fabricator/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/registry/aria-fabricator/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function Command({
  className,
  dir,
  style,
  ...props
}: Omit<AutocompleteProps, "className" | "style"> & {
  className?: string
  dir?: React.HTMLAttributes<HTMLDivElement>["dir"]
  style?: React.CSSProperties
}) {
  const { contains } = useFilter({ sensitivity: "base" })
  return (
    <div
      data-slot="command"
      dir={dir}
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-surface-3 text-popover-foreground in-data-[slot=dialog-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        className
      )}
      style={style}
    >
      <Autocomplete {...props} filter={props.filter || contains}>
        {props.children}
      </Autocomplete>
    </div>
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  open,
  onOpenChange,
  className,
  showCloseButton = false,
  ...props
}: Omit<
  React.ComponentProps<typeof Dialog>,
  "children" | "className" | "isOpen" | "onOpenChange"
> & {
  title?: string
  description?: string
  open?: boolean
  onOpenChange?: (isOpen: boolean) => void
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      className={cn(
        "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
        className
      )}
      showCloseButton={showCloseButton}
      isDismissable
      // Opened from the keyboard many times a day: no animation.
      data-motion="off"
      {...props}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </Dialog>
  )
}

function CommandInput({ className, ...props }: InputProps) {
  return (
    <SearchField
      autoFocus
      aria-label={props.placeholder || "Search"}
      data-slot="command-input-wrapper"
      className="p-0"
    >
      <InputGroup className="h-(--density-48)! gap-(--density-10) rounded-none! border-0! bg-transparent! px-1 shadow-none! ring-0! *:data-[slot=input-group-addon]:pl-(--density-8)!">
        <Input
          {...props}
          data-slot="command-input"
          className={cn(
            "w-full text-(length:--density-text-14) outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden",
            className
          )}
        />
        <InputGroupAddon>
          <IconPlaceholder
            lucide="SearchIcon"
            tabler="IconSearch"
            hugeicons="SearchIcon"
            phosphor="MagnifyingGlassIcon"
            remixicon="RiSearchLine"
            className="size-(--density-icon-16) shrink-0 stroke-[1.5] text-muted-foreground transition-[color,stroke-width] duration-feedback group-focus-within/input-group:stroke-2 group-focus-within/input-group:text-foreground"
          />
        </InputGroupAddon>
      </InputGroup>
    </SearchField>
  )
}

// Fabricator override: the list is a fluid hover container, so one highlight
// glides between items (the input's virtual focus moves the same highlight).
// The list renders a collection, so the highlight is portalled into it rather
// than passed as a child.
const COMMAND_ITEMS =
  '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'

function CommandList<T extends object>({
  className,
  ref,
  ...props
}: MenuProps<T> & { ref?: React.Ref<HTMLDivElement> }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: COMMAND_ITEMS,
    highlighted: "[data-focused]",
  })
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(fluid.attach, setList, ref)

  return (
    <>
      <Menu
        {...fluid.props}
        {...props}
        ref={mergedRef}
        data-slot="command-list"
        className={cn(
          "relative isolate no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto border-t border-border/60 p-1 outline-none",
          className
        )}
      />
      {list && createPortal(<FluidHoverHighlight hover={fluid.hover} />, list)}
    </>
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-empty"
      className={cn(
        "py-(--density-24) text-center text-(length:--density-text-13) text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandGroup<T extends object>({
  className,
  children,
  items,
  heading,
  ...props
}: MenuSectionProps<T> & { heading?: string }) {
  return (
    <MenuSection
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-foreground **:[[cmdk-group-heading]]:flex **:[[cmdk-group-heading]]:h-(--density-28) **:[[cmdk-group-heading]]:items-center **:[[cmdk-group-heading]]:px-(--density-8) **:[[cmdk-group-heading]]:text-(length:--density-text-12) **:[[cmdk-group-heading]]:font-normal **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {heading && <Header cmdk-group-heading="">{heading}</Header>}
      <Collection items={items}>{children}</Collection>
    </MenuSection>
  )
}

function CommandSeparator({ className, ...props }: SeparatorProps) {
  return (
    <Separator
      data-slot="command-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function CommandItem<T extends object>({
  className,
  children,
  textValue,
  ...props
}: MenuItemProps<T>) {
  return (
    <MenuItem
      {...props}
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-focused:bg-hover data-focused:text-foreground in-data-[fluid-hover]:data-focused:bg-transparent data-[checked=true]:font-semibold data-[checked=true]:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-hover data-selected:text-foreground in-data-[fluid-hover]:data-selected:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] data-fluid-hover-active:[&_svg]:stroke-2 data-focused:[&_svg]:stroke-2 data-selected:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      textValue={
        textValue || (typeof children === "string" ? children : undefined)
      }
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100"
          />
        </>
      ))}
    </MenuItem>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-(length:--density-text-11) tracking-normal text-muted-foreground group-data-focused/command-item:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
