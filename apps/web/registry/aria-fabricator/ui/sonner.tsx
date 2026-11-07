"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream sonner: styles the toasts through
// the toaster's className.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // The toast styles are set on the toaster and reach each toast through
      // descendant selectors.
      className="toaster group [&_[data-sonner-toast]]:rounded-xl! [&_[data-sonner-toast]]:border-0! [&_[data-sonner-toast]]:bg-surface-5! [&_[data-sonner-toast]]:text-(length:--density-text-13)! [&_[data-sonner-toast]]:text-popover-foreground! [&_[data-sonner-toast]]:shadow-surface-5! [&_[data-sonner-toast]]:[transition-duration:calc(var(--motion-toast)*var(--motion-scale,1))]! [&_[data-sonner-toast]]:[transition-timing-function:var(--motion-ease-enter)]! [&_[data-sonner-toast][data-type=error]_[data-icon]_svg]:text-destructive! [&_[data-sonner-toast][data-type=info]_[data-icon]_svg]:text-info! [&_[data-sonner-toast][data-type=success]_[data-icon]_svg]:text-success! [&_[data-sonner-toast][data-type=warning]_[data-icon]_svg]:text-warning!"
      icons={{
        success: (
          <IconPlaceholder
            lucide="CircleCheckIcon"
            tabler="IconCircleCheck"
            hugeicons="CheckmarkCircle02Icon"
            phosphor="CheckCircleIcon"
            remixicon="RiCheckboxCircleLine"
            className="size-4"
          />
        ),
        info: (
          <IconPlaceholder
            lucide="InfoIcon"
            tabler="IconInfoCircle"
            hugeicons="InformationCircleIcon"
            phosphor="InfoIcon"
            remixicon="RiInformationLine"
            className="size-4"
          />
        ),
        warning: (
          <IconPlaceholder
            lucide="TriangleAlertIcon"
            tabler="IconAlertTriangle"
            hugeicons="Alert02Icon"
            phosphor="WarningIcon"
            remixicon="RiErrorWarningLine"
            className="size-4"
          />
        ),
        error: (
          <IconPlaceholder
            lucide="OctagonXIcon"
            tabler="IconAlertOctagon"
            hugeicons="MultiplicationSignCircleIcon"
            phosphor="XCircleIcon"
            remixicon="RiCloseCircleLine"
            className="size-4"
          />
        ),
        loading: (
          <IconPlaceholder
            lucide="Loader2Icon"
            tabler="IconLoader"
            hugeicons="Loading03Icon"
            phosphor="SpinnerIcon"
            remixicon="RiLoaderLine"
            className="size-4 animate-spin"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
