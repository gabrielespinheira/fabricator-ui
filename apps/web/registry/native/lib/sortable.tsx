// The one drag-and-drop adapter, as on the website: components import this file,
// never a gesture library's sorting, and keep a menu alternative of their own.
// A long press starts a drag, so the list still scrolls under a finger.
import * as React from "react"
import { Gesture } from "react-native-gesture-handler"
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"

import { useMotion } from "@/registry/native/lib/motion"
import {
  getDropIndex,
  getRowCollisionValue,
  getRowShift,
  type SortableMove,
  type SortableRow,
} from "@/registry/native/lib/sortable-model"

const DEFAULT_GROUP = "default"
// Long enough that a slow tap on a row that also navigates stays a tap: a drag
// taking over cancels the press.
const LONG_PRESS_MS = 400

type RowsByGroup = Record<string, Record<string, SortableRow>>

type SortableContextValue = {
  axis: "x" | "y"
  rows: SharedValue<RowsByGroup>
  activeId: SharedValue<string>
  activeGroup: SharedValue<string>
  sourceIndex: SharedValue<number>
  targetIndex: SharedValue<number>
  sourceSize: SharedValue<number>
  finish: (id: string, group: string, from: number, to: number) => void
  setDragging: (isDragging: boolean) => void
}

const SortableContext = React.createContext<SortableContextValue | null>(null)

function SortableProvider({
  axis = "y",
  onMove,
  onDraggingChange,
  children,
}: {
  /** The direction rows run in. */
  axis?: "x" | "y"
  /** Called once per drop that changed the order. */
  onMove: (move: SortableMove) => void
  onDraggingChange?: (isDragging: boolean) => void
  children: React.ReactNode
}) {
  const rows = useSharedValue<RowsByGroup>({})
  const activeId = useSharedValue("")
  const activeGroup = useSharedValue("")
  const sourceIndex = useSharedValue(-1)
  const targetIndex = useSharedValue(-1)
  const sourceSize = useSharedValue(0)
  const value = React.useMemo<SortableContextValue>(
    () => ({
      axis,
      rows,
      activeId,
      activeGroup,
      sourceIndex,
      targetIndex,
      sourceSize,
      setDragging: (isDragging) => onDraggingChange?.(isDragging),
      finish: (id, group, from, to) => {
        onDraggingChange?.(false)
        if (from === to) return
        onMove({
          id,
          fromGroup: group,
          fromIndex: from,
          toGroup: group,
          toIndex: to,
        })
      },
    }),
    [
      axis,
      rows,
      activeId,
      activeGroup,
      sourceIndex,
      targetIndex,
      sourceSize,
      onMove,
      onDraggingChange,
    ]
  )
  return <SortableContext value={value}>{children}</SortableContext>
}

/**
 * Makes a view sortable: wrap it in a `GestureDetector` with `gesture`, render
 * it as an `Animated.View`, and give it `style` and `onLayout`. Items only land
 * among items of their own group; moving between groups goes through a menu.
 */
function useSortableItem({
  id,
  index,
  group = DEFAULT_GROUP,
  disabled = false,
}: {
  id: string
  index: number
  group?: string
  disabled?: boolean
  hasVariableHeight?: boolean
}) {
  const context = React.use(SortableContext)
  if (!context) throw new Error("useSortableItem needs a SortableProvider.")
  const {
    axis,
    rows,
    activeId,
    activeGroup,
    sourceIndex,
    targetIndex,
    sourceSize,
    finish,
    setDragging,
  } = context
  const motion = useMotion("move")
  const translation = useSharedValue(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const duration = motion.isReduced ? 0 : motion.enterMs
  const easing = motion.moveEasing

  const onLayout = React.useCallback(
    (event: {
      nativeEvent: {
        layout: { x: number; y: number; width: number; height: number }
      }
    }) => {
      const { x, y, width, height } = event.nativeEvent.layout
      const row: SortableRow = {
        index,
        start: axis === "x" ? x : y,
        size: axis === "x" ? width : height,
      }
      rows.modify((current) => {
        "worklet"
        const next = { ...current }
        next[group] = { ...next[group], [id]: row }
        return next
      })
    },
    [axis, group, id, index, rows]
  )

  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
          const row = rows.value[group]?.[id]
          if (!row) return
          activeId.value = id
          activeGroup.value = group
          sourceIndex.value = row.index
          targetIndex.value = row.index
          sourceSize.value = row.size
          runOnJS(setIsDragging)(true)
          runOnJS(setDragging)(true)
        })
        .onUpdate((event) => {
          const distance =
            axis === "x" ? event.translationX : event.translationY
          translation.value = distance
          const row = rows.value[group]?.[id]
          if (!row) return
          targetIndex.value = getDropIndex(
            Object.values(rows.value[group] ?? {}),
            row.index,
            row.start + row.size / 2 + distance
          )
        })
        .onFinalize(() => {
          const from = sourceIndex.value
          const to = targetIndex.value
          if (activeId.value === id) {
            translation.value = withTiming(0, { duration, easing })
            sourceIndex.value = -1
            targetIndex.value = -1
            activeId.value = ""
            runOnJS(setIsDragging)(false)
            runOnJS(finish)(id, group, from, to)
          }
        }),
    [
      activeGroup,
      activeId,
      axis,
      disabled,
      duration,
      easing,
      finish,
      group,
      id,
      rows,
      setDragging,
      sourceIndex,
      sourceSize,
      targetIndex,
      translation,
    ]
  )

  const style = useAnimatedStyle(() => {
    const isActive = activeId.value === id
    const shift =
      activeGroup.value === group
        ? getRowShift({
            index,
            sourceIndex: sourceIndex.value,
            targetIndex: targetIndex.value,
            sourceSize: sourceSize.value,
          })
        : 0
    const offset = isActive
      ? translation.value
      : withTiming(shift, { duration, easing })
    return {
      zIndex: isActive ? 1 : 0,
      transform: [
        axis === "x" ? { translateX: offset } : { translateY: offset },
      ],
    }
  })

  return { gesture, style, onLayout, isDragging }
}

export {
  getRowCollisionValue,
  SortableProvider,
  useSortableItem,
  type SortableMove,
}
