import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"
import Animated from "react-native-reanimated"

import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { usePulse } from "@/registry/native/ui/skeleton"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

const markerVariants = cva("cn-marker relative w-full flex-row items-center", {
  variants: {
    variant: {
      default: "cn-marker-variant-default",
      separator: "cn-marker-variant-separator",
      border: "cn-marker-variant-border",
    },
  },
})

type MarkerVariant = NonNullable<VariantProps<typeof markerVariants>["variant"]>

// React Native has no group-data-*: the content reads the variant from here.
const MarkerContext = React.createContext<MarkerVariant>("default")

function Marker({
  className,
  variant = "default",
  render,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof markerVariants> &
  RenderProps) {
  const shared = {
    "data-slot": "marker",
    "data-variant": variant,
    className: cn(markerVariants({ variant, className })),
    ...props,
  }
  // The separator's rules, the website's ::before and ::after.
  const content =
    variant === "separator" ? (
      <>
        <View aria-hidden className="cn-marker-line-start" />
        {renderTextChildren(children ?? render?.props.children)}
        <View aria-hidden className="cn-marker-line-end" />
      </>
    ) : (
      renderTextChildren(children ?? render?.props.children)
    )
  const slotted = renderSlot(
    { render, asChild },
    shared,
    render ? content : children
  )
  return (
    <MarkerContext value={variant ?? "default"}>
      <TextStyle className="cn-marker-text">
        <IconProvider strokeWidth={1.5}>
          {slotted ?? <View {...shared}>{content}</View>}
        </IconProvider>
      </TextStyle>
    </MarkerContext>
  )
}

function MarkerIcon({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="marker-icon"
      aria-hidden
      className={cn(
        "cn-marker-icon shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function MarkerContent({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const variant = React.use(MarkerContext)
  // The website's loading text is `className="shimmer"`, so the same class works
  // here, where no utility can animate it.
  const isShimmering = /\bshimmer\b/.test(className ?? "")
  const pulseStyle = usePulse(isShimmering)
  const content = (
    <Text
      data-slot="marker-content"
      data-variant={variant}
      className={cn("cn-marker-content min-w-0 shrink", className)}
      {...props}
    />
  )
  if (!isShimmering) return content
  return (
    <Animated.View className="min-w-0 shrink" style={pulseStyle}>
      {content}
    </Animated.View>
  )
}

export { Marker, MarkerContent, MarkerIcon, markerVariants }
