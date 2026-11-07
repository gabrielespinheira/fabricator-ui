import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const markerVariants = cva(
  "group/marker relative flex min-h-(--density-20) w-full items-center gap-(--density-8) text-start text-(length:--density-text-13) leading-snug text-muted-foreground transition-colors duration-feedback ease-feedback [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16) [a]:underline [a]:decoration-current/30 [a]:underline-offset-3 [a]:hover:text-foreground [a]:hover:decoration-current/60 [button]:rounded-lg [button]:outline-none [button]:hover:text-foreground [button]:focus-visible:ring-1 [button]:focus-visible:ring-ring [button]:hover:[&_svg]:stroke-2",
  {
    variants: {
      variant: {
        default: "",
        separator:
          "before:me-1 before:h-px before:min-w-0 before:flex-1 before:bg-border/60 after:ms-1 after:h-px after:min-w-0 after:flex-1 after:bg-border/60",
        border: "border-b border-border/60 pb-(--density-8)",
      },
    },
  }
)

function Marker({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof markerVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant, className }))}
      {...props}
    />
  )
}

function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn(
        "size-(--density-icon-16) shrink-0 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    />
  )
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-content"
      className={cn(
        "min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center *:[a]:underline *:[a]:decoration-current/30 *:[a]:underline-offset-3 *:[a]:transition-colors *:[a]:duration-feedback *:[a]:hover:text-foreground *:[a]:hover:decoration-current/60",
        className
      )}
      {...props}
    />
  )
}

export { Marker, MarkerIcon, MarkerContent, markerVariants }
