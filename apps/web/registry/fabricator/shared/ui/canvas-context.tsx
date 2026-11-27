"use client"

// What every Canvas part reads: the controller, the interaction mode, the
// words, and, inside a node, that node's state. Shared by web and native.
import * as React from "react"

import {
  type CanvasApi,
  type CanvasController,
} from "@/registry/bases/__base__/hooks/use-canvas"
import {
  type CanvasData,
  type CanvasNode,
  type CanvasNodeStatus,
  type CanvasPosition,
} from "@/registry/bases/__base__/lib/canvas-model"
import { type CanvasConnectionIssue } from "@/registry/bases/__base__/lib/canvas-validation"

type CanvasMode = "edit" | "view" | "static"

/** Every word the Canvas shows or announces, in English by default. */
type CanvasLabels = {
  canvas: string
  node: string
  edge: string
  controls: string
  zoomIn: string
  zoomOut: string
  zoomReset: string
  fitView: string
  zoomMenu: string
  lock: string
  unlock: string
  undo: string
  redo: string
  minimap: string
  handle: string
  search: string
  searchPlaceholder: string
  searchEmpty: string
  connectTo: string
  connectEmpty: string
  library: string
  libraryPlaceholder: string
  addNode: string
  outline: string
  issues: string
  emptyTitle: string
  emptyDescription: string
  emptyViewTitle: string
  loading: string
  errorTitle: string
  retry: string
  dismiss: string
  open: string
  rename: string
  duplicate: string
  copy: string
  cut: string
  paste: string
  selectAll: string
  delete: string
  group: string
  ungroup: string
  bringToFront: string
  sendToBack: string
  insertNode: string
  tidyUp: string
  arrange: string
  /** The menu a long press or a right click opens, as an action's name. */
  actions: string
  move: Record<"left" | "right" | "up" | "down", string>
  edgeShape: string
  edgeShapes: Record<"bezier" | "smoothstep" | "step" | "straight", string>
  status: Record<CanvasNodeStatus, string>
  issue: Record<CanvasConnectionIssue, string>
  connectFailed: string
  deleteFailed: string
  changeFailed: string
  /** "Workflow, 12 nodes, 14 connections, 2 selected" */
  summary: (counts: {
    label: string
    nodes: number
    edges: number
    selected: number
  }) => string
  /** "Connections: in from Fetch and Parse. Out to Summarize." */
  connections: (names: { incoming: string[]; outgoing: string[] }) => string
  connected: (names: { source: string; target: string }) => string
  deleted: (counts: { nodes: number; edges: number }) => string
  undone: string
  redone: string
}

// "A", "A and B", "A, B and C". Plain, because Hermes has no Intl.ListFormat.
function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function plural(count: number, one: string, other: string) {
  return `${count} ${count === 1 ? one : other}`
}

const CANVAS_LABELS: CanvasLabels = {
  canvas: "Canvas",
  node: "node",
  edge: "connection",
  controls: "Canvas controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Zoom to 100%",
  fitView: "Fit to screen",
  zoomMenu: "Zoom",
  lock: "Lock canvas",
  unlock: "Unlock canvas",
  undo: "Undo",
  redo: "Redo",
  minimap: "Mini map",
  handle: "Connection point",
  search: "Find a node",
  searchPlaceholder: "Find a node…",
  searchEmpty: "No nodes found.",
  connectTo: "Connect to…",
  connectEmpty: "Nothing can connect here.",
  library: "Add a node",
  libraryPlaceholder: "Search nodes…",
  addNode: "Add node…",
  outline: "Outline",
  issues: "Issues",
  emptyTitle: "Add your first node",
  emptyDescription: "Pick one from the library to start the flow.",
  emptyViewTitle: "Nothing here yet",
  loading: "Loading the canvas…",
  errorTitle: "The canvas couldn't load",
  retry: "Retry",
  dismiss: "Dismiss",
  open: "Open",
  rename: "Rename…",
  duplicate: "Duplicate",
  copy: "Copy",
  cut: "Cut",
  paste: "Paste",
  selectAll: "Select all",
  delete: "Delete",
  group: "Group",
  ungroup: "Ungroup",
  bringToFront: "Bring to front",
  sendToBack: "Send to back",
  insertNode: "Insert node…",
  tidyUp: "Tidy up",
  arrange: "Arrange",
  actions: "Actions",
  move: {
    left: "Move left",
    right: "Move right",
    up: "Move up",
    down: "Move down",
  },
  edgeShape: "Line style",
  edgeShapes: {
    bezier: "Curved",
    smoothstep: "Rounded steps",
    step: "Steps",
    straight: "Straight",
  },
  status: {
    idle: "Idle",
    running: "Running",
    success: "Done",
    warning: "Needs attention",
    error: "Failed",
    skipped: "Skipped",
  },
  issue: {
    "self-loop": "A node can't connect to itself",
    duplicate: "These are already connected",
    cycle: "This would make a loop",
    "type-mismatch": "These points take different kinds of data",
    "handle-full": "This point takes no more connections",
    "not-connectable": "This node doesn't take connections",
    rule: "This connection isn't allowed",
  },
  connectFailed: "Couldn't connect",
  deleteFailed: "Couldn't delete",
  changeFailed: "Couldn't save the change",
  summary: ({ label, nodes, edges, selected }) =>
    [
      label,
      plural(nodes, "node", "nodes"),
      plural(edges, "connection", "connections"),
      selected > 0 ? `${selected} selected` : null,
    ]
      .filter(Boolean)
      .join(", "),
  connections: ({ incoming, outgoing }) =>
    [
      incoming.length > 0 ? `In from ${joinNames(incoming)}.` : null,
      outgoing.length > 0 ? `Out to ${joinNames(outgoing)}.` : null,
    ]
      .filter(Boolean)
      .join(" ") || "Not connected.",
  connected: ({ source, target }) => `Connected ${source} to ${target}`,
  deleted: ({ nodes, edges }) =>
    `Deleted ${[
      nodes > 0 ? plural(nodes, "node", "nodes") : null,
      edges > 0 ? plural(edges, "connection", "connections") : null,
    ]
      .filter(Boolean)
      .join(" and ")}`,
  undone: "Undone",
  redone: "Redone",
}

