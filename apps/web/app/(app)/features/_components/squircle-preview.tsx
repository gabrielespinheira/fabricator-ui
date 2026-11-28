"use client"

import * as React from "react"
import { CopyIcon } from "@fabricator-ui/icons"

import { getShapeStyle } from "@/components/foundations/radius-demos"
import {
  RADIUS_SHAPES,
  SQUIRCLE_CORNER_SCALE,
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

import { getCornerPath } from "../_lib/corner-path"
import { PreviewStage } from "./preview-stage"

const SIZE = 220
const RADIUS = 56
const SQUIRCLE_RADIUS = RADIUS * SQUIRCLE_CORNER_SCALE
// SQUIRCLE_CORNER_SHAPE is superellipse(1.5): exponent 2^1.5.
const SQUIRCLE_EXPONENT = 2 ** 1.5

const ROUND_PATH = getCornerPath({ size: SIZE, radius: RADIUS, exponent: 2 })
const SQUIRCLE_PATH = getCornerPath({
  size: SIZE,
  radius: SQUIRCLE_RADIUS,
  exponent: SQUIRCLE_EXPONENT,
})

const SHAPE_LABELS: Record<RadiusShape, string> = {
  rounded: "Rounded",
  squircle: "Squircle",
  pill: "Pill",
}

function isRadiusShape(value: unknown): value is RadiusShape {
  return RADIUS_SHAPES.some((shape) => shape === value)
}

// The top-left corner, magnified: where each curve leaves the straight edge.
const ZOOM = 96

// The circle meets the straight edge with a visible kink; the superellipse
// starts earlier and eases into it.
function CornerDiagram() {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox={`-8 -8 ${ZOOM} ${ZOOM}`}
        className="w-52 overflow-hidden rounded-2xl sm:w-60"
        role="img"
        aria-label="A magnified corner: the circular corner meets the edge abruptly, the squircle eases into it"
      >
        <path d={SQUIRCLE_PATH} className="fill-surface-3" />
        <path
          d={ROUND_PATH}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
          className="stroke-muted-foreground"
        />
        <path
          d={SQUIRCLE_PATH}
          fill="none"
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
          className="stroke-foreground"
        />
        {[
          { x: RADIUS, y: 0 },
          { x: 0, y: RADIUS },
        ].map(({ x, y }) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={1.6}
            className="fill-muted-foreground"
          />
        ))}
        {[
          { x: SQUIRCLE_RADIUS, y: 0 },
          { x: 0, y: SQUIRCLE_RADIUS },
        ].map(({ x, y }) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={2}
            className="fill-foreground"
          />
        ))}
      </svg>
      <div className="flex items-center gap-5 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          Squircle
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 border-t-[1.5px] border-dashed border-muted-foreground" />
          Circle
        </span>
      </div>
    </div>
  )
}

export function SquirclePreview() {
  const [shape, setShape] = React.useState<RadiusShape>("squircle")

  return (
    <PreviewStage
      className="flex-col gap-10 lg:flex-row lg:gap-14"
      caption="Continuous corners in Chrome, Edge and Electron. Other browsers draw the same corners round."
      controls={
        <Tabs
          value={shape}
          onValueChange={(value) => {
            if (isRadiusShape(value)) setShape(value)
          }}
        >
          <TabsList aria-label="Corner shape">
            {RADIUS_SHAPES.map((option) => (
              <TabsTrigger key={option} value={option}>
                {SHAPE_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      <CornerDiagram />
      <div
        style={getShapeStyle(shape)}
        className="flex w-full max-w-64 flex-col gap-(--density-12) supports-[corner-shape:squircle]:[--radius-corner-scale:var(--radius-squircle-scale,1)]"
      >
        <div className="flex flex-col gap-(--density-12) rounded-(--radius-card) bg-surface-3 p-(--density-16) shadow-surface-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-medium text-foreground">
              Share project
            </span>
            <Badge variant="secondary">{SHAPE_LABELS[shape]}</Badge>
          </div>
          <InputGroup>
            <InputGroupInput
              defaultValue="fabricator.app/r/9f2"
              aria-label="Share link"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Copy link">
                <CopyIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <div className="flex flex-col gap-1 rounded-(--radius-surface) bg-surface-4 p-1 shadow-surface-4">
            <div className="flex h-(--density-36) items-center rounded-(--radius-nested) bg-hover px-(--density-8) text-(length:--density-text-13) text-foreground">
              Can edit
            </div>
            <div className="flex h-(--density-36) items-center rounded-(--radius-nested) px-(--density-8) text-(length:--density-text-13) text-muted-foreground">
              Can view
            </div>
          </div>
          <div className="flex justify-end gap-(--density-8)">
            <Button variant="outline">Cancel</Button>
            <Button>Share</Button>
          </div>
        </div>
      </div>
    </PreviewStage>
  )
}
