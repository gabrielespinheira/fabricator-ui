import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  AccessibilityInfo,
  Pressable,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import { type CanvasApi } from "@/registry/fabricator/shared/hooks/use-canvas"
import {
  getHandlePoint,
  type CanvasSide,
} from "@/registry/fabricator/shared/lib/canvas-geometry"
import { getSnap } from "@/registry/fabricator/shared/lib/canvas-guides"
import { getNudge } from "@/registry/fabricator/shared/lib/canvas-keyboard"
import {
  getAbsolutePosition,
  getDescendantIds,
  getNodesBounds,
  getNodeSize,
  indexNodes,
  type CanvasData,
  type CanvasEdge as CanvasEdgeRecord,
  type CanvasHandleSpec,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasPosition,
  type CanvasViewport,
} from "@/registry/fabricator/shared/lib/canvas-model"
import { getHandleKey } from "@/registry/fabricator/shared/lib/canvas-validation"
import {
  clamp,
  getLevelOfDetail,
  getNextZoom,
  getViewportForBounds,
  getViewportToReveal,
  getVisibleNodeIds,
  type CanvasFitOptions,
  type CanvasLevelOfDetail,
} from "@/registry/fabricator/shared/lib/canvas-viewport"
import {
  CanvasSurfaceContext,
  type CanvasDrag,
  type CanvasLiveConnection,
  type CanvasSurface,
} from "@/registry/native/lib/canvas-surface"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import {
  CanvasNodeContext,
  useCanvas,
  useCanvasContext,
  type CanvasMode,
  type CanvasNodeState,
} from "@/registry/native/ui/canvas-context"
import {
  CanvasConnectionLine,
  CanvasEdge,
  CanvasEdgeContext,
  CanvasEdgeLabelAnchor,
  CanvasEdgeMarkers,
  type CanvasEdgeEnds,
} from "@/registry/native/ui/canvas-edge"
import {
  CANVAS_NODE_TYPES,
  CanvasLevelContext,
  type CanvasNodeComponent,
} from "@/registry/native/ui/canvas-node"

// The Canvas's native engine, in place of React Flow: one transformed layer
// of node views over a frame-sized SVG of edges. Pan and zoom live in shared
// values and never render React; a dragged node and its edges move in
// worklets and land through the controller once, at the drop. Culling,
// fitting and the engine port the controller uses are here too.

// Colours the SVG reads from the style map.
const backgroundVariants = cva("cn-canvas-background")
const backgroundPatternVariants = cva("cn-canvas-background-pattern")
const minimapNodeVariants = cva("cn-canvas-minimap-node")
const minimapFrameVariants = cva("cn-canvas-minimap-frame")

type CanvasPanInput = "scroll" | "drag"

type CanvasMenuTarget =
  | { kind: "pane"; point: CanvasPosition; at: CanvasPosition }
  | { kind: "node"; point: CanvasPosition; id: string }
  | { kind: "edge"; point: CanvasPosition; id: string }
  | { kind: "selection"; point: CanvasPosition }

type CanvasNodeMeta = {
  pending: ReadonlySet<string>
  names: ReadonlyMap<string, string>
  descriptions: ReadonlyMap<string, string>
}

/** The node type the engine draws: the Canvas's own, as on the website. */
type CanvasEngineNode = CanvasNode

/** Native has no edge components of its own; edges draw from `type`. */
type CanvasEdgeComponent = never

/** Above this many nodes, nodes outside the view aren't drawn. */
const CULL_FROM = 150
/** How near a handle a connection lands, in screen points. */
const CONNECTION_RADIUS = 28

const CanvasViewportContext = React.createContext<{
  viewport: CanvasViewport
  size: { width: number; height: number }
}>({ viewport: { x: 0, y: 0, zoom: 1 }, size: { width: 0, height: 0 } })

