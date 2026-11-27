"use client"

// The Canvas's adapter to React Flow 13. It hands React Flow the graph and
// the interaction settings for the mode, turns React Flow's changes,
// connections and menus into calls on the controller, snaps a dragged node
// to its neighbours, and registers the engine port (fit, zoom, focus) the
// controller and the controls use. React Flow's own look is never used: its
// structural stylesheet sits in the `base` layer (the item's css) and every
// colour comes from the `--xy-*` variables the style map sets.
import * as React from "react"
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  SelectionMode,
  useNode,
  useReactFlow,
  useViewport,
  ViewportPortal,
  type Edge,
  type EdgeChangeset,
  type EdgeProps,
  type EdgeTypes,
  type FinalConnectionState,
  type NodeChangeset,
  type NodeProps,
  type NodeTypes,
  type ReactFlowProps,
} from "@xyflow/react"
import { cn } from "cn"

import { type CanvasApi } from "@/registry/bases/__base__/hooks/use-canvas"
import {
  getSnap,
  type CanvasGuide,
} from "@/registry/bases/__base__/lib/canvas-guides"
import {
  getAbsolutePosition,
  getNodeSize,
  indexNodes,
  type CanvasConnection,
  type CanvasData,
  type CanvasEdge as CanvasEdgeRecord,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasPosition,
  type CanvasViewport,
} from "@/registry/bases/__base__/lib/canvas-model"
import {
  getLevelOfDetail,
  getMotionDuration,
  getNextZoom,
  getViewportToReveal,
  type CanvasFitOptions,
  type CanvasLevelOfDetail,
  type CanvasPadding,
  type CanvasPaddingValue,
} from "@/registry/bases/__base__/lib/canvas-viewport"
import {
  CanvasNodeContext,
  useCanvas,
  useCanvasContext,
  type CanvasMode,
  type CanvasNodeState,
} from "@/registry/bases/__base__/ui/canvas-context"
import {
  CanvasConnectionLine,
  CanvasEdge,
  CanvasEdgeContext,
  CanvasEdgeMarkers,
} from "@/registry/bases/__base__/ui/canvas-edge"
import {
  CANVAS_NODE_TYPES,
  type CanvasNodeComponent,
} from "@/registry/bases/__base__/ui/canvas-node"

// The Canvas's own node and edge types are structural subsets of React
// Flow's, so React Flow is handed them as they are.
type CanvasEngineNode = CanvasNode

type CanvasEdgeComponent = React.FunctionComponent<EdgeProps>

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

const CanvasNodeMetaContext = React.createContext<CanvasNodeMeta>({
  pending: new Set(),
  names: new Map(),
  descriptions: new Map(),
})

// One wrapper per node component, kept for the component's life: React Flow
// remounts every node when a type's component changes identity.
const nodeRenderers = new WeakMap<
  CanvasNodeComponent,
  React.FunctionComponent<NodeProps>
>()

function getNodeRenderer(Component: CanvasNodeComponent) {
  const cached = nodeRenderers.get(Component)
  if (cached) return cached
  function CanvasNodeRenderer(props: NodeProps) {
    // Status, colour and validity are the Canvas's fields, read off the node.
    const node = useNode<CanvasEngineNode>(props.id)
    const meta = React.useContext(CanvasNodeMetaContext)
    const status = node?.status
    const color = node?.color
    const invalid = node?.invalid
    const state = React.useMemo<CanvasNodeState>(
      () => ({
        id: props.id,
        name: meta.names.get(props.id) ?? props.id,
        description: meta.descriptions.get(props.id) ?? "",
        status,
        color,
        invalid,
        isSelected: props.selected,
        isDragging: props.dragging,
        isPending: meta.pending.has(props.id),
        isConnectable: props.isConnectable,
      }),
      [
        color,
        invalid,
        meta,
        props.dragging,
        props.id,
        props.isConnectable,
        props.selected,
        status,
      ]
    )
    return (
      <CanvasNodeContext.Provider value={state}>
        <Component
          id={props.id}
          type={props.type}
          data={props.data}
          selected={props.selected}
          dragging={props.dragging}
          isConnectable={props.isConnectable}
          status={status}
          invalid={invalid}
          width={props.width}
          height={props.height}
        />
      </CanvasNodeContext.Provider>
    )
  }
  const renderer = React.memo(CanvasNodeRenderer)
  nodeRenderers.set(Component, renderer)
  return renderer
}

const EDGE_TYPES: Record<string, CanvasEdgeComponent> = {
  default: CanvasEdge,
  bezier: CanvasEdge,
  smoothstep: CanvasEdge,
  step: CanvasEdge,
  straight: CanvasEdge,
}

