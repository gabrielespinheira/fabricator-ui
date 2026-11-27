import * as React from "react"
import {
  CircleCheckIcon,
  CircleXIcon,
  PlusIcon,
  SkipForwardIcon,
  TriangleAlertIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { View, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { runOnJS } from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { type CanvasSide } from "@/registry/fabricator/shared/lib/canvas-geometry"
import {
  type CanvasData,
  type CanvasHandleKind,
  type CanvasNodeStatus as CanvasRunStatus,
} from "@/registry/fabricator/shared/lib/canvas-model"
import { getHandleKey } from "@/registry/fabricator/shared/lib/canvas-validation"
import { useCanvasSurface } from "@/registry/native/lib/canvas-surface"
import { usePaletteMark } from "@/registry/native/lib/palette-color"
import {
  useCanvasContext,
  useCanvasNode,
} from "@/registry/native/ui/canvas-context"
import { Spinner } from "@/registry/native/ui/spinner"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// A Canvas node and its parts on React Native: the same frame, header, icon
// tile, title, status, content, footer, handles, toolbar and resize grip as
// the website, drawn with views. The engine wraps each node with its
// gestures and its accessibility actions; these parts only draw.

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
 * data (`CanvasNodeProps<PromptData>`) fits `nodeTypes`.
 */
type CanvasNodeComponent = {
  render(props: CanvasNodeProps): React.ReactNode
}["render"]

function parseNumber(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : fallback
}

function CanvasNode({
  variant = "default",
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  variant?: "default" | "note" | "group" | "placeholder"
}) {
  const node = useCanvasNode()
  const resolveMark = usePaletteMark()
  const mark = node.color ? resolveMark(node.color) : null
  return (
    <View
      data-slot="canvas-node"
      data-variant={variant}
      data-status={node.status ?? "idle"}
      data-selected={node.isSelected}
      data-dragging={node.isDragging}
      data-invalid={Boolean(node.invalid)}
      data-pending={node.isPending}
      data-colored={Boolean(node.color)}
      className={cn("cn-canvas-node relative", className)}
      {...props}
    >
      <CanvasNodeColorContext.Provider value={mark}>
        {children}
      </CanvasNodeColorContext.Provider>
    </View>
  )
}

const CanvasNodeColorContext = React.createContext<string | null>(null)

// Icons take the palette colour through their `color` prop: a colour picked
// at runtime has no class to compile.
function tintIcons(children: React.ReactNode, color: string) {
  return React.Children.map(children, (child) =>
    React.isValidElement<{ color?: string }>(child)
      ? React.cloneElement(child, { color })
      : child
  )
}

function CanvasNodeHeader({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="canvas-node-header"
      className={cn("cn-canvas-node-header flex-row items-center", className)}
      {...props}
    />
  )
}

function CanvasNodeIcon({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const color = React.useContext(CanvasNodeColorContext)
  return (
    <View
      data-slot="canvas-node-icon"
      data-colored={color !== null}
      importantForAccessibility="no-hide-descendants"
      className={cn(
        "cn-canvas-node-icon items-center justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      {color && (
        // The palette colour at a sixth, as the website's tile mixes it.
        <View
          pointerEvents="none"
          className="absolute inset-0"
          style={{ backgroundColor: color, opacity: 0.16 }}
        />
      )}
      <TextStyle className="cn-canvas-node-icon-text">
        {color ? tintIcons(children, color) : children}
      </TextStyle>
    </View>
  )
}

function CanvasNodeTitle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="canvas-node-title"
      numberOfLines={1}
      className={cn("cn-canvas-node-title min-w-0 flex-1", className)}
      {...props}
    >
      {children}
    </Text>
  )
}

function CanvasNodeDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="canvas-node-description"
      numberOfLines={3}
      className={cn("cn-canvas-node-description", className)}
      {...props}
    />
  )
}

