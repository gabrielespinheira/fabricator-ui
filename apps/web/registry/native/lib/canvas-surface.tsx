import * as React from "react"
import { type SharedValue } from "react-native-reanimated"

import { type CanvasSide } from "@/registry/fabricator/shared/lib/canvas-geometry"
import {
  type CanvasHandleSpec,
  type CanvasPosition,
} from "@/registry/fabricator/shared/lib/canvas-model"

// What the native Canvas engine shares with its nodes, handles and edges:
// the viewport and the drag in progress as shared values, so pan, zoom and a
// node drag move views on the UI thread, and the callbacks gestures report
// to. Edges follow a drag from React state, because SVG paths are drawn in
// render. The website's engine is React Flow; this is the native one's own.

/** Nodes being dragged and how far, in canvas units. */
type CanvasDrag = { ids: string[]; dx: number; dy: number }

/** A connection being dragged from a handle, in canvas units. */
type CanvasLiveConnection = {
  fromX: number
  fromY: number
  fromSide: CanvasSide
  toX: number
  toY: number
  status: "none" | "valid" | "invalid"
}

type CanvasSurface = {
  x: SharedValue<number>
  y: SharedValue<number>
  zoom: SharedValue<number>
  drag: SharedValue<CanvasDrag | null>
  /** A handle's centre relative to its node, as laid out. */
  reportHandle: (key: string, offset: CanvasPosition) => void
  reportNodeSize: (id: string, size: { width: number; height: number }) => void
  beginNodeDrag: (id: string) => void
  /** The drag so far, in canvas units, for the edges it moves. */
  moveNodeDrag: (dx: number, dy: number) => void
  endNodeDrag: (dx: number, dy: number) => void
  beginConnection: (handle: CanvasHandleSpec) => void
  /** How far the finger has moved since the connection began, in points. */
  moveConnection: (translation: CanvasPosition) => void
  endConnection: () => void
  pressNode: (id: string) => void
  openNodeMenu: (id: string) => void
  resizeNode: (id: string, size: { width: number; height: number }) => void
}

const CanvasSurfaceContext = React.createContext<CanvasSurface | null>(null)

class CanvasSurfaceError extends Error {
  constructor(part: string) {
    super(`${part} must be inside a <Canvas>.`)
    this.name = "CanvasSurfaceError"
  }
}

function useCanvasSurface(part: string) {
  const surface = React.useContext(CanvasSurfaceContext)
  if (!surface) throw new CanvasSurfaceError(part)
  return surface
}

export {
  CanvasSurfaceContext,
  useCanvasSurface,
  type CanvasDrag,
  type CanvasLiveConnection,
  type CanvasSurface,
}