function isInside(
  point: CanvasPosition,
  rect: { x: number; y: number; width: number; height: number }
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

type CanvasEngineProps = {
  canvasId: string
  nodes: CanvasNode[]
  edges: CanvasEdgeRecord[]
  api: CanvasApi<CanvasNode, CanvasData>
  mode: CanvasMode
  panOn: CanvasPanInput
  isEditable: boolean
  isDisabled: boolean
  nodeTypes?: Record<string, CanvasNodeComponent>
  background: "dots" | "lines" | "cross" | "none"
  gridSize: number
  snapToGrid: boolean
  guides: boolean
  fitView: boolean | CanvasFitOptions
  minZoom: number
  maxZoom: number
  viewport?: CanvasViewport
  defaultViewport?: CanvasViewport
  onViewportChange?: (viewport: CanvasViewport) => void
  onViewportChangeEnd?: (viewport: CanvasViewport) => void
  meta: CanvasNodeMeta
  pending: ReadonlySet<string>
  onConnectToPane?: (event: {
    position: CanvasPosition
    source: {
      nodeId: string
      handleId: string | null
      kind: "source" | "target"
    }
  }) => void
  onEdgeInsert?: (edgeId: string, position: CanvasPosition) => void
  onMenu: (target: CanvasMenuTarget) => void
  onLevelOfDetail: (level: CanvasLevelOfDetail) => void
  onNodeOpen: (id: string) => void
  children?: React.ReactNode
}

function CanvasEngine({
  canvasId,
  nodes,
  edges,
  api,
  mode,
  isEditable,
  isDisabled,
  nodeTypes,
  background,
  gridSize,
  snapToGrid,
  guides: hasGuides,
  fitView,
  minZoom,
  maxZoom,
  viewport: controlledViewport,
  defaultViewport,
  onViewportChange,
  onViewportChangeEnd,
  meta,
  pending,
  onConnectToPane,
  onEdgeInsert,
  onMenu,
  onLevelOfDetail,
  onNodeOpen,
  children,
}: CanvasEngineProps) {
  const feedback = useFeedback()
  const motion = useMotion("move")
  const initial = controlledViewport ??
    defaultViewport ?? { x: 0, y: 0, zoom: 1 }
  const x = useSharedValue(initial.x)
  const y = useSharedValue(initial.y)
  const zoom = useSharedValue(initial.zoom)
  const drag = useSharedValue<CanvasDrag | null>(null)
  const [liveConnection, setLiveConnection] =
    React.useState<CanvasLiveConnection | null>(null)
  // The drag as React state, for the edges it moves; nodes move on the UI
  // thread from the shared value. Updates land once a frame.
  const [dragOffset, setDragOffset] = React.useState<{
    ids: ReadonlySet<string>
    dx: number
    dy: number
  } | null>(null)
  const dragFrame = React.useRef<number | null>(null)
  // Drag updates arrive from the UI thread and can land after the drop.
  const isDraggingRef = React.useRef(false)
  const pendingDrag = React.useRef<{ dx: number; dy: number } | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  const [viewport, setViewport] = React.useState<CanvasViewport>(initial)
  const [handleVersion, setHandleVersion] = React.useState(0)
  const handleOffsets = React.useRef(new Map<string, CanvasPosition>())
  const pendingSizes = React.useRef(
    new Map<string, { width: number; height: number }>()
  )
  const flushFrame = React.useRef<number | null>(null)
  const connectionRef = React.useRef<{
    from: CanvasHandleSpec
    start: CanvasPosition
    target: CanvasHandleSpec | null
    point: CanvasPosition
  } | null>(null)
  const hasFitted = React.useRef(fitView === false)
  const levelRef = React.useRef<CanvasLevelOfDetail>(
    getLevelOfDetail(initial.zoom)
  )

  const latest = React.useRef({
    nodes,
    size,
    onViewportChange,
    onViewportChangeEnd,
    onMenu,
    onConnectToPane,
  })
  React.useLayoutEffect(() => {
    latest.current = {
      nodes,
      size,
      onViewportChange,
      onViewportChangeEnd,
      onMenu,
      onConnectToPane,
    }
  })

  const byId = React.useMemo(() => indexNodes(nodes), [nodes])

  // The viewport in React state, for culling, the level of detail, the
  // controls and the owner: once a gesture or a glide settles.
  const commitViewport = React.useCallback(() => {
    const next = { x: x.get(), y: y.get(), zoom: zoom.get() }
    setViewport(next)
    const level = getLevelOfDetail(next.zoom)
    if (level !== levelRef.current) {
      levelRef.current = level
      onLevelOfDetail(level)
    }
    latest.current.onViewportChange?.(next)
    latest.current.onViewportChangeEnd?.(next)
  }, [onLevelOfDetail, x, y, zoom])

  const moveTo = React.useCallback(
    (next: CanvasViewport, animate = true) => {
      const duration = animate ? motion.enterMs : 0
      const done = () => commitViewport()
      x.set(withTiming(next.x, { duration, easing: motion.moveEasing }))
      y.set(withTiming(next.y, { duration, easing: motion.moveEasing }))
      zoom.set(
        withTiming(
          next.zoom,
          { duration, easing: motion.moveEasing },
          (finished) => {
            if (finished) runOnJS(done)()
          }
        )
      )
    },
    [commitViewport, motion.enterMs, motion.moveEasing, x, y, zoom]
  )

  React.useEffect(() => {
    if (!controlledViewport) return
    moveTo(controlledViewport, false)
  }, [controlledViewport, moveTo])

  const fit = React.useCallback(
    (options?: CanvasFitOptions & { nodeIds?: string[] }, animate = true) => {
      const frame = latest.current.size
      if (frame.width === 0) return
      const all = latest.current.nodes
      const subset = options?.nodeIds
        ? all.filter((node) => options.nodeIds?.includes(node.id))
        : all
      const bounds = getNodesBounds(subset, indexNodes(all))
      if (!bounds) return
      const base = typeof fitView === "object" ? fitView : {}
      moveTo(
        getViewportForBounds(bounds, frame, {
          ...base,
          ...options,
          minZoom: options?.minZoom ?? base.minZoom ?? minZoom,
          maxZoom: options?.maxZoom ?? base.maxZoom ?? 1,
        }),
        animate
      )
    },
    [fitView, maxZoom, minZoom, moveTo]
  )

  // Fits once the frame and the nodes have sizes; a static canvas refits
  // whenever its frame changes.
  const isMeasured =
    nodes.length > 0 && nodes.every((node) => getNodeSize(node).width > 0)
  React.useEffect(() => {
    if (size.width === 0 || !isMeasured) return
    if (hasFitted.current && mode !== "static") return
    hasFitted.current = true
    fit(undefined, false)
  }, [fit, isMeasured, mode, size])

  const zoomBy = React.useCallback(
    (direction: "in" | "out") => {
      const frame = latest.current.size
      const current = { x: x.get(), y: y.get(), zoom: zoom.get() }
      const next = getNextZoom(current.zoom, direction, minZoom, maxZoom)
      const anchor = { x: frame.width / 2, y: frame.height / 2 }
      const k = next / current.zoom
      moveTo({
        x: anchor.x - (anchor.x - current.x) * k,
        y: anchor.y - (anchor.y - current.y) * k,
        zoom: next,
      })
    },
    [maxZoom, minZoom, moveTo, x, y, zoom]
  )

  React.useEffect(() => {
    api.registerEngine({
      fitView: (options) => fit(options),
      zoomIn: () => zoomBy("in"),
      zoomOut: () => zoomBy("out"),
      zoomTo: (value) => {
        const frame = latest.current.size
        const current = { x: x.get(), y: y.get(), zoom: zoom.get() }
        const next = clamp(value, minZoom, maxZoom)
        const k = next / current.zoom
        moveTo({
          x: frame.width / 2 - (frame.width / 2 - current.x) * k,
          y: frame.height / 2 - (frame.height / 2 - current.y) * k,
          zoom: next,
        })
      },
      setViewport: (next, options) => moveTo(next, options?.animate !== false),
      getViewport: () => ({ x: x.get(), y: y.get(), zoom: zoom.get() }),
      getSize: () => latest.current.size,
      // Native points are already inside the frame.
      screenToCanvas: (point) => ({
        x: (point.x - x.get()) / zoom.get(),
        y: (point.y - y.get()) / zoom.get(),
      }),
      focusNode: (id) => {
        const bounds = api.getNodeBounds(id)
        if (!bounds) return
        moveTo(
          getViewportToReveal(
            bounds,
            { x: x.get(), y: y.get(), zoom: zoom.get() },
            latest.current.size
          )
        )
        const name = meta.names.get(id)
        if (name) AccessibilityInfo.announceForAccessibility(name)
      },
    })
    return () => api.registerEngine(null)
  }, [api, fit, maxZoom, meta.names, minZoom, moveTo, x, y, zoom, zoomBy])

  // Sizes and handle positions arrive by layout, many at once; one frame
  // later they land together.
  const flush = React.useCallback(() => {
    flushFrame.current = null
    if (pendingSizes.current.size > 0) {
      const changes: CanvasNodeChange<CanvasNode>[] = [
        ...pendingSizes.current,
      ].map(([id, dimensions]) => ({ id, type: "dimensions", dimensions }))
      pendingSizes.current.clear()
      api.applyNodeChanges(changes, { history: false })
    }
    setHandleVersion((version) => version + 1)
  }, [api])

  const scheduleFlush = React.useCallback(() => {
    if (flushFrame.current !== null) return
    flushFrame.current = requestAnimationFrame(flush)
  }, [flush])

  const getHandlePosition = React.useCallback(
    (
      nodeId: string,
      kind: "source" | "target",
      handleId: string | null | undefined,
      fallbackSide: CanvasSide
    ) => {
      const node = byId.get(nodeId)
      if (!node) return null
      const origin = getAbsolutePosition(node, byId)
      const offset = handleOffsets.current.get(
        getHandleKey(nodeId, kind, handleId)
      )
      if (offset) return { x: origin.x + offset.x, y: origin.y + offset.y }
      return getHandlePoint({ ...origin, ...getNodeSize(node) }, fallbackSide)
    },
    [byId]
  )

  const findHandleAt = React.useCallback(
    (point: CanvasPosition, from: CanvasHandleSpec) => {
      const radius = CONNECTION_RADIUS / zoom.get()
      let best: { spec: CanvasHandleSpec; distance: number } | null = null
      const wanted = from.kind === "source" ? "target" : "source"
      for (const node of latest.current.nodes) {
        if (node.id === from.nodeId && !node.connectable) continue
        for (const spec of api.getHandles(node.id)) {
          if (spec.kind !== wanted) continue
          const position = getHandlePosition(
            node.id,
            spec.kind,
            spec.id,
            spec.side
          )
          if (!position) continue
          const distance = Math.hypot(
            position.x - point.x,
            position.y - point.y
          )
          if (distance <= radius && (!best || distance < best.distance)) {
            best = { spec, distance }
          }
        }
      }
      if (best) return best.spec
      // Dropped on a node's body: its first handle that can take it.
      const all = latest.current.nodes
      const index = indexNodes(all)
      const over = [...all].reverse().find((node) =>
        isInside(point, {
          ...getAbsolutePosition(node, index),
          ...getNodeSize(node),
        })
      )
      if (!over || over.id === from.nodeId) return null
      return from.kind === "source"
        ? (api.getTargets(from).find((target) => target.nodeId === over.id) ??
            null)
        : null
    },
    [api, getHandlePosition, zoom]
  )

  const toConnection = (from: CanvasHandleSpec, to: CanvasHandleSpec) =>
    from.kind === "source"
      ? {
          source: from.nodeId,
          sourceHandle: from.id,
          target: to.nodeId,
          targetHandle: to.id,
        }
      : {
          source: to.nodeId,
          sourceHandle: to.id,
          target: from.nodeId,
          targetHandle: from.id,
        }

  const surface = React.useMemo<CanvasSurface>(
    () => ({
      x,
      y,
      zoom,
      drag,
      reportHandle: (key, offset) => {
        const current = handleOffsets.current.get(key)
        if (current && current.x === offset.x && current.y === offset.y) return
        handleOffsets.current.set(key, offset)
        scheduleFlush()
      },
      reportNodeSize: (id, next) => {
        const node = byId.get(id)
        const measured = node?.measured
        if (measured?.width === next.width && measured?.height === next.height)
          return
        pendingSizes.current.set(id, next)
        scheduleFlush()
      },
      beginNodeDrag: (id) => {
        const all = latest.current.nodes
        const node = byId.get(id)
        if (!node || node.draggable === false) return
        const selected = all
          .filter((item) => item.selected)
          .map((item) => item.id)
        const roots = node.selected ? selected : [id]
        if (!node.selected) api.select({ nodeIds: [id] })
        const ids = [...roots, ...getDescendantIds(all, roots)]
        isDraggingRef.current = true
        drag.set({ ids, dx: 0, dy: 0 })
        feedback("grab")
      },
      endNodeDrag: (dx, dy) => {
        const moving = drag.get()
        if (!moving) return
        const all = latest.current.nodes
        const index = indexNodes(all)
        const moved = new Set(moving.ids)
        const roots = moving.ids.filter((id) => {
          const parent = index.get(id)?.parentId
          return !parent || !moved.has(parent)
        })
        let delta = { x: dx, y: dy }
        const primary = index.get(roots[0] ?? "")
        if (primary && (hasGuides || snapToGrid)) {
          const origin = getAbsolutePosition(primary, index)
          const rect = {
            x: origin.x + dx,
            y: origin.y + dy,
            ...getNodeSize(primary),
          }
          const others = all
            .filter((node) => !moved.has(node.id) && !node.hidden)
            .map((node) => ({
              ...getAbsolutePosition(node, index),
              ...getNodeSize(node),
            }))
          const snap = getSnap(rect, hasGuides ? others : [], {
            grid: snapToGrid ? gridSize : 0,
          })
          delta = {
            x: snap.position.x - origin.x,
            y: snap.position.y - origin.y,
          }
        }
        isDraggingRef.current = false
        if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current)
        dragFrame.current = null
        pendingDrag.current = null
        // The new positions and the cleared offset render together, so edges
        // land once; the views' own offset clears a frame later.
        setDragOffset(null)
        if (delta.x !== 0 || delta.y !== 0) api.moveNodes(roots, delta)
        requestAnimationFrame(() => drag.set(null))
        feedback("drop")
      },
      moveNodeDrag: (dx, dy) => {
        if (!isDraggingRef.current) return
        pendingDrag.current = { dx, dy }
        if (dragFrame.current !== null) return
        dragFrame.current = requestAnimationFrame(() => {
          dragFrame.current = null
          const moving = drag.get()
          const next = pendingDrag.current
          if (!moving || !next || !isDraggingRef.current) return
          setDragOffset({ ids: new Set(moving.ids), dx: next.dx, dy: next.dy })
        })
      },
      beginConnection: (handle) => {
        const from = getHandlePosition(
          handle.nodeId,
          handle.kind,
          handle.id,
          handle.side
        )
        if (!from) return
        connectionRef.current = {
          from: handle,
          start: from,
          target: null,
          point: from,
        }
        setLiveConnection({
          fromX: from.x,
          fromY: from.y,
          fromSide: handle.side,
          toX: from.x,
          toY: from.y,
          status: "none",
        })
        feedback("grab")
      },
      moveConnection: (translation) => {
        const live = connectionRef.current
        if (!live) return
        const scale = zoom.get()
        const point = {
          x: live.start.x + translation.x / scale,
          y: live.start.y + translation.y / scale,
        }
        live.point = point
        const target = findHandleAt(point, live.from)
        live.target = target
        const status = target
          ? api.validate(toConnection(live.from, target)).isValid
            ? "valid"
            : "invalid"
          : "none"
        setLiveConnection({
          fromX: live.start.x,
          fromY: live.start.y,
          fromSide: live.from.side,
          toX: point.x,
          toY: point.y,
          status,
        })
      },
      endConnection: () => {
        const live = connectionRef.current
        connectionRef.current = null
        setLiveConnection(null)
        if (!live) return
        if (live.target) {
          const result = api.connect(toConnection(live.from, live.target))
          feedback(result.isValid ? "drop" : "deny")
          return
        }
        // A connection dropped on empty canvas asks the app what to make there.
        latest.current.onConnectToPane?.({
          position: live.point,
          source: {
            nodeId: live.from.nodeId,
            handleId: live.from.id,
            kind: live.from.kind,
          },
        })
      },
      pressNode: (id) => {
        const node = byId.get(id)
        if (!node || node.selectable === false) return
        api.select({ nodeIds: node.selected ? [] : [id] })
        feedback("tick")
      },
      openNodeMenu: (id) => {
        const node = byId.get(id)
        if (!node) return
        if (!node.selected) api.select({ nodeIds: [id] })
        const origin = getAbsolutePosition(node, byId)
        latest.current.onMenu({
          kind: "node",
          id,
          point: {
            x: origin.x * zoom.get() + x.get(),
            y: origin.y * zoom.get() + y.get(),
          },
        })
      },
      resizeNode: (id, next) => {
        api.applyNodeChanges(
          [
            {
              id,
              type: "dimensions",
              dimensions: next,
              setAttributes: true,
              resizing: false,
            },
          ],
          { key: `resize:${id}` }
        )
      },
    }),
    [
      api,
      byId,
      drag,
      feedback,
      findHandleAt,
      getHandlePosition,
      gridSize,
      hasGuides,
      scheduleFlush,
      snapToGrid,
      x,
      y,
      zoom,
    ]
  )

  // Pane: one finger pans, two pinch about their centre, a tap clears the
  // selection, a double tap zooms in, a long press opens the canvas menu.
  const start = useSharedValue({ x: 0, y: 0, zoom: 1, focalX: 0, focalY: 0 })
  const isInteractive = mode !== "static" && !isDisabled
  const pan = Gesture.Pan()
    .enabled(isInteractive)
    .maxPointers(1)
    .onStart(() => {
      start.set({
        x: x.get(),
        y: y.get(),
        zoom: zoom.get(),
        focalX: 0,
        focalY: 0,
      })
    })
    .onUpdate((event) => {
      const origin = start.get()
      x.set(origin.x + event.translationX)
      y.set(origin.y + event.translationY)
    })
    .onEnd(() => {
      runOnJS(commitViewport)()
    })
  const pinch = Gesture.Pinch()
    .enabled(isInteractive)
    .onStart((event) => {
      start.set({
        x: x.get(),
        y: y.get(),
        zoom: zoom.get(),
        focalX: event.focalX,
        focalY: event.focalY,
      })
    })
    .onUpdate((event) => {
      const origin = start.get()
      const next = Math.min(
        maxZoom,
        Math.max(minZoom, origin.zoom * event.scale)
      )
      const k = next / origin.zoom
      x.set(event.focalX - (origin.focalX - origin.x) * k)
      y.set(event.focalY - (origin.focalY - origin.y) * k)
      zoom.set(next)
    })
    .onEnd(() => {
      runOnJS(commitViewport)()
    })
  const clearSelection = () => api.clearSelection()
  const zoomInAt = (pointX: number, pointY: number) => {
    const current = { x: x.get(), y: y.get(), zoom: zoom.get() }
    const next = getNextZoom(current.zoom, "in", minZoom, maxZoom)
    const k = next / current.zoom
    moveTo({
      x: pointX - (pointX - current.x) * k,
      y: pointY - (pointY - current.y) * k,
      zoom: next,
    })
  }
  const openPaneMenu = (pointX: number, pointY: number) => {
    const at = {
      x: (pointX - x.get()) / zoom.get(),
      y: (pointY - y.get()) / zoom.get(),
    }
    latest.current.onMenu({ kind: "pane", point: { x: pointX, y: pointY }, at })
  }
  const tap = Gesture.Tap()
    .enabled(isInteractive)
    .onEnd(() => {
      runOnJS(clearSelection)()
    })
  const doubleTap = Gesture.Tap()
    .enabled(isInteractive)
    .numberOfTaps(2)
    .onEnd((event) => {
      runOnJS(zoomInAt)(event.x, event.y)
    })
  const longPress = Gesture.LongPress()
    .enabled(isInteractive)
    .minDuration(450)
    .onStart((event) => {
      runOnJS(openPaneMenu)(event.x, event.y)
    })
  const paneGesture = Gesture.Simultaneous(
    Gesture.Simultaneous(pan, pinch),
    Gesture.Exclusive(longPress, doubleTap, tap)
  )

  const layerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: zoom.get() },
    ],
  }))
  const dotStyle = useResolveClassNames(backgroundPatternVariants())
  const backgroundStyle = useResolveClassNames(backgroundVariants())
  const backgroundOpacity =
    typeof backgroundStyle.opacity === "number" ? backgroundStyle.opacity : 1
  const dotColor =
    typeof dotStyle.color === "string" ? dotStyle.color : "#d4d4d4"

  const level = getLevelOfDetail(viewport.zoom)
  const visible = React.useMemo(
    () =>
      nodes.length > CULL_FROM && size.width > 0
        ? getVisibleNodeIds(nodes, viewport, size, 200)
        : null,
    [nodes, size, viewport]
  )

  // The part of the canvas the SVG covers: the graph with a margin, cut to
  // the view and a frame either side of it, recomputed when a gesture
  // settles.
  const region = React.useMemo(() => {
    if (size.width === 0) return null
    const bounds = getNodesBounds(nodes, byId)
    const zoomLevel = viewport.zoom
    const view = {
      x: -viewport.x / zoomLevel - size.width / zoomLevel,
      y: -viewport.y / zoomLevel - size.height / zoomLevel,
      width: (size.width * 3) / zoomLevel,
      height: (size.height * 3) / zoomLevel,
    }
    const margin = 240
    const area = bounds
      ? {
          x: Math.max(view.x, bounds.x - margin),
          y: Math.max(view.y, bounds.y - margin),
          right: Math.min(
            view.x + view.width,
            bounds.x + bounds.width + margin
          ),
          bottom: Math.min(
            view.y + view.height,
            bounds.y + bounds.height + margin
          ),
        }
      : null
    if (!area || area.right <= area.x || area.bottom <= area.y) {
      return {
        x: view.x,
        y: view.y,
        width: view.width,
        height: view.height,
        zoom: zoomLevel,
      }
    }
    return {
      x: Math.floor(area.x),
      y: Math.floor(area.y),
      width: Math.ceil(area.right - area.x),
      height: Math.ceil(area.bottom - area.y),
      zoom: zoomLevel,
    }
  }, [byId, nodes, size, viewport])

  const resolvedTypes = React.useMemo<Record<string, CanvasNodeComponent>>(
    () => ({ ...CANVAS_NODE_TYPES, ...nodeTypes }),
    [nodeTypes]
  )

  // Groups draw first, so the nodes in them sit on top.
  const ordered = React.useMemo(
    () =>
      [...nodes]
        .filter((node) => !node.hidden && (!visible || visible.has(node.id)))
        .sort(
          (a, b) =>
            Number(b.type === "group") - Number(a.type === "group") ||
            (a.zIndex ?? 0) - (b.zIndex ?? 0)
        ),
    [nodes, visible]
  )

  const edgeEnds = React.useMemo(() => {
    const ends = new Map<string, CanvasEdgeEnds>()
    for (const edge of edges) {
      if (edge.hidden) continue
      if (visible && !visible.has(edge.source) && !visible.has(edge.target))
        continue
      const sourceSpec = api
        .getHandles(edge.source)
        .find(
          (spec) =>
            spec.kind === "source" && spec.id === (edge.sourceHandle ?? null)
        )
      const targetSpec = api
        .getHandles(edge.target)
        .find(
          (spec) =>
            spec.kind === "target" && spec.id === (edge.targetHandle ?? null)
        )
      const sourceSide = sourceSpec?.side ?? "right"
      const targetSide = targetSpec?.side ?? "left"
      const from = getHandlePosition(
        edge.source,
        "source",
        edge.sourceHandle,
        sourceSide
      )
      const to = getHandlePosition(
        edge.target,
        "target",
        edge.targetHandle,
        targetSide
      )
      if (!from || !to) continue
      const moveSource = dragOffset?.ids.has(edge.source) ?? false
      const moveTarget = dragOffset?.ids.has(edge.target) ?? false
      ends.set(edge.id, {
        sourceX: from.x + (moveSource && dragOffset ? dragOffset.dx : 0),
        sourceY: from.y + (moveSource && dragOffset ? dragOffset.dy : 0),
        sourceSide,
        targetX: to.x + (moveTarget && dragOffset ? dragOffset.dx : 0),
        targetY: to.y + (moveTarget && dragOffset ? dragOffset.dy : 0),
        targetSide,
      })
    }
    return ends
    // Handle positions change with layout, which bumps the version.
  }, [api, edges, getHandlePosition, visible, handleVersion, dragOffset])

  const selectEdge = React.useCallback(
    (id: string) => api.select({ edgeIds: [id] }),
    [api]
  )
  const openEdgeMenu = React.useCallback(
    (id: string) => {
      api.select({ edgeIds: [id] })
      const frame = latest.current.size
      latest.current.onMenu({
        kind: "edge",
        id,
        point: { x: frame.width / 2, y: frame.height / 2 },
      })
    },
    [api]
  )

  const edgeContext = React.useMemo(
    () => ({ pending, canvasId, onInsert: onEdgeInsert }),
    [canvasId, onEdgeInsert, pending]
  )
  const viewportContext = React.useMemo(
    () => ({ viewport, size }),
    [size, viewport]
  )
  const levelContext = React.useMemo(() => ({ level }), [level])

  return (
    <CanvasSurfaceContext.Provider value={surface}>
      <CanvasViewportContext.Provider value={viewportContext}>
        <CanvasLevelContext.Provider value={levelContext}>
          <CanvasEdgeContext.Provider value={edgeContext}>
            <GestureDetector gesture={paneGesture}>
              <View
                data-slot="canvas-engine"
                collapsable={false}
                onLayout={(event: LayoutChangeEvent) => {
                  const { width, height } = event.nativeEvent.layout
                  setSize({ width, height })
                }}
                className="cn-canvas-engine flex-1 overflow-hidden"
              >
                <Animated.View
                  pointerEvents="box-none"
                  className="absolute top-0 left-0"
                  style={[layerStyle, { transformOrigin: "top left" }]}
                >
                  {region && (
                    // In canvas units, inside the layer, so pan and zoom move
                    // it with the nodes. Its bitmap is the region at the
                    // settled zoom, counter-scaled, so it stays sharp and its
                    // memory doesn't grow with the graph.
                    <View
                      pointerEvents="box-none"
                      className="absolute"
                      style={{
                        left: region.x,
                        top: region.y,
                        width: region.width * region.zoom,
                        height: region.height * region.zoom,
                        transform: [{ scale: 1 / region.zoom }],
                        transformOrigin: "top left",
                      }}
                    >
                      <Svg
                        width={region.width * region.zoom}
                        height={region.height * region.zoom}
                        viewBox={`${region.x} ${region.y} ${region.width} ${region.height}`}
                      >
                        {background !== "none" && level !== "outline" && (
                          <>
                            <Defs>
                              <Pattern
                                id={`${canvasId}-grid`}
                                patternUnits="userSpaceOnUse"
                                x={0}
                                y={0}
                                width={gridSize}
                                height={gridSize}
                              >
                                <Circle cx={1} cy={1} r={1} fill={dotColor} />
                              </Pattern>
                            </Defs>
                            <Rect
                              x={region.x}
                              y={region.y}
                              width={region.width}
                              height={region.height}
                              fill={`url(#${canvasId}-grid)`}
                              opacity={backgroundOpacity}
                            />
                          </>
                        )}
                        <CanvasEdgeMarkers canvasId={canvasId} />
                        {edges.map((edge) => {
                          const ends = edgeEnds.get(edge.id)
                          return ends ? (
                            <CanvasEdge
                              key={edge.id}
                              edge={edge}
                              ends={ends}
                              canvasId={canvasId}
                              onPress={selectEdge}
                              onLongPress={openEdgeMenu}
                            />
                          ) : null
                        })}
                        <CanvasConnectionLine live={liveConnection} />
                      </Svg>
                    </View>
                  )}
                  {edges.map((edge) => {
                    const ends = edgeEnds.get(edge.id)
                    return ends ? (
                      <CanvasEdgeLabelAnchor
                        key={edge.id}
                        edge={edge}
                        ends={ends}
                      />
                    ) : null
                  })}
                  {ordered.map((node) => (
                    <CanvasNodeView
                      key={node.id}
                      node={node}
                      position={getAbsolutePosition(node, byId)}
                      Component={
                        resolvedTypes[node.type ?? "default"] ??
                        resolvedTypes.default
                      }
                      meta={meta}
                      isEditable={isEditable}
                      onOpen={onNodeOpen}
                    />
                  ))}
                </Animated.View>
                <View pointerEvents="box-none" className="absolute inset-0">
                  {children}
                </View>
              </View>
            </GestureDetector>
          </CanvasEdgeContext.Provider>
        </CanvasLevelContext.Provider>
      </CanvasViewportContext.Provider>
    </CanvasSurfaceContext.Provider>
  )
}

