"use client"

// The Canvas's controller: the graph (controlled or not), selection, undo and
// redo, the clipboard, connection rules, the handles nodes drew, and pending
// changes waiting on an async handler. React web and React Native share it;
// each engine registers a small port (`CanvasEngine`) for what only it can
// do: move the viewport and focus a node. Nothing here imports React Flow.
import * as React from "react"

import {
  copyCanvasSelection,
  getPastedElements,
  parseCanvasClipboard,
  serializeCanvasClipboard,
  type CanvasClipboard,
} from "@/registry/bases/__base__/lib/canvas-clipboard"
import {
  createHistoryEntry,
  EMPTY_HISTORY,
  getHistoryChanges,
  pushHistory,
  redoHistory,
  undoHistory,
  type CanvasHistory,
  type CanvasHistoryEntry,
} from "@/registry/bases/__base__/lib/canvas-history"
import {
  getLayoutChanges,
  type CanvasLayoutEngine,
  type CanvasLayoutOptions,
} from "@/registry/bases/__base__/lib/canvas-layout"
import {
  applyCanvasEdgeChanges,
  applyCanvasNodeChanges,
  createEdge,
  getGroupChanges,
  getNodeRect,
  getRemovalChanges,
  getSelectionChanges,
  getUngroupChanges,
  getZOrderChanges,
  indexNodes,
  type CanvasConnection,
  type CanvasData,
  type CanvasEdge,
  type CanvasEdgeChange,
  type CanvasHandleSpec,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasPosition,
  type CanvasRect,
  type CanvasViewport,
} from "@/registry/bases/__base__/lib/canvas-model"
import {
  getConnectableTargets,
  getHandleKey,
  validateCanvasConnection,
  type CanvasConnectionResult,
  type CanvasConnectionRule,
} from "@/registry/bases/__base__/lib/canvas-validation"
import { type CanvasFitOptions } from "@/registry/bases/__base__/lib/canvas-viewport"

/** What only an engine can do. Web registers React Flow's; native its own. */
type CanvasEngine = {
  fitView: (options?: CanvasFitOptions & { nodeIds?: string[] }) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomTo: (zoom: number) => void
  setViewport: (
    viewport: CanvasViewport,
    options?: { animate?: boolean }
  ) => void
  getViewport: () => CanvasViewport
  /** The frame's size in screen pixels. */
  getSize: () => { width: number; height: number }
  screenToCanvas: (point: CanvasPosition) => CanvasPosition
  /** Pans the rect into view and moves keyboard focus to the node. */
  focusNode: (id: string) => void
}

/**
 * A system clipboard. `read` parses what it finds into the owner's node and
 * edge types (with their own validation), or null; without a port the
 * controller keeps its own copy, which pastes within the page.
 */
type CanvasClipboardPort<
  TNode extends CanvasNode = CanvasNode,
  TEdge extends CanvasEdge = CanvasEdge,
> = {
  read: () => Promise<CanvasClipboard<TNode, TEdge> | null>
  write: (clipboard: CanvasClipboard<TNode, TEdge>) => Promise<void>
}

/** A port on the browser's clipboard that hands its parsed text to `parse`. */
function createCanvasClipboardPort<
  TNode extends CanvasNode,
  TEdge extends CanvasEdge,
>(
  parse: (clipboard: CanvasClipboard) => CanvasClipboard<TNode, TEdge> | null
): CanvasClipboardPort<TNode, TEdge> {
  return {
    read: async () => {
      const text = await navigator.clipboard.readText()
      const clipboard = parseCanvasClipboard(text)
      return clipboard ? parse(clipboard) : null
    },
    write: (clipboard) =>
      navigator.clipboard.writeText(serializeCanvasClipboard(clipboard)),
  }
}

type CanvasNotice = {
  id: number
  kind: "connect-failed" | "delete-failed" | "change-failed"
  error: unknown
  retry?: () => void
}

/** What the live region says after a change. */
type CanvasAnnouncement = { id: number } & (
  | { kind: "connected"; source: string; target: string }
  | { kind: "deleted"; nodes: number; edges: number }
  | { kind: "undone" | "redone" }
)

