"use client"

import { cn } from "cn"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useToastStack } from "@/registry/bases/__base__/hooks/use-toast-stack"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream sonner, for every base: Sonner keeps its
// API, timers and gestures, and takes Toast's look. Every toast has the same
// width, and the stack's sizes and places come from `useToastStack`.

// Sonner takes the classes of a toast's parts as plain values, and the build
// compiles placeholders in `className` only.
const parts = {
  toast: { className: cn("cn-sonner-toast group/toast") },
  icon: { className: cn("cn-sonner-icon") },
  content: { className: cn("cn-sonner-content") },
  title: { className: cn("cn-sonner-title") },
  description: { className: cn("cn-sonner-description") },
  actionButton: { className: cn("cn-sonner-action") },
  cancelButton: { className: cn("cn-sonner-cancel") },
  closeButton: { className: cn("cn-sonner-close") },
}

function getClassNames(
  classNames: NonNullable<ToasterProps["toastOptions"]>["classNames"]
) {
  return {
    ...classNames,
    toast: cn(parts.toast.className, classNames?.toast),
    icon: cn(parts.icon.className, classNames?.icon),
    content: cn(parts.content.className, classNames?.content),
    title: cn(parts.title.className, classNames?.title),
    description: cn(parts.description.className, classNames?.description),
    actionButton: cn(parts.actionButton.className, classNames?.actionButton),
    cancelButton: cn(parts.cancelButton.className, classNames?.cancelButton),
    closeButton: cn(parts.closeButton.className, classNames?.closeButton),
  }
}

const Toaster = ({
  className,
  icons,
  style,
  toastOptions,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const attachStack = useToastStack()

  return (
    <Sonner
      ref={attachStack}
      theme={theme as ToasterProps["theme"]}
      className={cn("cn-sonner toaster group", className)}
      closeButton
      gap={10}
      icons={{
        close: (
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
          />
        ),
        success: (
          <IconPlaceholder
            lucide="CircleCheckIcon"
            tabler="IconCircleCheck"
            hugeicons="CheckmarkCircle02Icon"
            phosphor="CheckCircleIcon"
            remixicon="RiCheckboxCircleLine"
          />
        ),
        info: (
          <IconPlaceholder
            lucide="InfoIcon"
            tabler="IconInfoCircle"
            hugeicons="InformationCircleIcon"
            phosphor="InfoIcon"
            remixicon="RiInformationLine"
          />
        ),
        warning: (
          <IconPlaceholder
            lucide="TriangleAlertIcon"
            tabler="IconAlertTriangle"
            hugeicons="Alert02Icon"
            phosphor="WarningIcon"
            remixicon="RiErrorWarningLine"
          />
        ),
        error: (
          <IconPlaceholder
            lucide="OctagonXIcon"
            tabler="IconAlertOctagon"
            hugeicons="MultiplicationSignCircleIcon"
            phosphor="XCircleIcon"
            remixicon="RiCloseCircleLine"
          />
        ),
        loading: (
          <IconPlaceholder
            lucide="Loader2Icon"
            tabler="IconLoader"
            hugeicons="Loading03Icon"
            phosphor="SpinnerIcon"
            remixicon="RiLoaderLine"
            className="animate-spin"
          />
        ),
        ...icons,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-surface)",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: getClassNames(toastOptions?.classNames),
      }}
      {...props}
    />
  )
}

export { Toaster }
