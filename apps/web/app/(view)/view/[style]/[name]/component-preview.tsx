import { cn } from "cn"

import { FrameHeight } from "./frame-height"
import { FrameReady } from "./frame-ready"
import { getPreviewGuardScript } from "./preview-links"

export function ComponentPreview({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-slot="view-preview"
      className={cn(
        "bg-background *:data-[slot=card]:has-[[data-slot=chart]]:shadow-none"
      )}
    >
      {/* Before the preview, so its links can't navigate even while the
          page is still hydrating. */}
      <script dangerouslySetInnerHTML={{ __html: getPreviewGuardScript() }} />
      {children}
      <FrameHeight />
      <FrameReady />
    </div>
  )
}
