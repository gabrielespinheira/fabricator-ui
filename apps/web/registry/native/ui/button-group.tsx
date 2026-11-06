import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"

import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { ButtonJoinedContext } from "@/registry/native/ui/button"
import { Separator } from "@/registry/native/ui/separator"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

const buttonGroupVariants = cva("cn-button-group items-stretch self-start", {
  variants: {
    orientation: {
      horizontal: "cn-button-group-orientation-horizontal flex-row",
      vertical: "cn-button-group-orientation-vertical flex-col",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

type ButtonGroupItemProps = {
  className?: string
  "data-group-item"?: string
}

function getItemPosition(index: number, count: number) {
  if (index === 0) return "first"
  return index === count - 1 ? "last" : "middle"
}

function ButtonGroup({
  className,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof buttonGroupVariants>) {
  const items = React.Children.toArray(children)
  const isNested = items.some(
    (item) => React.isValidElement(item) && item.type === ButtonGroup
  )
  return (
    <ButtonJoinedContext value={true}>
      <View
        role="group"
        data-slot="button-group"
        data-orientation={orientation}
        data-nested={isNested}
        className={cn(buttonGroupVariants({ orientation }), className)}
        {...props}
      >
        {/* No sibling selectors here: each part is told where it sits, and squares
            the corners and drops the border it shares with its neighbour. */}
        {items.map((item, index) =>
          !isNested &&
          items.length > 1 &&
          React.isValidElement<ButtonGroupItemProps>(item) &&
          item.type !== React.Fragment
            ? React.cloneElement(item, {
                "data-group-item": `${orientation}-${getItemPosition(index, items.length)}`,
                className: cn("cn-button-group-item", item.props.className),
              })
            : renderTextChildren(item)
        )}
      </View>
    </ButtonJoinedContext>
  )
}

function ButtonGroupText({
  className,
  render,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof View> & RenderProps) {
  const shared = {
    "data-slot": "button-group-text",
    className: cn("cn-button-group-text flex-row items-center", className),
    ...props,
  }
  const slotted = renderSlot(
    { render, asChild },
    shared,
    render ? renderTextChildren(children ?? render.props.children) : children
  )
  return (
    <TextStyle className="cn-button-group-text-text">
      <IconProvider strokeWidth={1.5}>
        {slotted ?? <View {...shared}>{renderTextChildren(children)}</View>}
      </IconProvider>
    </TextStyle>
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn("cn-button-group-separator relative", className)}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
