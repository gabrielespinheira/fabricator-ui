import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Fabricator override of the upstream alert (identical in every base): adds the
// status variants info, success, warning and error, and a `contrast` prop.
// Low contrast keeps the neutral surface and colours only the icon; high
// contrast washes the alert in the status surface. Upstream's default and
// destructive variants are unchanged.
const alertVariants = cva("cn-alert group/alert relative w-full", {
  variants: {
    variant: {
      default: "cn-alert-variant-default",
      destructive: "cn-alert-variant-destructive",
      info: "cn-alert-variant-info",
      success: "cn-alert-variant-success",
      warning: "cn-alert-variant-warning",
      error: "cn-alert-variant-error",
    },
    contrast: {
      low: "cn-alert-contrast-low",
      high: "cn-alert-contrast-high",
    },
  },
  defaultVariants: {
    variant: "default",
    contrast: "low",
  },
})

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
        "cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
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
        "cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
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
      className={cn("cn-alert-action", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
