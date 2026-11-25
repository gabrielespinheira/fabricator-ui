"use client"

// Record View: one record beside, over or instead of what it was opened from.
// Beside, it isn't modal: the board behind stays live, and opening another card
// swaps what is inside.
import * as React from "react"
import { cn } from "cn"
import { Dialog as DialogPrimitive } from "radix-ui"

import {
  RecordViewFrame,
  RecordViewModeIcon,
  type RecordViewProps,
} from "@/registry/bases/radix/components/record-view-parts"
import { recordViewModes } from "@/registry/bases/radix/lib/record-view-model"
import { Button } from "@/registry/bases/radix/ui/button"
import { useDensity } from "@/registry/bases/radix/ui/density"
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/registry/bases/radix/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/bases/radix/ui/dropdown-menu"

function RecordViewModeMenu({
  mode = "side",
  onModeChange,
}: Pick<RecordViewProps, "mode" | "onModeChange">) {
  if (!onModeChange) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Open record in">
          <RecordViewModeIcon mode={mode} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="cn-record-view-menu">
        <DropdownMenuRadioGroup value={mode}>
          {recordViewModes.map(({ id, label }) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              onSelect={() => onModeChange(id)}
            >
              <RecordViewModeIcon mode={id} />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A pointer leaves focus on the card it pressed, so arrows keep moving along the board. */
function isKeyboardOpen() {
  return !!document.activeElement?.matches(":focus-visible")
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
  const surface = React.useRef<HTMLDivElement>(null)
  const frame = (
    <RecordViewFrame
      {...props}
      mode={mode}
      title={title}
      onOpenChange={onOpenChange}
      modeMenu={<RecordViewModeMenu mode={mode} onModeChange={onModeChange} />}
    />
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={mode !== "side"}>
      <DialogPortal>
        {mode === "center" && <DialogOverlay />}
        <DialogPrimitive.Content
          data-slot="record-view-surface"
          data-density={density}
          data-mode={mode}
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            // Radix hears Escape before a field that takes it to undo its edit.
            if (
              event.target instanceof Element &&
              event.target.closest("[data-escape]")
            )
              event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (mode === "side") event.preventDefault()
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            if (mode !== "side" || isKeyboardOpen()) surface.current?.focus()
          }}
          ref={surface}
          tabIndex={-1}
          className={cn(
            "cn-record-view fixed z-50 flex flex-col overflow-hidden outline-none",
            className
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {frame}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
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
} from "@/registry/bases/radix/components/record-view-parts"
