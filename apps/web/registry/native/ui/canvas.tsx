import * as React from "react"
import {
  BringToFrontIcon,
  CableIcon,
  CircleAlertIcon,
  ClipboardPasteIcon,
  CopyIcon,
  GroupIcon,
  LockIcon,
  LockOpenIcon,
  MinusIcon,
  MousePointer2Icon,
  NetworkIcon,
  PlusIcon,
  Redo2Icon,
  ScanIcon,
  ScissorsIcon,
  SearchIcon,
  SendToBackIcon,
  SplitIcon,
  SquarePenIcon,
  Trash2Icon,
  Undo2Icon,
  UngroupIcon,
  WorkflowIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import * as Clipboard from "expo-clipboard"
import { AccessibilityInfo, Pressable, ScrollView, View } from "react-native"

import {
  useCanvasController,
  type CanvasAnnouncement,
  type CanvasApi,
  type CanvasClipboardPort,
  type CanvasDeleteEvent,
  type CanvasNotice,
} from "@/registry/fabricator/shared/hooks/use-canvas"
import {
  parseCanvasClipboard,
  serializeCanvasClipboard,
} from "@/registry/fabricator/shared/lib/canvas-clipboard"
import { type CanvasLayoutEngine } from "@/registry/fabricator/shared/lib/canvas-layout"
import {
  getConnectedPorts,
  getReadingOrder,
  type CanvasConnection,
  type CanvasData,
  type CanvasEdge,
  type CanvasEdgeChange,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasPosition,
  type CanvasNodeStatus as CanvasRunStatus,
  type CanvasViewport,
} from "@/registry/fabricator/shared/lib/canvas-model"
import { type CanvasConnectionRule } from "@/registry/fabricator/shared/lib/canvas-validation"
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  type CanvasFitOptions,
  type CanvasLevelOfDetail,
} from "@/registry/fabricator/shared/lib/canvas-viewport"
import {
  ControlSheet,
  type ControlMenuGroup,
} from "@/registry/native/lib/control-sheet"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/native/ui/alert"
import { Button } from "@/registry/native/ui/button"
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
} from "@/registry/native/ui/canvas-context"
import {
  CanvasConnectionLine,
  CanvasEdgeLabel,
  CanvasEdge as CanvasEdgeView,
} from "@/registry/native/ui/canvas-edge"
import {
  CanvasEngine,
  CanvasMinimap,
  useCanvasViewport,
  type CanvasEdgeComponent,
  type CanvasMenuTarget,
  type CanvasPanInput,
} from "@/registry/native/ui/canvas-engine"
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
} from "@/registry/native/ui/canvas-node"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/native/ui/empty"
import { Input } from "@/registry/native/ui/input"
import { Skeleton } from "@/registry/native/ui/skeleton"
import { Text, TextStyle } from "@/registry/native/ui/text"
import { toast } from "@/registry/native/ui/toast"

// Canvas on React Native: the same graph, controller, words and states as
// the website, on its own engine (canvas-engine). Touch takes the place of
// the pointer: one finger pans, two pinch, a long press opens the menu a
// right click does, and the connect and find lists open in a sheet. Every
// gesture has a VoiceOver and TalkBack action.

type CanvasLibraryItem = CanvasLibraryEntry

