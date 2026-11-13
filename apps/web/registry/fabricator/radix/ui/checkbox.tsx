"use client"

import * as React from "react"
import { cn } from "cn"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

// Fabricator override of the upstream checkbox: the indicator stays mounted
// so the mark animates out as well as in (driven by its state attributes in
// the style map), instead of unmounting on uncheck. The mark is drawn inline,
// a check and a minus with `pathLength={1}`, so the style map can draw its
// stroke in and show the minus while indeterminate. An icon from the
// project's library has no known stroke direction or length to draw.

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "cn-checkbox peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        forceMount
        data-slot="checkbox-indicator"
        className="cn-checkbox-indicator group/checkbox-indicator grid place-content-center text-current"
      >
        <svg
          data-slot="checkbox-mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="cn-checkbox-mark"
        >
          <path
            d="M4 12l5 5L20 6"
            pathLength={1}
            className="cn-checkbox-check"
          />
          <path d="M5 12h14" pathLength={1} className="cn-checkbox-minus" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
