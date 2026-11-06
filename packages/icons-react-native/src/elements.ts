import { createElement } from "react"
import {
  Circle,
  Ellipse,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
} from "react-native-svg"

import type { IconElement } from "./generated/runtime/types.js"

const ELEMENTS = {
  path: Path,
  circle: Circle,
  ellipse: Ellipse,
  rect: Rect,
  line: Line,
  polyline: Polyline,
  polygon: Polygon,
} as const

/** Maps icon data onto react-native-svg's shape components. */
export function renderShapes(
  node: IconElement[],
  extra: Record<string, unknown> = {}
) {
  return node.map(([tag, attributes], index) =>
    createElement(ELEMENTS[tag] as typeof Path, {
      key: index,
      ...extra,
      ...attributes,
    })
  )
}
