"use client"

import * as React from "react"
import { cn } from "cn"
import { Avatar as AvatarPrimitive } from "radix-ui"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"

// Fabricator override of the upstream avatar: an optional `tooltip` names the
// person on hover and focus, and a group parts around the avatar under the
// pointer (registry/styles/fabricator/avatar.css). A group's avatars share one
// tooltip provider, so moving along it swaps names without the open animation;
// an avatar outside a group brings its own, which Radix's tooltip needs.

type AvatarTooltip = string | React.ComponentProps<typeof TooltipContent>

const AvatarGroupContext = React.createContext(false)

function getTooltipProps(tooltip: AvatarTooltip) {
  return typeof tooltip === "string" ? { children: tooltip } : tooltip
}

function getTooltipLabel({ children }: { children?: React.ReactNode }) {
  return typeof children === "string" ? children : undefined
}

function Avatar({
  className,
  size = "default",
  tooltip,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
  tooltip?: AvatarTooltip
}) {
  const isInGroup = React.use(AvatarGroupContext)
  const avatar = (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
  if (!tooltip) return avatar

  const tooltipProps = getTooltipProps(tooltip)
  // Focusable, so the name shows on focus too: an image named by its tooltip.
  // No hoverable content: its grace area would hold one name open while the
  // pointer moves sideways onto the next avatar.
  const avatarWithTooltip = (
    <Tooltip disableHoverableContent>
      <TooltipTrigger
        asChild
        role="img"
        aria-label={getTooltipLabel(tooltipProps)}
        tabIndex={0}
      >
        {avatar}
      </TooltipTrigger>
      <TooltipContent {...tooltipProps} />
    </Tooltip>
  )
  if (isInGroup) return avatarWithTooltip
  return <TooltipProvider>{avatarWithTooltip}</TooltipProvider>
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "cn-avatar-image aspect-square size-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <AvatarGroupContext value>
      <TooltipProvider>
        <div
          data-slot="avatar-group"
          className={cn(
            "cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
            className
          )}
          {...props}
        />
      </TooltipProvider>
    </AvatarGroupContext>
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
