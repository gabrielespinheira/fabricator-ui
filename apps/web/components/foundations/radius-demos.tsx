import * as React from "react"

import { CopyIcon } from "@/lib/site-icons"
import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import {
  RADIUS_ROLE_VARS,
  RADIUS_SHAPES,
  toShapeVars,
  type RadiusShape,
} from "@/registry/fabricator/radius"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/styles/base-fabricator/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

const SHAPES: Record<RadiusShape, { label: string; note: string }> = {
  rounded: { label: "Rounded", note: "8px controls, 12px containers" },
  squircle: { label: "Squircle", note: "Continuous corners, round fallback" },
  pill: { label: "Pill", note: "Capsule controls, 22px containers" },
}

// A column's shape: the shape's inputs and the role formulas again, so the
// roles resolve here rather than at the page's root, whatever shape the site
// is set to.
function getShapeStyle(shape: RadiusShape) {
  return Object.fromEntries(
    Object.entries({
      "radius-squircle-scale": "1",
      ...toShapeVars(shape),
      ...RADIUS_ROLE_VARS,
    }).map(([name, value]) => [`--${name}`, value])
  ) as React.CSSProperties
}

function ShapeColumn({ shape }: { shape: RadiusShape }) {
  const { label, note } = SHAPES[shape]
  return (
    <DemoColumn label={label} note={note} className="w-60">
      <div
        style={getShapeStyle(shape)}
        className="flex flex-col gap-(--density-12) supports-[corner-shape:squircle]:[--radius-corner-scale:var(--radius-squircle-scale,1)]"
      >
        <Tabs defaultValue="monthly">
          <TabsList className="w-full">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
        <InputGroup>
          <InputGroupInput
            defaultValue="fabricator.app/r/9f2"
            aria-label={`Share link (${label})`}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Copy link">
              <CopyIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex flex-col gap-1 rounded-(--radius-surface) bg-surface-3 p-1 shadow-surface-3">
          <div className="flex h-(--density-36) items-center rounded-(--radius-nested) bg-hover px-(--density-8) text-(length:--density-text-13) text-foreground">
            Duplicate
          </div>
          <div className="flex h-(--density-36) items-center rounded-(--radius-nested) px-(--density-8) text-(length:--density-text-13) text-muted-foreground">
            Move to folder
          </div>
        </div>
        <div className="flex items-center gap-(--density-8)">
          <Button>Save</Button>
          <Button variant="outline">Cancel</Button>
          <Badge variant="secondary">New</Badge>
        </div>
      </div>
    </DemoColumn>
  )
}

/** The same controls in each shape, side by side. */
export function RadiusCompare() {
  return (
    <DemoFrame
      className="items-start"
      caption="Each column sets its shape's variables. Squircle draws continuous corners in Chromium browsers and Electron, and round ones elsewhere."
    >
      {RADIUS_SHAPES.map((shape) => (
        <ShapeColumn key={shape} shape={shape} />
      ))}
    </DemoFrame>
  )
}

/** Concentric layers: a popup's rows sit 4px inside it. */
export function ShapeDemo() {
  return (
    <DemoFrame caption="The menu is rounded-(--radius-surface) with 4px of padding, so its rows take rounded-(--radius-nested): the surface's corner minus 4px.">
      <div className="flex w-56 flex-col gap-1 rounded-(--radius-surface) bg-surface-3 p-1 shadow-surface-3">
        <div className="flex h-(--density-36) items-center rounded-(--radius-nested) bg-hover px-(--density-12) text-(length:--density-text-13) text-foreground">
          Nested row
        </div>
        <div className="flex h-(--density-36) items-center rounded-(--radius-nested) px-(--density-12) text-(length:--density-text-13) text-muted-foreground">
          Inside the surface
        </div>
      </div>
    </DemoFrame>
  )
}
