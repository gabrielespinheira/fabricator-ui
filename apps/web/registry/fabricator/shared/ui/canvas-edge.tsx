"use client"

// Canvas edges: one renderer for every shape (bezier, smooth step, step,
// straight), drawn from the shared geometry so React Native draws the same
// path, with the arrow, a label, an insert button and flowing dashes for a
// run in progress. Also the line drawn while a connection is dragged.
//
// BaseEdge and EdgeLabelRenderer come from React Flow.
import * as React from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  useEdge,
  type ConnectionLineComponentProps,
  type EdgeProps,
} from "@xyflow/react"
import { cn } from "cn"

import {
  getCanvasEdgePath,
  type CanvasEdgeShape,
  type CanvasSide,
} from "@/registry/bases/__base__/lib/canvas-geometry"
import { type CanvasEdge as CanvasEdgeRecord } from "@/registry/bases/__base__/lib/canvas-model"
import { useCanvasContext } from "@/registry/bases/__base__/ui/canvas-context"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const SHAPES = new Set<string>(["bezier", "smoothstep", "step", "straight"])

function isEdgeShape(type: string | undefined): type is CanvasEdgeShape {
  return type !== undefined && SHAPES.has(type)
}

/** Ids for the arrow markers, unique per canvas. */
function getMarkerId(canvasId: string, state: "default" | "selected") {
  return `${canvasId}-arrow-${state}`
}

type CanvasEdgeExtras = {
  /** Set by the Canvas: changes waiting on an async handler. */
  pending: ReadonlySet<string>
  canvasId: string
  /** Inserts a node on an edge; the edge shows a + when set. */
  onInsert?: (edgeId: string, position: { x: number; y: number }) => void
}

const CanvasEdgeContext = React.createContext<CanvasEdgeExtras>({
  pending: new Set(),
  canvasId: "canvas",
})

function CanvasEdge({
  id,
  type,
  label,
  selected,
  animated,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const { pending, canvasId, onInsert } = React.useContext(CanvasEdgeContext)
  const { isEditable, labels } = useCanvasContext("CanvasEdge")
  const shape: CanvasEdgeShape = isEdgeShape(type) ? type : "bezier"
  const { path, labelX, labelY } = getCanvasEdgePath(shape, {
    sourceX,
    sourceY,
    sourceSide: sourcePosition satisfies CanvasSide,
    targetX,
    targetY,
    targetSide: targetPosition satisfies CanvasSide,
  })
  // The marker is the Canvas's own field, so it's read off the edge itself.
  // Ports show where an edge plugs in; an arrowhead is asked for.
  const hasArrow = useEdge<CanvasEdgeRecord>(id)?.marker === "arrow"
  const isPending = pending.has(id)
  const hasLabel = typeof label === "string" && label.length > 0
  const canInsert = Boolean(onInsert) && isEditable

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={20}
        markerEnd={
          hasArrow
            ? `url(#${getMarkerId(canvasId, selected ? "selected" : "default")})`
            : undefined
        }
        data-slot="canvas-edge"
        data-selected={selected || undefined}
        data-animated={animated || undefined}
        data-pending={isPending || undefined}
        className="cn-canvas-edge"
      />
      {(hasLabel || canInsert) && (
        <EdgeLabelRenderer>
          <div
            data-slot="canvas-edge-label-anchor"
            data-selected={selected || undefined}
            className="nodrag nopan group/canvas-edge-label pointer-events-auto absolute flex items-center"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {hasLabel && <CanvasEdgeLabel>{label}</CanvasEdgeLabel>}
            {canInsert && (
              <button
                type="button"
                data-slot="canvas-edge-insert"
                aria-label={labels.insertNode}
                onClick={() => onInsert?.(id, { x: labelX, y: labelY })}
                className="cn-canvas-edge-insert flex items-center justify-center"
              >
                <IconPlaceholder
                  lucide="PlusIcon"
                  tabler="IconPlus"
                  hugeicons="PlusSignIcon"
                  phosphor="PlusIcon"
                  remixicon="RiAddLine"
                  aria-hidden
                />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function CanvasEdgeLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="canvas-edge-label"
      className={cn("cn-canvas-edge-label max-w-48 truncate", className)}
      {...props}
    />
  )
}

/** The arrows edges point with, one per state so each takes its colour. */
function CanvasEdgeMarkers({ canvasId }: { canvasId: string }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute size-0">
      <defs>
        {(["default", "selected"] as const).map((state) => (
          <marker
            key={state}
            id={getMarkerId(canvasId, state)}
            viewBox="0 0 10 10"
            // The tip stops at the edge of the target's port (4px dot and its
            // 1px ring, at 0.8px per marker unit) instead of under it.
            refX="14.5"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M1.5 1.5 L8.5 5 L1.5 8.5"
              data-slot="canvas-edge-marker"
              data-state={state}
              className="cn-canvas-edge-marker"
            />
          </marker>
        ))}
      </defs>
    </svg>
  )
}

/** The line drawn while a connection is dragged; dashed red over a target it can't take. */
function CanvasConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const { path } = getCanvasEdgePath("bezier", {
    sourceX: fromX,
    sourceY: fromY,
    sourceSide: fromPosition satisfies CanvasSide,
    targetX: toX,
    targetY: toY,
    targetSide: toPosition satisfies CanvasSide,
  })
  return (
    <g
      data-slot="canvas-connection-line"
      data-status={connectionStatus ?? "none"}
    >
      <path d={path} className="cn-canvas-connection-line fill-none" />
      <circle cx={toX} cy={toY} r={3} className="cn-canvas-connection-end" />
    </g>
  )
}

export {
  CanvasConnectionLine,
  CanvasEdge,
  CanvasEdgeContext,
  CanvasEdgeLabel,
  CanvasEdgeMarkers,
  getMarkerId,
  type CanvasEdgeExtras,
}
