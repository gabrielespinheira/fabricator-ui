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
import { useIsMobile } from "@/registry/bases/radix/hooks/use-mobile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/registry/bases/radix/ui/alert-dialog"
import { Button } from "@/registry/bases/radix/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/radix/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/radix/ui/drawer"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/registry/bases/radix/ui/dropdown-menu"
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/registry/bases/radix/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/bases/radix/ui/number-field"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/radix/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/radix/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/radix/ui/sheet"
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/bases/radix/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/registry/bases/radix/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"

// The billing block's controls whose API differs between Base UI, Radix and
// React Aria. This is Radix's; the rest of the block is shared.

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
    // A local provider: Radix tooltips need one, and the app may not have it.
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      value={value}
      onValueChange={(next) => {
        if (isBillingInterval(next)) onValueChange(next)
      }}
    >
      <TabsList aria-label="Billed">
        {BILLING_INTERVALS.map((interval) => (
          <TabsTrigger key={interval.value} value={interval.value}>
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
      value={value}
      onValueChange={(next) => {
        if (isBillingExtraRuns(next)) onValueChange(next)
      }}
    >
      <TabsList aria-labelledby={labelledBy} className="w-full">
        <TabsTrigger value="continue">Keep running</TabsTrigger>
        <TabsTrigger value="pause">Pause</TabsTrigger>
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
      onValueChange={onValueChange}
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
      <Drawer open={open} onOpenChange={onOpenChange}>
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
                onSelect={entry.onSelect}
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
        onValueChange={(next) => {
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
  toast(message, undo ? { action: { label: "Undo", onClick: undo } } : {})
}
