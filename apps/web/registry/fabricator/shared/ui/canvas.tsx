"use client"

// Canvas: an infinite, zoomable surface of nodes and connections for
// workflow editors, diagrams, flowcharts, mind maps and read-only graphs.
// React Flow draws it on the web (canvas-engine.tsx); the look, the
// keyboard, undo, the clipboard, connection rules and every state are the
// Canvas's own, from a model React Native shares.
//
// The frame is a labelled region. Nodes are groups named by their titles;
// arrow keys move between them by position, Alt with an arrow moves the
// selection, C connects the focused node and ⌘K finds one. A polite live
// region reads out connections, deletions, undo and redo.
import * as React from "react"
import { cn } from "cn"

import {
  CanvasCommandDialog,
  useCanvasToast,
  type CanvasCommandGroup,
  type CanvasNoticeMessage,
} from "@/registry/bases/__base__/components/canvas-commands"
import {
  ControlMenu,
  ControlTooltip,
  type ControlMenuGroup,
} from "@/registry/bases/__base__/components/property-controls"
import {
  createCanvasClipboardPort,
  useCanvasController,
  type CanvasAnnouncement,
  type CanvasApi,
  type CanvasClipboardPort,
  type CanvasDeleteEvent,
  type CanvasNotice,
} from "@/registry/bases/__base__/hooks/use-canvas"
import {
  getCanvasKeyAction,
  getNearestInDirection,
  getNudge,
  isTypingTarget,
} from "@/registry/bases/__base__/lib/canvas-keyboard"
import { type CanvasLayoutEngine } from "@/registry/bases/__base__/lib/canvas-layout"
import {
  getConnectedPorts,
  getNodeRect,
  getReadingOrder,
  indexNodes,
  type CanvasConnection,
  type CanvasData,
  type CanvasEdge,
  type CanvasEdgeChange,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasNodeStatus as CanvasNodeState,
  type CanvasPosition,
  type CanvasViewport,
} from "@/registry/bases/__base__/lib/canvas-model"
import { type CanvasConnectionRule } from "@/registry/bases/__base__/lib/canvas-validation"
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  type CanvasFitOptions,
  type CanvasLevelOfDetail,
} from "@/registry/bases/__base__/lib/canvas-viewport"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  CANVAS_LABELS,
  CanvasContext,
  CanvasStateContext,
  getNodeName,
  useCanvas,
  useCanvasContext,
  useCanvasNode,
  type CanvasContextValue,
  type CanvasLabels,
  type CanvasLibraryEntry,
  type CanvasMode,
} from "@/registry/bases/__base__/ui/canvas-context"
import {
  CanvasConnectionLine,
  CanvasEdgeLabel,
  CanvasEdge as CanvasEdgeView,
} from "@/registry/bases/__base__/ui/canvas-edge"
import {
  CanvasEngine,
  CanvasMinimap,
  useCanvasViewport,
  type CanvasEdgeComponent,
  type CanvasMenuTarget,
  type CanvasPanInput,
} from "@/registry/bases/__base__/ui/canvas-engine"
import {
  CANVAS_NODE_TYPES,
  CanvasDefaultNode,
  CanvasGroupNode,
  CanvasHandle,
  CanvasNodeContent,
  CanvasNodeDescription,
  CanvasNodeFooter,
  CanvasNode as CanvasNodeFrame,
  CanvasNodeHeader,
  CanvasNodeIcon,
  CanvasNodeResizer,
  CanvasNodeStatus,
  CanvasNodeTitle,
  CanvasNodeToolbar,
  CanvasNoteNode,
  CanvasPlaceholderNode,
  type CanvasHandleProps,
  type CanvasNodeComponent,
  type CanvasNodeProps,
} from "@/registry/bases/__base__/ui/canvas-node"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type CanvasLibraryItem = CanvasLibraryEntry

type CanvasProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "defaultValue" | "onSelect"
> & {
  nodes?: CanvasNode[]
  defaultNodes?: CanvasNode[]
  edges?: CanvasEdge[]
  defaultEdges?: CanvasEdge[]
  // Callbacks are written as methods so handlers typed for a project's own
  // nodes fit, the way React's event handler types do.
  /** Every node change; apply them with `applyCanvasNodeChanges`. */
  onNodesChange?(changes: CanvasNodeChange[]): void
  onEdgesChange?(changes: CanvasEdgeChange[]): void
  /** A connection was made; a rejected promise removes it again. */
  onConnect?(
    connection: CanvasConnection,
    edge: CanvasEdge
  ): void | Promise<void>
  /** Nodes and connections were deleted; a rejected promise puts them back. */
  onDelete?(
    event: CanvasDeleteEvent<CanvasNode, CanvasEdge>
  ): void | Promise<void>
  /** A connection dropped on empty canvas: create a node there, already connected. */
  onConnectToPane?(event: {
    position: CanvasPosition
    source: {
      nodeId: string
      handleId: string | null
      kind: "source" | "target"
    }
  }): void
  /** Shows a + on edges that inserts a node there. */
  onEdgeInsert?(edgeId: string, position: CanvasPosition): void
  /** Double click, Enter or Open in a node's menu. */
  onNodeOpen?(node: CanvasNode): void
  onSelectionChange?(selection: {
    nodes: CanvasNode[]
    edges: CanvasEdge[]
  }): void
  /** A project rule on top of handle types and limits: true, or why not. */
  validateConnection?: CanvasConnectionRule
  allowCycles?: boolean
  allowSelfLoops?: boolean
  /** Fields every new connection starts with, such as its `type`. */
  edgeDefaults?: Partial<CanvasEdge>
  nodeTypes?: Record<string, CanvasNodeComponent>
  /** Web only: React Flow edge components for edges of your own types. */
  edgeTypes?: Record<string, CanvasEdgeComponent>
  /** `edit` changes the graph; `view` pans, zooms and selects; `static` is a picture. */
  mode?: CanvasMode
  /** In edit mode: scroll pans like a design tool, or drag pans like a map. */
  panOn?: CanvasPanInput
  background?: "dots" | "lines" | "cross" | "none"
  gridSize?: number
  snapToGrid?: boolean
  /** Snap a dragged node to the edges and centres of its neighbours. */
  guides?: boolean
  fitView?: boolean | CanvasFitOptions
  minZoom?: number
  maxZoom?: number
  viewport?: CanvasViewport
  defaultViewport?: CanvasViewport
  onViewportChange?(viewport: CanvasViewport): void
  /** Once a pan or zoom settles, for saving the view. */
  onViewportChangeEnd?(viewport: CanvasViewport): void
  /** Arranges the graph from the menus; install `canvas-layout` for dagre. */
  layout?: CanvasLayoutEngine
  /** Kinds of node the library and the pane menu add. */
  library?: readonly CanvasLibraryItem[]
  history?: boolean | { limit: number }
  /** New ids for pasted, duplicated and grouped elements. */
  createId?(): string
  /** The system clipboard; `canvasClipboard` reads and writes the browser's. */
  clipboard?: CanvasClipboardPort<CanvasNode, CanvasEdge>
  loading?: boolean
  /** A load failure: its message shows with Retry. */
  error?: React.ReactNode
  onRetry?(): void
  disabled?: boolean
  /** Names the canvas for screen readers. */
  label?: string
  labels?: Partial<CanvasLabels>
  /** Compact nodes and controls for dense graphs. */
  size?: "sm" | "default"
  /** Web only: props passed to React Flow as they are. */
  reactFlow?: React.ComponentProps<typeof CanvasEngine>["reactFlow"]
}

