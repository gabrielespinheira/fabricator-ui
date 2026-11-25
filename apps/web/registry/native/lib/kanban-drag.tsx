import * as React from "react"
import { type ScrollView, type View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"

import { getKanbanScrollSpeed } from "@/registry/fabricator/shared/lib/kanban-model"
import { useFeedback } from "@/registry/native/lib/feedback"

type Node = React.ComponentRef<typeof View>
type Column = { columnId: string; laneId: string | null }
type Target = Column & { index: number }
type Bounds = { left: number; top: number; right: number; bottom: number }
type Registration = { node: Node; column: Column; index?: number }

function measure(node: Node) {
  return new Promise<Bounds>((resolve) => {
    node.measureInWindow((left, top, width, height) =>
      resolve({ left, top, right: left + width, bottom: top + height })
    )
  })
}

function contains(bounds: Bounds, x: number, y: number) {
  return (
    x >= bounds.left &&
    x <= bounds.right &&
    y >= bounds.top &&
    y <= bounds.bottom
  )
}

function useKanbanDrag(onDrop: (id: string, target: Target) => void) {
  const elements = React.useRef(new Map<string, Registration>())
  const scroller = React.useRef<React.ComponentRef<typeof ScrollView>>(null)
  const scrollerBounds = React.useRef<Bounds | null>(null)
  const scrollOffset = React.useRef(0)
  const alive = React.useRef(true)
  const left = useSharedValue(0)
  const top = useSharedValue(0)
  const originX = useSharedValue(0)
  const originY = useSharedValue(0)
  const grabX = useSharedValue(0)
  const grabY = useSharedValue(0)
  const pointer = React.useRef(0)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [target, setTarget] = React.useState<Target | null>(null)
  // Where everything was when the card was picked up, for finding the slot as
  // the finger moves. The drop itself measures again.
  const layout = React.useRef<
    { column: Column; index?: number; bounds: Bounds }[]
  >([])
  const startOffset = React.useRef(0)
  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: left.value - originX.value - grabX.value },
      { translateY: top.value - originY.value - grabY.value },
      { rotate: "1.5deg" },
    ],
  }))

  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  function register(
    key: string,
    node: Node | null,
    column: Column,
    index?: number
  ) {
    if (node) elements.current.set(key, { node, column, index })
    else elements.current.delete(key)
  }

  function start(id: string, x: number, offsetX: number, offsetY: number) {
    pointer.current = x
    grabX.set(offsetX)
    grabY.set(offsetY)
    startOffset.current = scrollOffset.current
    setActiveId(id)
    void Promise.all(
      [...elements.current.values()].map(async ({ node, column, index }) => ({
        column,
        index,
        bounds: await measure(node),
      }))
    ).then((entries) => {
      layout.current = entries
    })
    scroller.current?.measureInWindow((left, top, width, height) => {
      originX.set(left)
      originY.set(top)
      scrollerBounds.current = {
        left,
        top,
        right: left + width,
        bottom: top + height,
      }
    })
  }

  React.useEffect(() => {
    if (!activeId) return
    let frame = 0
    function scroll() {
      const bounds = scrollerBounds.current
      if (bounds) {
        const amount = getKanbanScrollSpeed(
          pointer.current,
          bounds.left,
          bounds.right
        )
        if (amount !== 0) {
          scrollOffset.current = Math.max(0, scrollOffset.current + amount)
          scroller.current?.scrollTo({
            x: scrollOffset.current,
            animated: false,
          })
        }
      }
      frame = requestAnimationFrame(scroll)
    }
    frame = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(frame)
  }, [activeId])

  function track(x: number, y: number) {
    pointer.current = x
    // The board may have scrolled sideways under the finger since.
    const boardX = x + scrollOffset.current - startOffset.current
    const column = layout.current.find(
      ({ index, bounds }) => index === undefined && contains(bounds, boardX, y)
    )?.column
    if (!column) return setTarget(null)
    const cards = layout.current
      .filter(
        (entry) =>
          entry.index !== undefined &&
          entry.column.columnId === column.columnId &&
          entry.column.laneId === column.laneId
      )
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const next = cards.find(
      ({ bounds }) => y < (bounds.top + bounds.bottom) / 2
    )
    const index = next?.index ?? (cards.at(-1)?.index ?? -1) + 1
    setTarget((old) =>
      old?.columnId === column.columnId &&
      old.laneId === column.laneId &&
      old.index === index
        ? old
        : { ...column, index }
    )
  }

  async function drop(id: string, x: number, y: number) {
    const entries = [...elements.current.values()]
    const columns = await Promise.all(
      entries
        .filter(({ index }) => index === undefined)
        .map(async (entry) => ({ ...entry, bounds: await measure(entry.node) }))
    )
    const target = columns.find(({ bounds }) => contains(bounds, x, y))
    if (!target || !alive.current) return
    const cards = await Promise.all(
      entries
        .filter(
          ({ index, column }) =>
            index !== undefined &&
            column.columnId === target.column.columnId &&
            column.laneId === target.column.laneId
        )
        .map(async (entry) => ({
          index: entry.index ?? 0,
          bounds: await measure(entry.node),
        }))
    )
    if (!alive.current) return
    const visible = cards
      .filter(
        ({ bounds }) =>
          bounds.bottom >= target.bounds.top &&
          bounds.top <= target.bounds.bottom
      )
      .sort((a, b) => a.index - b.index)
    const next = visible.find(
      ({ bounds }) => y < (bounds.top + bounds.bottom) / 2
    )
    const last = visible.at(-1)
    onDrop(id, {
      ...target.column,
      index: next?.index ?? (last ? last.index + 1 : 0),
    })
  }

  return {
    register,
    left,
    top,
    start,
    track,
    drop,
    finish: () => {
      setActiveId(null)
      setTarget(null)
      layout.current = []
    },
    scroller,
    scrollOffset,
    activeId,
    target,
    overlayStyle,
  }
}