/** Drops away below the compact zoom, where it would be too small to read. */
function CanvasNodeContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { level } = useCanvasLevel()
  if (level !== "full") return null
  return (
    <View
      data-slot="canvas-node-content"
      className={cn("cn-canvas-node-content min-w-0", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function CanvasNodeFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const node = useCanvasNode()
  const content = children ?? node.invalid
  if (!content) return null
  return (
    <View
      data-slot="canvas-node-footer"
      data-invalid={Boolean(node.invalid)}
      className={cn("cn-canvas-node-footer flex-row items-center", className)}
      {...props}
    >
      <TextStyle className="cn-canvas-node-footer-text">
        {renderTextChildren(content)}
      </TextStyle>
    </View>
  )
}

/** The node's run state as an icon; colour never carries it alone. */
function CanvasNodeStatus({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const node = useCanvasNode()
  const { labels } = useCanvasContext("CanvasNodeStatus")
  const [iconToken] = useCSSVariable(["--density-icon-16"])
  const size = parseNumber(iconToken, 16)
  const status = node.status ?? "idle"
  if (status === "idle") return null
  return (
    <View
      data-slot="canvas-node-status"
      data-status={status}
      accessibilityRole="image"
      accessibilityLabel={labels.status[status]}
      className={cn(
        "cn-canvas-node-status items-center justify-center",
        className
      )}
      {...props}
    >
      <TextStyle className="cn-canvas-node-status-text" data-status={status}>
        {status === "running" ? (
          <Spinner variant="ring" />
        ) : status === "success" ? (
          <CircleCheckIcon size={size} />
        ) : status === "warning" ? (
          <TriangleAlertIcon size={size} />
        ) : status === "error" ? (
          <CircleXIcon size={size} />
        ) : (
          <SkipForwardIcon size={size} />
        )}
      </TextStyle>
    </View>
  )
}

type CanvasHandleProps = Omit<
  React.ComponentProps<typeof View>,
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

const HANDLE_POSITIONS: Record<CanvasSide, (size: number) => object> = {
  left: (size) => ({ left: -size / 2, top: "50%", marginTop: -size / 2 }),
  right: (size) => ({ right: -size / 2, top: "50%", marginTop: -size / 2 }),
  top: (size) => ({ top: -size / 2, left: "50%", marginLeft: -size / 2 }),
  bottom: (size) => ({ bottom: -size / 2, left: "50%", marginLeft: -size / 2 }),
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
  style,
  ...props
}: CanvasHandleProps) {
  const node = useCanvasNode()
  const { api, isEditable, labels, mode } = useCanvasContext("CanvasHandle")
  const surface = useCanvasSurface("CanvasHandle")
  const handleId = id ?? null
  const acceptsKey = accepts?.join("|")
  const { registerHandle } = api
  const [sizeToken] = useCSSVariable(["--density-24"])
  const size = parseNumber(sizeToken, 24)

  const spec = React.useMemo(
    () => ({
      id: handleId,
      nodeId: node.id,
      kind,
      side,
      accepts: acceptsKey?.split("|"),
      produces,
      max,
      label,
    }),
    [handleId, node.id, kind, side, acceptsKey, produces, max, label]
  )
  React.useEffect(() => registerHandle(spec), [registerHandle, spec])

  const key = getHandleKey(node.id, kind, handleId)
  const onLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout
    surface.reportHandle(key, { x: x + width / 2, y: y + height / 2 })
  }

  const canConnect = isEditable && node.isConnectable
  const pan = Gesture.Pan()
    .enabled(canConnect)
    .minDistance(4)
    .onStart(() => {
      runOnJS(surface.beginConnection)(spec)
    })
    .onUpdate((event) => {
      runOnJS(surface.moveConnection)({
        x: event.translationX,
        y: event.translationY,
      })
    })
    .onFinalize(() => {
      runOnJS(surface.endConnection)()
    })

  if (mode !== "edit") return null
  return (
    <GestureDetector gesture={pan}>
      <View
        data-slot="canvas-handle"
        data-kind={kind}
        data-side={side}
        accessibilityLabel={
          label ? `${label}, ${labels.handle}` : labels.handle
        }
        importantForAccessibility="no"
        onLayout={onLayout}
        hitSlop={10}
        className={cn(
          "cn-canvas-handle absolute items-center justify-center",
          className
        )}
        style={[
          { width: size, height: size, ...HANDLE_POSITIONS[side](size) },
          style,
        ]}
        {...props}
      >
        <View data-slot="canvas-handle-dot" className="cn-canvas-handle-dot" />
        {label && (
          <Text
            data-slot="canvas-handle-label"
            data-side={side}
            numberOfLines={1}
            className="cn-canvas-handle-label absolute"
          >
            {label}
          </Text>
        )}
      </View>
    </GestureDetector>
  )
}

/** Floats over the selected node; actions for it go here. */
function CanvasNodeToolbar({
  side = "top",
  isVisible,
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  side?: CanvasSide
  /** Shown while the node is selected unless set. */
  isVisible?: boolean
}) {
  const node = useCanvasNode()
  const { mode } = useCanvasContext("CanvasNodeToolbar")
  if (!(isVisible ?? (node.isSelected && mode !== "static"))) return null
  return (
    <View
      data-slot="canvas-node-toolbar"
      data-side={side}
      className={cn(
        "cn-canvas-node-toolbar absolute flex-row items-center self-center",
        className
      )}
      {...props}
    >
      {children}
    </View>
  )
}

/** A grip in the bottom end corner to resize the selected node. */
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
  const surface = useCanvasSurface("CanvasNodeResizer")
  const start = React.useRef({ width: 0, height: 0 })
  const frame = React.useRef({ width: 0, height: 0 })

  const begin = () => {
    start.current = { ...frame.current }
  }
  const resize = (dx: number, dy: number) => {
    const width = Math.max(minWidth, start.current.width + dx)
    const height = keepAspectRatio
      ? (width / Math.max(1, start.current.width)) * start.current.height
      : Math.max(minHeight, start.current.height + dy)
    surface.resizeNode(node.id, { width, height })
  }
  const { zoom } = surface
  const pan = Gesture.Pan()
    .onStart(() => {
      runOnJS(begin)()
    })
    .onUpdate((event) => {
      const scale = zoom.get()
      runOnJS(resize)(event.translationX / scale, event.translationY / scale)
    })

  if (!node.isSelected || !isEditable) return null
  return (
    <>
      <View
        pointerEvents="none"
        onLayout={(event) => {
          frame.current = event.nativeEvent.layout
        }}
        className="cn-canvas-node-resizer-line absolute inset-0"
      />
      <GestureDetector gesture={pan}>
        <View
          hitSlop={16}
          className="cn-canvas-node-resizer-handle absolute -right-1 -bottom-1"
        />
      </GestureDetector>
    </>
  )
}