let groupCount = 0
function createFallbackId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID()
  groupCount += 1
  return `canvas-${groupCount}`
}

const isMacPlatform = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** The browser's clipboard, for canvases of the default node and edge types. */
const canvasClipboard = createCanvasClipboardPort<CanvasNode, CanvasEdge>(
  (clipboard) => clipboard
)

function getAnnouncementText(
  announcement: CanvasAnnouncement,
  labels: CanvasLabels,
  names: ReadonlyMap<string, string>
) {
  switch (announcement.kind) {
    case "connected":
      return labels.connected({
        source: names.get(announcement.source) ?? announcement.source,
        target: names.get(announcement.target) ?? announcement.target,
      })
    case "deleted":
      return labels.deleted(announcement)
    case "undone":
      return labels.undone
    case "redone":
      return labels.redone
  }
}

function getNoticeMessage(
  notice: CanvasNotice,
  labels: CanvasLabels
): CanvasNoticeMessage {
  const message =
    notice.kind === "connect-failed"
      ? labels.connectFailed
      : notice.kind === "delete-failed"
        ? labels.deleteFailed
        : labels.changeFailed
  return {
    id: notice.id,
    message,
    description:
      notice.error instanceof Error ? notice.error.message : undefined,
    action: notice.retry
      ? { label: labels.retry, run: notice.retry }
      : undefined,
  }
}

