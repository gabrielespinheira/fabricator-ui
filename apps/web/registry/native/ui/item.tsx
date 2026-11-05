import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"

import { useFeedback } from "@/registry/native/lib/feedback"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { Separator } from "@/registry/native/ui/separator"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type ItemSize = NonNullable<VariantProps<typeof itemVariants>["size"]>

type PartProps = {
  children?: React.ReactNode
  size?: ItemSize
  className?: string
}

// React Native has no group-data-* or group-has-*: parts read the item's size
// and whether it has a description from here.
const ItemContext = React.createContext<{
  size: ItemSize
  hasDescription: boolean
}>({ size: "default", hasDescription: false })

function containsDescription(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement<PartProps>(child) &&
      (child.type === ItemDescription ||
        containsDescription(child.props.children))
  )
}

// The website's `[&+[data-slot=item-content]]:flex-none`: a second content
// column right after the first keeps its own width.
function markAdjacentContent(children: React.ReactNode) {
  const parts = React.Children.toArray(children)
  const isContent = (part: React.ReactNode) =>
    React.isValidElement(part) && part.type === ItemContent
  return parts.map((part, index) =>
    index > 0 &&
    isContent(parts[index - 1]) &&
    React.isValidElement<PartProps>(part) &&
    part.type === ItemContent
      ? React.cloneElement(part, {
          className: cn("flex-none", part.props.className),
        })
      : part
  )
}

function ItemGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const sizes = React.Children.toArray(children).map((child) =>
    React.isValidElement<PartProps>(child) && child.type === Item
      ? child.props.size
      : undefined
  )
  const size = sizes.includes("xs")
    ? "xs"
    : sizes.includes("sm")
      ? "sm"
      : "default"
  return (
    <View
      role="list"
      data-slot="item-group"
      data-size={size}
      className={cn("cn-item-group w-full flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("cn-item-separator", className)}
      {...props}
    />
  )
}

const itemVariants = cva("cn-item w-full flex-row flex-wrap items-center", {
  variants: {
    variant: {
      default: "cn-item-variant-default",
      outline: "cn-item-variant-outline",
      muted: "cn-item-variant-muted",
    },
    size: {
      default: "cn-item-size-default",
      sm: "cn-item-size-sm",
      xs: "cn-item-size-xs",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Item({
  className,
  variant = "default",
  size = "default",
  render,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof itemVariants> &
  RenderProps) {
  const feedback = useFeedback()
  const content = markAdjacentContent(children ?? render?.props.children)
  const shared = {
    "data-slot": "item",
    "data-variant": variant,
    "data-size": size,
    className: cn(itemVariants({ variant, size, className })),
    ...props,
  }
  // Rendered as a pressable it's a link: the lightest sound, as rows are.
  const slotted = renderSlot(
    { render, asChild },
    { ...shared, onPress: () => feedback("tick") },
    render ? renderTextChildren(content) : children
  )
  return (
    <ItemContext
      value={{
        size: size ?? "default",
        hasDescription: containsDescription(content),
      }}
    >
      <TextStyle className="cn-item-text">
        {slotted ?? <View {...shared}>{renderTextChildren(content)}</View>}
      </TextStyle>
    </ItemContext>
  )
}

const itemMediaVariants = cva(
  "cn-item-media shrink-0 flex-row items-center justify-center",
  {
    variants: {
      variant: {
        default: "cn-item-media-variant-default",
        icon: "cn-item-media-variant-icon",
        image: "cn-item-media-variant-image",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof View> & VariantProps<typeof itemMediaVariants>) {
  const { size, hasDescription } = React.use(ItemContext)
  // The website's `[&_img]:size-full`: an image has no size of its own here.
  const content =
    variant === "image"
      ? React.Children.map(children, (child) =>
          React.isValidElement<{ className?: string }>(child)
            ? React.cloneElement(child, {
                className: cn("size-full", child.props.className),
              })
            : child
        )
      : children
  return (
    <IconProvider {...(variant === "icon" ? { strokeWidth: 1.5 } : {})}>
      <View
        data-slot="item-media"
        data-variant={variant}
        data-size={size}
        data-description={hasDescription}
        className={cn(itemMediaVariants({ variant, className }))}
        {...props}
      >
        {renderTextChildren(content)}
      </View>
    </IconProvider>
  )
}

function ItemContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size } = React.use(ItemContext)
  return (
    <View
      data-slot="item-content"
      data-size={size}
      className={cn("cn-item-content flex-1 flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="item-title"
      numberOfLines={1}
      className={cn("cn-item-title", className)}
      {...props}
    />
  )
}

function ItemDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { size } = React.use(ItemContext)
  return (
    <Text
      data-slot="item-description"
      data-size={size}
      numberOfLines={2}
      className={cn("cn-item-description", className)}
      {...props}
    />
  )
}

function ItemActions({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="item-actions"
      className={cn("cn-item-actions flex-row items-center", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function ItemHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="item-header"
      className={cn(
        "cn-item-header basis-full flex-row items-center justify-between",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function ItemFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="item-footer"
      className={cn(
        "cn-item-footer basis-full flex-row items-center justify-between",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
}