const CanvasLevelContext = React.createContext<{
  level: "full" | "compact" | "outline"
}>({
  level: "full",
})

function useCanvasLevel() {
  return React.use(CanvasLevelContext)
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
      <CanvasNodeFooter />
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
      <Text data-slot="canvas-note-text" className="cn-canvas-note-text">
        {readString(data, "text") ?? readString(data, "label")}
      </Text>
    </CanvasNode>
  )
}

/** A frame other nodes sit in. */
function CanvasGroupNode({ data }: CanvasNodeProps) {
  return (
    <CanvasNode variant="group">
      <CanvasNodeResizer minWidth={160} minHeight={96} />
      <Text
        data-slot="canvas-group-label"
        className="cn-canvas-group-label absolute"
      >
        {readString(data, "label") ?? readString(data, "title")}
      </Text>
    </CanvasNode>
  )
}

/** Holds a place for a node not chosen yet, such as the next step. */
function CanvasPlaceholderNode({ data }: CanvasNodeProps) {
  const [iconToken] = useCSSVariable(["--density-icon-16"])
  return (
    <CanvasNode variant="placeholder">
      <TextStyle className="cn-canvas-placeholder-text">
        <PlusIcon size={parseNumber(iconToken, 16)} />
        <Text numberOfLines={1}>{readString(data, "label")}</Text>
      </TextStyle>
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
  CanvasLevelContext,
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
