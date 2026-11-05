import * as React from "react"
import { PortalHost } from "@rn-primitives/portal"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaListener } from "react-native-safe-area-context"
import { Uniwind } from "uniwind"

import { markGesture } from "@/registry/native/lib/feedback"

/**
 * What a React Native app needs once at its root, where a web page has the
 * document: gestures, safe-area classes, and the place overlays render.
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
        {children}
        <PortalHost />
      </SafeAreaListener>
    </GestureHandlerRootView>
  )
}

export { FabricatorRoot }
