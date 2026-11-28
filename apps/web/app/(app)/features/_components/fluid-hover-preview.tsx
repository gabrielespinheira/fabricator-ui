import {
  FluidList,
  PlainList,
} from "@/components/foundations/fluid-hover-demos"

import { PreviewColumn, PreviewStage } from "./preview-stage"

export function FluidHoverPreview() {
  return (
    <PreviewStage caption="Move the pointer slowly down both lists, then Tab into the one on the right.">
      <div className="grid w-full max-w-md grid-cols-2 gap-4 sm:gap-8">
        <PreviewColumn label="Plain :hover" note="Goes dark in every gap">
          <PlainList />
        </PreviewColumn>
        <PreviewColumn label="Fluid hover" note="Always on the nearest row">
          <FluidList />
        </PreviewColumn>
      </div>
    </PreviewStage>
  )
}
