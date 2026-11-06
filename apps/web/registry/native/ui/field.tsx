import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View } from "react-native"

import {
  FieldContext,
  getFieldErrorMessages,
  useFieldScope,
} from "@/registry/native/lib/field-model"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// A label wrapping a whole Field is a choice card, which pads the Field inside.
const FieldCardContext = React.createContext(false)

function hasChildOfType(children: React.ReactNode, type: unknown) {
  return React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === type
  )
}

function FieldSet({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="field-set"
      role="group"
      className={cn("cn-field-set flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<typeof Text> & { variant?: "legend" | "label" }) {
  return (
    <Text
      data-slot="field-legend"
      data-variant={variant}
      role="heading"
      className={cn("cn-field-legend", className)}
      {...props}
    />
  )
}

function FieldGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="field-group"
      className={cn("cn-field-group w-full flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

const fieldVariants = cva("cn-field w-full", {
  variants: {
    orientation: {
      vertical: "cn-field-orientation-vertical",
      horizontal:
        "cn-field-orientation-horizontal data-[has-content=true]:items-start",
      responsive:
        "cn-field-orientation-responsive sm:data-[has-content=true]:items-start",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

const FieldOrientationContext =
  React.createContext<VariantProps<typeof fieldVariants>["orientation"]>(
    undefined
  )

function Field({
  className,
  orientation = "vertical",
  "data-invalid": isInvalid,
  "data-disabled": isDisabled,
  children,
  ...props
}: React.ComponentProps<typeof View> &
  VariantProps<typeof fieldVariants> & {
    "data-invalid"?: boolean
    "data-disabled"?: boolean
  }) {
  const scope = useFieldScope({ isInvalid, isDisabled })
  const isInCard = React.use(FieldCardContext)
  return (
    <FieldContext value={scope}>
      <FieldOrientationContext value={orientation}>
        <View
          data-slot="field"
          data-orientation={orientation}
          data-invalid={scope.isInvalid}
          data-disabled={scope.isDisabled}
          data-card={isInCard}
          data-has-content={hasChildOfType(children, FieldContent)}
          role="group"
          className={cn(fieldVariants({ orientation }), className)}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </FieldOrientationContext>
    </FieldContext>
  )
}

function FieldContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="field-content"
      className={cn("cn-field-content flex-1 flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function FieldLabel({
  className,
  children,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  className?: string
  children?: React.ReactNode
}) {
  const scope = useFieldScope({})
  const orientation = React.use(FieldOrientationContext)
  const isCard = hasChildOfType(children, Field)
  const content = (
    <FieldCardContext value={isCard}>
      <FieldContext value={scope}>{renderTextChildren(children)}</FieldContext>
    </FieldCardContext>
  )
  return (
    <Pressable
      data-slot="field-label"
      data-card={isCard}
      data-checked={isCard && scope.isChecked}
      data-disabled={scope.isDisabled}
      data-orientation={orientation}
      // Not one accessible element: the control inside must stay reachable.
      accessible={false}
      disabled={scope.isDisabled}
      // A line of label text, taken to a full touch target.
      hitSlop={12}
      className={cn(
        "cn-field-label flex-row items-center self-start",
        className
      )}
      onPress={(event) => {
        scope.activate()
        onPress?.(event)
      }}
      {...props}
    >
      {scope.isInvalid ? (
        <TextStyle className="cn-field-label-text cn-field-label-text-invalid">
          {content}
        </TextStyle>
      ) : (
        <TextStyle className="cn-field-label-text">{content}</TextStyle>
      )}
    </Pressable>
  )
}

function FieldTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const scope = React.use(FieldContext)
  return (
    <Text
      data-slot="field-label"
      data-invalid={scope?.isInvalid ?? false}
      data-disabled={scope?.isDisabled ?? false}
      className={cn("cn-field-title", className)}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="field-description"
      className={cn("cn-field-description", className)}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  contentClassName,
  ...props
}: React.ComponentProps<typeof View> & {
  children?: React.ReactNode
  /**
   * The label's background has to match the surface behind it. On the web a
   * parent reaches it with a child selector; here it's a prop.
   */
  contentClassName?: string
}) {
  return (
    <View
      data-slot="field-separator"
      data-content={Boolean(children)}
      className={cn("cn-field-separator relative justify-center", className)}
      {...props}
    >
      <View className="cn-field-separator-line absolute inset-x-0 top-1/2" />
      {children ? (
        <Text
          data-slot="field-separator-content"
          className={cn(
            "cn-field-separator-content relative self-center",
            contentClassName
          )}
        >
          {children}
        </Text>
      ) : null}
    </View>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<typeof View> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const messages = getFieldErrorMessages(errors)
  if (!children && messages.length === 0) return null
  return (
    <TextStyle className="cn-field-error-text">
      <View
        data-slot="field-error"
        role="alert"
        accessibilityLiveRegion="polite"
        className={cn("cn-field-error flex-col", className)}
        {...props}
      >
        {children ? (
          renderTextChildren(children)
        ) : messages.length === 1 ? (
          <Text>{messages[0]}</Text>
        ) : (
          messages.map((message) => <Text key={message}>{`• ${message}`}</Text>)
        )}
      </View>
    </TextStyle>
  )
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
}
