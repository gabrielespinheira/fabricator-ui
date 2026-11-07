"use client"

import * as React from "react"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/base-fabricator/lib/fluid-hover"

// Fabricator override of the upstream table: the container is a fluid hover
// container (a table can't hold the overlay), so one square highlight glides
// between body rows. The pointer lights a row only while it is over the
// body; the header, footer and caption switch it off.
const ROW = "tbody > tr"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const fluid = useFluidHover<HTMLDivElement>({ items: ROW, gapClick: false })
  const containerRef = useMergedRef(fluid.attach)

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className="relative isolate w-full overflow-x-auto"
      {...fluid.props}
      onPointerMove={(event) => {
        if ((event.target as Element).closest(ROW)) {
          fluid.props.onPointerMove(event)
        } else {
          fluid.props.onPointerLeave()
        }
      }}
    >
      <FluidHoverHighlight hover={fluid.hover} className="rounded-none" />
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-(length:--density-text-13)",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border/60 font-medium text-foreground [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/60 transition-colors duration-feedback in-data-[slot=table-body]:hover:bg-hover in-data-[fluid-hover]:in-data-[slot=table-body]:hover:bg-transparent has-aria-expanded:bg-muted/50 has-[+[data-fluid-hover-active]]:border-transparent data-fluid-hover-active:border-transparent data-[state=selected]:bg-active",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-(--density-36) px-(--density-12) text-start align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-(--density-12) py-(--density-8) align-middle whitespace-nowrap text-muted-foreground transition-colors duration-feedback in-data-fluid-hover-active:text-foreground in-data-[slot=table-footer]:text-foreground in-[tr:hover]:text-foreground [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "mt-4 text-(length:--density-text-12) text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
