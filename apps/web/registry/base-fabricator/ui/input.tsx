import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-(--density-36) w-full min-w-0 rounded-lg border-0 bg-transparent px-(--density-10) py-1 text-base text-foreground scheme-light ring-1 ring-border transition-[color,background-color,box-shadow] duration-feedback ease-feedback outline-none ring-inset file:me-(--density-8) file:inline-flex file:h-(--density-24) file:cursor-pointer file:rounded-md file:border-0 file:bg-hover! file:bg-transparent file:px-(--density-8) file:text-(length:--density-text-12) file:font-medium file:text-foreground file:transition-colors file:duration-feedback placeholder:text-muted-foreground autofill:shadow-[inset_0_0_0_100vmax_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)] hover:bg-muted/50 hover:file:bg-active! focus-visible:bg-card focus-visible:ring-foreground/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/50 aria-invalid:hover:bg-destructive/5 aria-invalid:focus-visible:bg-card data-[slot=input-group-control]:bg-transparent data-[slot=input-group-control]:ring-0 data-[slot=input-group-control]:hover:bg-transparent data-[slot=input-group-control]:focus-visible:bg-transparent data-[slot=input-group-control]:aria-invalid:hover:bg-transparent md:text-(length:--density-text-13) dark:scheme-dark [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-0 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:duration-feedback hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-date-and-time-value]:min-h-[1lh] [&::-webkit-date-and-time-value]:text-start [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&[type=color]]:cursor-pointer [&[type=color]]:p-(--density-6) [&[type=file]]:cursor-pointer [&[type=file]]:py-(--density-6) [&[type=file]]:ps-(--density-6) [&[type=file]]:text-muted-foreground [&[type=number]]:[appearance:textfield] [&[type=number]]:tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Input }
