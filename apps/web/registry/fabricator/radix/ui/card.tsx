import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Upstream's Card with Fabricator additions: a `variant`, a media column in the
// header, the headline value and a stretched link that makes the whole card
// open one record while the controls inside it keep working.

const cardVariants = cva("cn-card group/card relative flex flex-col", {
  variants: {
    variant: {
      default: "cn-card-variant-default",
      muted: "cn-card-variant-muted",
      tray: "cn-card-variant-tray",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
} & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] has-data-[slot=card-media]:grid-cols-[auto_1fr] has-data-[slot=card-media]:has-data-[slot=card-action]:grid-cols-[auto_1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

const cardMediaVariants = cva(
  "cn-card-media col-start-1 row-span-2 row-start-1 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "cn-card-media-variant-default",
        icon: "cn-card-media-variant-icon",
        image: "cn-card-media-variant-image",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/** The header's leading picture: an icon tile, a logo or an avatar. */
function CardMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardMediaVariants>) {
  return (
    <div
      data-slot="card-media"
      data-variant={variant}
      className={cn(cardMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "cn-card-title cn-font-heading group-has-data-[slot=card-media]/card-header:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "cn-card-description group-has-data-[slot=card-media]/card-header:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "cn-card-action col-start-[-2] row-span-2 row-start-1 justify-self-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * The title's link to the record. Its `::after` covers the card, so the whole
 * card opens it; buttons and menus inside the card stay above it.
 */
function CardLink({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      data-slot="card-link"
      className={cn(
        "cn-card-link outline-none after:absolute after:inset-0 after:content-['']",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("cn-card-content", className)}
      {...props}
    />
  )
}

/** The headline figure. A caption or a Delta after it wraps under it. */
function CardValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-value"
      className={cn("cn-card-value flex flex-wrap items-baseline", className)}
      {...props}
    />
  )
}

/** Muted text after a value: a unit, a total ("of 200K"), a previous value. */
function CardValueCaption({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="card-value-caption"
      className={cn("cn-card-value-caption", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("cn-card-footer flex items-center", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardMedia,
  CardLink,
  CardValue,
  CardValueCaption,
  cardVariants,
}