type KanbanNativeDrag = ReturnType<typeof useKanbanDrag>

// A card answers a tap, so it is picked up with a hold. Scrolling keeps working
// until then.
const HOLD_MS = 280

function KanbanDragArea({
  drag,
  id,
  disabled,
  children,
}: {
  drag: KanbanNativeDrag
  id: string
  disabled: boolean
  children: React.ReactNode
}) {
  const { left, top, start, track, drop, finish } = drag
  const feedback = useFeedback()
  const pickUp = () => feedback("tick")
  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(HOLD_MS)
    .onStart((event) => {
      left.value = event.absoluteX
      top.value = event.absoluteY
      runOnJS(pickUp)()
      runOnJS(start)(id, event.absoluteX, event.x, event.y)
    })
    .onUpdate((event) => {
      left.value = event.absoluteX
      top.value = event.absoluteY
      runOnJS(track)(event.absoluteX, event.absoluteY)
    })
    .onEnd((event, success) => {
      if (success) runOnJS(drop)(id, event.absoluteX, event.absoluteY)
    })
    .onFinalize(() => {
      runOnJS(finish)()
    })
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>
}

/** The card under the finger, above the board. */
function KanbanNativeDragOverlay({
  drag,
  width,
  children,
}: {
  drag: KanbanNativeDrag
  width: number
  children: React.ReactNode
}) {
  if (!drag.activeId) return null
  return (
    <Animated.View
      pointerEvents="none"
      data-slot="kanban-drag-overlay"
      className="cn-kanban-drag-overlay absolute top-0 left-0"
      style={[{ width }, drag.overlayStyle]}
    >
      {children}
    </Animated.View>
  )
}

export {
  KanbanDragArea,
  KanbanNativeDragOverlay,
  useKanbanDrag,
  type KanbanNativeDrag,
}
