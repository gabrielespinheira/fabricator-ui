"use client"

import * as React from "react"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/radix/lib/fluid-hover"

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
      className="cn-table-container"
      {...fluid.props}
      onPointerMove={(event) => {
        if ((event.target as Element).closest(ROW)) {
          fluid.props.onPointerMove(event)
        } else {
          fluid.props.onPointerLeave()
        }
      }}
    >
      <FluidHoverHighlight hover={fluid.hover} className="cn-table-highlight" />
      <table
        data-slot="table"
        className={cn("cn-table", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("cn-table-header", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("cn-table-body", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("cn-table-footer", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("cn-table-row has-aria-expanded:bg-muted/50", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("cn-table-head", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("cn-table-cell", className)}
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
      className={cn("cn-table-caption", className)}
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
