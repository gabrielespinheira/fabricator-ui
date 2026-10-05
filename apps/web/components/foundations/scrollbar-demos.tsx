import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import { ScrollArea } from "@/styles/base-fabricator/ui/scroll-area"

const RELEASES = Array.from({ length: 24 }, (_, index) => `v1.${23 - index}.0`)

function Releases() {
  return (
    <ul className="flex flex-col p-1">
      {RELEASES.map((release) => (
        <li
          key={release}
          className="flex h-8 items-center justify-between rounded-lg px-2 text-[13px]"
        >
          <span className="text-foreground">{release}</span>
          <span className="text-[12px] text-muted-foreground">Maintenance</span>
        </li>
      ))}
    </ul>
  )
}

const BOX = "h-56 rounded-xl bg-surface-3 shadow-surface-3"

/** Native, ScrollArea and hidden scrollbars side by side. */
export function ScrollbarsDemo() {
  return (
    <DemoFrame
      className="items-start gap-4 sm:px-6"
      caption="With a mouse or trackpad, hover each list and scroll. Touch devices keep their native overlay scrollbars."
    >
      <DemoColumn
        className="w-40"
        label="Native, thin"
        note="Any overflow container, no markup"
      >
        <div className={`${BOX} overflow-y-auto`} tabIndex={0}>
          <Releases />
        </div>
      </DemoColumn>
      <DemoColumn
        className="w-40"
        label="ScrollArea"
        note="Thin thumb that widens on hover"
      >
        <ScrollArea className={BOX}>
          <Releases />
        </ScrollArea>
      </DemoColumn>
      <DemoColumn
        className="w-40"
        label="scrollbar-hide"
        note="Still scrolls; no scrollbar"
      >
        <div className={`${BOX} scrollbar-hide overflow-y-auto`} tabIndex={0}>
          <Releases />
        </div>
      </DemoColumn>
    </DemoFrame>
  )
}
