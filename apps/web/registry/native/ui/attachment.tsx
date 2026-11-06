import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  View,
  type GestureResponderEvent,
} from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { PressWash } from "@/registry/native/lib/press-wash"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { Button } from "@/registry/native/ui/button"
import { usePulse } from "@/registry/native/ui/skeleton"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done"

const attachmentVariants = cva(
  "cn-attachment relative max-w-full min-w-0 shrink-0 self-start border",
  {
    variants: {
      size: {
        default: "cn-attachment-size-default",
        sm: "cn-attachment-size-sm",
        xs: "cn-attachment-size-xs",
      },
      orientation: {
        horizontal:
          "cn-attachment-orientation-horizontal flex-row items-center",
        vertical: "cn-attachment-orientation-vertical flex-col",
      },
    },
  }
)

const attachmentTextVariants = cva("cn-attachment-text", {
  variants: {
    size: {
      default: "cn-attachment-text-size-default",
      sm: "cn-attachment-text-size-sm",
      xs: "cn-attachment-text-size-xs",
    },
  },
})

type AttachmentSize = NonNullable<
  VariantProps<typeof attachmentVariants>["size"]
>
type AttachmentOrientation = NonNullable<
  VariantProps<typeof attachmentVariants>["orientation"]
>

// React Native has no group-data-*: parts read these from here.
const AttachmentContext = React.createContext<{
  state: AttachmentState
  size: AttachmentSize
  orientation: AttachmentOrientation
}>({ state: "done", size: "default", orientation: "horizontal" })

function isPart(child: React.ReactNode, part: unknown) {
  return React.isValidElement(child) && child.type === part
}

