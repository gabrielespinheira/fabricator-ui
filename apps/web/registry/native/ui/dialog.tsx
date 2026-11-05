import * as React from "react"
import { XIcon } from "@fabricator-ui/icons-react-native"
import * as DialogPrimitive from "@rn-primitives/dialog"
import { cn } from "cn"
import { KeyboardAvoidingView, Platform, View } from "react-native"
import Animated from "react-native-reanimated"

import { useMountFeedback } from "@/registry/native/lib/feedback"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import { resolveRender, type RenderProps } from "@/registry/native/lib/render"
import { Button } from "@/registry/native/ui/button"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

function Dialog(props: DialogPrimitive.RootProps) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  render,
  asChild,
  children,
  ...props
}: Omit<DialogPrimitive.TriggerProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const resolved = resolveRender({ render, asChild, children })
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal(props: DialogPrimitive.PortalProps) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  render,
  asChild,
  children,
  ...props
}: Omit<DialogPrimitive.CloseProps, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const resolved = resolveRender({ render, asChild, children })
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...props}
      asChild={resolved.asChild}
    >
      {resolved.asChild
        ? resolved.children
        : renderTextChildren(resolved.children)}
    </DialogPrimitive.Close>
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const { entering, exiting } = useSurfaceAnimation("dialog", { scale: 1 })
  return (
    <Animated.View
      data-slot="dialog-overlay"
      pointerEvents="none"
      entering={entering}
      exiting={exiting}
      className={cn("cn-dialog-overlay absolute inset-0", className)}
      {...props}
    />
  )
}

// The primitive's portal renders this only while the dialog is open.
function DialogFeedback() {
  useMountFeedback("dialog")
  return null
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.ContentProps & {
  showCloseButton?: boolean
}) {
  const density = useDensity()
  const { entering, exiting } = useSurfaceAnimation("dialog")
  return (
    <DialogPortal>
      <DensityScope density={density}>
        <DialogFeedback />
        <DialogPrimitive.Overlay
          aria-modal
          className="absolute inset-0 items-center justify-center"
        >
          <DialogOverlay />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="w-full items-center"
          >
            <Animated.View
              entering={entering}
              exiting={exiting}
              className="w-full items-center"
            >
              <TextStyle className="cn-dialog-text">
                <DialogPrimitive.Content
                  data-slot="dialog-content"
                  className={cn("cn-dialog-content w-full", className)}
                  {...props}
                >
                  {renderTextChildren(children)}
                  {showCloseButton && (
                    <DialogClose
                      accessibilityLabel="Close"
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="cn-dialog-close absolute"
                        />
                      }
                    >
                      <XIcon />
                    </DialogClose>
                  )}
                </DialogPrimitive.Content>
              </TextStyle>
            </Animated.View>
          </KeyboardAvoidingView>
        </DialogPrimitive.Overlay>
      </DensityScope>
    </DialogPortal>
  )
}

function DialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="dialog-header"
      className={cn("cn-dialog-header flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  showCloseButton?: boolean
}) {
  return (
    <View
      data-slot="dialog-footer"
      className={cn("cn-dialog-footer flex-col-reverse", className)}
      {...props}
    >
      {renderTextChildren(children)}
      {showCloseButton && (
        <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
      )}
    </View>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <DialogPrimitive.Title asChild>
      <Text
        data-slot="dialog-title"
        role="heading"
        className={cn("cn-dialog-title", className)}
        {...props}
      />
    </DialogPrimitive.Title>
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <DialogPrimitive.Description asChild>
      <Text
        data-slot="dialog-description"
        className={cn("cn-dialog-description", className)}
        {...props}
      />
    </DialogPrimitive.Description>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
