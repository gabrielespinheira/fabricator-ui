"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  BILLING_SAMPLES,
  isBillingSample,
  type BillingSample,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  BILLING_COUNTRIES,
  BILLING_INTERVALS,
  isBillingCountry,
  isBillingExtraRuns,
  isBillingInterval,
  type BillingCountry,
  type BillingExtraRuns,
  type BillingInterval,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { useIsMobile } from "@/registry/bases/aria/hooks/use-mobile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/aria/ui/alert-dialog"
import { Button } from "@/registry/bases/aria/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/aria/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/aria/ui/drawer"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { Field, FieldContent, FieldLabel } from "@/registry/bases/aria/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/bases/aria/ui/number-field"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/aria/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/aria/ui/select"
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/aria/ui/sheet"
import { TableHead, TableHeader } from "@/registry/bases/aria/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/registry/bases/aria/ui/tabs"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"

// The billing block's controls whose API differs between Base UI, Radix and
// React Aria. This is React Aria's; the rest of the block is shared.

/** An icon button named by a tooltip. */
export function BillingIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <TooltipTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onPress={onClick}
      >
        {children}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}

export function BillingIntervalTabs({
  value,
  onValueChange,
}: {
  value: BillingInterval
  onValueChange: (interval: BillingInterval) => void
}) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(next) => {
        if (isBillingInterval(next)) onValueChange(next)
      }}
    >
      <TabsList aria-label="Billed">
        {BILLING_INTERVALS.map((interval) => (
          <TabsTrigger key={interval.value} id={interval.value}>
            {interval.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** What happens to automations at the limit. */
export function BillingExtraRunsTabs({
  labelledBy,
  value,
  onValueChange,
}: {
  labelledBy: string
  value: BillingExtraRuns
  onValueChange: (extraRuns: BillingExtraRuns) => void
}) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(next) => {
        if (isBillingExtraRuns(next)) onValueChange(next)
      }}
    >
      <TabsList aria-labelledby={labelledBy} className="w-full">
        <TabsTrigger id="continue">Keep running</TabsTrigger>
        <TabsTrigger id="pause">Pause</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function BillingSeatsField({
  labelledBy,
  describedBy,
  value,
  min,
  max,
  onValueChange,
}: {
  labelledBy: string
  describedBy?: string
  value: number
  min: number
  max?: number
  onValueChange: (seats: number) => void
}) {
  return (
    <NumberField
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      value={value}
      minValue={min}
      maxValue={max}
      onChange={(next) => onValueChange(Number.isNaN(next) ? min : next)}
    >
      <NumberFieldGroup>
        <NumberFieldDecrement aria-label="Fewer seats" />
        <NumberFieldInput />
        <NumberFieldIncrement aria-label="More seats" />
      </NumberFieldGroup>
    </NumberField>
  )
}

export function BillingCountrySelect({
  id,
  value,
  onValueChange,
}: {
  id: string
  value: BillingCountry
  onValueChange: (country: BillingCountry) => void
}) {
  return (
    <Select
      aria-label="Country"
      value={value}
      onChange={(next) => {
        if (isBillingCountry(next)) onValueChange(next)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {BILLING_COUNTRIES.map((country) => (
            <SelectItem key={country.value} id={country.value}>
              {country.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/** One of a few, each a card that says what it is. */
export function BillingChoiceCards({
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  label: string
  value: string
  options: { value: string; content: React.ReactNode }[]
  onValueChange: (value: string) => void
  className?: string
}) {
  const id = React.useId()
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onChange={onValueChange}
      className={className}
    >
      {options.map((option) => (
        <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
          <Field orientation="horizontal" className="h-full">
            <FieldContent>{option.content}</FieldContent>
            <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  )
}

/** A dialog, and a drawer from the bottom edge on phones. */
export function BillingDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  footer: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-(--density-16) py-(--density-8)">
            {children}
          </div>
          <DrawerFooter className="flex-col-reverse">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className={className}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
      <DialogFooter>{footer}</DialogFooter>
    </Dialog>
  )
}

/** A task beside the page. */
export function BillingSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Sheet
      isOpen={open}
      onOpenChange={onOpenChange}
      side="right"
      className="data-[side=right]:w-full data-[side=right]:sm:max-w-md"
    >
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-(--density-16) py-(--density-4)">
        {children}
      </div>
      <SheetFooter className="flex-row justify-end">{footer}</SheetFooter>
    </Sheet>
  )
}

/** A decision that states what it costs or ends, and when. */
export function BillingConfirm({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  actionLabel,
  isDestructive = false,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  cancelLabel: string
  actionLabel: string
  isDestructive?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}) {
  return (
    <AlertDialog isOpen={open} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {children}
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          variant={isDestructive ? "destructive" : "default"}
          onPress={onConfirm}
        >
          {actionLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialog>
  )
}

export type BillingMenuEntry = {
  id: string
  label: string
  icon: React.ReactNode
  isDestructive?: boolean
  onSelect: () => void
}

/** The page's rare actions, then the sample situations. */
export function BillingPageMenu({
  groups,
  sample,
  onSampleChange,
}: {
  groups: BillingMenuEntry[][]
  sample: BillingSample
  onSampleChange: (sample: BillingSample) => void
}) {
  return (
    <>
      {groups.map((entries) => (
        <React.Fragment key={entries.map(({ id }) => id).join()}>
          <DropdownMenuGroup>
            {entries.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                id={entry.id}
                textValue={entry.label}
                variant={entry.isDestructive ? "destructive" : undefined}
                onAction={entry.onSelect}
              >
                {entry.icon}
                {entry.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </React.Fragment>
      ))}
      <DropdownMenuGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[sample]}
        onSelectionChange={(keys) => {
          if (keys === "all") return
          const [next] = keys
          if (isBillingSample(next)) onSampleChange(next)
        }}
      >
        <DropdownMenuLabel>Sample data</DropdownMenuLabel>
        {BILLING_SAMPLES.map((option) => (
          <DropdownMenuItem key={option.value} id={option.value}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </>
  )
}

export function BillingInvoiceTableHeader() {
  return (
    <TableHeader>
      <TableHead isRowHeader>Date</TableHead>
      <TableHead className="hidden @lg/invoices:table-cell">Invoice</TableHead>
      <TableHead className="hidden @sm/invoices:table-cell">Status</TableHead>
      <TableHead className="text-end">Amount</TableHead>
      <TableHead className="w-0">
        <span className="sr-only">Download</span>
      </TableHead>
    </TableHeader>
  )
}

/** A short report of what just happened, with Undo when it can be undone. */
export function notifyBilling(message: string, undo?: () => void) {
  toast(message, undo ? { action: { label: "Undo", onClick: undo } } : {})
}
