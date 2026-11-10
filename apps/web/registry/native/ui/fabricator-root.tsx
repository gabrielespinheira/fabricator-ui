import * as React from "react"
import { PortalHost } from "@rn-primitives/portal"
import { useWindowDimensions } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaListener } from "react-native-safe-area-context"
import { ScopedVariables, Uniwind, useCSSVariable } from "uniwind"

import { getDensityVariables } from "@/registry/fabricator/density-variables"
import {
  getDensityName,
  getDensityTokens,
  getDeviceDensity,
} from "@/registry/native/lib/density-scale"
import { markGesture } from "@/registry/native/lib/feedback"
import { parseNumber } from "@/registry/native/lib/motion-tokens"

const NO_VARIABLES = {}

/**
 * The sizes for this window: a tablet's rung where the look has a phone's base,
 * and on a phone whose look is Default, which is sized for a pointer. The
 * scope stays mounted with nothing in it: a wrapper that came and went with a density
 * change or a resized window would remount the whole app, and lose its state.
 */
function DeviceDensity({ children }: { children?: React.ReactNode }) {
  const { width } = useWindowDimensions()
  const base = getDensityName(parseNumber(useCSSVariable("--density-36"), 36))
  const density = getDeviceDensity(base, width)
  const variables = React.useMemo(
    () =>
      density ? getDensityVariables(getDensityTokens(density)) : NO_VARIABLES,
    [density]
  )
  return <ScopedVariables variables={variables}>{children}</ScopedVariables>
}

/**
 * What a React Native app needs once at its root, where a web page has the
 * document: gestures, safe-area classes, the sizes for this device, and the place
 * overlays render.
 */
function FabricatorRoot({ children }: { children?: React.ReactNode }) {
  return (
    <GestureHandlerRootView
      data-slot="fabricator-root"
      style={{ flex: 1 }}
      // Sees every touch on its way down, and takes none of them.
      onStartShouldSetResponderCapture={() => {
        markGesture()
        return false
      }}
    >
      <SafeAreaListener
        onChange={({ insets }) => {
          Uniwind.updateInsets(insets)
        }}
        style={{ flex: 1 }}
      >
        <DeviceDensity>
          {children}
          <PortalHost />
        </DeviceDensity>
      </SafeAreaListener>
    </GestureHandlerRootView>
  )
}

export { FabricatorRoot }
