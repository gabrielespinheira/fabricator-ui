// Icons pick their stroke from their size (Fabricator Icons' getAutoStrokeWidth).
// A lit, active or focused icon draws a quarter unit heavier than that pick.

import { getAutoStrokeWidth } from "@fabricator-ui/icons-react-native"
import { useCSSVariable } from "uniwind"

import { parseNumber } from "@/registry/native/lib/motion-tokens"

/** How much heavier, in grid units, an emphasised icon draws. */
export const EMPHASIS_STROKE = 0.25

/** The stroke of an emphasised icon of `size` pixels. */
export function getEmphasisStroke(size: number) {
  return getAutoStrokeWidth(1.75, size) + EMPHASIS_STROKE
}

/**
 * The stroke for an icon at the `token` size (a control's 16px icon by
 * default): undefined at rest, so the icon picks it, heavier while
 * `isEmphasised`. Call it before any early return.
 */
export function useIconStroke(
  isEmphasised: boolean,
  token = "--density-icon-16"
) {
  const size = parseNumber(useCSSVariable(token), 16)
  return isEmphasised ? getEmphasisStroke(size) : undefined
}
