import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"
import { useResolveClassNames } from "uniwind"

import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

// Fabricator's badge: the status variants info, success, warning and error are
// tinted pills from the status surfaces. `self-start` is the website's `w-fit`:
// a view stretches across its column otherwise.
const badgeVariants = cva(
  "cn-badge shrink-0 flex-row items-center justify-center self-start overflow-hidden",
  {
    variants: {
      variant: {
        default: "cn-badge-variant-default",
        secondary: "cn-badge-variant-secondary",
        destructive: "cn-badge-variant-destructive",
        outline: "cn-badge-variant-outline",
        ghost: "cn-badge-variant-ghost",
        link: "cn-badge-variant-link",
        info: "cn-badge-variant-info",
        success: "cn-badge-variant-success",
        warning: "cn-badge-variant-warning",
        error: "cn-badge-variant-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const badgeTextVariants = cva("cn-badge-text", {
  variants: {
    variant: {
      default: "cn-badge-text-variant-default",
      secondary: "cn-badge-text-variant-secondary",
      destructive: "cn-badge-text-variant-destructive",
      outline: "cn-badge-text-variant-outline",
      ghost: "cn-badge-text-variant-ghost",
      link: "cn-badge-text-variant-link",
      info: "cn-badge-text-variant-info",
      success: "cn-badge-text-variant-success",
      warning: "cn-badge-text-variant-warning",
      error: "cn-badge-text-variant-error",
    },
  },
})

// A status badge's icon takes the role's fill, not its text colour.
const badgeIconVariants = cva("", {
  variants: {
    variant: {
      default: "cn-badge-icon-variant-default",
      secondary: "cn-badge-icon-variant-secondary",
      destructive: "cn-badge-icon-variant-destructive",
      outline: "cn-badge-icon-variant-outline",
      ghost: "cn-badge-icon-variant-ghost",
      link: "cn-badge-icon-variant-link",
      info: "cn-badge-icon-variant-info",
      success: "cn-badge-icon-variant-success",
      warning: "cn-badge-icon-variant-warning",
      error: "cn-badge-icon-variant-error",
    },
  },
})

function Badge({
  className,
  variant = "default",
  render,
  asChild,
  children,
  "aria-invalid": isInvalid,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof badgeVariants> &
  RenderProps & { "aria-invalid"?: boolean }) {
  const { color } = useResolveClassNames(badgeIconVariants({ variant }))
  const shared = {
    "data-slot": "badge",
    "data-variant": variant,
    "data-invalid": Boolean(isInvalid),
    "aria-invalid": isInvalid,
    className: cn(badgeVariants({ variant }), className),
    ...props,
  }
  const slotted = renderSlot(
    { render, asChild },
    shared,
    render ? renderTextChildren(children ?? render.props.children) : children
  )
  return (
    <TextStyle className={badgeTextVariants({ variant })}>
      <IconProvider
        size={12}
        strokeWidth={1.5}
        {...(typeof color === "string" ? { color } : {})}
      >
        {slotted ?? <View {...shared}>{renderTextChildren(children)}</View>}
      </IconProvider>
    </TextStyle>
  )
}

export { Badge, badgeTextVariants, badgeVariants }