const NUDGE_DIRECTIONS = ["left", "right", "up", "down"] as const

/** One node: positioned, moved by a drag, pressed, held and read out. */
const CanvasNodeView = React.memo(function CanvasNodeView({
  node,
  position,
  Component,
  meta,
  isEditable,
  onOpen,
}: {
  node: CanvasNode
  position: CanvasPosition
  Component: CanvasNodeComponent
  meta: CanvasNodeMeta
  isEditable: boolean
  onOpen: (id: string) => void
}) {
  const surface = React.useContext(CanvasSurfaceContext)
  const { api, labels, openConnect } = useCanvasContext("CanvasNode")
  if (!surface) throw new Error("CanvasNodeView must be inside a <Canvas>.")
  const { drag, zoom } = surface
  const id = node.id
  const isDraggable = isEditable && node.draggable !== false

  const style = useAnimatedStyle(() => {
    const moving = drag.get()
    const isMoving = moving !== null && moving.ids.includes(id)
    return {
      transform: [
        { translateX: isMoving ? moving.dx : 0 },
        { translateY: isMoving ? moving.dy : 0 },
      ],
      zIndex: isMoving ? 1000 : (node.zIndex ?? 0),
    }
  })

  const panGesture = Gesture.Pan()
    .enabled(isDraggable)
    .minDistance(6)
    .onStart(() => {
      runOnJS(surface.beginNodeDrag)(id)
    })
    .onUpdate((event) => {
      const moving = drag.get()
      if (!moving) return
      const scale = zoom.get()
      const dx = event.translationX / scale
      const dy = event.translationY / scale
      drag.set({ ids: moving.ids, dx, dy })
      runOnJS(surface.moveNodeDrag)(dx, dy)
    })
    .onEnd((event) => {
      const scale = zoom.get()
      runOnJS(surface.endNodeDrag)(
        event.translationX / scale,
        event.translationY / scale
      )
    })
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(surface.pressNode)(id)
  })
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(onOpen)(id)
    })
  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      runOnJS(surface.openNodeMenu)(id)
    })
  const gesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPress, doubleTap, tap)
  )

  const state = React.useMemo<CanvasNodeState>(
    () => ({
      id,
      name: meta.names.get(id) ?? id,
      description: meta.descriptions.get(id) ?? "",
      status: node.status,
      color: node.color,
      invalid: node.invalid,
      isSelected: Boolean(node.selected),
      isDragging: Boolean(node.dragging),
      isPending: meta.pending.has(id),
      isConnectable: isEditable && node.connectable !== false,
    }),
    [id, isEditable, meta, node]
  )

  // VoiceOver and TalkBack reach every gesture through actions: open, the
  // menu, connect, delete and a nudge each way.
  const actions = [
    { name: "activate", label: labels.open },
    { name: "longpress", label: labels.actions },
    ...(isEditable
      ? [
          { name: "connect", label: labels.connectTo },
          { name: "delete", label: labels.delete },
          ...NUDGE_DIRECTIONS.map((direction) => ({
            name: `move-${direction}`,
            label: labels.move[direction],
          })),
        ]
      : []),
  ]

  const width = node.width ?? undefined
  const height = node.height ?? undefined
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityLabel={state.name}
        accessibilityHint={state.description}
        accessibilityState={{
          selected: state.isSelected,
          disabled: state.isPending,
        }}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName
          if (action === "activate") onOpen(id)
          else if (action === "longpress") surface.openNodeMenu(id)
          else if (action === "connect") openConnect(id)
          else if (action === "delete") api.deleteElements({ nodeIds: [id] })
          else {
            const direction = NUDGE_DIRECTIONS.find(
              (value) => action === `move-${value}`
            )
            if (direction)
              api.moveNodes([id], getNudge(direction, false, 20), `nudge:${id}`)
          }
        }}
        onLayout={(event) => {
          const layout = event.nativeEvent.layout
          surface.reportNodeSize(id, {
            width: layout.width,
            height: layout.height,
          })
        }}
        className="absolute"
        style={[{ left: position.x, top: position.y, width, height }, style]}
      >
        <CanvasNodeContext.Provider value={state}>
          <Component
            id={id}
            type={node.type ?? "default"}
            data={node.data}
            selected={state.isSelected}
            dragging={state.isDragging}
            isConnectable={state.isConnectable}
            status={node.status}
            invalid={node.invalid}
            width={width}
            height={height}
          />
        </CanvasNodeContext.Provider>
      </Animated.View>
    </GestureDetector>
  )
})