function Canvas({
  nodes,
  defaultNodes,
  edges,
  defaultEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDelete,
  onConnectToPane,
  onEdgeInsert,
  onNodeOpen,
  onSelectionChange,
  validateConnection,
  allowCycles,
  allowSelfLoops,
  edgeDefaults,
  nodeTypes,
  edgeTypes,
  mode = "edit",
  panOn = "scroll",
  background = "dots",
  gridSize = 20,
  snapToGrid = false,
  guides = true,
  fitView = true,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  viewport,
  defaultViewport,
  onViewportChange,
  onViewportChangeEnd,
  layout,
  library,
  history,
  createId,
  clipboard,
  loading = false,
  error,
  onRetry,
  disabled = false,
  label,
  labels: labelOverrides,
  size = "default",
  reactFlow,
  className,
  children,
  onKeyDown,
  ...props
}: CanvasProps) {
  const controller = useCanvasController<CanvasNode, CanvasData>({
    nodes,
    defaultNodes,
    edges,
    defaultEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
    validateConnection,
    allowCycles,
    allowSelfLoops,
    edgeDefaults,
    history,
    createId,
    clipboard,
  })
  const { api } = controller
  const labels = React.useMemo(
    () => ({ ...CANVAS_LABELS, ...labelOverrides }),
    [labelOverrides]
  )
  const rawId = React.useId()
  const canvasId = `canvas-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [isLocked, setLocked] = React.useState(false)
  const [level, setLevel] = React.useState<CanvasLevelOfDetail>("full")
  const [menu, setMenu] = React.useState<CanvasMenuTarget | null>(null)
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  const [connectFrom, setConnectFrom] = React.useState<string | null>(null)
  const isEditable = mode === "edit" && !isLocked && !disabled && !loading

  // Latest props for callbacks that keep their identity.
  const latest = React.useRef({
    onNodeOpen,
    onSelectionChange,
    library,
    layout,
  })
  React.useLayoutEffect(() => {
    latest.current = { onNodeOpen, onSelectionChange, library, layout }
  })

  // Names change rarely and positions often: the maps below are built from
  // a key of names and states, so a drag doesn't re-render every node.
  const namesKey = controller.nodes
    .map((node) =>
      [node.id, getNodeName(node), node.status ?? "", node.invalid ?? ""].join(
        "\u0000"
      )
    )
    .join("\u0001")
  const meta = React.useMemo(() => {
    const entries = namesKey
      ? namesKey.split("\u0001").map((entry) => entry.split("\u0000"))
      : []
    const names = new Map(entries.map(([id, name]) => [id, name]))
    const incoming = new Map<string, string[]>()
    const outgoing = new Map<string, string[]>()
    for (const edge of controller.edges) {
      const source = names.get(edge.source)
      const target = names.get(edge.target)
      if (source === undefined || target === undefined) continue
      incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), source])
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), target])
    }
    const descriptions = new Map<string, string>()
    for (const [id, , status, invalid] of entries) {
      descriptions.set(
        id,
        [
          labels.connections({
            incoming: incoming.get(id) ?? [],
            outgoing: outgoing.get(id) ?? [],
          }),
          isNodeStatus(status) && status !== "idle"
            ? labels.status[status]
            : null,
          invalid || null,
        ]
          .filter(Boolean)
          .join(" ")
      )
    }
    return {
      names,
      descriptions,
      pending: controller.pending,
      connected: getConnectedPorts(controller.edges),
    }
  }, [namesKey, controller.edges, controller.pending, labels])

  const openNode = React.useCallback(
    (id: string) => {
      const node = api.getNodes().find((item) => item.id === id)
      if (node) latest.current.onNodeOpen?.(node)
    },
    [api]
  )

  const openConnect = React.useCallback((nodeId: string) => {
    setConnectFrom(nodeId)
  }, [])

  const openSearch = React.useCallback(() => setSearchOpen(true), [])

  const addFromLibrary = React.useCallback(
    (item: CanvasLibraryItem, at?: CanvasPosition) => {
      const frame = rootRef.current?.getBoundingClientRect()
      const position =
        at ??
        api.screenToCanvas({
          x: (frame?.left ?? 0) + (frame?.width ?? 0) / 2,
          y: (frame?.top ?? 0) + (frame?.height ?? 0) / 2,
        })
      const node = item.create(position)
      api.addNodes([node])
      requestAnimationFrame(() => api.focusNode(node.id))
    },
    [api]
  )

  const context = React.useMemo<CanvasContextValue>(
    () => ({
      api,
      mode,
      labels,
      isEditable,
      isLocked,
      setLocked,
      gridSize,
      openNode,
      openConnect,
      openSearch,
      addLibraryItem: addFromLibrary,
    }),
    [
      addFromLibrary,
      api,
      gridSize,
      isEditable,
      isLocked,
      labels,
      mode,
      openConnect,
      openNode,
      openSearch,
    ]
  )

  // Selection changes reach the owner once per change.
  const selectionKey = `${controller.selection.nodeIds.join(",")}|${controller.selection.edgeIds.join(",")}`
  React.useEffect(() => {
    const nodeIds = new Set(
      selectionKey.split("|")[0].split(",").filter(Boolean)
    )
    const edgeIds = new Set(
      selectionKey.split("|")[1].split(",").filter(Boolean)
    )
    latest.current.onSelectionChange?.({
      nodes: api.getNodes().filter(({ id }) => nodeIds.has(id)),
      edges: api.getEdges().filter(({ id }) => edgeIds.has(id)),
    })
  }, [api, selectionKey])

  const noticeMessage = React.useMemo(
    () =>
      controller.notice ? getNoticeMessage(controller.notice, labels) : null,
    [controller.notice, labels]
  )
  useCanvasToast(noticeMessage)

  const createGroup = React.useCallback(
    (): CanvasNode => ({
      id: (createId ?? createFallbackId)(),
      type: "group",
      position: { x: 0, y: 0 },
      data: { label: labels.group },
    }),
    [createId, labels.group]
  )

  const getFocusedNodeId = () => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    if (!rootRef.current?.contains(active)) return null
    return (
      active
        .closest<HTMLElement>("[data-slot=canvas-node]")
        ?.getAttribute("data-node-id") ?? null
    )
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || mode === "static" || disabled) return
    if (event.target instanceof HTMLElement && isTypingTarget(event.target))
      return
    const action = getCanvasKeyAction(event, { isMac: isMacPlatform() })
    if (!action) return
    const focused = getFocusedNodeId()
    const selected = controller.selection.nodeIds
    const run = () => {
      switch (action.type) {
        case "focus": {
          const all = api.getNodes()
          const byId = indexNodes(all)
          const from = focused ? byId.get(focused) : undefined
          if (!from) {
            const first = getReadingOrder(all)[0]
            if (first) api.focusNode(first.id)
            return true
          }
          const target = getNearestInDirection(
            getNodeRect(from, byId),
            all
              .filter((node) => node.id !== from.id && !node.hidden)
              .map((node) => ({ id: node.id, rect: getNodeRect(node, byId) })),
            action.direction
          )
          if (target) api.focusNode(target)
          return true
        }
        case "move": {
          if (!isEditable) return false
          const ids = selected.length > 0 ? selected : focused ? [focused] : []
          if (ids.length === 0) return false
          api.moveNodes(
            ids,
            getNudge(
              action.direction,
              action.isLarge,
              snapToGrid ? gridSize : 0
            ),
            `nudge:${ids.join(",")}`
          )
          return true
        }
        case "open":
          if (!focused) return false
          openNode(focused)
          return true
        case "toggle-select": {
          if (!focused) return false
          const isSelected = selected.includes(focused)
          api.select({
            nodeIds: isSelected
              ? selected.filter((id) => id !== focused)
              : [...selected, focused],
            edgeIds: controller.selection.edgeIds,
          })
          return true
        }
        case "connect":
          if (!isEditable || !focused) return false
          setConnectFrom(focused)
          return true
        case "delete":
          if (!isEditable) return false
          api.deleteSelection()
          return true
        case "select-all":
          api.selectAll()
          return true
        case "copy":
          void api.copy()
          return true
        case "cut":
          if (!isEditable) return false
          void api.cut()
          return true
        case "paste":
          if (!isEditable) return false
          void api.paste()
          return true
        case "duplicate":
          if (!isEditable) return false
          api.duplicate()
          return true
        case "undo":
          if (!isEditable) return false
          api.undo()
          return true
        case "redo":
          if (!isEditable) return false
          api.redo()
          return true
        case "group":
          if (!isEditable || selected.length === 0) return false
          api.group(createGroup())
          return true
        case "ungroup": {
          if (!isEditable) return false
          const groups = api
            .getNodes()
            .filter((node) => node.selected && node.type === "group")
          for (const group of groups) api.ungroup(group.id)
          return groups.length > 0
        }
        case "zoom-in":
          api.zoomIn()
          return true
        case "zoom-out":
          api.zoomOut()
          return true
        case "zoom-reset":
          api.zoomTo(1)
          return true
        case "fit-view":
          api.fitView()
          return true
        case "search":
          setSearchOpen(true)
          return true
        case "menu": {
          // The keyboard's way to the menu a right click opens.
          const element = focused
            ? rootRef.current?.querySelector<HTMLElement>(
                `[data-slot=canvas-node][data-node-id="${CSS.escape(focused)}"]`
              )
            : null
          const rect = (element ?? rootRef.current)?.getBoundingClientRect()
          if (!rect) return false
          const point = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
          if (focused && !selected.includes(focused))
            api.select({ nodeIds: [focused] })
          setMenu(
            focused
              ? { kind: "node", point, id: focused }
              : { kind: "pane", point, at: api.screenToCanvas(point) }
          )
          return true
        }
        case "escape":
          if (
            selected.length === 0 &&
            controller.selection.edgeIds.length === 0
          )
            return false
          api.clearSelection()
          return true
      }
    }
    if (run()) event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const id = event.dataTransfer.getData(LIBRARY_MIME)
    const item = latest.current.library?.find((entry) => entry.id === id)
    if (!item || !isEditable) return
    event.preventDefault()
    addFromLibrary(
      item,
      api.screenToCanvas({ x: event.clientX, y: event.clientY })
    )
  }

  const menuGroups = useCanvasMenuGroups({
    menu,
    api,
    labels,
    isEditable,
    hasOpen: Boolean(onNodeOpen),
    hasInsert: Boolean(onEdgeInsert),
    onInsert: onEdgeInsert,
    layout,
    library,
    openConnect,
    openNode,
    openSearch,
    addFromLibrary,
    createGroup,
  })

  const searchGroups = React.useMemo<CanvasCommandGroup[]>(
    () =>
      isSearchOpen
        ? [
            {
              id: "nodes",
              items: getReadingOrder(api.getNodes()).map((node) => ({
                id: node.id,
                label: getNodeName(node),
                detail:
                  node.type && node.type !== "default" ? node.type : undefined,
                onSelect: () => {
                  api.select({ nodeIds: [node.id] })
                  api.focusNode(node.id)
                },
              })),
            },
          ]
        : [],
    [api, isSearchOpen]
  )

  const connectGroups = React.useMemo<CanvasCommandGroup[]>(() => {
    if (!connectFrom) return []
    const names = meta.names
    return api
      .getHandles(connectFrom)
      .filter((handle) => handle.kind === "source")
      .map((source) => ({
        id: `${source.id ?? "source"}`,
        label: source.label,
        items: api.getTargets(source).map((target) => ({
          id: `${target.nodeId}:${target.id ?? ""}`,
          label: names.get(target.nodeId) ?? target.nodeId,
          detail: target.label,
          onSelect: () => {
            api.connect({
              source: source.nodeId,
              sourceHandle: source.id,
              target: target.nodeId,
              targetHandle: target.id,
            })
            requestAnimationFrame(() => api.focusNode(source.nodeId))
          },
        })),
      }))
  }, [api, connectFrom, meta.names])

  const isEmpty = controller.nodes.length === 0 && !loading && !error
  const selectedCount = controller.selection.nodeIds.length
  const announcement = controller.announcement
    ? getAnnouncementText(controller.announcement, labels, meta.names)
    : ""

  return (
    <CanvasContext.Provider value={context}>
      <CanvasStateContext.Provider value={controller}>
        <div
          ref={rootRef}
          data-slot="canvas"
          data-mode={mode}
          data-size={size}
          data-lod={level}
          data-locked={isLocked || undefined}
          data-disabled={disabled || undefined}
          data-loading={loading || undefined}
          role="region"
          aria-roledescription={labels.canvas.toLowerCase()}
          aria-label={label ?? labels.canvas}
          aria-busy={loading || undefined}
          onKeyDown={handleKeyDown}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes(LIBRARY_MIME))
              event.preventDefault()
          }}
          onDrop={handleDrop}
          className={cn(
            "cn-canvas group/canvas @container/canvas relative isolate flex min-h-96 overflow-hidden",
            className
          )}
          {...props}
        >
          <CanvasEngine
            canvasId={canvasId}
            nodes={controller.nodes}
            edges={controller.edges}
            api={api}
            mode={mode}
            panOn={panOn}
            isEditable={isEditable}
            isDisabled={disabled}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            background={background}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            guides={guides}
            fitView={fitView}
            minZoom={minZoom}
            maxZoom={maxZoom}
            viewport={viewport}
            defaultViewport={defaultViewport}
            onViewportChange={onViewportChange}
            onViewportChangeEnd={onViewportChangeEnd}
            meta={meta}
            pending={controller.pending}
            onConnectToPane={onConnectToPane}
            onEdgeInsert={onEdgeInsert}
            onMenu={setMenu}
            onLevelOfDetail={setLevel}
            reactFlow={reactFlow}
          >
            {children ??
              // Without a graph the state (empty, loading, failed) is the
              // whole canvas, so the controls stay out of its way.
              (mode !== "static" && controller.nodes.length > 0 && (
                <>
                  <CanvasControls />
                  <CanvasMinimap />
                </>
              ))}
          </CanvasEngine>

          {loading && <CanvasLoading hasGraph={controller.nodes.length > 0} />}
          {error !== undefined && error !== null && error !== false && (
            <CanvasError
              hasGraph={controller.nodes.length > 0}
              onRetry={onRetry}
            >
              {error}
            </CanvasError>
          )}
          {isEmpty && (
            <CanvasEmpty
              library={isEditable ? library : undefined}
              onAdd={addFromLibrary}
            />
          )}

          {menu && menuGroups.length > 0 && (
            <ControlMenu
              key={`${menu.kind}/${menu.point.x}/${menu.point.y}`}
              label={labels.canvas}
              groups={menuGroups}
              point={menu.point}
              open
              onOpenChange={(open: boolean) => {
                if (!open) setMenu(null)
              }}
            />
          )}
          <CanvasCommandDialog
            open={isSearchOpen}
            onOpenChange={setSearchOpen}
            title={labels.search}
            placeholder={labels.searchPlaceholder}
            empty={labels.searchEmpty}
            groups={searchGroups}
          />
          <CanvasCommandDialog
            open={connectFrom !== null}
            onOpenChange={(open) => {
              if (!open) setConnectFrom(null)
            }}
            title={labels.connectTo}
            placeholder={labels.connectTo}
            empty={labels.connectEmpty}
            groups={connectGroups}
          />

          <p className="sr-only" aria-live="polite">
            {labels.summary({
              label: label ?? labels.canvas,
              nodes: controller.nodes.length,
              edges: controller.edges.length,
              selected: selectedCount,
            })}
          </p>
          <p
            className="sr-only"
            aria-live="polite"
            key={controller.announcement?.id}
          >
            {announcement}
          </p>
        </div>
      </CanvasStateContext.Provider>
    </CanvasContext.Provider>
  )
}

const LIBRARY_MIME = "application/x-fabricator-canvas-node"

const NODE_STATUSES = new Set<string>([
  "idle",
  "running",
  "success",
  "warning",
  "error",
  "skipped",
])

function isNodeStatus(value: string | undefined): value is CanvasNodeState {
  return value !== undefined && NODE_STATUSES.has(value)
}

function useCanvasMenuGroups({
  menu,
  api,
  labels,
  isEditable,
  hasOpen,
  hasInsert,
  onInsert,
  layout,
  library,
  openConnect,
  openNode,
  openSearch,
  addFromLibrary,
  createGroup,
}: {
  menu: CanvasMenuTarget | null
  api: CanvasApi<CanvasNode, CanvasData>
  labels: CanvasLabels
  isEditable: boolean
  hasOpen: boolean
  hasInsert: boolean
  onInsert?: (edgeId: string, position: CanvasPosition) => void
  layout?: CanvasLayoutEngine
  library?: readonly CanvasLibraryItem[]
  openConnect: (nodeId: string) => void
  openNode: (id: string) => void
  openSearch: () => void
  addFromLibrary: (item: CanvasLibraryItem, at?: CanvasPosition) => void
  createGroup: () => CanvasNode
}): ControlMenuGroup[] {
  if (!menu) return []
  const shortcut = (key: string) => `${isMacPlatform() ? "⌘" : "Ctrl+"}${key}`
  const remove = {
    id: "delete",
    label: labels.delete,
    variant: "destructive" as const,
    shortcut: "⌫",
    icon: <GlyphTrash />,
    isDisabled: !isEditable,
    onSelect: () => api.deleteSelection(),
  }

  if (menu.kind === "pane") {
    const add: ControlMenuGroup = {
      id: "add",
      items: (library ?? []).slice(0, 8).map((item) => ({
        id: `add-${item.id}`,
        label: item.label,
        icon: item.icon,
        isDisabled: !isEditable,
        onSelect: () => addFromLibrary(item, menu.at),
      })),
    }
    return [
      ...(isEditable && add.items.length > 0 ? [add] : []),
      {
        id: "edit",
        items: [
          {
            id: "paste",
            label: labels.paste,
            shortcut: shortcut("V"),
            icon: <GlyphPaste />,
            isDisabled: !isEditable,
            onSelect: () => void api.paste(menu.at),
          },
          {
            id: "select-all",
            label: labels.selectAll,
            shortcut: shortcut("A"),
            icon: <GlyphSelect />,
            onSelect: () => api.selectAll(),
          },
        ],
      },
      {
        id: "view",
        items: [
          {
            id: "fit",
            label: labels.fitView,
            shortcut: "⇧1",
            icon: <GlyphFit />,
            onSelect: () => api.fitView(),
          },
          {
            id: "zoom-reset",
            label: labels.zoomReset,
            shortcut: shortcut("0"),
            icon: <GlyphZoomReset />,
            onSelect: () => api.zoomTo(1),
          },
          {
            id: "search",
            label: labels.search,
            shortcut: shortcut("K"),
            icon: <GlyphSearch />,
            onSelect: openSearch,
          },
          ...(layout
            ? [
                {
                  id: "tidy",
                  label: labels.tidyUp,
                  icon: <GlyphLayout />,
                  isDisabled: !isEditable,
                  onSelect: () => api.layout(layout),
                },
              ]
            : []),
        ],
      },
    ]
  }

  if (menu.kind === "edge") {
    const edge = api.getEdges().find(({ id }) => id === menu.id)
    return [
      {
        id: "edge",
        items: [
          ...(hasInsert && edge
            ? [
                {
                  id: "insert",
                  label: labels.insertNode,
                  icon: <GlyphPlus />,
                  isDisabled: !isEditable,
                  onSelect: () =>
                    onInsert?.(edge.id, api.screenToCanvas(menu.point)),
                },
              ]
            : []),
          {
            type: "submenu" as const,
            id: "shape",
            label: labels.edgeShape,
            icon: <GlyphShape />,
            groups: [
              {
                id: "shapes",
                items: (
                  ["bezier", "smoothstep", "step", "straight"] as const
                ).map((shape) => ({
                  type: "check" as const,
                  id: shape,
                  label: labels.edgeShapes[shape],
                  isChecked: (edge?.type ?? "bezier") === shape,
                  isDisabled: !isEditable,
                  onSelect: () =>
                    api.applyEdgeChanges([
                      { id: menu.id, type: "update", item: { type: shape } },
                    ]),
                })),
              },
            ],
          },
        ],
      },
      { id: "danger", items: [remove] },
    ]
  }

  const selected = api.getNodes().filter((node) => node.selected)
  const target = menu.kind === "node" ? menu.id : selected[0]?.id
  const isGroup = selected.some((node) => node.type === "group")
  return [
    {
      id: "node",
      items: [
        ...(hasOpen && target && menu.kind === "node"
          ? [
              {
                id: "open",
                label: labels.open,
                shortcut: "↵",
                icon: <GlyphOpen />,
                onSelect: () => openNode(target),
              },
            ]
          : []),
        ...(target && menu.kind === "node"
          ? [
              {
                id: "connect",
                label: labels.connectTo,
                shortcut: "C",
                icon: <GlyphConnect />,
                isDisabled: !isEditable,
                onSelect: () => openConnect(target),
              },
            ]
          : []),
        {
          id: "duplicate",
          label: labels.duplicate,
          shortcut: shortcut("D"),
          icon: <GlyphDuplicate />,
          isDisabled: !isEditable,
          onSelect: () => api.duplicate(),
        },
        {
          id: "copy",
          label: labels.copy,
          shortcut: shortcut("C"),
          icon: <GlyphCopy />,
          onSelect: () => void api.copy(),
        },
        {
          id: "cut",
          label: labels.cut,
          shortcut: shortcut("X"),
          icon: <GlyphCut />,
          isDisabled: !isEditable,
          onSelect: () => void api.cut(),
        },
      ],
    },
    {
      id: "arrange",
      items: [
        isGroup
          ? {
              id: "ungroup",
              label: labels.ungroup,
              shortcut: `⇧${shortcut("G")}`,
              icon: <GlyphUngroup />,
              isDisabled: !isEditable,
              onSelect: () => {
                for (const node of selected) {
                  if (node.type === "group") api.ungroup(node.id)
                }
              },
            }
          : {
              id: "group",
              label: labels.group,
              shortcut: shortcut("G"),
              icon: <GlyphGroup />,
              isDisabled: !isEditable,
              onSelect: () => api.group(createGroup()),
            },
        {
          id: "front",
          label: labels.bringToFront,
          icon: <GlyphFront />,
          isDisabled: !isEditable,
          onSelect: () =>
            api.reorder(
              selected.map(({ id }) => id),
              "front"
            ),
        },
        {
          id: "back",
          label: labels.sendToBack,
          icon: <GlyphBack />,
          isDisabled: !isEditable,
          onSelect: () =>
            api.reorder(
              selected.map(({ id }) => id),
              "back"
            ),
        },
      ],
    },
    { id: "danger", items: [remove] },
  ]
}

/** A box in a corner of the canvas for controls and panels. */
function CanvasPanel({
  position = "top-start",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  position?:
    | "top-start"
    | "top-center"
    | "top-end"
    | "bottom-start"
    | "bottom-center"
    | "bottom-end"
    | "center-start"
    | "center-end"
}) {
  return (
    <div
      data-slot="canvas-panel"
      data-position={position}
      className={cn("cn-canvas-panel absolute z-10 flex", className)}
      {...props}
    />
  )
}

/** Zoom, fit, lock, undo and redo, in a bar at the top centre. */
function CanvasControls({
  position = "top-center",
  hasHistory = true,
  className,
}: {
  position?: React.ComponentProps<typeof CanvasPanel>["position"]
  /** Undo and redo; shown in edit mode. */
  hasHistory?: boolean
  className?: string
}) {
  const { api, labels, mode, isLocked, setLocked } =
    useCanvasContext("CanvasControls")
  const controller = useCanvas()
  const { zoom } = useCanvasViewport()
  const percent = `${Math.round(zoom * 100)}%`
  const shortcut = isMacPlatform() ? "⌘" : "Ctrl+"
  const isEdit = mode === "edit"

  return (
    <CanvasPanel position={position} className={className}>
      <div
        data-slot="canvas-controls"
        role="toolbar"
        aria-label={labels.controls}
        className="cn-canvas-controls flex items-center"
      >
        <ControlTooltip label={labels.zoomOut}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.zoomOut}
            onClick={() => api.zoomOut()}
          >
            <IconPlaceholder
              lucide="MinusIcon"
              tabler="IconMinus"
              hugeicons="MinusSignIcon"
              phosphor="MinusIcon"
              remixicon="RiSubtractLine"
            />
          </Button>
        </ControlTooltip>
        <ControlMenu
          label={labels.zoomMenu}
          size="sm"
          variant="ghost"
          className="cn-canvas-zoom tabular-nums"
          groups={[
            {
              id: "zoom",
              items: [
                {
                  id: "in",
                  label: labels.zoomIn,
                  shortcut: `${shortcut}+`,
                  icon: <GlyphPlus />,
                  onSelect: () => api.zoomIn(),
                },
                {
                  id: "out",
                  label: labels.zoomOut,
                  shortcut: `${shortcut}−`,
                  icon: <GlyphMinus />,
                  onSelect: () => api.zoomOut(),
                },
                {
                  id: "reset",
                  label: labels.zoomReset,
                  shortcut: `${shortcut}0`,
                  icon: <GlyphZoomReset />,
                  onSelect: () => api.zoomTo(1),
                },
                {
                  id: "fit",
                  label: labels.fitView,
                  shortcut: "⇧1",
                  icon: <GlyphFit />,
                  onSelect: () => api.fitView(),
                },
              ],
            },
          ]}
        >
          {percent}
        </ControlMenu>
        <ControlTooltip label={labels.zoomIn}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.zoomIn}
            onClick={() => api.zoomIn()}
          >
            <GlyphPlus />
          </Button>
        </ControlTooltip>
        <span
          data-slot="canvas-controls-separator"
          aria-hidden
          className="cn-canvas-controls-separator"
        />
        <ControlTooltip label={labels.fitView}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.fitView}
            onClick={() => api.fitView()}
          >
            <GlyphFit />
          </Button>
        </ControlTooltip>
        {isEdit && (
          <ControlTooltip label={isLocked ? labels.unlock : labels.lock}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.lock}
              aria-pressed={isLocked}
              onClick={() => setLocked(!isLocked)}
            >
              {isLocked ? <GlyphLock /> : <GlyphUnlock />}
            </Button>
          </ControlTooltip>
        )}
        {isEdit && hasHistory && (
          <>
            <span
              data-slot="canvas-controls-separator"
              aria-hidden
              className="cn-canvas-controls-separator"
            />
            <ControlTooltip label={labels.undo}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={labels.undo}
                aria-disabled={!controller.canUndo || isLocked || undefined}
                onClick={() => {
                  if (controller.canUndo && !isLocked) api.undo()
                }}
              >
                <IconPlaceholder
                  lucide="Undo2Icon"
                  tabler="IconArrowBackUp"
                  hugeicons="Undo02Icon"
                  phosphor="ArrowUUpLeftIcon"
                  remixicon="RiArrowGoBackLine"
                />
              </Button>
            </ControlTooltip>
            <ControlTooltip label={labels.redo}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={labels.redo}
                aria-disabled={!controller.canRedo || isLocked || undefined}
                onClick={() => {
                  if (controller.canRedo && !isLocked) api.redo()
                }}
              >
                <IconPlaceholder
                  lucide="Redo2Icon"
                  tabler="IconArrowForwardUp"
                  hugeicons="Redo02Icon"
                  phosphor="ArrowUUpRightIcon"
                  remixicon="RiArrowGoForwardLine"
                />
              </Button>
            </ControlTooltip>
          </>
        )}
      </div>
    </CanvasPanel>
  )
}

/** Kinds of node to drag onto the canvas or add with a click. */
function CanvasLibrary({
  items,
  title,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  items: readonly CanvasLibraryItem[]
  title?: string
}) {
  const { labels, isEditable, addLibraryItem } =
    useCanvasContext("CanvasLibrary")
  const [query, setQuery] = React.useState("")
  const visible = items.filter((item) =>
    `${item.label} ${item.description ?? ""} ${item.group ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )
  const groups = new Map<string, CanvasLibraryItem[]>()
  for (const item of visible) {
    const key = item.group ?? ""
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return (
    <div
      data-slot="canvas-library"
      aria-label={title ?? labels.library}
      role="region"
      className={cn("cn-canvas-library flex flex-col", className)}
      {...props}
    >
      <input
        type="search"
        data-slot="canvas-library-search"
        aria-label={labels.libraryPlaceholder}
        placeholder={labels.libraryPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="cn-canvas-library-search"
      />
      <div
        data-slot="canvas-library-list"
        className="cn-canvas-library-list flex flex-col overflow-y-auto"
      >
        {[...groups].map(([group, entries]) => (
          <div
            key={group}
            role="group"
            aria-label={group || undefined}
            className="flex flex-col"
          >
            {group && (
              <span
                data-slot="canvas-library-group"
                className="cn-canvas-library-group"
              >
                {group}
              </span>
            )}
            {entries.map((item) => (
              <button
                key={item.id}
                type="button"
                draggable={isEditable}
                disabled={!isEditable}
                data-slot="canvas-library-item"
                onDragStart={(event) => {
                  event.dataTransfer.setData(LIBRARY_MIME, item.id)
                  event.dataTransfer.effectAllowed = "copy"
                }}
                onClick={() => addLibraryItem(item)}
                className="cn-canvas-library-item flex items-center text-start"
              >
                {item.icon && (
                  <span
                    data-slot="canvas-library-icon"
                    aria-hidden
                    className="cn-canvas-library-icon flex shrink-0 items-center justify-center"
                  >
                    {item.icon}
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.description && (
                    <span
                      data-slot="canvas-library-description"
                      className="cn-canvas-library-description truncate"
                    >
                      {item.description}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Opens node search (also ⌘K). */
function CanvasSearch({ className }: { className?: string }) {
  const { labels, openSearch } = useCanvasContext("CanvasSearch")
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={openSearch}
      className={cn("cn-canvas-search", className)}
    >
      <GlyphSearch />
      <span>{labels.search}</span>
      <Kbd>{isMacPlatform() ? "⌘K" : "Ctrl K"}</Kbd>
    </Button>
  )
}

/**
 * The graph as a list, in reading order, each node with its connections:
 * the way through for screen readers, and the phone's "List" view.
 */
function CanvasOutline({ className, ...props }: React.ComponentProps<"ol">) {
  const controller = useCanvas()
  const { api, labels } = useCanvasContext("CanvasOutline")
  const ordered = getReadingOrder(controller.nodes)
  const names = new Map(
    controller.nodes.map((node) => [node.id, getNodeName(node)])
  )
  return (
    <ol
      data-slot="canvas-outline"
      aria-label={labels.outline}
      className={cn("cn-canvas-outline flex flex-col", className)}
      {...props}
    >
      {ordered.map((node) => {
        const outgoing = controller.edges.filter(
          (edge) => edge.source === node.id
        )
        return (
          <li
            key={node.id}
            data-slot="canvas-outline-item"
            className="cn-canvas-outline-item flex flex-col"
          >
            <button
              type="button"
              data-status={node.status ?? "idle"}
              onClick={() => {
                api.select({ nodeIds: [node.id] })
                api.focusNode(node.id)
              }}
              className="cn-canvas-outline-node flex min-w-0 items-center text-start"
            >
              <span className="truncate">{names.get(node.id)}</span>
              {node.status && node.status !== "idle" && (
                <span className="cn-canvas-outline-status">
                  {labels.status[node.status]}
                </span>
              )}
            </button>
            {outgoing.length > 0 && (
              <ul className="cn-canvas-outline-edges flex flex-col">
                {outgoing.map((edge) => (
                  <li key={edge.id} className="cn-canvas-outline-edge truncate">
                    {edge.label ? `${edge.label}: ` : "→ "}
                    {names.get(edge.target) ?? edge.target}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Nodes with a problem (`invalid`), each a link to the node. */
function CanvasIssues({ className, ...props }: React.ComponentProps<"div">) {
  const controller = useCanvas()
  const { api, labels } = useCanvasContext("CanvasIssues")
  const issues = controller.nodes.filter((node) => node.invalid)
  if (issues.length === 0) return null
  return (
    <div
      data-slot="canvas-issues"
      role="region"
      aria-label={labels.issues}
      className={cn("cn-canvas-issues flex flex-col", className)}
      {...props}
    >
      <span className="cn-canvas-issues-title">
        {labels.issues} · {issues.length}
      </span>
      {issues.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => {
            api.select({ nodeIds: [node.id] })
            api.focusNode(node.id)
          }}
          className="cn-canvas-issue flex min-w-0 items-start text-start"
        >
          <IconPlaceholder
            lucide="CircleAlertIcon"
            tabler="IconExclamationCircle"
            hugeicons="AlertCircleIcon"
            phosphor="WarningCircleIcon"
            remixicon="RiErrorWarningLine"
            aria-hidden
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{getNodeName(node)}</span>
            <span className="cn-canvas-issue-message">{node.invalid}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function CanvasEmpty({
  library,
  onAdd,
}: {
  library?: readonly CanvasLibraryItem[]
  onAdd: (item: CanvasLibraryItem) => void
}) {
  const { labels, isEditable } = useCanvasContext("CanvasEmpty")
  const first = library?.[0]
  return (
    <div
      data-slot="canvas-empty"
      className="cn-canvas-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <Empty className="pointer-events-auto">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPlaceholder
              lucide="WorkflowIcon"
              tabler="IconSitemap"
              hugeicons="WorkflowSquare01Icon"
              phosphor="FlowArrowIcon"
              remixicon="RiFlowChart"
            />
          </EmptyMedia>
          <EmptyTitle>
            {isEditable ? labels.emptyTitle : labels.emptyViewTitle}
          </EmptyTitle>
          {isEditable && first && (
            <EmptyDescription>{labels.emptyDescription}</EmptyDescription>
          )}
        </EmptyHeader>
        {isEditable && first && (
          <EmptyContent>
            <Button onClick={() => onAdd(first)}>
              <GlyphPlus />
              {first.label}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </div>
  )
}

// Before the first load: ghost nodes in a loose flow. A reload keeps the
// graph and shows a spinner in place of the zoom instead.
function CanvasLoading({ hasGraph }: { hasGraph: boolean }) {
  const { labels } = useCanvasContext("CanvasLoading")
  if (hasGraph) {
    return (
      <span role="status" className="sr-only">
        {labels.loading}
      </span>
    )
  }
  return (
    <div
      data-slot="canvas-loading"
      role="status"
      aria-label={labels.loading}
      className="cn-canvas-overlay absolute inset-0 z-10 flex items-center justify-center"
    >
      <div className="cn-canvas-loading grid grid-cols-3 items-center">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton
            key={index}
            data-index={index}
            className="cn-canvas-loading-node"
          />
        ))}
      </div>
    </div>
  )
}

function CanvasError({
  hasGraph,
  onRetry,
  children,
}: {
  hasGraph: boolean
  onRetry?: () => void
  children: React.ReactNode
}) {
  const { labels } = useCanvasContext("CanvasError")
  return (
    <div
      data-slot="canvas-error"
      data-placement={hasGraph ? "top" : "center"}
      className="cn-canvas-overlay pointer-events-none absolute inset-0 z-10 flex justify-center"
    >
      <Alert
        variant="destructive"
        className="cn-canvas-error pointer-events-auto"
      >
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
        />
        <AlertTitle>{labels.errorTitle}</AlertTitle>
        <AlertDescription>
          {children === true ? null : children}
        </AlertDescription>
        {onRetry && (
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="cn-canvas-error-retry"
            >
              {labels.retry}
            </Button>
          </AlertAction>
        )}
      </Alert>
    </div>
  )
}

function GlyphPlus() {
  return (
    <IconPlaceholder
      lucide="PlusIcon"
      tabler="IconPlus"
      hugeicons="PlusSignIcon"
      phosphor="PlusIcon"
      remixicon="RiAddLine"
    />
  )
}
function GlyphMinus() {
  return (
    <IconPlaceholder
      lucide="MinusIcon"
      tabler="IconMinus"
      hugeicons="MinusSignIcon"
      phosphor="MinusIcon"
      remixicon="RiSubtractLine"
    />
  )
}
function GlyphFit() {
  return (
    <IconPlaceholder
      lucide="ScanIcon"
      tabler="IconScan"
      hugeicons="CenterFocusIcon"
      phosphor="FrameCornersIcon"
      remixicon="RiFullscreenLine"
    />
  )
}
function GlyphZoomReset() {
  return (
    <IconPlaceholder
      lucide="SearchIcon"
      tabler="IconSearch"
      hugeicons="Search01Icon"
      phosphor="MagnifyingGlassIcon"
      remixicon="RiSearchLine"
    />
  )
}
function GlyphSearch() {
  return (
    <IconPlaceholder
      lucide="SearchIcon"
      tabler="IconSearch"
      hugeicons="Search01Icon"
      phosphor="MagnifyingGlassIcon"
      remixicon="RiSearchLine"
    />
  )
}
function GlyphLock() {
  return (
    <IconPlaceholder
      lucide="LockIcon"
      tabler="IconLock"
      hugeicons="ShieldIcon"
      phosphor="LockIcon"
      remixicon="RiLockLine"
    />
  )
}
function GlyphUnlock() {
  return (
    <IconPlaceholder
      lucide="LockOpenIcon"
      tabler="IconLockOpen"
      hugeicons="SquareUnlock02Icon"
      phosphor="LockOpenIcon"
      remixicon="RiLockUnlockLine"
    />
  )
}
function GlyphTrash() {
  return (
    <IconPlaceholder
      lucide="Trash2Icon"
      tabler="IconTrash"
      hugeicons="Delete02Icon"
      phosphor="TrashIcon"
      remixicon="RiDeleteBinLine"
    />
  )
}
function GlyphPaste() {
  return (
    <IconPlaceholder
      lucide="ClipboardPasteIcon"
      tabler="IconClipboard"
      hugeicons="ClipboardIcon"
      phosphor="ClipboardIcon"
      remixicon="RiClipboardLine"
    />
  )
}
function GlyphSelect() {
  return (
    <IconPlaceholder
      lucide="MousePointer2Icon"
      tabler="IconPointer"
      hugeicons="Cursor01Icon"
      phosphor="CursorIcon"
      remixicon="RiCursorLine"
    />
  )
}
function GlyphLayout() {
  return (
    <IconPlaceholder
      lucide="NetworkIcon"
      tabler="IconHierarchy2"
      hugeicons="HierarchyIcon"
      phosphor="TreeStructureIcon"
      remixicon="RiNodeTree"
    />
  )
}
function GlyphShape() {
  return (
    <IconPlaceholder
      lucide="SplitIcon"
      tabler="IconArrowsSplit"
      hugeicons="GitBranchIcon"
      phosphor="GitForkIcon"
      remixicon="RiGitBranchLine"
    />
  )
}
function GlyphOpen() {
  return (
    <IconPlaceholder
      lucide="SquarePenIcon"
      tabler="IconEdit"
      hugeicons="PencilEdit02Icon"
      phosphor="NotePencilIcon"
      remixicon="RiEditBoxLine"
    />
  )
}
function GlyphConnect() {
  return (
    <IconPlaceholder
      lucide="CableIcon"
      tabler="IconPlug"
      hugeicons="ConnectIcon"
      phosphor="PlugsConnectedIcon"
      remixicon="RiPlugLine"
    />
  )
}
function GlyphDuplicate() {
  return (
    <IconPlaceholder
      lucide="CopyIcon"
      tabler="IconCopy"
      hugeicons="Copy01Icon"
      phosphor="CopyIcon"
      remixicon="RiFileCopyLine"
    />
  )
}
function GlyphCopy() {
  return (
    <IconPlaceholder
      lucide="CopyIcon"
      tabler="IconCopy"
      hugeicons="Copy01Icon"
      phosphor="CopyIcon"
      remixicon="RiFileCopyLine"
    />
  )
}
function GlyphCut() {
  return (
    <IconPlaceholder
      lucide="ScissorsIcon"
      tabler="IconCut"
      hugeicons="ScissorIcon"
      phosphor="ScissorsIcon"
      remixicon="RiScissorsLine"
    />
  )
}
function GlyphGroup() {
  return (
    <IconPlaceholder
      lucide="GroupIcon"
      tabler="IconBoxMultiple"
      hugeicons="GroupItemsIcon"
      phosphor="SelectionPlusIcon"
      remixicon="RiGroupLine"
    />
  )
}
function GlyphUngroup() {
  return (
    <IconPlaceholder
      lucide="UngroupIcon"
      tabler="IconBoxOff"
      hugeicons="UngroupItemsIcon"
      phosphor="SelectionSlashIcon"
      remixicon="RiFolderReduceLine"
    />
  )
}
function GlyphFront() {
  return (
    <IconPlaceholder
      lucide="BringToFrontIcon"
      tabler="IconStack2"
      hugeicons="Layers01Icon"
      phosphor="StackIcon"
      remixicon="RiBringToFront"
    />
  )
}
function GlyphBack() {
  return (
    <IconPlaceholder
      lucide="SendToBackIcon"
      tabler="IconStack3"
      hugeicons="Layers02Icon"
      phosphor="StackSimpleIcon"
      remixicon="RiSendToBack"
    />
  )
}

export {
  applyCanvasEdgeChanges,
  applyCanvasNodeChanges,
} from "@/registry/bases/__base__/lib/canvas-model"
export { useCanvasState } from "@/registry/bases/__base__/hooks/use-canvas"

export {
  Canvas,
  canvasClipboard,
  CanvasConnectionLine,
  CanvasControls,
  CanvasDefaultNode,
  CanvasEdgeView as CanvasEdge,
  CanvasEdgeLabel,
  CanvasGroupNode,
  CanvasHandle,
  CanvasIssues,
  CanvasLibrary,
  CanvasMinimap,
  CanvasNodeFrame as CanvasNode,
  CanvasNodeContent,
  CanvasNodeDescription,
  CanvasNodeFooter,
  CanvasNodeHeader,
  CanvasNodeIcon,
  CanvasNodeResizer,
  CanvasNodeStatus,
  CanvasNodeTitle,
  CanvasNodeToolbar,
  CanvasNoteNode,
  CanvasOutline,
  CanvasPanel,
  CanvasPlaceholderNode,
  CanvasSearch,
  CANVAS_NODE_TYPES,
  useCanvas,
  useCanvasNode,
  useCanvasViewport,
  type CanvasEdge as CanvasEdgeRecord,
  type CanvasHandleProps,
  type CanvasLabels,
  type CanvasLibraryItem,
  type CanvasMode,
  type CanvasNodeComponent,
  type CanvasNodeProps,
  type CanvasProps,
}
