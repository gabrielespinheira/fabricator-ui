"use client"

// Record View: one record beside, over or instead of what it was opened from.
// Beside, it isn't modal: the board behind stays live, and opening another card
// swaps what is inside. Switching modes keeps the same dialog, so what is being
// edited stays.
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import {
  RecordViewFrame,
  RecordViewModeIcon,
  type RecordViewProps,
} from "@/registry/bases/base/components/record-view-parts"
import { recordViewModes } from "@/registry/bases/base/lib/record-view-model"
import { Button } from "@/registry/bases/base/ui/button"
import { useDensity } from "@/registry/bases/base/ui/density"
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/registry/bases/base/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"

function RecordViewModeMenu({
  mode = "side",
  onModeChange,
}: Pick<RecordViewProps, "mode" | "onModeChange">) {
  if (!onModeChange) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label="Open record in" />
        }
      >
        <RecordViewModeIcon mode={mode} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="cn-record-view-menu">
        <DropdownMenuRadioGroup value={mode}>
          {recordViewModes.map(({ id, label }) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              closeOnClick
              onClick={() => onModeChange(id)}
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      modal={mode !== "side"}
      disablePointerDismissal={mode === "side"}
    >
      <DialogPortal>
        {mode === "center" && <DialogOverlay />}
        <DialogPrimitive.Popup
          data-slot="record-view-surface"
          data-density={density}
          data-mode={mode}
          initialFocus={() =>
            mode !== "side" || isKeyboardOpen() ? surface.current : false
          }
          ref={surface}
          tabIndex={-1}
          className={cn(
            "cn-record-view fixed z-50 flex flex-col overflow-hidden outline-none",
            className
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {frame}
        </DialogPrimitive.Popup>
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
} from "@/registry/bases/base/components/record-view-parts"
