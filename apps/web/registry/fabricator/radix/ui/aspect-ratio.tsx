"use client"

import { cn } from "cn"
import { Slot, type AspectRatio as AspectRatioPrimitive } from "radix-ui"

// Fabricator override: one element sized with CSS `aspect-ratio`, as in the
// other bases, instead of Radix's padding-bottom wrapper. The frame then
// takes its width from `className` and glides to a new ratio on the move
// timing. Radix's props stay: `ratio` defaults to 1, and `asChild`
// renders the child as the frame.
function AspectRatio({
  ratio = 1,
  asChild = false,
  className,
  style,
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
          ...style,
        } as React.CSSProperties
      }
      className={cn("cn-aspect-ratio relative aspect-(--ratio)", className)}
      {...props}
    />
  )
}

export { AspectRatio }