// React Flow takes these as class props; the object form lets the style
// build find and replace the placeholders.
const backgroundPatternClass = {
  className: cn("cn-canvas-background-pattern"),
}.className
const minimapNodeClass = { className: cn("cn-canvas-minimap-node") }.className

const BACKGROUNDS = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
} as const

// The Canvas's numbers are shares of the frame; React Flow 13 reads numbers
// as pixels, so shares go over as percentages.
function toEnginePaddingValue(
  value: CanvasPaddingValue | undefined
): `${number}%` | `${number}px` | undefined {
  if (value === undefined) return undefined
  return typeof value === "number" ? `${value * 100}%` : value
}

function toEnginePadding(padding: CanvasPadding | undefined) {
  if (padding === undefined) return "8%" as const
  if (typeof padding !== "object") return toEnginePaddingValue(padding)
  return {
    top: toEnginePaddingValue(padding.top),
    right: toEnginePaddingValue(padding.right),
    bottom: toEnginePaddingValue(padding.bottom),
    left: toEnginePaddingValue(padding.left),
  }
}

function readMotion(element: Element | null, role: "move" | "popup") {
  if (!element) return 0
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0
  const style = getComputedStyle(element)
  return getMotionDuration(
    style.getPropertyValue(`--motion-${role}`),
    style.getPropertyValue("--motion-scale")
  )
}

