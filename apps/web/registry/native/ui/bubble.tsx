import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"

import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

type BubbleAlign = "start" | "end"
type BubbleVariant = NonNullable<VariantProps<typeof bubbleVariants>["variant"]>

// React Native has no `*:data-[slot=bubble-content]`: the content reads the
// bubble's variant and alignment from here, and holds the fill itself.
const BubbleContext = React.createContext<{
  variant: BubbleVariant
  align: BubbleAlign
}>({ variant: "default", align: "start" })

function BubbleGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="bubble-group"
      className={cn("cn-bubble-group min-w-0 flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

const bubbleVariants = cva("cn-bubble relative min-w-0 flex-col self-start", {
  variants: {
    variant: {
      default: "cn-bubble-variant-default",
      secondary: "cn-bubble-variant-secondary",
      muted: "cn-bubble-variant-muted",
      tinted: "cn-bubble-variant-tinted",
      outline: "cn-bubble-variant-outline",
      ghost: "cn-bubble-variant-ghost",
      destructive: "cn-bubble-variant-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Bubble({
  variant = "default",
  align = "start",
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <BubbleContext value={{ variant: variant ?? "default", align }}>
      <View
        data-slot="bubble"
        data-variant={variant}
        data-align={align}
        className={cn(bubbleVariants({ variant }), className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </BubbleContext>
  )
}

const bubbleContentVariants = cva(
  "cn-bubble-content max-w-full min-w-0 self-start overflow-hidden",
  {
    variants: {
      variant: {
        default: "cn-bubble-content-variant-default",
        secondary: "cn-bubble-content-variant-secondary",
        muted: "cn-bubble-content-variant-muted",
        tinted: "cn-bubble-content-variant-tinted",
        outline: "cn-bubble-content-variant-outline",
        ghost: "cn-bubble-content-variant-ghost",
        destructive: "cn-bubble-content-variant-destructive",
      },
    },
  }
)

const bubbleTextVariants = cva("cn-bubble-text", {
  variants: {
    variant: {
      default: "cn-bubble-text-variant-default",
      secondary: "cn-bubble-text-variant-secondary",
      muted: "cn-bubble-text-variant-muted",
      tinted: "cn-bubble-text-variant-tinted",
      outline: "cn-bubble-text-variant-outline",
      ghost: "cn-bubble-text-variant-ghost",
      destructive: "cn-bubble-text-variant-destructive",
    },
  },
})

const bubbleOutlineActionText = cva("cn-bubble-text-outline-action")

function BubbleContent({
  className,
  render,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof View> & RenderProps) {
  const { variant, align } = React.use(BubbleContext)
  const isAction = Boolean(render || asChild)
  const shared = {
    "data-slot": "bubble-content",
    "data-variant": variant,
    "data-align": align,
    className: cn(bubbleContentVariants({ variant }), className),
    // A ghost action is only its text, so it reaches for a full touch target.
    ...(isAction && variant === "ghost" ? { hitSlop: 10 } : {}),
    ...props,
  }
  const slotted = renderSlot(
    { render, asChild },
    shared,
    render ? renderTextChildren(children ?? render.props.children) : children
  )
  return (
    <TextStyle
      className={cn(
        bubbleTextVariants({ variant }),
        isAction && variant === "outline" && bubbleOutlineActionText()
      )}
    >
      {slotted ?? <View {...shared}>{renderTextChildren(children)}</View>}
    </TextStyle>
  )
}

const bubbleReactionsVariants = cva(
  "cn-bubble-reactions absolute z-10 flex-row items-center justify-center",
  {
    variants: {
      side: {
        top: "cn-bubble-reactions-side-top",
        bottom: "cn-bubble-reactions-side-bottom",
      },
      align: {
        start: "cn-bubble-reactions-align-start",
        end: "cn-bubble-reactions-align-end",
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
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <TextStyle className="cn-bubble-reactions-text">
      <View
        data-slot="bubble-reactions"
        data-align={align}
        data-side={side}
        className={cn(bubbleReactionsVariants({ side, align }), className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

export { Bubble, BubbleContent, BubbleGroup, BubbleReactions }
