import * as React from "react"
import { cn } from "cn"
import { View, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"

import {
  getHandleValue,
  getInitialLayout,
  layoutFromMap,
  layoutToMap,
  resizeLayout,
  type Layout,
  type PanelConstraints,
} from "@/registry/native/lib/resizable-model"
import { renderTextChildren } from "@/registry/native/ui/text"

// react-resizable-panels' props on flex: a panel's share of the group is its
// flex-grow, so sizes add up however wide the group is.

type Orientation = "horizontal" | "vertical"

// How far increment and decrement move a handle, in percent of the group.
const ACCESSIBILITY_STEP = 5

const PanelIndexContext = React.createContext(-1)

const ResizableGroupContext = React.createContext<{
  orientation: Orientation
  isDisabled: boolean
  layout: readonly number[]
  panels: readonly PanelConstraints[]
  groupSize: number
  setLayout: (layout: readonly number[]) => void
  commit: (isUserInteraction: boolean) => void
} | null>(null)

function useResizableGroup() {
  const context = React.use(ResizableGroupContext)
  if (!context) {
    throw new Error(
      "Resizable parts must be used within a <ResizablePanelGroup />"
    )
  }
  return context
}

type ResizablePanelProps = React.ComponentProps<typeof View> &
  PanelConstraints & {
    /** The key this panel has in a saved layout. */
    id?: string
    onResize?: (
      panelSize: { asPercentage: number; inPixels: number },
      id: string | undefined,
      previousSize: { asPercentage: number; inPixels: number } | undefined
    ) => void
  }

function ResizablePanelGroup({
  className,
  orientation,
  direction,
  defaultLayout,
  disabled = false,
  onLayoutChange,
  onLayoutChanged,
  children,
  onLayout,
  ...props
}: React.ComponentProps<typeof View> & {
  orientation?: Orientation
  /** The name older versions of the library had for `orientation`. */
  direction?: Orientation
  /** A layout saved from `onLayoutChanged`. */
  defaultLayout?: Layout
  disabled?: boolean
  /** Each time the layout moves, as a drag does. */
  onLayoutChange?: (layout: Layout) => void
  /** When the layout has landed: what to save. */
  onLayoutChanged?: (
    layout: Layout,
    meta: { isUserInteraction: boolean }
  ) => void
}) {
  const resolvedOrientation = orientation ?? direction ?? "horizontal"
  const parts = React.Children.toArray(children)
  const panelElements = parts.filter(
    (part): part is React.ReactElement<ResizablePanelProps> =>
      React.isValidElement(part) && part.type === ResizablePanel
  )
  const panels = panelElements.map(({ props: panel }) => ({
    defaultSize: panel.defaultSize,
    minSize: panel.minSize,
    maxSize: panel.maxSize,
    disabled: panel.disabled,
  }))
  const ids = panelElements.map(
    ({ props: panel }, index) => panel.id ?? `panel-${index}`
  )
  const getStartingLayout = (groupSize: number) =>
    (defaultLayout && layoutFromMap(defaultLayout, ids)) ??
    getInitialLayout(panels, groupSize)

  const [layout, setLayoutState] = React.useState<readonly number[]>(() =>
    getStartingLayout(0)
  )
  const [groupSize, setGroupSize] = React.useState(0)
  const hasMoved = React.useRef(false)
  // A drag can end before its last move has rendered: what's saved is the latest.
  const latestLayout = React.useRef(layout)
  latestLayout.current = layout

  // Sizes in pixels only mean something once the group has a size.
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    const size = resolvedOrientation === "horizontal" ? width : height
    if (size !== groupSize && !hasMoved.current) {
      setLayoutState(getStartingLayout(size))
    }
    setGroupSize(size)
    onLayout?.(event)
  }

  if (layout.length !== panels.length) {
    setLayoutState(getStartingLayout(groupSize))
  }

  const context = {
    orientation: resolvedOrientation,
    isDisabled: disabled,
    layout,
    panels,
    groupSize,
    setLayout(next: readonly number[]) {
      hasMoved.current = true
      latestLayout.current = next
      setLayoutState(next)
      onLayoutChange?.(layoutToMap(next, ids))
    },
    commit(isUserInteraction: boolean) {
      onLayoutChanged?.(layoutToMap(latestLayout.current, ids), {
        isUserInteraction,
      })
    },
  }

  let panelIndex = -1
  return (
    <ResizableGroupContext value={context}>
      <View
        data-slot="resizable-panel-group"
        data-orientation={resolvedOrientation}
        onLayout={handleLayout}
        className={cn(
          "cn-resizable-panel-group h-full w-full",
          resolvedOrientation === "vertical" ? "flex-col" : "flex-row",
          className
        )}
        {...props}
      >
        {parts.map((part, index) => {
          if (React.isValidElement(part) && part.type === ResizablePanel) {
            panelIndex += 1
          }
          return (
            <PanelIndexContext
              key={React.isValidElement(part) ? part.key : index}
              value={panelIndex}
            >
              {part}
            </PanelIndexContext>
          )
        })}
      </View>
    </ResizableGroupContext>
  )
}

