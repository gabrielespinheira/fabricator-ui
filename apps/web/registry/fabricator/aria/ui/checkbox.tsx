"use client"

import { cn } from "cn"
import {
  Checkbox as CheckboxPrimitive,
  composeRenderProps,
  type CheckboxProps,
} from "react-aria-components"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream checkbox: the indicator stays mounted
// so the check animates out as well as in (driven by its state attributes in
// the style map), instead of unmounting on uncheck. The indicator drops upstream's inline
// `transition-none` so those transitions apply.

function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={cn(
        "cn-checkbox cn-checkbox-aria peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {composeRenderProps(
        children,
        (children, { isSelected, isIndeterminate }) => (
          <>
            <span
              data-slot="checkbox-indicator"
              data-checked={isSelected || isIndeterminate ? "" : undefined}
              data-unchecked={isSelected || isIndeterminate ? undefined : ""}
              data-indeterminate={isIndeterminate ? "" : undefined}
              className="cn-checkbox-indicator grid place-content-center text-current"
            >
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
              />
            </span>
            {children}
          </>
        )
      )}
    </CheckboxPrimitive>
  )
}

export { Checkbox }