type CanvasProps = Omit<React.ComponentProps<typeof View>, "children"> & {
  nodes?: CanvasNode[]
  defaultNodes?: CanvasNode[]
  edges?: CanvasEdge[]
  defaultEdges?: CanvasEdge[]
  onNodesChange?(changes: CanvasNodeChange[]): void
  onEdgesChange?(changes: CanvasEdgeChange[]): void
  onConnect?(
    connection: CanvasConnection,
    edge: CanvasEdge
  ): void | Promise<void>
  onDelete?(
    event: CanvasDeleteEvent<CanvasNode, CanvasEdge>
  ): void | Promise<void>
  onConnectToPane?(event: {
    position: CanvasPosition
    source: {
      nodeId: string
      handleId: string | null
      kind: "source" | "target"
    }
  }): void
  onEdgeInsert?(edgeId: string, position: CanvasPosition): void
  onNodeOpen?(node: CanvasNode): void
  onSelectionChange?(selection: {
    nodes: CanvasNode[]
    edges: CanvasEdge[]
  }): void
  validateConnection?: CanvasConnectionRule
  allowCycles?: boolean
  allowSelfLoops?: boolean
  edgeDefaults?: Partial<CanvasEdge>
  nodeTypes?: Record<string, CanvasNodeComponent>
  /** Web only; kept so shared code compiles. Edges draw from their `type`. */
  edgeTypes?: Record<string, CanvasEdgeComponent>
  mode?: CanvasMode
  /** Touch always pans with a finger; kept so shared code compiles. */
  panOn?: CanvasPanInput
  background?: "dots" | "lines" | "cross" | "none"
  gridSize?: number
  snapToGrid?: boolean
  guides?: boolean
  fitView?: boolean | CanvasFitOptions
  minZoom?: number
  maxZoom?: number
  viewport?: CanvasViewport
  defaultViewport?: CanvasViewport
  onViewportChange?(viewport: CanvasViewport): void
  onViewportChangeEnd?(viewport: CanvasViewport): void
  layout?: CanvasLayoutEngine
  library?: readonly CanvasLibraryItem[]
  history?: boolean | { limit: number }
  createId?(): string
  clipboard?: CanvasClipboardPort<CanvasNode, CanvasEdge>
  loading?: boolean
  error?: React.ReactNode
  onRetry?(): void
  disabled?: boolean
  label?: string
  labels?: Partial<CanvasLabels>
  size?: "sm" | "default"
  children?: React.ReactNode
}

let fallbackCount = 0
function createFallbackId() {
  fallbackCount += 1
  return `canvas-${Date.now().toString(36)}-${fallbackCount}`
}

/** The device clipboard, for canvases of the default node and edge types. */
const canvasClipboard: CanvasClipboardPort<CanvasNode, CanvasEdge> = {
  read: async () => parseCanvasClipboard(await Clipboard.getStringAsync()),
  write: async (clipboard) => {
    await Clipboard.setStringAsync(serializeCanvasClipboard(clipboard))
  },
}

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

function getNoticeMessage(notice: CanvasNotice, labels: CanvasLabels) {
  if (notice.kind === "connect-failed") return labels.connectFailed
  if (notice.kind === "delete-failed") return labels.deleteFailed
  return labels.changeFailed
}

const NODE_STATUSES = new Set<string>([
  "idle",
  "running",
  "success",
  "warning",
  "error",
  "skipped",
])

