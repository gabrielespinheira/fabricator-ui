import * as React from "react"
import { PlusIcon } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View } from "react-native"
import { Circle, Defs, Marker, Path } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import {
  getCanvasEdgePath,
  type CanvasEdgeShape,
  type CanvasSide,
} from "@/registry/fabricator/shared/lib/canvas-geometry"
import { type CanvasEdge as CanvasEdgeRecord } from "@/registry/fabricator/shared/lib/canvas-model"
import { type CanvasLiveConnection } from "@/registry/native/lib/canvas-surface"
import { useCanvasContext } from "@/registry/native/ui/canvas-context"
import { Text } from "@/registry/native/ui/text"

// Canvas edges on React Native: one SVG path per edge from the shared
// geometry, so it's the same curve as on the website. They're drawn in
// canvas units inside the layer that pans and zooms, so the View transform
// moves them with the nodes; a drag re-renders only the edges it touches.

// Colours the SVG reads from the style map.
const canvasEdgeVariants = cva("cn-canvas-edge")
const canvasEdgeSelectedVariants = cva("cn-canvas-edge-selected")
const canvasEdgeMarkerVariants = cva("cn-canvas-edge-marker")
const canvasConnectionLineVariants = cva("cn-canvas-connection-line")
const canvasConnectionLineValidVariants = cva("cn-canvas-connection-line-valid")
const canvasConnectionLineInvalidVariants = cva(
  "cn-canvas-connection-line-invalid"
)
const canvasConnectionEndVariants = cva("cn-canvas-connection-end")

const SHAPES = new Set<string>(["bezier", "smoothstep", "step", "straight"])

function isEdgeShape(type: string | undefined): type is CanvasEdgeShape {
  return type !== undefined && SHAPES.has(type)
}