type CanvasDeleteEvent<TNode extends CanvasNode, TEdge extends CanvasEdge> = {
  nodes: TNode[]
  edges: TEdge[]
}

type UseCanvasControllerOptions<
  TNode extends CanvasNode,
  TEdgeData extends CanvasData = CanvasData,
> = {
  nodes?: TNode[]
  defaultNodes?: TNode[]
  /** Every node change, as plain objects; apply them with `applyCanvasNodeChanges`. */
  onNodesChange?: (changes: CanvasNodeChange<TNode>[]) => void
  edges?: CanvasEdge<TEdgeData>[]
  defaultEdges?: CanvasEdge<TEdgeData>[]
  onEdgesChange?: (changes: CanvasEdgeChange<CanvasEdge<TEdgeData>>[]) => void
  /** A connection was made; a rejected promise removes the edge again. */
  onConnect?: (
    connection: CanvasConnection,
    edge: CanvasEdge<TEdgeData>
  ) => void | Promise<void>
  /** Nodes and edges were deleted; a rejected promise puts them back. */
  onDelete?: (
    event: CanvasDeleteEvent<TNode, CanvasEdge<TEdgeData>>
  ) => void | Promise<void>
  /** A project rule on top of handle types and limits: true, or why not. */
  validateConnection?: CanvasConnectionRule
  allowCycles?: boolean
  allowSelfLoops?: boolean
  /** Fields every new edge starts with, such as its `type`. */
  edgeDefaults?: Partial<CanvasEdge<TEdgeData>>
  history?: boolean | { limit: number }
  /** New ids for pasted and duplicated elements. */
  createId?: () => string
  clipboard?: CanvasClipboardPort<TNode, CanvasEdge<TEdgeData>>
}

type CanvasSelection = { nodeIds: string[]; edgeIds: string[] }

type ApplyOptions = {
  /** Record an undo step; on by default. */
  history?: boolean
  /** Merges steps with the same key that follow each other closely. */
  key?: string
}

let fallbackId = 0
function createDefaultId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID()
  fallbackId += 1
  return `canvas-${Date.now().toString(36)}-${fallbackId}`
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  )
}

// A drag or a resize is one step: it starts when the first change says the
// node is dragging (or resizing) and ends when one says it stopped.
function getGestureState(changes: readonly CanvasNodeChange[]) {
  let isMoving = false
  let isEnding = false
  for (const change of changes) {
    if (change.type === "position" && change.dragging !== undefined) {
      if (change.dragging) isMoving = true
      else isEnding = true
    }
    if (change.type === "dimensions" && change.resizing !== undefined) {
      if (change.resizing) isMoving = true
      else isEnding = true
    }
  }
  return { isMoving, isEnding }
}

function useCanvasController<
  TNode extends CanvasNode = CanvasNode,
  TEdgeData extends CanvasData = CanvasData,