/** The current pan and zoom, once a gesture settles. */
function useCanvasViewport(): CanvasViewport {
  return React.use(CanvasViewportContext).viewport
}

/** A map of the whole canvas with the view framed; tap to move there. Tablets only. */
function CanvasMinimap({ className }: { className?: string }) {
  const { labels, api } = useCanvasContext("CanvasMinimap")
  const { nodes } = useCanvas()
  const { viewport, size } = React.use(CanvasViewportContext)
  const { width: windowWidth } = useWindowDimensions()
  const nodeStyle = useResolveClassNames(minimapNodeVariants())
  const maskStyle = useResolveClassNames(minimapFrameVariants())
  const fill = typeof nodeStyle.color === "string" ? nodeStyle.color : "#d4d4d4"
  const stroke =
    typeof maskStyle.color === "string" ? maskStyle.color : "#737373"
  const index = indexNodes(nodes)
  const bounds = getNodesBounds(nodes, index)
  if (!bounds || windowWidth < 768) return null
  const frame = { width: 160, height: 104 }
  const scale = Math.min(
    frame.width / Math.max(1, bounds.width),
    frame.height / Math.max(1, bounds.height)
  )
  const view = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: size.width / viewport.zoom,
    height: size.height / viewport.zoom,
  }
  return (
    <Pressable
      data-slot="canvas-minimap"
      accessibilityRole="button"
      accessibilityLabel={labels.minimap}
      onPress={(event) => {
        const { locationX, locationY } = event.nativeEvent
        const point = {
          x: bounds.x + locationX / scale,
          y: bounds.y + locationY / scale,
        }
        api.setViewport({
          x: size.width / 2 - point.x * viewport.zoom,
          y: size.height / 2 - point.y * viewport.zoom,
          zoom: viewport.zoom,
        })
      }}
      className={cn(
        "cn-canvas-minimap absolute right-0 bottom-0 overflow-hidden",
        className
      )}
      style={frame}
    >
      <Svg width={frame.width} height={frame.height}>
        {nodes.map((node) => {
          if (node.hidden) return null
          const origin = getAbsolutePosition(node, index)
          const nodeSize = getNodeSize(node)
          return (
            <Rect
              key={node.id}
              x={(origin.x - bounds.x) * scale}
              y={(origin.y - bounds.y) * scale}
              width={Math.max(2, nodeSize.width * scale)}
              height={Math.max(2, nodeSize.height * scale)}
              rx={2}
              fill={fill}
            />
          )
        })}
        <Rect
          x={(view.x - bounds.x) * scale}
          y={(view.y - bounds.y) * scale}
          width={view.width * scale}
          height={view.height * scale}
          rx={3}
          fill="none"
          stroke={stroke}
          strokeWidth={1}
        />
      </Svg>
    </Pressable>
  )
}

export {
  CanvasEngine,
  CanvasMinimap,
  useCanvasViewport,
  type CanvasEdgeComponent,
  type CanvasEngineNode,
  type CanvasEngineProps,
  type CanvasMenuTarget,
  type CanvasNodeMeta,
  type CanvasPanInput,
}
