import * as React from "react"
import * as AlertDialogPrimitive from "@rn-primitives/alert-dialog"
import { cn } from "cn"
import { KeyboardAvoidingView, Platform, View } from "react-native"
import Animated from "react-native-reanimated"

import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import { Button } from "@/registry/native/ui/button"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type AlertDialogSize = "default" | "sm"

// React Native has no group-data-*: parts read the content's size from here.
const AlertDialogContext = React.createContext<AlertDialogSize>("default")

function AlertDialog(props: AlertDialogPrimitive.RootProps) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  render,
  asChild,
  children,
  ...props
}: Omit<AlertDialogPrimitive.TriggerProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const resolved = resolveRender({ render, asChild, children })
  return (
    <AlertDialogPrimitive.Trigger
      data-slot="alert-dialog-trigger"
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </AlertDialogPrimitive.Trigger>
  )
}

function AlertDialogPortal(props: AlertDialogPrimitive.PortalProps) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const { entering, exiting } = useSurfaceAnimation("dialog", { scale: 1 })
  return (
    <Animated.View
      data-slot="alert-dialog-overlay"
      pointerEvents="none"
      entering={entering}
      exiting={exiting}
      className={cn("cn-alert-dialog-overlay absolute inset-0", className)}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default",
  children,
  ...props
}: AlertDialogPrimitive.ContentProps & {
  size?: AlertDialogSize
}) {
  const density = useDensity()
  const { entering, exiting } = useSurfaceAnimation("dialog")
  return (
    <AlertDialogPortal>
      <DensityScope density={density}>
        <AlertDialogPrimitive.Overlay
          aria-modal
          className="absolute inset-0 items-center justify-center"
        >
          <AlertDialogOverlay />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="w-full items-center"
          >
            <Animated.View
              entering={entering}
              exiting={exiting}
              className="w-full items-center"
            >
              <AlertDialogContext value={size}>
                <TextStyle className="cn-alert-dialog-text">
                  <AlertDialogPrimitive.Content
                    data-slot="alert-dialog-content"
                    data-size={size}
                    className={cn("cn-alert-dialog-content w-full", className)}
                    {...props}
                  >
                    {renderTextChildren(children)}
                  </AlertDialogPrimitive.Content>
                </TextStyle>
              </AlertDialogContext>
            </Animated.View>
          </KeyboardAvoidingView>
        </AlertDialogPrimitive.Overlay>
      </DensityScope>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const size = React.use(AlertDialogContext)
  return (
    <View
      data-slot="alert-dialog-header"
      data-size={size}
      className={cn("cn-alert-dialog-header flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function AlertDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const size = React.use(AlertDialogContext)
  return (
    <View
      data-slot="alert-dialog-footer"
      data-size={size}
      className={cn("cn-alert-dialog-footer flex-col-reverse", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function AlertDialogMedia({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-alert-dialog-media-text">
      <View
        data-slot="alert-dialog-media"
        className={cn("cn-alert-dialog-media", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const size = React.use(AlertDialogContext)
  return (
    <AlertDialogPrimitive.Title asChild>
      <Text
        data-slot="alert-dialog-title"
        data-size={size}
        role="heading"
        className={cn("cn-alert-dialog-title", className)}
        {...props}
      />
    </AlertDialogPrimitive.Title>
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const size = React.use(AlertDialogContext)
  return (
    <AlertDialogPrimitive.Description asChild>
      <Text
        data-slot="alert-dialog-description"
        data-size={size}
        className={cn("cn-alert-dialog-description", className)}
        {...props}
      />
    </AlertDialogPrimitive.Description>
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const size = React.use(AlertDialogContext)
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button
        data-slot="alert-dialog-action"
        data-size={size}
        className={cn("cn-alert-dialog-action", className)}
        {...props}
      />
    </AlertDialogPrimitive.Action>
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof Button>) {
  const contentSize = React.use(AlertDialogContext)
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button
        data-slot="alert-dialog-cancel"
        data-size={contentSize}
        variant={variant}
        size={size}
        className={cn("cn-alert-dialog-cancel", className)}
        {...props}
      />
    </AlertDialogPrimitive.Cancel>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
