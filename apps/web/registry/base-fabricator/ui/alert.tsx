import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Fabricator override of the upstream alert (identical in every base): adds the
// status variants info, success, warning and error, and a `contrast` prop.
// Low contrast keeps the neutral surface and colours only the icon; high
// contrast washes the alert in the status surface. Upstream's default and
// destructive variants are unchanged.
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-xl p-(--density-16) text-left text-(length:--density-text-13) has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-(--density-10) *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:stroke-[1.5] *:[svg]:text-current *:[svg:not([class*='size-'])]:size-(--density-icon-16)",
  {
    variants: {
      variant: {
        default:
          "bg-hover text-foreground data-[contrast=high]:bg-active data-[contrast=high]:ring-border",
        destructive:
          "bg-hover text-foreground data-[contrast=high]:bg-destructive-surface-1 data-[contrast=high]:ring-destructive-border data-[contrast=high]:*:data-[slot=alert-description]:text-destructive-text dark:data-[contrast=high]:bg-destructive-surface-3 *:[svg]:text-destructive",
        info: "bg-hover text-foreground data-[contrast=high]:bg-info-surface-1 data-[contrast=high]:ring-info-border data-[contrast=high]:*:data-[slot=alert-description]:text-info-text dark:data-[contrast=high]:bg-info-surface-3 *:[svg]:text-info",
        success:
          "bg-hover text-foreground data-[contrast=high]:bg-success-surface-1 data-[contrast=high]:ring-success-border data-[contrast=high]:*:data-[slot=alert-description]:text-success-text dark:data-[contrast=high]:bg-success-surface-3 *:[svg]:text-success",
        warning:
          "bg-hover text-foreground data-[contrast=high]:bg-warning-surface-1 data-[contrast=high]:ring-warning-border data-[contrast=high]:*:data-[slot=alert-description]:text-warning-text dark:data-[contrast=high]:bg-warning-surface-3 *:[svg]:text-warning",
        error:
          "bg-hover text-foreground data-[contrast=high]:bg-destructive-surface-1 data-[contrast=high]:ring-destructive-border data-[contrast=high]:*:data-[slot=alert-description]:text-destructive-text dark:data-[contrast=high]:bg-destructive-surface-3 *:[svg]:text-destructive",
      },
      contrast: {
        low: "ring-0",
        high: "ring-1 ring-inset",
      },
    },
    defaultVariants: {
      variant: "default",
      contrast: "low",
    },
  }
)

function Alert({
  className,
  variant = "default",
  contrast = "low",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      data-contrast={contrast}
      role="alert"
      className={cn(alertVariants({ variant, contrast }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-(length:--density-text-14) leading-5 font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-(length:--density-text-13) text-balance text-foreground/70 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-3 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