function isSameGuides(a: CanvasGuide[], b: CanvasGuide[]) {
  return (
    a.length === b.length &&
    a.every(
      (guide, index) =>
        guide.orientation === b[index].orientation &&
        guide.position === b[index].position &&
        guide.from === b[index].from &&
        guide.to === b[index].to
    )
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
  edgeTypes?: Record<string, CanvasEdgeComponent>
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
  /** Passed to React Flow as is; web only. */
  reactFlow?: Partial<ReactFlowProps<CanvasEngineNode, CanvasEdgeRecord>>
  children?: React.ReactNode
}

function CanvasEngine({
  canvasId,
  nodes,
  edges,
  api,
  mode,
  panOn,
  isEditable,
  isDisabled,
  nodeTypes,
  edgeTypes,
  background,
  gridSize,
  snapToGrid,
  guides: hasGuides,
  fitView,
  minZoom,
  maxZoom,
  viewport,
  defaultViewport,
  onViewportChange,
  onViewportChangeEnd,
  meta,
  pending,
  onConnectToPane,
  onEdgeInsert,
  onMenu,
  onLevelOfDetail,
  reactFlow,
  children,
}: CanvasEngineProps) {
  const [guides, setGuides] = React.useState<CanvasGuide[]>([])
  const [isActive, setActive] = React.useState(false)
  const levelRef = React.useRef<CanvasLevelOfDetail>("full")

  const resolvedNodeTypes = React.useMemo<NodeTypes>(() => {
    const merged = { ...CANVAS_NODE_TYPES, ...nodeTypes }
    return Object.fromEntries(
      Object.entries(merged).map(([type, component]) => [
        type,
        getNodeRenderer(component),
      ])
    )
  }, [nodeTypes])

  const resolvedEdgeTypes = React.useMemo<EdgeTypes>(
    () => ({ ...EDGE_TYPES, ...edgeTypes }),
    [edgeTypes]
  )

  // The latest props, for callbacks that keep one identity.
  const latest = React.useRef({ hasGuides, gridSize, onConnectToPane, onMenu })
  React.useLayoutEffect(() => {
    latest.current = { hasGuides, gridSize, onConnectToPane, onMenu }
  })

  const onNodesChange = React.useCallback(
    (changeset: NodeChangeset<CanvasNode>) => {
      const changes: CanvasNodeChange<CanvasNode>[] = changeset.toArray()
      const moving = changes.filter(
        (change) => change.type === "position" && change.dragging
      )
      if (!latest.current.hasGuides || moving.length !== 1) {
        if (
          changes.some(
            (change) => change.type === "position" && change.dragging === false
          )
        )
          setGuides([])
        api.applyNodeChanges(changes)
        return
      }
      const change = moving[0]
      if (change.type !== "position" || !change.position) {
        api.applyNodeChanges(changes)
        return
      }
      const all = api.getNodes()
      const byId = indexNodes(all)
      const node = byId.get(change.id)
      if (!node) {
        api.applyNodeChanges(changes)
        return
      }
      const parent = node.parentId ? byId.get(node.parentId) : undefined
      const origin = parent ? getAbsolutePosition(parent, byId) : { x: 0, y: 0 }
      const size = getNodeSize(node)
      const others = all
        .filter(
          (other) =>
            other.id !== node.id && other.parentId !== node.id && !other.hidden
        )
        .map((other) => ({
          ...getAbsolutePosition(other, byId),
          ...getNodeSize(other),
        }))
      const snap = getSnap(
        {
          x: change.position.x + origin.x,
          y: change.position.y + origin.y,
          ...size,
        },
        others,
        { grid: latest.current.gridSize, threshold: 6 }
      )
      setGuides((current) =>
        isSameGuides(current, snap.guides) ? current : snap.guides
      )
      api.applyNodeChanges(
        changes.map((item) =>
          item === change
            ? {
                ...change,
                position: {
                  x: snap.position.x - origin.x,
                  y: snap.position.y - origin.y,
                },
              }
            : item
        )
      )
    },
    [api]
  )

  const onEdgesChange = React.useCallback(
    (changeset: EdgeChangeset<CanvasEdgeRecord>) => {
      api.applyEdgeChanges(changeset.toArray())
    },
    [api]
  )

  const toConnection = React.useCallback(
    (value: {
      source: string
      target: string
      sourceHandle?: string | null
      targetHandle?: string | null
    }): CanvasConnection => ({
      source: value.source,
      target: value.target,
      sourceHandle: value.sourceHandle ?? null,
      targetHandle: value.targetHandle ?? null,
    }),
    []
  )

  const onConnect = React.useCallback(
    (connection: CanvasConnection) => {
      api.connect(toConnection(connection))
    },
    [api, toConnection]
  )

  const isValidConnection = React.useCallback(
    (value: CanvasConnection | Edge) =>
      api.validate(toConnection(value)).isValid,
    [api, toConnection]
  )

  const onReconnect = React.useCallback(
    (edge: CanvasEdgeRecord, connection: CanvasConnection) => {
      const next = toConnection(connection)
      api.applyEdgeChanges([{ id: edge.id, type: "update", item: { ...next } }])
    },
    [api, toConnection]
  )

  // A connection dropped on a node's body takes its first free compatible
  // handle; dropped on the pane, it asks the app what to create there.
  const onConnectEnd = React.useCallback(
    (_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromHandle || !state.fromNode) return
      const fromKind = state.fromHandle.type
      const fromId = state.fromHandle.id ?? null
      if (state.toNode && !state.toHandle && fromKind === "source") {
        const spec = api
          .getHandles(state.fromNode.id)
          .find((handle) => handle.kind === "source" && handle.id === fromId)
        const target = spec
          ? api
              .getTargets(spec)
              .find((handle) => handle.nodeId === state.toNode?.id)
          : undefined
        if (target) {
          api.connect({
            source: state.fromNode.id,
            sourceHandle: fromId,
            target: target.nodeId,
            targetHandle: target.id,
          })
        }
        return
      }
      if (!state.toNode && state.to) {
        latest.current.onConnectToPane?.({
          position: state.to,
          source: {
            nodeId: state.fromNode.id,
            handleId: fromId,
            kind: fromKind,
          },
        })
      }
    },
    [api]
  )

  const openMenu = React.useCallback(
    (
      event: React.MouseEvent | MouseEvent,
      target: (point: CanvasPosition) => CanvasMenuTarget
    ) => {
      event.preventDefault()
      latest.current.onMenu(target({ x: event.clientX, y: event.clientY }))
    },
    []
  )

  const onPaneContextMenu = React.useCallback(
    (event: React.MouseEvent | MouseEvent) =>
      openMenu(event, (point) => ({
        kind: "pane",
        point,
        at: api.screenToCanvas(point),
      })),
    [api, openMenu]
  )

  const onNodeContextMenu = React.useCallback(
    (event: React.MouseEvent, node: CanvasEngineNode) => {
      if (!node.selected) api.select({ nodeIds: [node.id] })
      openMenu(event, (point) => ({ kind: "node", point, id: node.id }))
    },
    [api, openMenu]
  )

  const onEdgeContextMenu = React.useCallback(
    (event: React.MouseEvent, edge: CanvasEdgeRecord) => {
      if (!edge.selected) api.select({ edgeIds: [edge.id] })
      openMenu(event, (point) => ({ kind: "edge", point, id: edge.id }))
    },
    [api, openMenu]
  )

  const onSelectionContextMenu = React.useCallback(
    (event: React.MouseEvent) =>
      openMenu(event, (point) => ({ kind: "selection", point })),
    [openMenu]
  )

  const onMove = React.useCallback(
    (_event: MouseEvent | TouchEvent | null, next: CanvasViewport) => {
      const level = getLevelOfDetail(next.zoom)
      if (level !== levelRef.current) {
        levelRef.current = level
        onLevelOfDetail(level)
      }
      onViewportChange?.(next)
    },
    [onLevelOfDetail, onViewportChange]
  )

  const onMoveEnd = React.useCallback(
    (_event: MouseEvent | TouchEvent | null, next: CanvasViewport) => {
      onViewportChangeEnd?.(next)
    },
    [onViewportChangeEnd]
  )

  const isStatic = mode === "static"
  const isView = mode === "view"
  const isScrollPan = mode === "edit" && panOn === "scroll"
  // In view mode the page scrolls past the canvas until it's clicked or
  // focused; then the wheel zooms it.
  const capturesWheel = mode === "edit" || (isView && isActive)

  const fitViewOptions = React.useMemo(() => {
    const options = typeof fitView === "object" ? fitView : {}
    // Fitting never zooms a small graph past 100%: it would read as zoomed in.
    return {
      maxZoom: 1,
      ...options,
      padding: toEnginePadding(options.padding),
    }
  }, [fitView])

  const edgeContext = React.useMemo(
    () => ({ pending, canvasId, onInsert: onEdgeInsert }),
    [canvasId, onEdgeInsert, pending]
  )

  return (
    <CanvasNodeMetaContext.Provider value={meta}>
      <CanvasEdgeContext.Provider value={edgeContext}>
        <ReactFlow<CanvasEngineNode, CanvasEdgeRecord>
          id={canvasId}
          nodes={nodes}
          edges={edges}
          nodeTypes={resolvedNodeTypes}
          edgeTypes={resolvedEdgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onReconnect={onReconnect}
          isValidConnection={isValidConnection}
          connectionLineComponent={CanvasConnectionLine}
          connectionRadius={24}
          onPaneContextMenu={isStatic ? undefined : onPaneContextMenu}
          onNodeContextMenu={isStatic ? undefined : onNodeContextMenu}
          onEdgeContextMenu={isStatic ? undefined : onEdgeContextMenu}
          onSelectionContextMenu={isStatic ? undefined : onSelectionContextMenu}
          onMove={onMove}
          onMoveEnd={onMoveEnd}
          viewport={viewport}
          defaultViewport={defaultViewport}
          minZoom={minZoom}
          maxZoom={maxZoom}
          fitView={fitView !== false}
          fitViewOptions={fitViewOptions}
          // Edits
          nodesDraggable={isEditable}
          nodesConnectable={isEditable}
          edgesReconnectable={isEditable}
          elementsSelectable={!isStatic && !isDisabled}
          snapToGrid={snapToGrid && !hasGuides}
          snapGrid={[gridSize, gridSize]}
          // Panning and zooming, per mode (plan §8.1)
          panOnScroll={isScrollPan}
          zoomOnScroll={!isStatic && !isScrollPan && capturesWheel}
          zoomOnPinch={!isStatic}
          zoomOnDoubleClick={!isStatic && !isEditable}
          panOnDrag={isStatic ? false : isScrollPan ? [1] : true}
          selectionOnDrag={isScrollPan}
          selectionMode={SelectionMode.Partial}
          preventScrolling={capturesWheel}
          multiSelectionKeyCode={["Meta", "Control", "Shift"]}
          // The Canvas owns the keyboard (canvas-keyboard).
          deleteKeyCode={null}
          disableKeyboardA11y
          nodesFocusable={false}
          edgesFocusable={false}
          elevateNodesOnSelect
          autoPanOnConnect
          autoPanOnNodeDrag
          onlyRenderVisibleElements={nodes.length > 300}
          proOptions={{ hideAttribution: true }}
          onFocus={() => setActive(true)}
          onPointerDown={() => setActive(true)}
          onPointerLeave={() => setActive(false)}
          data-slot="canvas-engine"
          className="cn-canvas-engine"
          {...reactFlow}
        >
          <CanvasEdgeMarkers canvasId={canvasId} />
          {background !== "none" && (
            <Background
              id={`${canvasId}-grid`}
              variant={BACKGROUNDS[background]}
              gap={gridSize}
              size={background === "cross" ? 6 : 1}
              className="cn-canvas-background"
              patternClassName={backgroundPatternClass}
            />
          )}
          <CanvasGuides guides={guides} />
          <CanvasEngineBridge
            api={api}
            minZoom={minZoom}
            maxZoom={maxZoom}
            isStatic={isStatic}
          />
          {children}
        </ReactFlow>
      </CanvasEdgeContext.Provider>
    </CanvasNodeMetaContext.Provider>
  )
}

/** The lines a dragged node snapped to. */
function CanvasGuides({ guides }: { guides: CanvasGuide[] }) {
  if (guides.length === 0) return null
  return (
    <ViewportPortal>
      {guides.map((guide) => (
        <div
          key={`${guide.orientation}-${guide.position}`}
          data-slot="canvas-guide"
          data-orientation={guide.orientation}
          className="cn-canvas-guide pointer-events-none absolute top-0 left-0"
          style={
            guide.orientation === "vertical"
              ? {
                  transform: `translate(${guide.position}px, ${guide.from}px)`,
                  height: guide.to - guide.from,
                }
              : {
                  transform: `translate(${guide.from}px, ${guide.position}px)`,
                  width: guide.to - guide.from,
                }
          }
        />
      ))}
    </ViewportPortal>
  )
}

// Registers what only React Flow can do with the controller, and refits a
// static canvas whenever its frame changes size.
function CanvasEngineBridge({
  api,
  minZoom,
  maxZoom,
  isStatic,
}: {
  api: CanvasApi<CanvasNode, CanvasData>
  minZoom: number
  maxZoom: number
  isStatic: boolean
}) {
  const flow = useReactFlow<CanvasEngineNode, CanvasEdgeRecord>()
  const markerRef = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const frame = () =>
      markerRef.current?.closest<HTMLElement>("[data-slot=canvas]") ?? null
    const duration = () => readMotion(frame(), "move")
    const getSize = () => {
      const rect = frame()?.getBoundingClientRect()
      return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
    }
    api.registerEngine({
      fitView: (options) => {
        void flow.fitView({
          padding: toEnginePadding(options?.padding),
          minZoom: options?.minZoom,
          maxZoom: options?.maxZoom ?? 1,
          duration: duration(),
          nodes: options?.nodeIds?.map((id) => ({ id })),
        })
      },
      zoomIn: () =>
        void flow.zoomTo(getNextZoom(flow.getZoom(), "in", minZoom, maxZoom), {
          duration: duration(),
        }),
      zoomOut: () =>
        void flow.zoomTo(getNextZoom(flow.getZoom(), "out", minZoom, maxZoom), {
          duration: duration(),
        }),
      zoomTo: (zoom) => void flow.zoomTo(zoom, { duration: duration() }),
      setViewport: (next, options) =>
        void flow.setViewport(next, {
          duration: options?.animate === false ? 0 : duration(),
        }),
      getViewport: () => flow.getViewport(),
      getSize,
      screenToCanvas: (point) => flow.screenToFlowPosition(point),
      focusNode: (id) => {
        const bounds = api.getNodeBounds(id)
        if (bounds) {
          const next = getViewportToReveal(
            bounds,
            flow.getViewport(),
            getSize()
          )
          void flow.setViewport(next, { duration: duration() })
        }
        // A node outside the view may not be mounted yet (culling).
        requestAnimationFrame(() => {
          const element = frame()?.querySelector<HTMLElement>(
            `[data-slot=canvas-node][data-node-id="${CSS.escape(id)}"]`
          )
          element?.focus({ preventScroll: true })
        })
      },
    })
    return () => api.registerEngine(null)
  }, [api, flow, maxZoom, minZoom])

  React.useEffect(() => {
    if (!isStatic) return
    const element = markerRef.current?.closest("[data-slot=canvas]")
    if (!element) return
    const observer = new ResizeObserver(() => {
      void flow.fitView({ padding: "8%", maxZoom: 1 })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [flow, isStatic])

  return <span ref={markerRef} hidden />
}

/** The current pan and zoom; re-renders on every move. */
function useCanvasViewport(): CanvasViewport {
  return useViewport()
}

/** A map of the whole canvas; drag or scroll it to move the view. */
function CanvasMinimap({ className }: { className?: string }) {
  const { labels, mode } = useCanvasContext("CanvasMinimap")
  const isEmpty = useCanvas().nodes.length === 0
  if (isEmpty) return null
  return (
    <MiniMap<CanvasEngineNode>
      data-slot="canvas-minimap"
      ariaLabel={labels.minimap}
      pannable={mode !== "static"}
      zoomable={mode !== "static"}
      position="bottom-right"
      nodeBorderRadius={4}
      nodeClassName={minimapNodeClass}
      className={cn("cn-canvas-minimap", className)}
    />
  )
}

export {
  CanvasEngine,
  CanvasMinimap,
  useCanvasViewport,
  type CanvasEdgeComponent,
  type CanvasEngineNode,
  type CanvasMenuTarget,
  type CanvasNodeMeta,
  type CanvasPanInput,
}
