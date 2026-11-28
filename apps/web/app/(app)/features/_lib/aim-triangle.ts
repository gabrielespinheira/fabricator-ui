import {
  type AimPoint,
  type AimRect,
  type SubmenuSide,
} from "@/styles/base-fabricator/lib/submenu-aim-model"

/** The safe triangle to draw: the pointer and the submenu's near corners. */
export function getAimTriangle(
  pointer: AimPoint,
  submenu: AimRect,
  side: SubmenuSide
): [AimPoint, AimPoint, AimPoint] | null {
  const edge = side === "right" ? submenu.left : submenu.right
  const ahead = side === "right" ? edge - pointer.x : pointer.x - edge
  if (ahead <= 0) return null
  return [pointer, { x: edge, y: submenu.top }, { x: edge, y: submenu.bottom }]
}