>(options: UseCanvasControllerOptions<TNode, TEdgeData> = {}) {
  type TEdge = CanvasEdge<TEdgeData>

  const isNodesControlled = options.nodes !== undefined
  const isEdgesControlled = options.edges !== undefined
  const [ownNodes, setOwnNodes] = React.useState<TNode[]>(
    () => options.defaultNodes ?? []
  )
  const [ownEdges, setOwnEdges] = React.useState<TEdge[]>(
    () => options.defaultEdges ?? []
  )
  const nodes = options.nodes ?? ownNodes
  const edges = options.edges ?? ownEdges

  // The latest graph and props, read by callbacks that stay stable.
  const nodesRef = React.useRef(nodes)
  const edgesRef = React.useRef(edges)
  const optionsRef = React.useRef(options)
  React.useLayoutEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
    optionsRef.current = options
  })

  const engineRef = React.useRef<CanvasEngine | null>(null)
  const handlesRef = React.useRef(new Map<string, CanvasHandleSpec>())
  const clipboardRef = React.useRef<CanvasClipboard<TNode, TEdge> | null>(null)
  const gestureRef = React.useRef<{
    nodes: TNode[]
    edges: TEdge[]
    nodeIds: Set<string>
  } | null>(null)

  const historyLimit =
    typeof options.history === "object" ? options.history.limit : 100
  const isHistoryOn = options.history !== false
  const historyRef = React.useRef<CanvasHistory<TNode, TEdge>>(EMPTY_HISTORY)
  const [historySize, setHistorySize] = React.useState({ past: 0, future: 0 })
  const [pending, setPending] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [notice, setNotice] = React.useState<CanvasNotice | null>(null)
  const [announcement, setAnnouncement] =
    React.useState<CanvasAnnouncement | null>(null)

  const setHistory = React.useCallback(
    (history: CanvasHistory<TNode, TEdge>) => {
      historyRef.current = history
      setHistorySize({
        past: history.past.length,
        future: history.future.length,
      })
    },
    []
  )

  const record = React.useCallback(
    (entry: CanvasHistoryEntry<TNode, TEdge> | null) => {
      if (!entry || !isHistoryOn) return
      setHistory(pushHistory(historyRef.current, entry, historyLimit))
    },
    [historyLimit, isHistoryOn, setHistory]
  )

  // Writes a graph change: to our state when uncontrolled, to the owner's
  // handlers always. Returns the graph after it.
  const write = React.useCallback(
    (
      nodeChanges: CanvasNodeChange<TNode>[],
      edgeChanges: CanvasEdgeChange<TEdge>[]
    ) => {
      const nextNodes = applyCanvasNodeChanges(nodesRef.current, nodeChanges)
      const nextEdges = applyCanvasEdgeChanges(edgesRef.current, edgeChanges)
      nodesRef.current = nextNodes
      edgesRef.current = nextEdges
      if (nodeChanges.length > 0) {
        if (!isNodesControlled) setOwnNodes(nextNodes)
        optionsRef.current.onNodesChange?.(nodeChanges)
      }
      if (edgeChanges.length > 0) {
        if (!isEdgesControlled) setOwnEdges(nextEdges)
        optionsRef.current.onEdgesChange?.(edgeChanges)
      }
      return { nodes: nextNodes, edges: nextEdges }
    },
    [isEdgesControlled, isNodesControlled]
  )

  /** Applies changes and records one undo step for all of them. */
  const commit = React.useCallback(
    (
      nodeChanges: CanvasNodeChange<TNode>[],
      edgeChanges: CanvasEdgeChange<TEdge>[],
      { history = true, key }: ApplyOptions = {}
    ) => {
      const previous = { nodes: nodesRef.current, edges: edgesRef.current }
      const next = write(nodeChanges, edgeChanges)
      if (!history) return next
      record(
        createHistoryEntry(
          previous,
          next,
          {
            nodeIds: nodeChanges.map(({ id }) => id),
            edgeIds: edgeChanges.map(({ id }) => id),
          },
          { key, time: Date.now() }
        )
      )
      return next
    },
    [record, write]
  )

  /** Node changes from an engine: drags and resizes become one step each. */
  const applyNodeChanges = React.useCallback(
    (changes: CanvasNodeChange<TNode>[], applyOptions: ApplyOptions = {}) => {
      const { isMoving, isEnding } = getGestureState(changes)
      if (isMoving) {
        if (!gestureRef.current) {
          gestureRef.current = {
            nodes: nodesRef.current,
            edges: edgesRef.current,
            nodeIds: new Set(),
          }
        }
        for (const change of changes) gestureRef.current.nodeIds.add(change.id)
        write(changes, [])
        return
      }
      const gesture = gestureRef.current
      if (isEnding && gesture) {
        gestureRef.current = null
        const next = write(changes, [])
        for (const change of changes) gesture.nodeIds.add(change.id)
        if (applyOptions.history !== false) {
          record(
            createHistoryEntry(
              gesture,
              next,
              { nodeIds: gesture.nodeIds, edgeIds: [] },
              { time: Date.now() }
            )
          )
        }
        return
      }
      commit(changes, [], applyOptions)
    },
    [commit, record, write]
  )

  const applyEdgeChanges = React.useCallback(
    (changes: CanvasEdgeChange<TEdge>[], applyOptions: ApplyOptions = {}) => {
      commit([], changes, applyOptions)
    },
    [commit]
  )

  const markPending = React.useCallback((ids: string[], isPending: boolean) => {
    setPending((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (isPending) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const raise = React.useCallback(
    (kind: CanvasNotice["kind"], error: unknown, retry?: () => void) => {
      setNotice({ id: Date.now(), kind, error, retry })
    },
    []
  )

  const validate = React.useCallback(
    (connection: CanvasConnection): CanvasConnectionResult =>
      validateCanvasConnection(connection, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        handles: handlesRef.current,
        allowCycles: optionsRef.current.allowCycles,
        allowSelfLoops: optionsRef.current.allowSelfLoops,
        rule: optionsRef.current.validateConnection,
      }),
    []
  )

  // Runs an async handler after an optimistic change: the step is recorded
  // once the handler settles, and undone if it rejects.
  const settle = React.useCallback(
    (
      result: void | Promise<void>,
      step: {
        entry: CanvasHistoryEntry<TNode, TEdge> | null
        pendingIds: string[]
        kind: CanvasNotice["kind"]
        retry: () => void
      }
    ) => {
      if (!isPromiseLike(result)) {
        record(step.entry)
        return
      }
      markPending(step.pendingIds, true)
      result.then(
        () => {
          markPending(step.pendingIds, false)
          record(step.entry)
        },
        (error: unknown) => {
          markPending(step.pendingIds, false)
          if (step.entry) {
            const { nodeChanges, edgeChanges } = getHistoryChanges(
              step.entry,
              "undo"
            )
            write(nodeChanges, edgeChanges)
          }
          raise(step.kind, error, step.retry)
        }
      )
    },
    [markPending, raise, record, write]
  )

  // A failed change retries through the latest callbacks, defined below.
  const retryRef = React.useRef<{
    connect: (connection: CanvasConnection) => void
    deleteElements: (ids: { nodeIds?: string[]; edgeIds?: string[] }) => void
  }>({ connect: () => {}, deleteElements: () => {} })

  const connect = React.useCallback(
    (connection: CanvasConnection): CanvasConnectionResult => {
      const result = validate(connection)
      if (!result.isValid) return result
      const defaults = optionsRef.current.edgeDefaults
      const base = createEdge<TEdgeData>(edgesRef.current, connection, defaults)
      if (!base) return { isValid: false, issue: "duplicate" }
      const edge: TEdge = base
      const previous = { nodes: nodesRef.current, edges: edgesRef.current }
      const next = write([], [{ id: edge.id, type: "add", item: edge }])
      const entry = createHistoryEntry(
        previous,
        next,
        { nodeIds: [], edgeIds: [edge.id] },
        { time: Date.now() }
      )
      settle(optionsRef.current.onConnect?.(connection, edge), {
        entry,
        pendingIds: [edge.id],
        kind: "connect-failed",
        retry: () => retryRef.current.connect(connection),
      })
      setAnnouncement({
        id: Date.now(),
        kind: "connected",
        source: connection.source,
        target: connection.target,
      })
      return result
    },
    [settle, validate, write]
  )

  const deleteElements = React.useCallback(
    ({
      nodeIds = [],
      edgeIds = [],
    }: {
      nodeIds?: string[]
      edgeIds?: string[]
    }) => {
      const { nodeChanges, edgeChanges } = getRemovalChanges(
        nodesRef.current,
        edgesRef.current,
        { nodeIds, edgeIds }
      )
      if (nodeChanges.length === 0 && edgeChanges.length === 0) return
      const removedNodeIds = new Set(nodeChanges.map(({ id }) => id))
      const removedEdgeIds = new Set(edgeChanges.map(({ id }) => id))
      const removed = {
        nodes: nodesRef.current.filter(({ id }) => removedNodeIds.has(id)),
        edges: edgesRef.current.filter(({ id }) => removedEdgeIds.has(id)),
      }
      const previous = { nodes: nodesRef.current, edges: edgesRef.current }
      const next = write(nodeChanges, edgeChanges)
      const entry = createHistoryEntry(
        previous,
        next,
        { nodeIds: removedNodeIds, edgeIds: removedEdgeIds },
        { time: Date.now() }
      )
      settle(optionsRef.current.onDelete?.(removed), {
        entry,
        pendingIds: [],
        kind: "delete-failed",
        retry: () => retryRef.current.deleteElements({ nodeIds, edgeIds }),
      })
      setAnnouncement({
        id: Date.now(),
        kind: "deleted",
        nodes: removed.nodes.length,
        edges: removed.edges.length,
      })
    },
    [settle, write]
  )

  React.useLayoutEffect(() => {
    retryRef.current = { connect, deleteElements }
  })

  const selection = React.useMemo<CanvasSelection>(
    () => ({
      nodeIds: nodes.filter((node) => node.selected).map(({ id }) => id),
      edgeIds: edges.filter((edge) => edge.selected).map(({ id }) => id),
    }),
    [nodes, edges]
  )

  const select = React.useCallback(
    (ids: { nodeIds?: string[]; edgeIds?: string[] }) => {
      commit(
        getSelectionChanges(nodesRef.current, new Set(ids.nodeIds ?? [])),
        getSelectionChanges(edgesRef.current, new Set(ids.edgeIds ?? [])),
        { history: false }
      )
    },
    [commit]
  )

  const selectAll = React.useCallback(() => {
    select({ nodeIds: nodesRef.current.map(({ id }) => id) })
  }, [select])

  const clearSelection = React.useCallback(() => select({}), [select])

  const deleteSelection = React.useCallback(() => {
    deleteElements({
      nodeIds: nodesRef.current
        .filter((node) => node.selected)
        .map(({ id }) => id),
      edgeIds: edgesRef.current
        .filter((edge) => edge.selected)
        .map(({ id }) => id),
    })
  }, [deleteElements])

  const addNodes = React.useCallback(
    (added: TNode[], { select: shouldSelect = true } = {}) => {
      const changes: CanvasNodeChange<TNode>[] = shouldSelect
        ? getSelectionChanges(nodesRef.current, new Set())
        : []
      for (const node of added) {
        changes.push({
          id: node.id,
          type: "add",
          item: shouldSelect ? { ...node, selected: true } : node,
        })
      }
      commit(changes, [])
    },
    [commit]
  )

  const updateNodeData = React.useCallback(
    (id: string, data: Partial<TNode["data"]>) => {
      commit([{ id, type: "data", data }], [])
    },
    [commit]
  )

  const moveNodes = React.useCallback(
    (ids: string[], delta: CanvasPosition, key?: string) => {
      const byId = indexNodes(nodesRef.current)
      const changes: CanvasNodeChange<TNode>[] = []
      for (const id of ids) {
        const node = byId.get(id)
        if (!node || node.draggable === false) continue
        changes.push({
          id,
          type: "position",
          position: {
            x: node.position.x + delta.x,
            y: node.position.y + delta.y,
          },
        })
      }
      commit(changes, [], { key })
    },
    [commit]
  )

  const group = React.useCallback(
    (groupNode: TNode, ids?: string[]) => {
      const members =
        ids ??
        nodesRef.current.filter((node) => node.selected).map(({ id }) => id)
      if (members.length === 0) return
      commit(getGroupChanges(nodesRef.current, members, groupNode), [])
    },
    [commit]
  )

  const ungroup = React.useCallback(
    (id: string) => commit(getUngroupChanges(nodesRef.current, id), []),
    [commit]
  )

  const reorder = React.useCallback(
    (ids: string[], direction: "front" | "back") => {
      commit(getZOrderChanges(nodesRef.current, ids, direction), [])
    },
    [commit]
  )

  const undo = React.useCallback(() => {
    const step = undoHistory(historyRef.current)
    if (!step) return
    setHistory(step.history)
    const { nodeChanges, edgeChanges } = getHistoryChanges(step.entry, "undo")
    write(nodeChanges, edgeChanges)
    setAnnouncement({ id: Date.now(), kind: "undone" })
  }, [setHistory, write])

  const redo = React.useCallback(() => {
    const step = redoHistory(historyRef.current)
    if (!step) return
    setHistory(step.history)
    const { nodeChanges, edgeChanges } = getHistoryChanges(step.entry, "redo")
    write(nodeChanges, edgeChanges)
    setAnnouncement({ id: Date.now(), kind: "redone" })
  }, [setHistory, write])

  const copy = React.useCallback(async () => {
    const clipboard = copyCanvasSelection(
      nodesRef.current,
      edgesRef.current,
      nodesRef.current.filter((node) => node.selected).map(({ id }) => id)
    )
    if (!clipboard) return false
    clipboardRef.current = clipboard
    // The system clipboard can refuse (no permission, no focus); the copy
    // above still pastes within the page.
    await optionsRef.current.clipboard?.write(clipboard).catch(() => undefined)
    return true
  }, [])

  const pasteClipboard = React.useCallback(
    (clipboard: CanvasClipboard<TNode, TEdge>, at?: CanvasPosition) => {
      const pasted = getPastedElements(clipboard, {
        createId: optionsRef.current.createId ?? createDefaultId,
        at,
      })
      commit(
        [
          ...getSelectionChanges(nodesRef.current, new Set()),
          ...pasted.nodes.map((item) => ({
            id: item.id,
            type: "add" as const,
            item,
          })),
        ],
        [
          ...getSelectionChanges(edgesRef.current, new Set()),
          ...pasted.edges.map((item) => ({
            id: item.id,
            type: "add" as const,
            item,
          })),
        ]
      )
    },
    [commit]
  )

  const paste = React.useCallback(
    async (at?: CanvasPosition) => {
      const port = optionsRef.current.clipboard
      const fromSystem = port ? await port.read().catch(() => null) : null
      const clipboard = fromSystem ?? clipboardRef.current
      if (!clipboard) return false
      pasteClipboard(clipboard, at)
      return true
    },
    [pasteClipboard]
  )

  const cut = React.useCallback(async () => {
    if (await copy()) deleteSelection()
  }, [copy, deleteSelection])

  const duplicate = React.useCallback(() => {
    const clipboard = copyCanvasSelection(
      nodesRef.current,
      edgesRef.current,
      nodesRef.current.filter((node) => node.selected).map(({ id }) => id)
    )
    if (clipboard) pasteClipboard(clipboard)
  }, [pasteClipboard])

  const layout = React.useCallback(
    (engine: CanvasLayoutEngine, layoutOptions?: CanvasLayoutOptions) => {
      commit(
        getLayoutChanges(
          nodesRef.current,
          edgesRef.current,
          engine,
          layoutOptions
        ),
        []
      )
      requestAnimationFrame(() => engineRef.current?.fitView())
    },
    [commit]
  )

  const registerHandle = React.useCallback((spec: CanvasHandleSpec) => {
    const key = getHandleKey(spec.nodeId, spec.kind, spec.id)
    handlesRef.current.set(key, spec)
    return () => {
      if (handlesRef.current.get(key) === spec) handlesRef.current.delete(key)
    }
  }, [])

  const getHandles = React.useCallback(
    (nodeId: string) =>
      [...handlesRef.current.values()].filter(
        (handle) => handle.nodeId === nodeId
      ),
    []
  )

  const getTargets = React.useCallback(
    (source: CanvasHandleSpec) =>
      getConnectableTargets(source, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        handles: handlesRef.current,
        allowCycles: optionsRef.current.allowCycles,
        allowSelfLoops: optionsRef.current.allowSelfLoops,
        rule: optionsRef.current.validateConnection,
      }),
    []
  )

  const getNodeBounds = React.useCallback((id: string): CanvasRect | null => {
    const byId = indexNodes(nodesRef.current)
    const node = byId.get(id)
    return node ? getNodeRect(node, byId) : null
  }, [])

  const registerEngine = React.useCallback((engine: CanvasEngine | null) => {
    engineRef.current = engine
  }, [])

  const toJSON = React.useCallback(
    () => ({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      viewport: engineRef.current?.getViewport(),
    }),
    []
  )

  const dismissNotice = React.useCallback(() => setNotice(null), [])

  // Every method, with an identity that never changes: parts read this, so
  // a drag that changes the graph doesn't re-render them.
  const api = React.useMemo(
    () => ({
      applyNodeChanges,
      applyEdgeChanges,
      commit,
      validate,
      connect,
      deleteElements,
      deleteSelection,
      select,
      selectAll,
      clearSelection,
      addNodes,
      updateNodeData,
      moveNodes,
      group,
      ungroup,
      reorder,
      undo,
      redo,
      copy,
      cut,
      paste,
      duplicate,
      layout,
      registerHandle,
      getHandles,
      getTargets,
      getNodeBounds,
      registerEngine,
      toJSON,
      dismissNotice,
      getNodes: () => nodesRef.current,
      getEdges: () => edgesRef.current,
      fitView: (fitOptions?: CanvasFitOptions & { nodeIds?: string[] }) =>
        engineRef.current?.fitView(fitOptions),
      zoomIn: () => engineRef.current?.zoomIn(),
      zoomOut: () => engineRef.current?.zoomOut(),
      zoomTo: (zoom: number) => engineRef.current?.zoomTo(zoom),
      setViewport: (
        viewport: CanvasViewport,
        viewportOptions?: { animate?: boolean }
      ) => engineRef.current?.setViewport(viewport, viewportOptions),
      focusNode: (id: string) => engineRef.current?.focusNode(id),
      screenToCanvas: (point: CanvasPosition) =>
        engineRef.current?.screenToCanvas(point) ?? point,
      getViewport: () =>
        engineRef.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 },
      getSize: () => engineRef.current?.getSize() ?? { width: 0, height: 0 },
    }),
    [
      applyNodeChanges,
      applyEdgeChanges,
      commit,
      validate,
      connect,
      deleteElements,
      deleteSelection,
      select,
      selectAll,
      clearSelection,
      addNodes,
      updateNodeData,
      moveNodes,
      group,
      ungroup,
      reorder,
      undo,
      redo,
      copy,
      cut,
      paste,
      duplicate,
      layout,
      registerHandle,
      getHandles,
      getTargets,
      getNodeBounds,
      registerEngine,
      toJSON,
      dismissNotice,
    ]
  )

  return React.useMemo(
    () => ({
      nodes,
      edges,
      selection,
      pending,
      notice,
      announcement,
      canUndo: historySize.past > 0,
      canRedo: historySize.future > 0,
      api,
      ...api,
    }),
    [nodes, edges, selection, pending, notice, announcement, historySize, api]
  )
}

