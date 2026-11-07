"use client"

import * as React from "react"
import { cn } from "cn"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full scroll-fade rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-[state=hidden]:animate-out data-[state=hidden]:duration-feedback-exit data-[state=hidden]:ease-exit data-[state=hidden]:fade-out-0 data-[state=visible]:animate-in data-[state=visible]:duration-feedback data-[state=visible]:fade-in-0 data-horizontal:h-2.5 data-horizontal:flex-col data-vertical:h-full data-vertical:w-2.5",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-[rgb(var(--overlay)/0.08)]! bg-border opacity-0 [transition:opacity_calc(var(--motion-move-exit)*var(--motion-scale,1))_var(--motion-ease-exit)_calc(var(--motion-move)*var(--motion-scale,1)),background-color_calc(var(--motion-move)*var(--motion-scale,1)),max-width_calc(var(--motion-move)*var(--motion-scale,1)),max-height_calc(var(--motion-move)*var(--motion-scale,1))] active:bg-[rgb(var(--overlay)/0.16)]! in-[[data-slot=scroll-area-scrollbar]:hover]:bg-[rgb(var(--overlay)/0.12)]! in-[[data-slot=scroll-area-scrollbar][data-hovering]]:opacity-100 in-[[data-slot=scroll-area-scrollbar][data-hovering]]:[transition:opacity_calc(var(--motion-move)*var(--motion-scale,1))_var(--motion-ease-enter),background-color_calc(var(--motion-move)*var(--motion-scale,1)),max-width_calc(var(--motion-move)*var(--motion-scale,1)),max-height_calc(var(--motion-move)*var(--motion-scale,1))] in-[[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:my-auto in-[[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:max-h-1 in-[[data-slot=scroll-area-scrollbar][data-orientation=horizontal]:hover]:max-h-1.5 in-[[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:mx-auto in-[[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:max-w-1 in-[[data-slot=scroll-area-scrollbar][data-orientation=vertical]:hover]:max-w-1.5 in-[[data-slot=scroll-area-scrollbar][data-scrolling]]:opacity-100 in-[[data-slot=scroll-area-scrollbar][data-scrolling]]:[transition:opacity_calc(var(--motion-move)*var(--motion-scale,1))_var(--motion-ease-enter),background-color_calc(var(--motion-move)*var(--motion-scale,1)),max-width_calc(var(--motion-move)*var(--motion-scale,1)),max-height_calc(var(--motion-move)*var(--motion-scale,1))] data-[state=visible]:opacity-100"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
