import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Fabricator override of the upstream badge: adds the status variants info,
// success, warning and error (tinted pills from the status surfaces).
const badgeVariants = cva(
  "group/badge inline-flex h-(--density-24) w-fit shrink-0 items-center justify-center gap-(--density-6) overflow-hidden rounded-lg border border-transparent px-(--density-10) text-(length:--density-text-12) font-medium whitespace-nowrap transition-colors duration-feedback ease-feedback focus-visible:border-ring focus-visible:ring-0! focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-(--density-8) has-data-[icon=inline-start]:pl-(--density-8) aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3! [&>svg]:stroke-[1.5]",
  {
    variants: {
      variant: {
        default: "bg-active text-foreground [a]:hover:bg-foreground/10",
        secondary: "bg-hover text-foreground [a]:hover:bg-active",
        destructive:
          "border-destructive-border bg-destructive-surface-1 text-destructive-text dark:bg-destructive-surface-3 [a]:hover:bg-destructive-surface-2 dark:[a]:hover:bg-destructive-surface-4 [&>svg]:text-destructive",
        outline: "border-border text-foreground [a]:hover:bg-hover",
        ghost: "text-muted-foreground hover:bg-hover hover:text-foreground",
        link: "text-primary-text underline-offset-4 hover:underline",
        info: "border-info-border bg-info-surface-1 text-info-text dark:bg-info-surface-3 [a]:hover:bg-info-surface-2 dark:[a]:hover:bg-info-surface-4 [&>svg]:text-info",
        success:
          "border-success-border bg-success-surface-1 text-success-text dark:bg-success-surface-3 [a]:hover:bg-success-surface-2 dark:[a]:hover:bg-success-surface-4 [&>svg]:text-success",
        warning:
          "border-warning-border bg-warning-surface-1 text-warning-text dark:bg-warning-surface-3 [a]:hover:bg-warning-surface-2 dark:[a]:hover:bg-warning-surface-4 [&>svg]:text-warning",
        error:
          "border-destructive-border bg-destructive-surface-1 text-destructive-text dark:bg-destructive-surface-3 [a]:hover:bg-destructive-surface-2 dark:[a]:hover:bg-destructive-surface-4 [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    render?: (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode
  }) {
  if (render) {
    const renderProps = {
      "data-slot": "badge",
      "data-variant": variant,
      className: cn(badgeVariants({ variant }), className),
      ...props,
    }

    return render(renderProps)
  }

  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
