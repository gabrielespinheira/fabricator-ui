import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet } from "react-native"

import {
  getBottomNavFade,
  getHeaderFade,
} from "@/registry/native/lib/scroll-fade-model"

/**
 * What a phone's header sits on: the page's colour, behind the clock and the
 * island, melting into the page below. Render it first inside the header, and let
 * the page scroll under the header.
 */
function HeaderFade({
  color,
  insetTop,
  rowHeight,
}: {
  /** The colour of what's behind the header. */
  color: string
  insetTop: number
  rowHeight: number
}) {
  const { height, colors, locations } = getHeaderFade({
    color,
    insetTop,
    rowHeight,
  })
  return (
    <LinearGradient
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      colors={colors}
      locations={locations}
      style={[styles.fade, { height }]}
    />
  )
}

/**
 * What a floating tab bar sits on: the page quieting toward the screen's bottom
 * edge, so its text doesn't read through the capsule. Render it before the bar.
 */
function BottomNavFade({
  color,
  clearance,
  barHeight,
  opacity = 1,
}: {
  /** The colour of what's behind the bar. */
  color: string
  clearance: number
  barHeight: number
  /** Native materials already quiet the page; keep their scroll-edge fade lighter. */
  opacity?: number
}) {
  const { height, colors, locations } = getBottomNavFade({
    color,
    clearance,
    barHeight,
  })
  return (
    <LinearGradient
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      colors={colors}
      locations={locations}
      style={[styles.bottomFade, { height, opacity }]}
    />
  )
}

const styles = StyleSheet.create({
  fade: { position: "absolute", top: 0, left: 0, right: 0 },
  bottomFade: { position: "absolute", bottom: 0, left: 0, right: 0 },
})

export { BottomNavFade, HeaderFade }
