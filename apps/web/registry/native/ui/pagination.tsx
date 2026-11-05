import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"

import { useFeedback } from "@/registry/native/lib/feedback"
import { wrapTextChildren } from "@/registry/native/lib/text-children"
import { Button } from "@/registry/native/ui/button"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// A finger-sized target: taller, and sideways only up to the half of the gap that
// is its own, or a press would land on the link beside it.
const LINK_SLOP = { top: 8, bottom: 8, left: 2, right: 2 }

const paginationLinkWashVariants = cva("cn-pagination-link-wash")

function Pagination({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("cn-pagination w-full flex-row justify-center", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function PaginationContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      role="list"
      data-slot="pagination-content"
      className={cn("cn-pagination-content flex-row items-center", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function PaginationItem({
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View role="listitem" data-slot="pagination-item" {...props}>
      {renderTextChildren(children)}
    </View>
  )
}

type PaginationLinkProps = {
  isActive?: boolean
  /** Multiplies the page sound's pitch: lower to go back, higher to go on. */
  pitch?: number
} & Omit<React.ComponentProps<typeof Button>, "variant">

function PaginationLink({
  className,
  isActive = false,
  size = "icon",
  pitch,
  hitSlop = LINK_SLOP,
  children,
  onPress,
  ...props
}: PaginationLinkProps) {
  const feedback = useFeedback()
  return (
    <Button
      data-sound="none"
      variant={isActive ? "outline" : "ghost"}
      size={size}
      washClassName={paginationLinkWashVariants()}
      data-slot="pagination-link"
      data-active={isActive}
      role="link"
      aria-selected={isActive}
      hitSlop={hitSlop}
      className={cn("cn-pagination-link", className)}
      onPress={(event) => {
        feedback("page", { pitch })
        onPress?.(event)
      }}
      {...props}
    >
      {wrapTextChildren(children, (text, key) => (
        <Text
          key={key}
          data-active={isActive}
          className="cn-pagination-link-text"
        >
          {text}
        </Text>
      ))}
    </Button>
  )
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      pitch={0.92}
      className={cn("cn-pagination-previous", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" aria-hidden />
      <Text className="cn-pagination-previous-text hidden sm:flex">{text}</Text>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      pitch={1.08}
      className={cn("cn-pagination-next", className)}
      {...props}
    >
      <Text className="cn-pagination-next-text hidden sm:flex">{text}</Text>
      <ChevronRightIcon data-icon="inline-end" aria-hidden />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-pagination-ellipsis-text">
      <View
        aria-hidden
        data-slot="pagination-ellipsis"
        className={cn(
          "cn-pagination-ellipsis items-center justify-center",
          className
        )}
        {...props}
      >
        <MoreHorizontalIcon strokeWidth={1.5} />
      </View>
    </TextStyle>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
