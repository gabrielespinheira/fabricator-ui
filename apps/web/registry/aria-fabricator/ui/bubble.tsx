import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-[color-mix(in_oklab,var(--foreground)_6%,var(--background))] *:data-[slot=bubble-content]:text-foreground dark:*:data-[slot=bubble-content]:bg-[color-mix(in_oklab,var(--foreground)_20%,var(--background))] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklab,var(--foreground)_9%,var(--background))] dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklab,var(--foreground)_24%,var(--background))]",
        secondary:
          "*:data-[slot=bubble-content]:bg-[color-mix(in_oklab,var(--foreground)_10%,var(--background))] *:data-[slot=bubble-content]:text-foreground dark:*:data-[slot=bubble-content]:bg-[color-mix(in_oklab,var(--foreground)_28%,var(--background))] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklab,var(--foreground)_13%,var(--background))] dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklab,var(--foreground)_32%,var(--background))]",
        muted:
          "*:data-[slot=bubble-content]:bg-hover *:data-[slot=bubble-content]:text-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-active",
        tinted:
          "*:data-[slot=bubble-content]:bg-[color-mix(in_oklab,var(--focus-ring)_12%,var(--background))] *:data-[slot=bubble-content]:text-foreground dark:*:data-[slot=bubble-content]:bg-[color-mix(in_oklab,var(--focus-ring)_22%,var(--background))] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklab,var(--focus-ring)_18%,var(--background))] dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklab,var(--focus-ring)_28%,var(--background))]",
        outline:
          "*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:text-foreground [&>[data-slot=bubble-content]:is(button,a)]:text-muted-foreground [&>[data-slot=bubble-content]:is(button,a):active]:bg-active [&>[data-slot=bubble-content]:is(button,a):hover]:bg-hover [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground",
        ghost:
          "border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 *:data-[slot=bubble-content]:text-foreground [&>[data-slot=bubble-content]:is(button,a)]:rounded-lg [&>[data-slot=bubble-content]:is(button,a):hover]:bg-hover",
        destructive:
          "*:data-[slot=bubble-content]:bg-destructive/12 *:data-[slot=bubble-content]:text-destructive-text [&>[data-slot=bubble-content]:is(button,a):hover]:bg-destructive/16",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  render,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  render?: (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode
}) {
  if (render) {
    const renderProps = {
      ...props,
      "data-slot": "bubble-content",
      className: cn(
        "w-fit max-w-full min-w-0 overflow-hidden rounded-lg border border-transparent px-(--density-14) py-(--density-8) text-(length:--density-text-14) leading-normal text-pretty wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:duration-feedback [button,a]:ease-feedback [button,a]:outline-none [button,a]:focus-visible:ring-1 [button,a]:focus-visible:ring-ring",
        className
      ),
      children,
    }

    return render(renderProps)
  }

  return (
    <div
      {...props}
      data-slot="bubble-content"
      className={cn(
        "w-fit max-w-full min-w-0 overflow-hidden rounded-lg border border-transparent px-(--density-14) py-(--density-8) text-(length:--density-text-14) leading-normal text-pretty wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:duration-feedback [button,a]:ease-feedback [button,a]:outline-none [button,a]:focus-visible:ring-1 [button,a]:focus-visible:ring-ring",
        className
      )}
    >
      {children}
    </div>
  )
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex h-(--density-24) w-fit shrink-0 items-center justify-center gap-0.5 rounded-full bg-surface-3 px-(--density-6) text-(length:--density-text-12) shadow-surface-3 has-[button]:p-0.5",
  {
    variants: {
      side: {
        top: "top-0 -translate-y-3/4",
        bottom: "bottom-0 translate-y-3/4",
      },
      align: {
        start: "start-3",
        end: "end-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  }
)

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions }
