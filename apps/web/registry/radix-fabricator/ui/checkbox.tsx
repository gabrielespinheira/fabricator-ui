"use client"

import * as React from "react"
import { cn } from "cn"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream checkbox: the indicator stays mounted
// so the check animates out as well as in (driven by its state attributes in
// the style map), instead of unmounting on uncheck. The indicator drops upstream's inline
// `transition-none` so those transitions apply.

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[calc(var(--density-icon-16)+2px)] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.5px] border-foreground/25 bg-transparent text-primary-foreground transition-[background-color,border-color,box-shadow,scale] duration-feedback ease-feedback outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-foreground/45 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-indeterminate:border-primary data-indeterminate:bg-primary motion-reduce:transition-none motion-reduce:active:scale-100 data-checked:border-primary data-checked:bg-primary data-checked:hover:border-primary aria-invalid:data-checked:border-destructive aria-invalid:data-checked:bg-destructive",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        forceMount
        data-slot="checkbox-indicator"
        className="grid scale-[0.6] place-content-center text-current opacity-0 transition-[opacity,scale,clip-path] duration-feedback-exit ease-exit [clip-path:inset(0_100%_0_0)] data-indeterminate:scale-100 data-indeterminate:opacity-100 data-indeterminate:duration-move data-indeterminate:ease-enter data-indeterminate:[clip-path:inset(0_0_0_0)] data-[state=indeterminate]:scale-100 data-[state=indeterminate]:opacity-100 data-[state=indeterminate]:duration-move data-[state=indeterminate]:ease-enter data-[state=indeterminate]:[clip-path:inset(0_0_0_0)] motion-reduce:transition-none data-checked:scale-100 data-checked:opacity-100 data-checked:duration-move data-checked:ease-enter data-checked:[clip-path:inset(0_0_0_0)] [&>svg]:size-[calc(var(--density-icon-16)-4px)] [&>svg]:stroke-[3]"
      >
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