function ResizablePanel({
  className,
  children,
  style,
  id,
  defaultSize: _defaultSize,
  minSize: _minSize,
  maxSize: _maxSize,
  disabled: _disabled,
  onResize,
  ...props
}: ResizablePanelProps) {
  const { layout, groupSize } = useResizableGroup()
  const index = React.use(PanelIndexContext)
  const size = layout[index] ?? 0

  const previousSize = React.useRef<
    { asPercentage: number; inPixels: number } | undefined
  >(undefined)
  const onResizeRef = React.useRef(onResize)
  onResizeRef.current = onResize
  React.useEffect(() => {
    const current = {
      asPercentage: size,
      inPixels: (size / 100) * groupSize,
    }
    onResizeRef.current?.(current, id, previousSize.current)
    previousSize.current = current
  }, [groupSize, id, size])

  return (
    <View
      data-slot="resizable-panel"
      className={cn("min-h-0 min-w-0 overflow-hidden", className)}
      style={[{ flexGrow: size, flexShrink: 1, flexBasis: 0 }, style]}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function ResizableHandle({
  withHandle,
  className,
  disabled = false,
  accessibilityLabel = "Resize panels",
  ...props
}: React.ComponentProps<typeof View> & {
  withHandle?: boolean
  disabled?: boolean
}) {
  const group = useResizableGroup()
  const handleIndex = React.use(PanelIndexContext)
  const isDisabled = disabled || group.isDisabled
  const [isDragging, setIsDragging] = React.useState(false)

  // The gesture outlives a render: it reads the group as it is now.
  const latest = React.useRef(group)
  latest.current = group
  const startLayout = React.useRef(group.layout)

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(!isDisabled)
        .onBegin(() => {
          startLayout.current = latest.current.layout
          setIsDragging(true)
        })
        .onUpdate((event) => {
          const { orientation, panels, groupSize, setLayout } = latest.current
          if (groupSize === 0) return
          const moved =
            orientation === "horizontal"
              ? event.translationX
              : event.translationY
          setLayout(
            resizeLayout(
              startLayout.current,
              panels,
              handleIndex,
              (moved / groupSize) * 100,
              groupSize
            )
          )
        })
        .onEnd(() => latest.current.commit(true))
        .onFinalize(() => setIsDragging(false)),
    [handleIndex, isDisabled]
  )

  const value = getHandleValue(
    group.layout,
    group.panels,
    handleIndex,
    group.groupSize
  )
  const step = (delta: number) => {
    group.setLayout(
      resizeLayout(
        group.layout,
        group.panels,
        handleIndex,
        delta,
        group.groupSize
      )
    )
    group.commit(true)
  }

  return (
    <GestureDetector gesture={pan}>
      <View
        data-slot="resizable-handle"
        data-orientation={group.orientation}
        collapsable={false}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: isDisabled }}
        accessibilityValue={{
          min: Math.round(value.min),
          max: Math.round(value.max),
          now: Math.round(value.now),
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (isDisabled) return
          if (nativeEvent.actionName === "increment") step(ACCESSIBILITY_STEP)
          if (nativeEvent.actionName === "decrement") step(-ACCESSIBILITY_STEP)
        }}
        className={cn(
          "cn-resizable-handle items-center justify-center",
          className
        )}
        {...props}
      >
        <View
          data-orientation={group.orientation}
          data-dragging={isDragging}
          className="cn-resizable-handle-line"
        />
        {withHandle && (
          <View
            data-orientation={group.orientation}
            data-dragging={isDragging}
            className="cn-resizable-handle-icon absolute z-10 shrink-0"
          />
        )}
      </View>
    </GestureDetector>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
