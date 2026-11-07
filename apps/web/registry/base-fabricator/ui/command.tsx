"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/base-fabricator/lib/fluid-hover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/base-fabricator/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/registry/base-fabricator/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream command menu: the list is a fluid hover
// container, so one highlight glides between items. cmdk marks its active
// item with data-selected="true", so arrow keys move the same highlight.
const COMMAND_ITEMS = "[cmdk-item]"
// cmdk always sets data-disabled ("true" or "false").
const COMMAND_DISABLED = '[data-disabled="true"], [aria-disabled="true"]'

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-surface-3 text-popover-foreground in-data-[slot=dialog-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        // Opened from the keyboard many times a day: no animation.
        data-motion="off"
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-0">
      <InputGroup className="h-(--density-48)! gap-(--density-10) rounded-none! border-0! bg-transparent! px-1 shadow-none! ring-0! *:data-[slot=input-group-addon]:pl-(--density-8)!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-(length:--density-text-14) outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
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
    </div>
  )
}

function CommandList({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: COMMAND_ITEMS,
    disabled: COMMAND_DISABLED,
    highlighted: '[data-selected="true"]',
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "relative isolate no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto border-t border-border/60 p-1 outline-none",
        className
      )}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </CommandPrimitive.List>
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(
        "py-(--density-24) text-center text-(length:--density-text-13) text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-foreground **:[[cmdk-group-heading]]:flex **:[[cmdk-group-heading]]:h-(--density-28) **:[[cmdk-group-heading]]:items-center **:[[cmdk-group-heading]]:px-(--density-8) **:[[cmdk-group-heading]]:text-(length:--density-text-12) **:[[cmdk-group-heading]]:font-normal **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex h-(--density-36) cursor-pointer items-center gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground outline-hidden transition-colors duration-feedback select-none data-fluid-hover-active:text-foreground data-[checked=true]:font-semibold data-[checked=true]:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-hover data-selected:text-foreground in-data-[fluid-hover]:data-selected:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] data-fluid-hover-active:[&_svg]:stroke-2 data-selected:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="CheckIcon"
        tabler="IconCheck"
        hugeicons="Tick02Icon"
        phosphor="CheckIcon"
        remixicon="RiCheckLine"
        className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100"
      />
    </CommandPrimitive.Item>
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
        "ml-auto text-(length:--density-text-11) tracking-normal text-muted-foreground",
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
