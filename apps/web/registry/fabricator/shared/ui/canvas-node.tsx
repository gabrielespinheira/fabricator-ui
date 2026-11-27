"use client"

// A Canvas node and its parts: the frame, a header with an icon tile, a
// title and a status, content that drops away when zoomed out, a footer,
// connection handles, a toolbar over the selected node, and resize grips.
// The frame is the focus target: a group (WAI-ARIA) named by its title and
// described by its connections, so arrow keys can walk the graph.
//
// Handle, NodeToolbar and NodeResizer come from React Flow; this file and
// canvas-engine.tsx are where the Canvas imports it.
import * as React from "react"
import {
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  useConnection,
} from "@xyflow/react"
import { cn } from "cn"

import { type CanvasSide } from "@/registry/bases/__base__/lib/canvas-geometry"
import {
  getPortKey,
  type CanvasData,
  type CanvasHandleKind,
  type CanvasNodeStatus as CanvasRunStatus,
} from "@/registry/bases/__base__/lib/canvas-model"
import { getPaletteVariables } from "@/registry/bases/__base__/lib/palette-model"
import {
  useCanvasContext,
  useCanvasNode,
} from "@/registry/bases/__base__/ui/canvas-context"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** What a node component receives. `data` is the node's own. */
type CanvasNodeProps<TData extends CanvasData = CanvasData> = {
  id: string
  type: string
  data: TData
  selected: boolean
  dragging: boolean
  isConnectable: boolean
  status?: CanvasRunStatus
  invalid?: string
  width?: number
  height?: number
}

/**
 * A node component. Typed as a method so a component written for its own
 * data (`CanvasNodeProps<PromptData>`) fits `nodeTypes`, the way React's
 * event handler types do.
 */
type CanvasNodeComponent = {
  render(props: CanvasNodeProps): React.ReactNode
}["render"]

const POSITIONS: Record<CanvasSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

function CanvasNode({
  variant = "default",
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "note" | "group" | "placeholder"
}) {
  const node = useCanvasNode()
  const { labels, openNode } = useCanvasContext("CanvasNode")
  const describedBy = React.useId()
  const palette = node.color ? getPaletteVariables(node.color) : undefined

  return (
    <div
      data-slot="canvas-node"
      data-node-id={node.id}
      data-variant={variant}
      data-status={node.status ?? "idle"}
      data-selected={node.isSelected || undefined}
      data-dragging={node.isDragging || undefined}
      data-invalid={node.invalid ? true : undefined}
      data-pending={node.isPending || undefined}
      data-colored={palette ? true : undefined}
      role="group"
      aria-roledescription={labels.node}
      aria-label={node.name}
      aria-describedby={describedBy}
      tabIndex={0}
      onDoubleClick={() => openNode(node.id)}
      className={cn(
        "cn-canvas-node group/canvas-node relative flex flex-col",
        className
      )}
      style={{ ...palette, ...style }}
      {...props}
    >
      {children}
      <span id={describedBy} className="sr-only">
        {node.description}
      </span>
    </div>
  )
}

function CanvasNodeHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-node-header"
      className={cn(
        "cn-canvas-node-header flex min-w-0 items-center",
        className
      )}
      {...props}
    />
  )
}

function CanvasNodeIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="canvas-node-icon"
      aria-hidden
      className={cn(
        "cn-canvas-node-icon flex shrink-0 items-center justify-center",
        className
      )}
      {...props}
    />
  )
}

function CanvasNodeTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-node-title"
      className={cn("cn-canvas-node-title min-w-0 flex-1 truncate", className)}
      {...props}
    />
  )
}

function CanvasNodeDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="canvas-node-description"
      className={cn("cn-canvas-node-description", className)}
      {...props}
    />
  )
}

/** Drops away below the compact zoom, where it would be too small to read. */
function CanvasNodeContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-node-content"
      className={cn("cn-canvas-node-content min-w-0", className)}
      {...props}
    />
  )
}

function CanvasNodeFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const node = useCanvasNode()
  return (
    <div
      data-slot="canvas-node-footer"
      className={cn(
        "cn-canvas-node-footer flex min-w-0 items-center",
        className
      )}
      {...props}
    >
      {props.children ?? node.invalid}
    </div>
  )
}

const STATUS_ICONS: Record<
  Exclude<CanvasRunStatus, "idle" | "running">,
  React.ReactNode
