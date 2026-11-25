"use client"

// Record View: one record beside, over or instead of what it was opened from.
// Beside, it isn't modal: the board behind stays live, and opening another card
// swaps what is inside. React Aria's overlays are always modal, so the side
// panel is a labelled dialog of its own that Escape closes.
import * as React from "react"
import { cn } from "cn"
import {
  Dialog as DialogPrimitive,
  Modal as ModalPrimitive,
} from "react-aria-components"
import { createPortal } from "react-dom"

import {
  RecordViewFrame,
  RecordViewModeIcon,
  type RecordViewProps,
} from "@/registry/bases/aria/components/record-view-parts"
import { recordViewModes } from "@/registry/bases/aria/lib/record-view-model"
import { Button } from "@/registry/bases/aria/ui/button"
import { useDensity } from "@/registry/bases/aria/ui/density"
import { DialogOverlay, DialogTitle } from "@/registry/bases/aria/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/bases/aria/ui/dropdown-menu"

function RecordViewModeMenu({
  mode = "side",
  onModeChange,
}: Pick<RecordViewProps, "mode" | "onModeChange">) {
  if (!onModeChange) return null
  return (
    <DropdownMenuTrigger>
      <Button size="icon-sm" variant="ghost" aria-label="Open record in">
        <RecordViewModeIcon mode={mode} />
      </Button>
      <DropdownMenu
        aria-label="Open record in"
        placement="bottom end"
        className="cn-record-view-menu"
      >
        <DropdownMenuGroup
          aria-label="Open record in"
          selectionMode="single"
          selectedKeys={[mode]}
          disallowEmptySelection
        >
          {recordViewModes.map(({ id, label }) => (
            <DropdownMenuItem
              key={id}
              id={id}
              textValue={label}
              onAction={() => onModeChange(id)}
            >
              <RecordViewModeIcon mode={id} />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** A pointer leaves focus on the card it pressed, so arrows keep moving along the board. */
function isKeyboardOpen() {
  return !!document.activeElement?.matches(":focus-visible")
}

function RecordViewPanel({
  open,
  onOpenChange,
  label,
  density,
  className,
  children,
}: Pick<RecordViewProps, "open" | "onOpenChange" | "className" | "children"> & {
  label: string
  density: string | undefined
}) {
  const surface = React.useRef<HTMLDivElement>(null)
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const close = React.useRef(onOpenChange)
  React.useEffect(() => {
    close.current = onOpenChange
  })
  React.useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    if (isKeyboardOpen()) surface.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return
      // A popover or menu over the panel takes its own Escape.
      if (document.querySelector("[data-trigger][data-placement]")) return
      close.current(false)
      if (opener instanceof HTMLElement) opener.focus()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])
  if (!open || !isMounted) return null
  return createPortal(
    <div
      ref={surface}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      data-slot="record-view-surface"
      data-density={density}
      data-mode="side"
      data-entering=""
      className={cn(
        "cn-record-view fixed z-50 flex flex-col overflow-hidden outline-none",
        className
      )}
    >
      {children}
    </div>,
    document.body
  )
}

function RecordView({
  open,
  onOpenChange,
  mode = "side",
  onModeChange,
  title,
  className,
  ...props
}: RecordViewProps) {
  const density = useDensity()
  const frame = (
    <RecordViewFrame
      {...props}
      mode={mode}
      title={title}
      onOpenChange={onOpenChange}
      modeMenu={<RecordViewModeMenu mode={mode} onModeChange={onModeChange} />}
    />
  )
  if (mode === "side")
    return (
      <RecordViewPanel
        open={open}
        onOpenChange={onOpenChange}
        label={title}
        density={density}
        className={className}
      >
        {frame}
      </RecordViewPanel>
    )
  return (
    <DialogOverlay
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable
      data-mode={mode}
      className="cn-record-view-overlay"
    >
      <ModalPrimitive
        data-slot="record-view-surface"
        data-density={density}
        data-mode={mode}
        className={cn(
          "cn-record-view fixed z-50 flex flex-col overflow-hidden outline-none",
          className
        )}
      >
        <DialogPrimitive className="flex min-h-0 flex-1 flex-col outline-none">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {frame}
        </DialogPrimitive>
      </ModalPrimitive>
    </DialogOverlay>
  )
}

export { RecordView }
export {
  RecordViewBody,
  RecordViewCover,
  RecordViewFooter,
  RecordViewHeader,
  RecordViewSection,
  RecordViewState,
  RecordViewTitle,
  type RecordViewMode,
  type RecordViewProps,
} from "@/registry/bases/aria/components/record-view-parts"