// Stable for the canvas's life except when the mode, words or lock change,
// so the parts that read it don't re-render while the graph changes.
/** A kind of node people can add from the library. */
type CanvasLibraryEntry = {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  /** The group it's listed under. */
  group?: string
  /** The node to add, at a point on the canvas. */
  create: (position: CanvasPosition) => CanvasNode
}

type CanvasContextValue = {
  api: CanvasApi<CanvasNode, CanvasData>
  mode: CanvasMode
  labels: CanvasLabels
  /** Edits are allowed: edit mode, not locked, not disabled. */
  isEditable: boolean
  isLocked: boolean
  setLocked: (locked: boolean) => void
  gridSize: number
  /** Opens a node, as a double click or Enter does. */
  openNode: (id: string) => void
  /** Opens the list of targets a node can connect to. */
  openConnect: (nodeId: string) => void
  /** Opens the node search. */
  openSearch: () => void
  /** Adds a library item's node, at a point or the middle of the view. */
  addLibraryItem: (item: CanvasLibraryEntry, at?: CanvasPosition) => void
}

const CanvasContext = React.createContext<CanvasContextValue | null>(null)

/** The controller with its state; changes with every edit. */
const CanvasStateContext = React.createContext<CanvasController<
  CanvasNode,
  CanvasData
> | null>(null)

class CanvasContextError extends Error {
  constructor(part: string) {
    super(`${part} must be inside a <Canvas>.`)
    this.name = "CanvasContextError"
  }
}

function useCanvasContext(part: string) {
  const context = React.useContext(CanvasContext)
  if (!context) throw new CanvasContextError(part)
  return context
}

/**
 * The nearest Canvas's controller: its nodes, edges, selection and history,
 * and every method. A component that calls it re-renders on every change.
 */
function useCanvas() {
  const controller = React.useContext(CanvasStateContext)
  if (!controller) throw new CanvasContextError("useCanvas")
  return controller
}

type CanvasNodeState = {
  id: string
  /** The node's title, for screen readers and menus. */
  name: string
  /** Its connections and state, in words. */
  description: string
  status?: CanvasNodeStatus
  color?: CanvasNode["color"]
  invalid?: string
  isSelected: boolean
  isDragging: boolean
  isPending: boolean
  isConnectable: boolean
  /** Ports an edge plugs into, by `getPortKey`, so they show as connected. */
  connectedPorts: ReadonlySet<string>
}

const CanvasNodeContext = React.createContext<CanvasNodeState | null>(null)

function useCanvasNode() {
  const node = React.useContext(CanvasNodeContext)
  if (!node) throw new CanvasContextError("useCanvasNode")
  return node
}

/** The node's title, for announcements and menus: `data.title`, `data.label`, else its id. */
function getNodeName(node: CanvasNode) {
  const { title, label, name } = node.data
  if (typeof title === "string" && title) return title
  if (typeof label === "string" && label) return label
  if (typeof name === "string" && name) return name
  return node.id
}

export {
  CANVAS_LABELS,
  CanvasContext,
  CanvasContextError,
  CanvasNodeContext,
  CanvasStateContext,
  getNodeName,
  useCanvas,
  useCanvasContext,
  useCanvasNode,
  type CanvasContextValue,
  type CanvasLabels,
  type CanvasLibraryEntry,
  type CanvasMode,
  type CanvasNodeState,
}
