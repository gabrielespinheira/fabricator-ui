"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { cn } from "cn"

import { useToastStack } from "@/registry/bases/__base__/hooks/use-toast-stack"
import { useMergedRef } from "@/registry/bases/__base__/lib/fluid-hover"
import { Button } from "@/registry/bases/base/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream toast: each toast is as wide as its
// content, and the stack's sizes and places come from `useToastStack`.

const toast = ToastPrimitive.createToastManager()

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({
  className,
  ref,
  ...props
}: ToastPrimitive.Viewport.Props) {
  const mergedRef = useMergedRef(useToastStack(), ref)

  return (
    <ToastPrimitive.Viewport
      ref={mergedRef}
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm outline-none [--gap:10px] sm:right-4 sm:left-auto sm:mx-0 sm:w-full",
        className
      )}
      {...props}
    />
  )
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "cn-toast group/toast pointer-events-auto absolute bottom-0 z-[calc(1000-var(--toast-index))] origin-bottom will-change-transform outline-none select-none",
        // The box `useToastStack` sets. Centred on phones, at the end of the
        // screen above them.
        "left-1/2 h-(--toast-box-height)! w-(--toast-box-width)! max-w-(--toast-max-width) [--toast-x:-50%] sm:right-0 sm:left-auto sm:[--toast-x:calc(var(--toast-inset,0px)*-1)]",
        "[transform:translate(calc(var(--toast-x)+var(--toast-swipe-movement-x,0px)),calc(var(--toast-y)+var(--toast-swipe-movement-y,0px)))] [--toast-y:calc(var(--toast-offset,0px)*-1)]",
        "data-measuring:h-auto! data-measuring:w-max! data-[measuring=row]:max-w-none",
        // Covers the gap, so the pointer stays on the open stack between toasts.
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-ending-style:opacity-0 data-limited:pointer-events-none data-limited:opacity-0 data-starting-style:opacity-0",
        // In from below, out the same way. One leaving an open stack fades in
        // place, and one swiped away keeps going.
        "motion-safe:data-starting-style:[transform:translate(var(--toast-x),100%)_scale(var(--motion-popup-scale))]",
        "motion-safe:data-ending-style:[transform:translate(var(--toast-x),calc(var(--toast-y)+50%))_scale(var(--motion-popup-scale))]",
        "motion-safe:data-expanded:data-ending-style:[transform:translate(var(--toast-x),var(--toast-y))_scale(var(--motion-popup-scale))]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translate(var(--toast-x),calc(var(--toast-y)+var(--toast-swipe-movement-y)+100%))]!",
        "data-ending-style:data-[swipe-direction=up]:[transform:translate(var(--toast-x),calc(var(--toast-y)+var(--toast-swipe-movement-y)-100%))]!",
        "data-ending-style:data-[swipe-direction=left]:[transform:translate(calc(var(--toast-x)+var(--toast-swipe-movement-x)-100%),var(--toast-y))]!",
        "data-ending-style:data-[swipe-direction=right]:[transform:translate(calc(var(--toast-x)+var(--toast-swipe-movement-x)+100%),var(--toast-y))]!",
        className
      )}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        // Keeps the width it is going to have, cut to the box around it, so
        // text never wraps again while the toast changes size.
        "cn-toast-content flex w-(--toast-natural-width) items-center group-data-behind-front/toast:opacity-0 group-data-measuring/toast:w-auto",
        className
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("cn-toast-title", className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("cn-toast-description", className)}
      {...props}
    />
  )
}

function ToastAction({
  className,
  render = <Button variant="secondary" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("cn-toast-action shrink-0", className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-xs" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "cn-toast-close absolute shrink-0 after:absolute after:-inset-2 after:content-['']",
        className
      )}
      {...props}
    >
      {children ?? (
        <IconPlaceholder
          lucide="XIcon"
          tabler="IconX"
          hugeicons="Cancel01Icon"
          phosphor="XIcon"
          remixicon="RiCloseLine"
          aria-hidden="true"
        />
      )}
    </ToastPrimitive.Close>
  )
}

function getTypeIcon(type: string | undefined): React.ReactNode {
  if (type === "success") {
    return (
      <IconPlaceholder
        lucide="CircleCheckIcon"
        tabler="IconCircleCheck"
        hugeicons="CheckmarkCircle02Icon"
        phosphor="CheckCircleIcon"
        remixicon="RiCheckboxCircleLine"
        aria-hidden="true"
      />
    )
  }

  if (type === "info") {
    return (
      <IconPlaceholder
        lucide="InfoIcon"
        tabler="IconInfoCircle"
        hugeicons="InformationCircleIcon"
        phosphor="InfoIcon"
        remixicon="RiInformationLine"
        aria-hidden="true"
      />
    )
  }

  if (type === "warning") {
    return (
      <IconPlaceholder
        lucide="TriangleAlertIcon"
        tabler="IconAlertTriangle"
        hugeicons="Alert02Icon"
        phosphor="WarningIcon"
        remixicon="RiErrorWarningLine"
        aria-hidden="true"
      />
    )
  }

  if (type === "error") {
    return (
      <IconPlaceholder
        lucide="OctagonXIcon"
        tabler="IconAlertOctagon"
        hugeicons="MultiplicationSignCircleIcon"
        phosphor="XCircleIcon"
        remixicon="RiCloseCircleLine"
        aria-hidden="true"
      />
    )
  }

  if (type === "loading") {
    return (
      <IconPlaceholder
        lucide="Loader2Icon"
        tabler="IconLoader"
        hugeicons="Loading03Icon"
        phosphor="SpinnerIcon"
        remixicon="RiLoaderLine"
        className="animate-spin"
        aria-hidden="true"
      />
    )
  }

  return null
}

function ToastIcon({
  type,
  icon = getTypeIcon(type),
}: {
  type: string | undefined
  /** Shown instead of the type's icon. `null` shows none. */
  icon?: React.ReactNode
}) {
  if (!icon) {
    return null
  }

  return (
    <span
      data-slot="toast-icon"
      className={cn("cn-toast-icon shrink-0 [&_svg]:pointer-events-none")}
    >
      {icon}
    </span>
  )
}

type ToastData = {
  /** Shown instead of the type's icon. `null` shows none. */
  icon?: React.ReactNode
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} icon={toastItem.data?.icon} />
        <div
          data-slot="toast-body"
          className="cn-toast-body flex min-w-0 flex-1 items-center group-data-stacked/toast:flex-col group-data-stacked/toast:items-start"
        >
          <div
            data-slot="toast-message"
            className="cn-toast-message flex min-w-0 flex-1 flex-col"
          >
            <ToastTitle />
            <ToastDescription />
          </div>
          <ToastAction />
        </div>
      </ToastContent>
      <ToastClose />
    </Toast>
  ))
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
