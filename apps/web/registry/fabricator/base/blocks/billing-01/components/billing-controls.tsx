"use client"

import * as React from "react"

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
import { useIsMobile } from "@/registry/bases/base/hooks/use-mobile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/base/ui/alert-dialog"
import { Button } from "@/registry/bases/base/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/base/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/base/ui/drawer"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/registry/bases/base/ui/dropdown-menu"
import { Field, FieldContent, FieldLabel } from "@/registry/bases/base/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/bases/base/ui/number-field"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/base/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/base/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/base/ui/sheet"
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/bases/base/ui/table"
import { toast } from "@/registry/bases/base/ui/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/base/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/base/ui/tooltip"

// The billing block's controls whose API differs between Base UI, Radix and
// React Aria. This is Base UI's; the rest of the block is shared.

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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function BillingIntervalChoice({
  value,
  onValueChange,
}: {
  value: BillingInterval
  onValueChange: (interval: BillingInterval) => void
}) {
  return (
    <ToggleGroup
      aria-label="Billed"
      size="sm"
      spacing={0}
      className="bg-foreground/[0.05]"
      value={[value]}
      onValueChange={([next]) => {
        if (isBillingInterval(next)) onValueChange(next)
      }}
    >
      {BILLING_INTERVALS.map((interval) => (
        <ToggleGroupItem
          className="flex-1 font-normal text-foreground"
          key={interval.value}
          value={interval.value}
        >
          {interval.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** What happens to automations at the limit. */
export function BillingExtraRunsChoice({
  labelledBy,
  value,
  onValueChange,
}: {
  labelledBy: string
  value: BillingExtraRuns
  onValueChange: (extraRuns: BillingExtraRuns) => void
}) {
  return (
    <ToggleGroup
      aria-labelledby={labelledBy}
      size="sm"
      spacing={0}
      className="w-full bg-foreground/[0.05]"
      value={[value]}
      onValueChange={([next]) => {
        if (isBillingExtraRuns(next)) onValueChange(next)
      }}
    >
      <ToggleGroupItem
        className="flex-1 font-normal text-foreground"
        value="continue"
      >
        Keep running
      </ToggleGroupItem>
      <ToggleGroupItem
        className="flex-1 font-normal text-foreground"
        value="pause"
      >
        Pause
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export function BillingSeatsField({
  id,
  labelledBy,
  describedBy,
  value,
  min,
  max,
  onValueChange,
}: {
  id: string
  labelledBy: string
  describedBy?: string
  value: number
  min: number
  max?: number
  onValueChange: (seats: number) => void
}) {
  return (
    <NumberField
      id={id}
      value={value}
      min={min}
      max={max}
      onValueChange={(next) => onValueChange(next ?? min)}
    >
      <NumberFieldGroup>
        <NumberFieldDecrement aria-label="Fewer seats" />
        <NumberFieldInput
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
        />
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
      items={BILLING_COUNTRIES}
      value={value}
      onValueChange={(next) => {
        if (isBillingCountry(next)) onValueChange(next)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {BILLING_COUNTRIES.map((country) => (
            <SelectItem key={country.value} value={country.value}>
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
      onValueChange={(next: unknown) => {
        if (typeof next === "string") onValueChange(next)
      }}
      className={className}
    >
      {options.map((option) => (
        <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
          <Field orientation="horizontal" className="h-full">
            <FieldContent id={`${id}-${option.value}-label`}>
              {option.content}
            </FieldContent>
            <RadioGroupItem
              value={option.value}
              id={`${id}-${option.value}`}
              aria-labelledby={`${id}-${option.value}-label`}
            />
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
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
      </SheetContent>
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
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
                variant={entry.isDestructive ? "destructive" : undefined}
                onClick={entry.onSelect}
              >
                {entry.icon}
                {entry.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </React.Fragment>
      ))}
      <DropdownMenuRadioGroup
        value={sample}
        onValueChange={(next: unknown) => {
          if (isBillingSample(next)) onSampleChange(next)
        }}
      >
        <DropdownMenuLabel>Sample data</DropdownMenuLabel>
        {BILLING_SAMPLES.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={option.value}>
            {option.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}

export function BillingInvoiceTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Date</TableHead>
        <TableHead className="hidden @lg/invoices:table-cell">
          Invoice
        </TableHead>
        <TableHead className="hidden @sm/invoices:table-cell">Status</TableHead>
        <TableHead className="text-end">Amount</TableHead>
        <TableHead className="w-0">
          <span className="sr-only">Download</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

/** A short report of what just happened, with Undo when it can be undone. */
export function notifyBilling(message: string, undo?: () => void) {
  const id = toast.add({
    title: message,
    actionProps: undo
      ? {
          children: "Undo",
          onClick: () => {
            undo()
            toast.close(id)
          },
        }
      : undefined,
  })
}
