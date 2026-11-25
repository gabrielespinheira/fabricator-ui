"use client"

import * as React from "react"
import { cn } from "cn"
import { toast } from "sonner"

import { Button } from "@/registry/bases/aria/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/bases/aria/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"
import {
  Popover,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/bases/aria/ui/popover"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The assistant's controls whose API differs between Base UI, Radix and React
// Aria: tooltips, the title's menu, the sources' popover, disclosures and
// toasts. This is React Aria's; the rest of the block is shared.

/** An icon button named by a tooltip; `isPressed` makes it a toggle. */
export function AssistantIconButton({
  label,
  isPressed,
  onClick,
  children,
}: {
  label: string
  isPressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <TooltipTrigger>
      <Button
        variant={isPressed ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={label}
        aria-pressed={isPressed}
        onPress={onClick}
        className="pointer-coarse:size-11"
      >
        {children}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}

/** The chat's name, opening its menu. */
export function AssistantTitleMenu({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        className="min-w-0 shrink px-(--density-8) text-foreground pointer-coarse:min-h-11"
      >
        <span className="truncate weight-semibold">{title}</span>
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconChevronDown"
          hugeicons="ArrowDown01Icon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
          data-icon="inline-end"
          className="text-muted-foreground"
        />
      </Button>
      <DropdownMenu placement="bottom start" className="min-w-56">
        {children}
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** A quiet button that opens a titled popover above it. */
export function AssistantPopover({
  title,
  trigger,
  children,
}: {
  title: string
  trigger: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PopoverTrigger>
      <Button
        variant="ghost"
        size="sm"
        className="px-(--density-6) pointer-coarse:min-h-11"
      >
        {trigger}
      </Button>
      <Popover
        placement="top start"
        className="w-110 max-w-[calc(100vw-var(--density-32))] gap-(--density-4) p-(--density-8)"
      >
        <PopoverTitle className="px-(--density-8) pt-(--density-4)">
          {title}
        </PopoverTitle>
        {children}
      </Popover>
    </PopoverTrigger>
  )
}

/** A line of text that opens to what is under it. */
export function AssistantDisclosure({
  isOpen,
  onOpenChange,
  trigger,
  triggerClassName,
  children,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  trigger: React.ReactNode
  triggerClassName?: string
  children: React.ReactNode
}) {
  return (
    <Collapsible isExpanded={isOpen} onExpandedChange={onOpenChange}>
      <CollapsibleTrigger
        className={cn(
          // The hover wash reaches past the text by its padding, so the text
          // stays on the message's start edge.
          "group/disclosure -mx-(--density-8) w-fit max-w-[calc(100%+var(--density-16))] rounded-lg px-(--density-8) text-start outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11",
          triggerClassName
        )}
      >
        {trigger}
        <IconPlaceholder
          lucide="ChevronRightIcon"
          tabler="IconChevronRight"
          hugeicons="ArrowRight01Icon"
          phosphor="CaretRightIcon"
          remixicon="RiArrowRightSLine"
          className="size-(--density-icon-16) shrink-0 text-muted-foreground transition-transform duration-move ease-move group-aria-expanded/disclosure:rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}

/** A short report of what just happened. */
export function notifyAssistant(message: string) {
  toast(message)
}
