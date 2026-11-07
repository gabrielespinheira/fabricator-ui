"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const toggleVariants = cva(
  "group/toggle inline-flex motion-press cursor-pointer items-center justify-center gap-(--density-6) rounded-lg text-(length:--density-text-13) font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow,scale] duration-feedback ease-feedback outline-none hover:bg-hover! hover:bg-muted hover:text-foreground focus-visible:ring-1! focus-visible:ring-[3px] focus-visible:ring-ring active:bg-active! disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-1 aria-invalid:ring-destructive/50 aria-pressed:bg-active! aria-pressed:text-foreground data-[state=on]:bg-active! data-[state=on]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-feedback hover:[&_svg]:stroke-2 aria-pressed:[&_svg]:stroke-2 data-[state=on]:[&_svg]:stroke-2 [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border bg-transparent",
      },
      size: {
        default:
          "h-(--density-36) min-w-(--density-36) px-(--density-10) has-data-[icon=inline-end]:pr-(--density-8) has-data-[icon=inline-start]:pl-(--density-8)",
        sm: "h-(--density-36) min-w-(--density-36) px-(--density-10) density-compact has-data-[icon=inline-end]:pr-(--density-8) has-data-[icon=inline-start]:pl-(--density-8)",
        lg: "h-(--density-36) min-w-(--density-36) px-(--density-10) density-spacious has-data-[icon=inline-end]:pr-(--density-8) has-data-[icon=inline-start]:pl-(--density-8)",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
