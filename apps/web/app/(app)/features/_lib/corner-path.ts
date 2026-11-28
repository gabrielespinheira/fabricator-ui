// SVG outlines of a rounded square, to compare corner shapes at any size.
// Exponent 2 is a circular corner; CSS `superellipse(k)` is exponent 2^k.

type CornerPathOptions = {
  size: number
  radius: number
  exponent: number
  /** Points per corner. */
  steps?: number
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

// One corner, centred at (cx, cy), from `start` to `end` radians.
function getCornerPoints(
  cx: number,
  cy: number,
  radius: number,
  exponent: number,
  start: number,
  steps: number
) {
  const power = 2 / exponent
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = start + (index / steps) * (Math.PI / 2)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [
      cx + radius * Math.sign(cos) * Math.abs(cos) ** power,
      cy + radius * Math.sign(sin) * Math.abs(sin) ** power,
    ]
  })
}

export function getCornerPath({
  size,
  radius: requestedRadius,
  exponent,
  steps = 32,
}: CornerPathOptions) {
  const radius = Math.min(requestedRadius, size / 2)
  const near = radius
  const far = size - radius
  // Clockwise from the top edge, in SVG's y-down space.
  const corners = [
    getCornerPoints(far, near, radius, exponent, -Math.PI / 2, steps),
    getCornerPoints(far, far, radius, exponent, 0, steps),
    getCornerPoints(near, far, radius, exponent, Math.PI / 2, steps),
    getCornerPoints(near, near, radius, exponent, Math.PI, steps),
  ]
  const points = corners
    .flat()
    .map(([x, y]) => `L${round(x ?? 0)} ${round(y ?? 0)}`)
  return `M${round(near)} 0 ${points.join(" ")} Z`
}
