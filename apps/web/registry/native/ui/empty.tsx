import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"
import { useCSSVariable } from "uniwind"

import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

function Empty({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-empty-text">
      <View
        data-slot="empty"
        className={cn(
          "cn-empty w-full min-w-0 flex-1 flex-col items-center justify-center",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

function EmptyHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="empty-header"
      className={cn(
        "cn-empty-header max-w-sm flex-col items-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

const emptyMediaVariants = cva(
  "cn-empty-media shrink-0 flex-row items-center justify-center",
  {
    variants: {
      variant: {
        default: "cn-empty-media-default",
        icon: "cn-empty-media-icon",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof emptyMediaVariants>) {
  const iconTileSize = parseNumber(useCSSVariable("--density-20"), 20)
  return (
    <TextStyle className="cn-empty-media-text">
      <IconProvider
        {...(variant === "icon"
          ? { size: iconTileSize, strokeWidth: 1.5 }
          : {})}
      >
        <View
          data-slot="empty-icon"
          data-variant={variant}
          className={cn(emptyMediaVariants({ variant, className }))}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </IconProvider>
    </TextStyle>
  )
}

function EmptyTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="empty-title"
      role="heading"
      className={cn("cn-empty-title", className)}
      {...props}
    />
  )
}

function EmptyDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="empty-description"
      className={cn("cn-empty-description", className)}
      {...props}
    />
  )
}

function EmptyContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="empty-content"
      className={cn(
        "cn-empty-content w-full max-w-sm min-w-0 flex-col items-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
}
