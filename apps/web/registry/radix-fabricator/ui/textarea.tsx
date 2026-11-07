import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border-0 bg-transparent px-(--density-10) py-(--density-8) text-base text-foreground ring-1 ring-border transition-[color,background-color,box-shadow] duration-feedback ease-feedback outline-none ring-inset placeholder:text-muted-foreground hover:bg-muted/50 focus-visible:bg-card focus-visible:ring-foreground/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/50 aria-invalid:hover:bg-destructive/5 aria-invalid:focus-visible:bg-card data-[slot=input-group-control]:bg-transparent data-[slot=input-group-control]:ring-0 data-[slot=input-group-control]:hover:bg-transparent data-[slot=input-group-control]:focus-visible:bg-transparent data-[slot=input-group-control]:aria-invalid:hover:bg-transparent md:text-(length:--density-text-13)",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
