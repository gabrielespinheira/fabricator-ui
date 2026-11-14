"use client"

import * as React from "react"
import { cn } from "cn"
import { Avatar as AvatarPrimitive } from "radix-ui"

import {
  AvatarGroupLabel,
  useAvatarGroupName,
  useAvatarGroupNames,
  useAvatarGroupParting,
} from "@/registry/bases/radix/lib/avatar-group-parting"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"

// Fabricator override of the upstream avatar: an optional `tooltip` names the
// person on hover and focus. A group parts around the avatar a mouse enters or
// focus reaches, on the settle spring, and shows that avatar's name in one
// label that glides with it (lib/avatar-group-parting,
// registry/styles/fabricator/avatar.css). In a group, `tooltip` gives the
// label its name; its other options apply to an avatar on its own.

type AvatarTooltip = string | React.ComponentProps<typeof TooltipContent>

// Set by a group: its avatars put their names in its label.
const AvatarGroupNameContext = React.createContext<
  ((id: string, name: React.ReactNode) => () => void) | null
>(null)

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
  const register = React.use(AvatarGroupNameContext)
  const tooltipProps = tooltip ? getTooltipProps(tooltip) : undefined
  const nameProps = useAvatarGroupName(
    tooltipProps ? register : null,
    tooltipProps?.children
  )
  const avatar = (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      // Focusable, so the name shows on focus too: an image named by it.
      {...(tooltipProps && {
        role: "img",
        "aria-label": getTooltipLabel(tooltipProps),
        tabIndex: 0,
        ...(register && nameProps),
      })}
      className={cn(
        "cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
  if (!tooltipProps || register) return avatar
  // Radix's tooltip needs a provider above it. No hoverable content, so a name
  // never holds on while the pointer moves away.
  return (
    <TooltipProvider>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent {...tooltipProps} />
      </Tooltip>
    </TooltipProvider>
  )
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

function AvatarGroup({
  className,
  ref,
  onPointerOver,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<"div">) {
  const { groupProps, group, activeIndex } = useAvatarGroupParting({
    ref,
    onPointerOver,
    onPointerLeave,
    onFocus,
    onBlur,
  })
  const { names, register } = useAvatarGroupNames()
  return (
    <AvatarGroupNameContext value={register}>
      <div
        data-slot="avatar-group"
        className={cn(
          "cn-avatar-group group/avatar-group relative flex *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
          className
        )}
        {...props}
        {...groupProps}
      />
      <AvatarGroupLabel group={group} activeIndex={activeIndex} names={names} />
    </AvatarGroupNameContext>
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