function isNodeStatus(value: string | undefined): value is CanvasRunStatus {
  return value !== undefined && NODE_STATUSES.has(value)
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
  className,
  children,
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
  const canvasId = `canvas-${React.useId().replace(/[^a-zA-Z0-9-]/g, "")}`
  const [isLocked, setLocked] = React.useState(false)
  const [, setLevel] = React.useState<CanvasLevelOfDetail>("full")
  const [menu, setMenu] = React.useState<CanvasMenuTarget | null>(null)
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  const [connectFrom, setConnectFrom] = React.useState<string | null>(null)
  const isEditable = mode === "edit" && !isLocked && !disabled && !loading

  const latest = React.useRef({ onNodeOpen, onSelectionChange })
  React.useLayoutEffect(() => {
    latest.current = { onNodeOpen, onSelectionChange }
  })

  // Built from names and connections only, so a drag doesn't re-render every node.
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
  const openConnect = React.useCallback(
    (nodeId: string) => setConnectFrom(nodeId),
    []
  )
  const openSearch = React.useCallback(() => setSearchOpen(true), [])
  const addFromLibrary = React.useCallback(
    (item: CanvasLibraryItem, at?: CanvasPosition) => {
      const frame = api.getSize()
      const node = item.create(
        at ?? api.screenToCanvas({ x: frame.width / 2, y: frame.height / 2 })
      )
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

  const selectionKey = `${controller.selection.nodeIds.join(",")}|${controller.selection.edgeIds.join(",")}`
  React.useEffect(() => {
    const [nodePart = "", edgePart = ""] = selectionKey.split("|")
    const nodeIds = new Set(nodePart.split(",").filter(Boolean))
    const edgeIds = new Set(edgePart.split(",").filter(Boolean))
    latest.current.onSelectionChange?.({
      nodes: api.getNodes().filter(({ id }) => nodeIds.has(id)),
      edges: api.getEdges().filter(({ id }) => edgeIds.has(id)),
    })
  }, [api, selectionKey])

  // A failed change raises a toast with Retry, and tells VoiceOver.
  React.useEffect(() => {
    const notice = controller.notice
    if (!notice) return
    const message = getNoticeMessage(notice, labels)
    toast.add({
      title: message,
      description:
        notice.error instanceof Error ? notice.error.message : undefined,
      type: "error",
      actionProps: notice.retry
        ? { children: labels.retry, onPress: notice.retry }
        : undefined,
    })
    AccessibilityInfo.announceForAccessibility(message)
  }, [controller.notice, labels])

  React.useEffect(() => {
    const announcement = controller.announcement
    if (!announcement) return
    AccessibilityInfo.announceForAccessibility(
      getAnnouncementText(announcement, labels, meta.names)
    )
  }, [controller.announcement, labels, meta.names])

  const createGroup = React.useCallback(
    (): CanvasNode => ({
      id: (createId ?? createFallbackId)(),
      type: "group",
      position: { x: 0, y: 0 },
      data: { label: labels.group },
    }),
    [createId, labels.group]
  )

  const menuGroups = getMenuGroups({
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

  const searchGroups: ControlMenuGroup[] = isSearchOpen
    ? [
        {
          id: "nodes",
          items: getReadingOrder(api.getNodes()).map((node) => ({
            id: node.id,
            label: getNodeName(node),
            onSelect: () => {
              api.select({ nodeIds: [node.id] })
              api.focusNode(node.id)
            },
          })),
        },
      ]
    : []

  const connectGroups: ControlMenuGroup[] = connectFrom
    ? api
        .getHandles(connectFrom)
        .filter((handle) => handle.kind === "source")
        .map((source) => ({
          id: source.id ?? "source",
          label: source.label,
          items: api.getTargets(source).map((target) => ({
            id: `${target.nodeId}:${target.id ?? ""}`,
            label: [
              meta.names.get(target.nodeId) ?? target.nodeId,
              target.label,
            ]
              .filter(Boolean)
              .join(" · "),
            icon: <CableIcon size={18} />,
            onSelect: () =>
              api.connect({
                source: source.nodeId,
                sourceHandle: source.id,
                target: target.nodeId,
                targetHandle: target.id,
              }),
          })),
        }))
    : []

  const isEmpty = controller.nodes.length === 0 && !loading && !error

  return (
    <CanvasContext.Provider value={context}>
      <CanvasStateContext.Provider value={controller}>
        <View
          data-slot="canvas"
          data-mode={mode}
          data-size={size}
          data-locked={isLocked}
          data-disabled={disabled}
          accessibilityLabel={labels.summary({
            label: label ?? labels.canvas,
            nodes: controller.nodes.length,
            edges: controller.edges.length,
            selected: controller.selection.nodeIds.length,
          })}
          aria-busy={loading}
          aria-disabled={disabled}
          className={cn(
            "cn-canvas relative min-h-96 flex-1 overflow-hidden",
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
            onNodeOpen={openNode}
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

          <ControlSheet
            open={menu !== null && menuGroups.length > 0}
            onOpenChange={(open) => {
              if (!open) setMenu(null)
            }}
            label={labels.actions}
            groups={menuGroups}
          />
          <ControlSheet
            open={isSearchOpen}
            onOpenChange={setSearchOpen}
            label={labels.search}
            groups={searchGroups}
          />
          <ControlSheet
            open={connectFrom !== null}
            onOpenChange={(open) => {
              if (!open) setConnectFrom(null)
            }}
            label={labels.connectTo}
            groups={
              connectGroups.some((group) => group.items.length > 0)
                ? connectGroups
                : [
                    {
                      id: "none",
                      items: [
                        {
                          id: "none",
                          label: labels.connectEmpty,
                          isDisabled: true,
                          onSelect: () => {},
                        },
                      ],
                    },
                  ]
            }
          />
        </View>
      </CanvasStateContext.Provider>
    </CanvasContext.Provider>
  )
}

function getMenuGroups({
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
  const icon = 18
  const remove = {
    id: "delete",
    label: labels.delete,
    variant: "destructive" as const,
    icon: <Trash2Icon size={icon} />,
    isDisabled: !isEditable,
    onSelect: () => api.deleteSelection(),
  }
  if (menu.kind === "pane") {
    return [
      {
        id: "add",
        items: isEditable
          ? (library ?? []).slice(0, 8).map((item) => ({
              id: `add-${item.id}`,
              label: item.label,
              icon: item.icon,
              onSelect: () => addFromLibrary(item, menu.at),
            }))
          : [],
      },
      {
        id: "edit",
        items: [
          {
            id: "paste",
            label: labels.paste,
            icon: <ClipboardPasteIcon size={icon} />,
            isDisabled: !isEditable,
            onSelect: () => void api.paste(menu.at),
          },
          {
            id: "select-all",
            label: labels.selectAll,
            icon: <MousePointer2Icon size={icon} />,
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
            icon: <ScanIcon size={icon} />,
            onSelect: () => api.fitView(),
          },
          {
            id: "search",
            label: labels.search,
            icon: <SearchIcon size={icon} />,
            onSelect: openSearch,
          },
          ...(layout
            ? [
                {
                  id: "tidy",
                  label: labels.tidyUp,
                  icon: <NetworkIcon size={icon} />,
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
                  icon: <PlusIcon size={icon} />,
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
            icon: <SplitIcon size={icon} />,
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
        ...(hasOpen && target
          ? [
              {
                id: "open",
                label: labels.open,
                icon: <SquarePenIcon size={icon} />,
                onSelect: () => openNode(target),
              },
            ]
          : []),
        ...(target
          ? [
              {
                id: "connect",
                label: labels.connectTo,
                icon: <CableIcon size={icon} />,
                isDisabled: !isEditable,
                onSelect: () => openConnect(target),
              },
            ]
          : []),
        {
          id: "duplicate",
          label: labels.duplicate,
          icon: <CopyIcon size={icon} />,
          isDisabled: !isEditable,
          onSelect: () => api.duplicate(),
        },
        {
          id: "copy",
          label: labels.copy,
          icon: <CopyIcon size={icon} />,
          onSelect: () => void api.copy(),
        },
        {
          id: "cut",
          label: labels.cut,
          icon: <ScissorsIcon size={icon} />,
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
              icon: <UngroupIcon size={icon} />,
              isDisabled: !isEditable,
              onSelect: () => {
                for (const node of selected)
                  if (node.type === "group") api.ungroup(node.id)
              },
            }
          : {
              id: "group",
              label: labels.group,
              icon: <GroupIcon size={icon} />,
              isDisabled: !isEditable,
              onSelect: () => api.group(createGroup()),
            },
        {
          id: "front",
          label: labels.bringToFront,
          icon: <BringToFrontIcon size={icon} />,
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
          icon: <SendToBackIcon size={icon} />,
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
}: React.ComponentProps<typeof View> & {
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
    <View
      data-slot="canvas-panel"
      data-position={position}
      pointerEvents="box-none"
      className={cn("cn-canvas-panel absolute z-10 flex-row", className)}
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
  const [isZoomOpen, setZoomOpen] = React.useState(false)
  const isEdit = mode === "edit"
  const icon = 18
  return (
    <CanvasPanel position={position} className={className}>
      <View
        data-slot="canvas-controls"
        accessibilityRole="toolbar"
        accessibilityLabel={labels.controls}
        className="cn-canvas-controls flex-row items-center"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel={labels.zoomOut}
          onPress={() => api.zoomOut()}
        >
          <MinusIcon size={icon} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          accessibilityLabel={labels.zoomMenu}
          onPress={() => setZoomOpen(true)}
          className="cn-canvas-zoom"
        >
          {`${Math.round(zoom * 100)}%`}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel={labels.zoomIn}
          onPress={() => api.zoomIn()}
        >
          <PlusIcon size={icon} />
        </Button>
        <View
          data-slot="canvas-controls-separator"
          className="cn-canvas-controls-separator"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel={labels.fitView}
          onPress={() => api.fitView()}
        >
          <ScanIcon size={icon} />
        </Button>
        {isEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel={labels.lock}
            aria-pressed={isLocked}
            onPress={() => setLocked(!isLocked)}
          >
            {isLocked ? <LockIcon size={icon} /> : <LockOpenIcon size={icon} />}
          </Button>
        )}
        {isEdit && hasHistory && (
          <>
            <View
              data-slot="canvas-controls-separator"
              className="cn-canvas-controls-separator"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel={labels.undo}
              disabled={!controller.canUndo || isLocked}
              onPress={() => api.undo()}
            >
              <Undo2Icon size={icon} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel={labels.redo}
              disabled={!controller.canRedo || isLocked}
              onPress={() => api.redo()}
            >
              <Redo2Icon size={icon} />
            </Button>
          </>
        )}
      </View>
      <ControlSheet
        open={isZoomOpen}
        onOpenChange={setZoomOpen}
        label={labels.zoomMenu}
        groups={[
          {
            id: "zoom",
            items: [
              {
                id: "in",
                label: labels.zoomIn,
                icon: <PlusIcon size={icon} />,
                onSelect: () => api.zoomIn(),
              },
              {
                id: "out",
                label: labels.zoomOut,
                icon: <MinusIcon size={icon} />,
                onSelect: () => api.zoomOut(),
              },
              {
                id: "reset",
                label: labels.zoomReset,
                icon: <SearchIcon size={icon} />,
                onSelect: () => api.zoomTo(1),
              },
              {
                id: "fit",
                label: labels.fitView,
                icon: <ScanIcon size={icon} />,
                onSelect: () => api.fitView(),
              },
            ],
          },
        ]}
      />
    </CanvasPanel>
  )
}

/** Kinds of node to add; a press adds one in the middle of the view. */
function CanvasLibrary({
  items,
  title,
  className,
  ...props
}: React.ComponentProps<typeof View> & {
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
    <View
      data-slot="canvas-library"
      accessibilityLabel={title ?? labels.library}
      className={cn("cn-canvas-library", className)}
      {...props}
    >
      <Input
        data-slot="canvas-library-search"
        accessibilityLabel={labels.libraryPlaceholder}
        placeholder={labels.libraryPlaceholder}
        value={query}
        onChangeText={setQuery}
        className="cn-canvas-library-search"
      />
      <ScrollView
        data-slot="canvas-library-list"
        className="cn-canvas-library-list"
      >
        {[...groups].map(([group, entries]) => (
          <View key={group || "items"} accessibilityLabel={group || undefined}>
            {group ? (
              <Text
                data-slot="canvas-library-group"
                className="cn-canvas-library-group"
              >
                {group}
              </Text>
            ) : null}
            {entries.map((item) => (
              <Pressable
                key={item.id}
                data-slot="canvas-library-item"
                accessibilityRole="button"
                disabled={!isEditable}
                onPress={() => addLibraryItem(item)}
                className="cn-canvas-library-item flex-row items-center"
              >
                {item.icon && (
                  <View
                    data-slot="canvas-library-icon"
                    className="cn-canvas-library-icon items-center justify-center"
                  >
                    <TextStyle className="cn-canvas-library-icon-text">
                      {item.icon}
                    </TextStyle>
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="cn-canvas-library-label">
                    {item.label}
                  </Text>
                  {item.description && (
                    <Text
                      data-slot="canvas-library-description"
                      numberOfLines={1}
                      className="cn-canvas-library-description"
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

/** Opens node search in a sheet. */
function CanvasSearch({ className }: { className?: string }) {
  const { labels, openSearch } = useCanvasContext("CanvasSearch")
  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={openSearch}
      className={cn("cn-canvas-search", className)}
    >
      <SearchIcon size={16} />
      {labels.search}
    </Button>
  )
}

/** The graph as a list, in reading order, each node with its connections. */
function CanvasOutline({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const controller = useCanvas()
  const { api, labels } = useCanvasContext("CanvasOutline")
  const names = new Map(
    controller.nodes.map((node) => [node.id, getNodeName(node)])
  )
  return (
    <View
      data-slot="canvas-outline"
      accessibilityLabel={labels.outline}
      className={cn("cn-canvas-outline", className)}
      {...props}
    >
      {getReadingOrder(controller.nodes).map((node) => {
        const outgoing = controller.edges.filter(
          (edge) => edge.source === node.id
        )
        return (
          <View
            key={node.id}
            data-slot="canvas-outline-item"
            className="cn-canvas-outline-item"
          >
            <Pressable
              accessibilityRole="button"
              data-status={node.status ?? "idle"}
              onPress={() => {
                api.select({ nodeIds: [node.id] })
                api.focusNode(node.id)
              }}
              className="cn-canvas-outline-node flex-row items-center"
            >
              <Text numberOfLines={1} className="min-w-0 flex-1">
                {names.get(node.id)}
              </Text>
              {node.status && node.status !== "idle" && (
                <Text className="cn-canvas-outline-status">
                  {labels.status[node.status]}
                </Text>
              )}
            </Pressable>
            {outgoing.map((edge) => (
              <Text
                key={edge.id}
                numberOfLines={1}
                className="cn-canvas-outline-edges cn-canvas-outline-edge"
              >
                {edge.label ? `${edge.label}: ` : "→ "}
                {names.get(edge.target) ?? edge.target}
              </Text>
            ))}
          </View>
        )
      })}
    </View>
  )
}

/** Nodes with a problem (`invalid`), each a link to the node. */
function CanvasIssues({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const controller = useCanvas()
  const { api, labels } = useCanvasContext("CanvasIssues")
  const issues = controller.nodes.filter((node) => node.invalid)
  if (issues.length === 0) return null
  return (
    <View
      data-slot="canvas-issues"
      accessibilityLabel={labels.issues}
      className={cn("cn-canvas-issues", className)}
      {...props}
    >
      <Text className="cn-canvas-issues-title">{`${labels.issues} · ${issues.length}`}</Text>
      {issues.map((node) => (
        <Pressable
          key={node.id}
          accessibilityRole="button"
          onPress={() => {
            api.select({ nodeIds: [node.id] })
            api.focusNode(node.id)
          }}
          className="cn-canvas-issue flex-row items-start"
        >
          <TextStyle className="cn-canvas-issue-icon">
            <CircleAlertIcon size={16} />
          </TextStyle>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1}>{getNodeName(node)}</Text>
            <Text className="cn-canvas-issue-message">{node.invalid}</Text>
          </View>
        </Pressable>
      ))}
    </View>
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
    <View
      data-slot="canvas-empty"
      pointerEvents="box-none"
      className="cn-canvas-overlay absolute inset-0 items-center justify-center"
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WorkflowIcon size={20} />
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
            <Button onPress={() => onAdd(first)}>
              <PlusIcon size={16} />
              {first.label}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </View>
  )
}

function CanvasLoading({ hasGraph }: { hasGraph: boolean }) {
  const { labels } = useCanvasContext("CanvasLoading")
  if (hasGraph) return null
  return (
    <View
      data-slot="canvas-loading"
      accessibilityRole="progressbar"
      accessibilityLabel={labels.loading}
      className="cn-canvas-overlay absolute inset-0 items-center justify-center"
    >
      <View className="cn-canvas-loading flex-row flex-wrap justify-center">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton
            key={index}
            data-index={index}
            className="cn-canvas-loading-node"
          />
        ))}
      </View>
    </View>
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
    <View
      data-slot="canvas-error"
      data-placement={hasGraph ? "top" : "center"}
      pointerEvents="box-none"
      className="cn-canvas-overlay absolute inset-0"
    >
      <Alert variant="destructive" className="cn-canvas-error">
        <CircleAlertIcon size={16} />
        <AlertTitle>{labels.errorTitle}</AlertTitle>
        <AlertDescription>
          {children === true ? null : children}
        </AlertDescription>
        {onRetry && (
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onPress={onRetry}
              className="cn-canvas-error-retry"
            >
              {labels.retry}
            </Button>
          </AlertAction>
        )}
      </Alert>
    </View>
  )
}

export {
  applyCanvasEdgeChanges,
  applyCanvasNodeChanges,
} from "@/registry/fabricator/shared/lib/canvas-model"
export { useCanvasState } from "@/registry/fabricator/shared/hooks/use-canvas"

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
