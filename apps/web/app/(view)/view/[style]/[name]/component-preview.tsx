import { cn } from "cn"

import { FrameHeight } from "./frame-height"

export function ComponentPreview({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-slot="view-preview"
      className={cn(
        "bg-background *:data-[slot=card]:has-[[data-slot=chart]]:shadow-none"
      )}
    >
      {children}
      <FrameHeight />
    </div>
  )
}
