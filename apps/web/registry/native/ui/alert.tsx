import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View } from "react-native"

import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// Fabricator's alert: the status variants info, success, warning and error, and
// a `contrast` prop. Low contrast keeps the neutral surface and colours only the
// icon; high contrast washes the alert in the status surface.
const alertVariants = cva("cn-alert relative w-full flex-row", {
  variants: {
    variant: {
      default: "cn-alert-variant-default",
      destructive: "cn-alert-variant-destructive",
      info: "cn-alert-variant-info",
      success: "cn-alert-variant-success",
      warning: "cn-alert-variant-warning",
      error: "cn-alert-variant-error",
    },
    contrast: {
      low: "cn-alert-contrast-low",
      high: "cn-alert-contrast-high",
    },
  },
  defaultVariants: {
    variant: "default",
    contrast: "low",
  },
})

const alertIconVariants = cva("", {
  variants: {
    variant: {
      default: "cn-alert-icon-variant-default",
      destructive: "cn-alert-icon-variant-destructive",
      info: "cn-alert-icon-variant-info",
      success: "cn-alert-icon-variant-success",
      warning: "cn-alert-icon-variant-warning",
      error: "cn-alert-icon-variant-error",
    },
  },
})

const alertDescriptionVariants = cva("cn-alert-description", {
  variants: {
    variant: {
      default: "",
      destructive: "cn-alert-description-variant-destructive",
      info: "cn-alert-description-variant-info",
      success: "cn-alert-description-variant-success",
      warning: "cn-alert-description-variant-warning",
      error: "cn-alert-description-variant-error",
    },
  },
})

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>
type AlertContrast = NonNullable<VariantProps<typeof alertVariants>["contrast"]>

// React Native has no `*:data-[slot=…]`: the description reads these from here.
const AlertContext = React.createContext<{
  variant: AlertVariant
  contrast: AlertContrast
}>({ variant: "default", contrast: "low" })

function isPart(child: React.ReactNode, ...parts: unknown[]) {
  return React.isValidElement(child) && parts.includes(child.type)
}

function Alert({
  className,
  variant = "default",
  contrast = "low",
  children,
  ...props
}: React.ComponentProps<typeof View> & VariantProps<typeof alertVariants>) {
  const resolvedVariant = variant ?? "default"
  // No grid here: the title and description get a column of their own, and
  // anything else, an icon on the website, sits beside it.
  const parts = React.Children.toArray(children)
  const actions = parts.filter((part) => isPart(part, AlertAction))
  const body = parts.filter(
    (part) =>
      typeof part !== "object" || isPart(part, AlertTitle, AlertDescription)
  )
  const media = parts.filter(
    (part) => !actions.includes(part) && !body.includes(part)
  )
  return (
    <AlertContext
      value={{ variant: resolvedVariant, contrast: contrast ?? "low" }}
    >
      <TextStyle className="cn-alert-text">
        <View
          data-slot="alert"
          data-variant={variant}
          data-contrast={contrast}
          data-action={actions.length > 0}
          role="alert"
          className={cn(alertVariants({ variant, contrast }), className)}
          {...props}
        >
          {media.length > 0 ? (
            <TextStyle className={alertIconVariants({ variant })}>
              <IconProvider strokeWidth={1.5}>
                <View className="cn-alert-media shrink-0">{media}</View>
              </IconProvider>
            </TextStyle>
          ) : null}
          <View className="cn-alert-body min-w-0 flex-1">
            {renderTextChildren(body)}
          </View>
          {actions}
        </View>
      </TextStyle>
    </AlertContext>
  )
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="alert-title"
      className={cn("cn-alert-title", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { variant, contrast } = React.use(AlertContext)
  return (
    <Text
      data-slot="alert-description"
      data-contrast={contrast}
      className={cn(alertDescriptionVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertAction({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="alert-action"
      className={cn("cn-alert-action absolute", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

export { Alert, AlertAction, AlertDescription, AlertTitle }
