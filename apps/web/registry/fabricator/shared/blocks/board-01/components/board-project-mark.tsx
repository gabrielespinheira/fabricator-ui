import { cn } from "cn"

import { boardIcons } from "@/registry/bases/__base__/blocks/board-01/components/board-icons"
import { type BoardProjectId } from "@/registry/bases/__base__/blocks/board-01/lib/board-data"

const TONES: Record<BoardProjectId, string> = {
  storefront: "bg-chart-series-1/15 text-chart-series-1",
  mobile: "bg-chart-series-5/15 text-chart-series-5",
  fulfilment: "bg-chart-series-2/15 text-chart-series-2",
  loyalty: "bg-chart-series-6/15 text-chart-series-6",
}

/** A project's picture: its icon on a tile of its colour. */
export function BoardProjectMark({
  projectId,
  className,
}: {
  projectId: BoardProjectId
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-(--density-20) shrink-0 items-center justify-center rounded-md [&_svg]:size-(--density-12)!",
        TONES[projectId],
        className
      )}
    >
      {boardIcons[projectId]}
    </span>
  )
}
