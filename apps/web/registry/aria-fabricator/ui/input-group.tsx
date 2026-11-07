"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Group, type GroupProps } from "react-aria-components"

import { Button } from "@/registry/aria-fabricator/ui/button"
import { Input } from "@/registry/aria-fabricator/ui/input"
import { Textarea } from "@/registry/aria-fabricator/ui/textarea"

function InputGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="input-group"
      className={cn(
        "group/input-group relative flex h-(--density-36) w-full min-w-0 items-center rounded-lg border-0 bg-transparent ring-1 ring-border transition-[color,background-color,box-shadow] duration-feedback ease-feedback outline-none ring-inset focus-within:bg-card focus-within:ring-foreground/25 hover:not-focus-within:bg-muted/50 in-data-[slot=combobox-content]:focus-within:ring-border has-disabled:bg-transparent has-disabled:opacity-50 has-[[data-slot][aria-invalid=true]]:ring-destructive/50 has-[[data-slot][aria-invalid=true]]:hover:not-focus-within:bg-destructive/5 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>[data-align=block-end]]:[&>input]:pt-(--density-12) has-[>[data-align=block-start]]:[&>input]:pb-(--density-12) has-[>[data-align=inline-end]]:[&>input]:pr-(--density-6) has-[>[data-align=inline-start]]:[&>input]:pl-(--density-6)",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-(--density-8) py-(--density-6) text-(length:--density-text-13) leading-normal font-normal text-muted-foreground transition-colors duration-feedback select-none group-focus-within/input-group:text-foreground group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[5px] [&>svg]:stroke-[1.5] [&>svg]:transition-[stroke-width] group-focus-within/input-group:[&>svg]:stroke-2 [&>svg:not([class*='size-'])]:size-(--density-icon-16)",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-(--density-10) has-[>[data-size=sm],>[data-size=icon-sm]]:pl-[calc((var(--density-36)-var(--density-28))/2)] has-[>[data-slot=kbd],>[data-slot=kbd-group]]:pl-[calc((var(--density-36)-var(--density-20))/2)] has-[>button]:pl-[calc((var(--density-36)-var(--density-24))/2)]",
        "inline-end":
          "order-last pr-(--density-10) has-[>[data-size=sm],>[data-size=icon-sm]]:pr-[calc((var(--density-36)-var(--density-28))/2)] has-[>[data-slot=kbd],>[data-slot=kbd-group]]:pr-[calc((var(--density-36)-var(--density-20))/2)] has-[>button]:pr-[calc((var(--density-36)-var(--density-24))/2)]",
        "block-start":
          "order-first w-full justify-start px-(--density-10) pt-(--density-8) group-has-[>input]/input-group:pt-(--density-8) [.border-b]:border-border/60 [.border-b]:pb-(--density-8)",
        "block-end":
          "order-last w-full justify-start px-(--density-10) pb-(--density-8) group-has-[>input]/input-group:pb-(--density-8) [.border-t]:border-border/60 [.border-t]:pt-(--density-8)",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex cursor-pointer items-center gap-(--density-6) text-(length:--density-text-13) shadow-none",
  {
    variants: {
      size: {
        xs: "h-(--density-24) gap-1 rounded-md px-(--density-8) text-(length:--density-text-12) [&>svg:not([class*='size-'])]:size-(--density-icon-14)",
        sm: "h-(--density-28) gap-1 rounded-md px-(--density-10) text-(length:--density-text-12) [&>svg:not([class*='size-'])]:size-(--density-icon-14)",
        "icon-xs":
          "size-(--density-24) rounded-md p-0 has-[>svg]:p-0 [&>svg:not([class*='size-'])]:size-(--density-icon-14)",
        "icon-sm": "size-(--density-28) rounded-md p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-(--density-8) text-(length:--density-text-13) text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 aria-invalid:hover:bg-transparent aria-invalid:focus-visible:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-(--density-8) shadow-none ring-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 aria-invalid:hover:bg-transparent aria-invalid:focus-visible:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
