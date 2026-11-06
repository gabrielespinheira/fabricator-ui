import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet } from "react-native"

import { getHeaderFade } from "@/registry/native/lib/scroll-fade-model"

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

const styles = StyleSheet.create({
  fade: { position: "absolute", top: 0, left: 0, right: 0 },
})

export { HeaderFade }