type CanvasController<
  TNode extends CanvasNode = CanvasNode,
  TEdgeData extends CanvasData = CanvasData,
> = ReturnType<typeof useCanvasController<TNode, TEdgeData>>

type CanvasApi<
  TNode extends CanvasNode = CanvasNode,
  TEdgeData extends CanvasData = CanvasData,
> = CanvasController<TNode, TEdgeData>["api"]

/**
 * The graph held in state, for apps that own it: React Flow's
 * `useNodesState` and `useEdgesState` in one.
 */
function useCanvasState<
  TNode extends CanvasNode = CanvasNode,
  TEdge extends CanvasEdge = CanvasEdge,
>(initialNodes: TNode[], initialEdges: TEdge[]) {
  const [nodes, setNodes] = React.useState(initialNodes)
  const [edges, setEdges] = React.useState(initialEdges)
  const onNodesChange = React.useCallback(
    (changes: CanvasNodeChange<TNode>[]) =>
      setNodes((current) => applyCanvasNodeChanges(current, changes)),
    []
  )
  const onEdgesChange = React.useCallback(
    (changes: CanvasEdgeChange<TEdge>[]) =>
      setEdges((current) => applyCanvasEdgeChanges(current, changes)),
    []
  )
  return { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange }
}

export {
  createCanvasClipboardPort,
  useCanvasController,
  useCanvasState,
  type CanvasAnnouncement,
  type CanvasApi,
  type CanvasClipboardPort,
  type CanvasController,
  type CanvasDeleteEvent,
  type CanvasEngine,
  type CanvasNotice,
  type CanvasSelection,
  type UseCanvasControllerOptions,
}