function getEdgeShape(type: string | undefined): CanvasEdgeShape {
  return isEdgeShape(type) ? type : "bezier"
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

/** Where an edge starts and ends, in canvas units, with any drag applied. */
type CanvasEdgeEnds = {
  sourceX: number
  sourceY: number
  sourceSide: CanvasSide
  targetX: number
  targetY: number
  targetSide: CanvasSide
}

function readColor(style: { color?: unknown }, fallback: string) {
  return typeof style.color === "string" ? style.color : fallback
}

function useEdgeColors() {
  const base = useResolveClassNames(canvasEdgeVariants())
  const selected = useResolveClassNames(canvasEdgeSelectedVariants())
  return {
    stroke: readColor(base, "#8a8a8a"),
    selected: readColor(selected, "#171717"),
  }
}

/** One edge: its line, its arrow, and a wide invisible stroke to press. */
const CanvasEdge = React.memo(function CanvasEdge({
  edge,
  ends,
  canvasId,
  onPress,
  onLongPress,
}: {
  edge: CanvasEdgeRecord
  ends: CanvasEdgeEnds
  canvasId: string
  onPress: (id: string) => void
  onLongPress: (id: string) => void
}) {
  const { pending } = React.useContext(CanvasEdgeContext)
  const colors = useEdgeColors()
  const { path } = getCanvasEdgePath(getEdgeShape(edge.type), ends)
  // Ports show where an edge plugs in; an arrowhead is asked for.
  const hasArrow = edge.marker === "arrow"
  return (
    <>
      <Path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onPress={() => onPress(edge.id)}
        onLongPress={() => onLongPress(edge.id)}
      />
      <Path
        data-slot="canvas-edge"
        d={path}
        fill="none"
        stroke={edge.selected ? colors.selected : colors.stroke}
        strokeWidth={1.5}
        // A running edge is dashed; native keeps the dashes still (see
        // parity-exceptions).
        strokeDasharray={edge.animated ? "6 4" : undefined}
        opacity={pending.has(edge.id) ? 0.6 : 1}
        markerEnd={
          hasArrow
            ? `url(#${getMarkerId(canvasId, edge.selected ? "selected" : "default")})`
            : undefined
        }
        pointerEvents="none"
      />
    </>
  )
})

/** The arrows edges point with, one per state so each takes its colour. */
function CanvasEdgeMarkers({ canvasId }: { canvasId: string }) {
  const colors = useEdgeColors()
  const markerStyle = useResolveClassNames(canvasEdgeMarkerVariants())
  const markerColor = readColor(markerStyle, colors.stroke)
  return (
    <Defs>
      {(["default", "selected"] as const).map((state) => (
        <Marker
          key={state}
          id={getMarkerId(canvasId, state)}
          viewBox="0 0 10 10"
          // The tip stops at the edge of the target's port (4px dot and its
          // 1px ring, at 0.8px per marker unit) instead of under it.
          refX="14.5"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <Path
            data-slot="canvas-edge-marker"
            d="M1.5 1.5 L8.5 5 L1.5 8.5"
            fill="none"
            stroke={state === "selected" ? colors.selected : markerColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Marker>
      ))}
    </Defs>
  )
}

/** A label (and the insert button) at the middle of its edge. */
const CanvasEdgeLabelAnchor = React.memo(function CanvasEdgeLabelAnchor({
  edge,
  ends,
}: {
  edge: CanvasEdgeRecord
  ends: CanvasEdgeEnds
}) {
  const { onInsert } = React.useContext(CanvasEdgeContext)
  const { isEditable, labels } = useCanvasContext("CanvasEdge")
  const hasLabel = typeof edge.label === "string" && edge.label.length > 0
  const canInsert = Boolean(onInsert) && isEditable
  if (!hasLabel && !canInsert) return null
  const { labelX, labelY } = getCanvasEdgePath(getEdgeShape(edge.type), ends)
  return (
    <View
      data-slot="canvas-edge-label-anchor"
      pointerEvents="box-none"
      className="absolute"
      style={{ left: labelX, top: labelY }}
    >
      <View className="-translate-x-1/2 -translate-y-1/2 flex-row items-center">
        {hasLabel && <CanvasEdgeLabel>{edge.label}</CanvasEdgeLabel>}
        {canInsert && (
          <Pressable
            data-slot="canvas-edge-insert"
            accessibilityRole="button"
            accessibilityLabel={labels.insertNode}
            hitSlop={12}
            onPress={() => onInsert?.(edge.id, { x: labelX, y: labelY })}
            className="cn-canvas-edge-insert items-center justify-center"
          >
            <PlusIcon size={16} />
          </Pressable>
        )}
      </View>
    </View>
  )
})

function CanvasEdgeLabel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="canvas-edge-label"
      className={cn("cn-canvas-edge-label justify-center", className)}
      {...props}
    >
      <Text numberOfLines={1} className="cn-canvas-edge-label-text">
        {children}
      </Text>
    </View>
  )
}

/** The line drawn while a connection is dragged; dashed red over a target it can't take. */
function CanvasConnectionLine({ live }: { live: CanvasLiveConnection | null }) {
  const none = useResolveClassNames(canvasConnectionLineVariants())
  const valid = useResolveClassNames(canvasConnectionLineValidVariants())
  const invalid = useResolveClassNames(canvasConnectionLineInvalidVariants())
  const end = useResolveClassNames(canvasConnectionEndVariants())
  if (!live) return null
  const stroke =
    live.status === "valid"
      ? readColor(valid, "#171717")
      : live.status === "invalid"
        ? readColor(invalid, "#dc2626")
        : readColor(none, "#8a8a8a")
  const { path } = getCanvasEdgePath("bezier", {
    sourceX: live.fromX,
    sourceY: live.fromY,
    sourceSide: live.fromSide,
    targetX: live.toX,
    targetY: live.toY,
    targetSide: "left",
  })
  return (
    <>
      <Path
        data-slot="canvas-connection-line"
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={live.status === "invalid" ? "4 4" : undefined}
        pointerEvents="none"
      />
      <Circle
        cx={live.toX}
        cy={live.toY}
        r={3}
        fill={readColor(end, "#ffffff")}
        stroke={stroke}
        strokeWidth={1.5}
        pointerEvents="none"
      />
    </>
  )
}

export {
  CanvasConnectionLine,
  CanvasEdge,
  CanvasEdgeContext,
  CanvasEdgeLabel,
  CanvasEdgeLabelAnchor,
  CanvasEdgeMarkers,
  getEdgeShape,
  getMarkerId,
  type CanvasEdgeEnds,
  type CanvasEdgeExtras,
}
