import * as React from "react"
import {
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { Pressable, ScrollView, View } from "react-native"

import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

function Breadcrumb({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      role="navigation"
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn("cn-breadcrumb", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function BreadcrumbList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const scrollRef = React.useRef<React.ComponentRef<typeof ScrollView>>(null)
  // A trail too long for a phone scrolls instead of wrapping, and starts on the
  // current page: that's the end of it.
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: false })
      }
    >
      <TextStyle className="cn-breadcrumb-list-text">
        <View
          role="list"
          data-slot="breadcrumb-list"
          className={cn("cn-breadcrumb-list flex-row items-center", className)}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </TextStyle>
    </ScrollView>
  )
}

function BreadcrumbItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      role="listitem"
      data-slot="breadcrumb-item"
      className={cn("cn-breadcrumb-item flex-row items-center", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function BreadcrumbLink({
  className,
  render,
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const shared = {
    "data-slot": "breadcrumb-link",
    role: "link" as const,
    hitSlop: 8,
    className: cn("cn-breadcrumb-link", className),
    ...props,
  }
  return (
    renderSlot({ render, asChild }, shared, children) ?? (
      <Pressable {...shared}>{renderTextChildren(children)}</Pressable>
    )
  )
}

function BreadcrumbPage({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled
      aria-selected
      className={cn("cn-breadcrumb-page", className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-breadcrumb-separator-text">
      <View
        data-slot="breadcrumb-separator"
        role="presentation"
        aria-hidden
        className={cn("cn-breadcrumb-separator", className)}
        {...props}
      >
        {children === undefined ? (
          <ChevronRightIcon size={14} strokeWidth={1.5} />
        ) : (
          renderTextChildren(children)
        )}
      </View>
    </TextStyle>
  )
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden
      className={cn(
        "cn-breadcrumb-ellipsis items-center justify-center",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon strokeWidth={1.5} />
    </View>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