> = {
  success: (
    <IconPlaceholder
      lucide="CircleCheckIcon"
      tabler="IconCircleCheckFilled"
      hugeicons="CheckmarkCircle01Icon"
      phosphor="CheckCircleIcon"
      remixicon="RiCheckboxCircleFill"
    />
  ),
  warning: (
    <IconPlaceholder
      lucide="TriangleAlertIcon"
      tabler="IconAlertTriangle"
      hugeicons="Alert02Icon"
      phosphor="WarningIcon"
      remixicon="RiErrorWarningLine"
    />
  ),
  error: (
    <IconPlaceholder
      lucide="CircleXIcon"
      tabler="IconCircleX"
      hugeicons="CancelCircleIcon"
      phosphor="XCircleIcon"
      remixicon="RiCloseCircleLine"
    />
  ),
  skipped: (
    <IconPlaceholder
      lucide="SkipForwardIcon"
      tabler="IconPlayerSkipForward"
      hugeicons="NextIcon"
      phosphor="SkipForwardIcon"
      remixicon="RiSkipForwardLine"
    />
  ),
}

/** The node's run state as an icon; colour never carries it alone. */
function CanvasNodeStatus({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const node = useCanvasNode()
  const { labels } = useCanvasContext("CanvasNodeStatus")
  const status = node.status ?? "idle"
  if (status === "idle") return null
  return (
    <span
      data-slot="canvas-node-status"
      data-status={status}
      role="img"
      aria-label={labels.status[status]}
      className={cn(
        "cn-canvas-node-status flex shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      {status === "running" ? (
        <Spinner variant="ring" aria-hidden />
      ) : (
        STATUS_ICONS[status]
      )}
    </span>
  )
}

type CanvasHandleProps = Omit<
  React.ComponentProps<"div">,
  "id" | "children"
> & {
  /** Unique among the node's handles of the same kind. */
  id?: string
  kind: CanvasHandleKind
  side: CanvasSide
  /** Value types a target takes; `*` takes any. */
  accepts?: readonly string[]
  /** The value type a source gives. */
  produces?: string
  /** Most connections the handle takes. */
  max?: number
  /** Shown beside the handle and read by screen readers. */
  label?: string
}

function CanvasHandle({
  id,
  kind,
  side,
  accepts,
  produces,
  max,
  label,
  className,
  ...props
}: CanvasHandleProps) {
  const node = useCanvasNode()
  const { api, isEditable, labels } = useCanvasContext("CanvasHandle")
  const handleId = id ?? null
  const acceptsKey = accepts?.join("|")
  const { registerHandle } = api

  React.useEffect(
    () =>
      registerHandle({
        id: handleId,
        nodeId: node.id,
        kind,
        side,
        accepts: acceptsKey?.split("|"),
        produces,
        max,
        label,
      }),
    [
      registerHandle,
      handleId,
      node.id,
      kind,
      side,
      acceptsKey,
      produces,
      max,
      label,
    ]
  )

  // Only this handle's own state, so a drag re-renders the handle it's over.
  const state = useConnection((connection) => {
    if (!connection.inProgress) return null
    const to = connection.toHandle
    const isOver =
      connection.toNode?.id === node.id &&
      to?.type === kind &&
      (to?.id ?? null) === handleId
    if (isOver) return connection.isValid ? "valid" : "invalid"
    const from = connection.fromHandle
    if (
      connection.fromNode.id === node.id &&
      from.type === kind &&
      (from.id ?? null) === handleId
    )
      return "source"
    return "connecting"
  })

  return (
    <Handle
      type={kind}
      position={POSITIONS[side]}
      id={handleId}
      isConnectable={isEditable && node.isConnectable}
      data-slot="canvas-handle"
      data-kind={kind}
      data-side={side}
      data-state={state ?? undefined}
      data-connected={
        node.connectedPorts.has(getPortKey(kind, handleId)) || undefined
      }
      aria-label={label ? `${label}, ${labels.handle}` : labels.handle}
      className={cn("cn-canvas-handle", className)}
      {...props}
    >
      <span
        data-slot="canvas-handle-dot"
        className="cn-canvas-handle-dot pointer-events-none block"
      />
      {label && (
        <span
          data-slot="canvas-handle-label"
          data-side={side}
          className="cn-canvas-handle-label pointer-events-none absolute whitespace-nowrap"
        >
          {label}
        </span>
      )}
    </Handle>
  )
}

/** Floats over the selected node; actions for it go here. */
function CanvasNodeToolbar({
  side = "top",
  isVisible,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  side?: CanvasSide
  /** Shown while the node is selected unless set. */
  isVisible?: boolean
}) {
  const node = useCanvasNode()
  const { mode } = useCanvasContext("CanvasNodeToolbar")
  return (
    <NodeToolbar
      nodeId={node.id}
      position={POSITIONS[side]}
      offset={8}
      isVisible={isVisible ?? (node.isSelected && mode !== "static")}
      data-slot="canvas-node-toolbar"
      className={cn("cn-canvas-node-toolbar flex items-center", className)}
      {...props}
    />
  )
}

// React Flow takes these as class props; the object form lets the style
// build find and replace the placeholders.
const resizerLineClass = { className: cn("cn-canvas-node-resizer-line") }
  .className
const resizerHandleClass = {
  className: cn("cn-canvas-node-resizer-handle"),
}.className

/** Grips to resize the selected node. */
function CanvasNodeResizer({
  minWidth = 120,
  minHeight = 48,
  keepAspectRatio,
}: {
  minWidth?: number
  minHeight?: number
  keepAspectRatio?: boolean
}) {
  const node = useCanvasNode()
  const { isEditable } = useCanvasContext("CanvasNodeResizer")
  return (
    <NodeResizer
      nodeId={node.id}
      isVisible={node.isSelected && isEditable}
      minWidth={minWidth}
      minHeight={minHeight}
      keepAspectRatio={keepAspectRatio}
      lineClassName={resizerLineClass}
      handleClassName={resizerHandleClass}
    />
  )
}

function readString(data: CanvasData, key: string) {
  const value = data[key]
  return typeof value === "string" ? value : undefined
}

function readIcon(data: CanvasData) {
  const value = data.icon
  return React.isValidElement(value) ? value : null
}

/**
 * The node drawn when a node has no type: an optional icon, its title and
 * description, a target before and a source after. `data.orientation:
 * "vertical"` puts them above and below.
 */
function CanvasDefaultNode({ data }: CanvasNodeProps) {
  const isVertical = data.orientation === "vertical"
  const icon = readIcon(data)
  const description = readString(data, "description")
  return (
    <CanvasNode>
      <CanvasNodeHeader>
        {icon && <CanvasNodeIcon>{icon}</CanvasNodeIcon>}
        <CanvasNodeTitle>
          {readString(data, "title") ?? readString(data, "label")}
        </CanvasNodeTitle>
        <CanvasNodeStatus />
      </CanvasNodeHeader>
      {description && (
        <CanvasNodeContent>
          <CanvasNodeDescription>{description}</CanvasNodeDescription>
        </CanvasNodeContent>
      )}
      <CanvasHandle kind="target" side={isVertical ? "top" : "left"} />
      <CanvasHandle kind="source" side={isVertical ? "bottom" : "right"} />
    </CanvasNode>
  )
}

/** A sticky note: text on a warm tint, resizable, no connections. */
function CanvasNoteNode({ data }: CanvasNodeProps) {
  return (
    <CanvasNode variant="note">
      <CanvasNodeResizer minWidth={120} minHeight={64} />
      <p data-slot="canvas-note-text" className="cn-canvas-note-text">
        {readString(data, "text") ?? readString(data, "label")}
      </p>
    </CanvasNode>
  )
}

/** A frame other nodes sit in; drag a node onto it to put it inside. */
function CanvasGroupNode({ data }: CanvasNodeProps) {
  return (
    <CanvasNode variant="group">
      <CanvasNodeResizer minWidth={160} minHeight={96} />
      <span data-slot="canvas-group-label" className="cn-canvas-group-label">
        {readString(data, "label") ?? readString(data, "title")}
      </span>
    </CanvasNode>
  )
}

/** Holds a place for a node not chosen yet, such as the next step. */
function CanvasPlaceholderNode({ data }: CanvasNodeProps) {
  return (
    <CanvasNode variant="placeholder">
      <IconPlaceholder
        lucide="PlusIcon"
        tabler="IconPlus"
        hugeicons="PlusSignIcon"
        phosphor="PlusIcon"
        remixicon="RiAddLine"
        aria-hidden
      />
      <span className="truncate">{readString(data, "label")}</span>
      <CanvasHandle kind="target" side="left" />
    </CanvasNode>
  )
}

const CANVAS_NODE_TYPES = {
  default: CanvasDefaultNode,
  note: CanvasNoteNode,
  group: CanvasGroupNode,
  placeholder: CanvasPlaceholderNode,
} satisfies Record<string, CanvasNodeComponent>

export {
  CANVAS_NODE_TYPES,
  CanvasDefaultNode,
  CanvasGroupNode,
  CanvasHandle,
  CanvasNode,
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
  CanvasPlaceholderNode,
  type CanvasHandleProps,
  type CanvasNodeComponent,
  type CanvasNodeProps,
}