function Attachment({
  className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof attachmentVariants> & {
    state?: "idle" | "uploading" | "processing" | "error" | "done"
  }) {
  const parts = React.Children.toArray(children)
  const resolvedSize = size ?? "default"
  const resolvedOrientation = orientation ?? "horizontal"
  const hasContent = parts.some((part) => isPart(part, AttachmentContent))
  return (
    <AttachmentContext
      value={{ state, size: resolvedSize, orientation: resolvedOrientation }}
    >
      <TextStyle className={attachmentTextVariants({ size })}>
        <View
          data-slot="attachment"
          data-state={state}
          data-size={size}
          data-orientation={orientation}
          data-media={parts.some((part) => isPart(part, AttachmentMedia))}
          data-content={hasContent}
          data-end-inset={resolvedOrientation === "horizontal" && hasContent}
          className={cn(attachmentVariants({ size, orientation }), className)}
          {...props}
        >
          {renderTextChildren(parts)}
        </View>
      </TextStyle>
    </AttachmentContext>
  )
}

const attachmentMediaVariants = cva(
  "cn-attachment-media relative aspect-square shrink-0 items-center justify-center overflow-hidden",
  {
    variants: {
      variant: {
        icon: "cn-attachment-media-variant-icon",
        image: "cn-attachment-media-variant-image",
      },
    },
    defaultVariants: {
      variant: "icon",
    },
  }
)

const attachmentMediaTextVariants = cva("cn-attachment-media-text", {
  variants: {
    state: {
      idle: "",
      uploading: "",
      processing: "",
      error: "cn-attachment-media-text-state-error",
      done: "",
    },
  },
})

// The website's `opacity-60` on an image still on its way.
const DIMMED = 0.6

const MEDIA_ICON_TOKEN: Record<AttachmentSize, string> = {
  default: "--density-icon-16",
  sm: "--density-icon-16",
  xs: "--density-icon-14",
}

function AttachmentMedia({
  className,
  variant = "icon",
  style,
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof attachmentMediaVariants>) {
  const { state, size, orientation } = React.use(AttachmentContext)
  const isVertical = orientation === "vertical"
  const iconSize = parseNumber(
    useCSSVariable(isVertical ? "--density-24" : MEDIA_ICON_TOKEN[size]),
    16
  )
  // An image is dimmed until it's up, and clears on the move timing. A fade:
  // Reduce Motion keeps it, and Reanimated would jump it to the end.
  const targetOpacity =
    variant !== "image" || state === "idle" || state === "done" ? 1 : DIMMED
  const motion = useMotion("move")
  const opacity = useSharedValue(targetOpacity)
  React.useEffect(() => {
    opacity.value = withTiming(targetOpacity, {
      duration: motion.enterMs,
      easing: motion.moveEasing,
      reduceMotion: ReduceMotion.Never,
    })
  }, [motion, opacity, targetOpacity])
  const opacityStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  // Icons and spinners take their size as a prop, and an image has no size of
  // its own: the website sets both from here with `[&_svg]` and `*:[img]`.
  const content = React.Children.map(children, (child) => {
    if (
      !React.isValidElement<{ className?: string; size?: number }>(child) ||
      child.type === React.Fragment
    ) {
      return child
    }
    return variant === "image"
      ? React.cloneElement(child, {
          className: cn("size-full", child.props.className),
        })
      : React.cloneElement(child, { size: child.props.size ?? iconSize })
  })
  return (
    <TextStyle className={attachmentMediaTextVariants({ state })}>
      <IconProvider strokeWidth={1.5}>
        <Animated.View
          data-slot="attachment-media"
          data-variant={variant}
          data-state={state}
          data-layout={isVertical ? "vertical" : size}
          className={cn(attachmentMediaVariants({ variant }), className)}
          style={[opacityStyle, style]}
          {...props}
        >
          {renderTextChildren(content)}
        </Animated.View>
      </IconProvider>
    </TextStyle>
  )
}

function AttachmentContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { orientation } = React.use(AttachmentContext)
  return (
    <View
      data-slot="attachment-content"
      data-orientation={orientation}
      className={cn(
        "cn-attachment-content max-w-full min-w-0 shrink grow",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function AttachmentTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { state } = React.use(AttachmentContext)
  const isBusy = state === "uploading" || state === "processing"
  const pulseStyle = usePulse(isBusy)
  return (
    <Animated.View style={pulseStyle}>
      <Text
        data-slot="attachment-title"
        numberOfLines={1}
        className={cn("cn-attachment-title", className)}
        {...props}
      />
    </Animated.View>
  )
}

function AttachmentDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { state } = React.use(AttachmentContext)
  return (
    <Text
      data-slot="attachment-description"
      data-state={state}
      numberOfLines={1}
      className={cn("cn-attachment-description", className)}
      {...props}
    />
  )
}

function AttachmentActions({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { orientation } = React.use(AttachmentContext)
  return (
    <View
      data-slot="attachment-actions"
      data-orientation={orientation}
      className={cn(
        "cn-attachment-actions shrink-0 flex-row items-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function AttachmentAction({
  className,
  variant,
  size = "icon-xs",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant ?? "ghost"}
      size={size}
      className={cn("cn-attachment-action", className)}
      {...props}
    />
  )
}

// The pressed wash follows the tile's corners, which are larger when vertical.
const attachmentTriggerWashVariants = cva("cn-attachment-trigger-wash", {
  variants: {
    orientation: {
      horizontal: "",
      vertical: "cn-attachment-trigger-wash-vertical",
    },
  },
})

// What a row reaches past its own height to make a full touch target. A vertical
// attachment is taller than one at every size.
const TRIGGER_SLOP: Record<AttachmentSize, number> = {
  default: 2,
  sm: 5,
  xs: 9,
}

function AttachmentTrigger({
  className,
  render,
  asChild,
  children,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: React.ComponentProps<typeof Pressable> &
  RenderProps & { className?: string; children?: React.ReactNode }) {
  const { orientation, size } = React.use(AttachmentContext)
  const feedback = useFeedback()
  const press = usePressScale()
  const slop = orientation === "horizontal" ? TRIGGER_SLOP[size] : 0
  const shared = {
    "data-slot": "attachment-trigger",
    role: "button" as const,
    hitSlop: { top: slop, bottom: slop },
    className: cn("cn-attachment-trigger absolute inset-0 z-10", className),
    onPress: (event: GestureResponderEvent) => {
      feedback("tap")
      onPress?.(event)
    },
    ...props,
  }
  const slotted = renderSlot(
    { render, asChild },
    shared,
    render ? renderTextChildren(children ?? render.props.children) : children
  )
  return (
    slotted ?? (
      <Pressable
        {...shared}
        onPressIn={(event) => {
          press.onPressIn()
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          press.onPressOut()
          onPressOut?.(event)
        }}
      >
        <PressWash
          press={press}
          className={attachmentTriggerWashVariants({ orientation })}
        />
        {renderTextChildren(children)}
      </Pressable>
    )
  )
}

const attachmentGroupVariants = cva("cn-attachment-group flex-row")

function AttachmentGroup({
  className,
  contentContainerClassName,
  children,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView
      data-slot="attachment-group"
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn("min-w-0 grow-0", className)}
      contentContainerClassName={attachmentGroupVariants({
        className: contentContainerClassName,
      })}
      {...props}
    >
      {renderTextChildren(children)}
    </ScrollView>
  )
}

export {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
}
