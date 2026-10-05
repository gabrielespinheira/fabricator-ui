import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Input } from "@/styles/base-fabricator/ui/input"

/** Default and compact controls side by side. */
export function SizesDemo() {
  return (
    <DemoFrame className="items-start">
      <DemoColumn
        label="Default"
        note="36px controls, 13px text"
        className="w-64"
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button>Save</Button>
            <Button variant="outline">Cancel</Button>
          </div>
          <Input placeholder="Email" aria-label="Email" />
        </div>
      </DemoColumn>
      <DemoColumn
        label="Compact"
        note='28px controls, 12px text (size="sm")'
        className="w-64"
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button size="sm">Save</Button>
            <Button size="sm" variant="outline">
              Cancel
            </Button>
          </div>
          <Input
            placeholder="Email"
            aria-label="Email"
            className="h-7 text-[12px]"
          />
        </div>
      </DemoColumn>
    </DemoFrame>
  )
}

/** Concentric corners: rounded-lg items inside rounded-xl containers. */
export function ShapeDemo() {
  return (
    <DemoFrame caption="Containers are rounded-xl (12px) with 4px of padding, so the rounded-lg (8px) items inside them share the same curve.">
      <div className="flex w-56 flex-col gap-1 rounded-xl bg-surface-3 p-1 shadow-surface-3">
        <div className="flex h-9 items-center justify-between rounded-lg bg-hover px-3 text-[13px] text-foreground">
          Rounded large
          <Badge variant="secondary">8px</Badge>
        </div>
        <div className="flex h-9 items-center justify-between rounded-lg px-3 text-[13px] text-muted-foreground">
          Inside rounded extra large
          <Badge variant="secondary">12px</Badge>
        </div>
      </div>
    </DemoFrame>
  )
}
