import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 motion-press cursor-pointer items-center justify-center rounded-lg border border-transparent text-(length:--density-text-13) font-medium whitespace-nowrap transition-all duration-feedback ease-feedback outline-none select-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-invalid:ring-1 aria-invalid:ring-destructive/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-feedback hover:[&_svg]:stroke-2 aria-expanded:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 aria-expanded:bg-primary/80 data-pressed:bg-primary/80",
        outline:
          "border-border bg-transparent text-foreground hover:bg-hover active:bg-active aria-expanded:bg-active aria-invalid:border-destructive/50 data-pressed:bg-active",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary aria-expanded:bg-secondary data-pressed:bg-secondary",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-hover hover:text-foreground active:bg-active aria-expanded:bg-active aria-expanded:text-foreground data-pressed:bg-active",
        destructive:
          "bg-destructive/12 text-destructive-text hover:bg-destructive/16 active:bg-destructive/20 aria-expanded:bg-destructive/20 data-pressed:bg-destructive/20",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-(--density-36) gap-(--density-6) px-(--density-16) has-data-[icon=inline-end]:pr-(--density-12) has-data-[icon=inline-start]:pl-(--density-12)",
        xs: "h-6 gap-1 px-2 text-[12px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-(--density-36) gap-(--density-6) px-(--density-16) density-compact has-data-[icon=inline-end]:pr-(--density-12) has-data-[icon=inline-start]:pl-(--density-12)",
        lg: "h-(--density-36) gap-(--density-6) px-(--density-16) density-spacious has-data-[icon=inline-end]:pr-(--density-12) has-data-[icon=inline-start]:pl-(--density-12)",
        icon: "size-(--density-36)",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-(--density-36) density-compact",
        "icon-lg": "size-(--density-36) density-spacious",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
