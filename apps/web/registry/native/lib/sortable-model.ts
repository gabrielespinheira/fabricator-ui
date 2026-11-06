// How a dragged row picks its place. The same rule as the website's adapter
// (lib/sortable.tsx): a row counts once the pointer crosses its centre, so rows
// of different heights don't swap back and forth. Worklets: gestures run these
// on the UI thread.

export type SortableMove = {
  id: string
  fromGroup: string
  fromIndex: number
  toGroup: string
  toIndex: number
}

export type SortableRow = { index: number; start: number; size: number }

/** How strongly a row is a drop target, or null when it isn't one. */
export function getRowCollisionValue({
  pointerY,
  rowCenterY,
  rowIndex,
  sourceIndex,
}: {
  pointerY: number
  rowCenterY: number
  rowIndex: number
  sourceIndex: number
}) {
  "worklet"
  if (rowIndex === sourceIndex) return 0
  const hasCrossed =
    rowIndex < sourceIndex ? pointerY <= rowCenterY : pointerY >= rowCenterY
  return hasCrossed ? Math.abs(rowIndex - sourceIndex) : null
}

/** The index a drop lands on: the farthest row the pointer crossed. */
export function getDropIndex(
  rows: SortableRow[],
  sourceIndex: number,
  pointer: number
) {
  "worklet"
  let target = sourceIndex
  let best = 0
  for (const row of rows) {
    const value = getRowCollisionValue({
      pointerY: pointer,
      rowCenterY: row.start + row.size / 2,
      rowIndex: row.index,
      sourceIndex,
    })
    if (value !== null && value > best) {
      best = value
      target = row.index
    }
  }
  return target
}

/** How far a neighbour slides aside while another row is dragged over it. */
export function getRowShift({
  index,
  sourceIndex,
  targetIndex,
  sourceSize,
}: {
  index: number
  sourceIndex: number
  targetIndex: number
  sourceSize: number
}) {
  "worklet"
  if (sourceIndex < 0 || index === sourceIndex) return 0
  if (index > sourceIndex && index <= targetIndex) return -sourceSize
  if (index < sourceIndex && index >= targetIndex) return sourceSize
  return 0
}
