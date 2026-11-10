export function getWheelIndex(items: number[], value: number) {
  return items.reduce(
    (nearest, item, index) =>
      Math.abs(item - value) < Math.abs((items[nearest] ?? item) - value)
        ? index
        : nearest,
    0
  )
}
export function getScrollWheelIndex(
  offset: number,
  height: number,
  count: number
) {
  return Math.max(0, Math.min(count - 1, Math.round(offset / height)))
}
