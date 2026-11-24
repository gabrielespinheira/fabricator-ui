import { requireOptionalNativeModule } from "expo"
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect"

/**
 * Whether Apple's Liquid Glass can be drawn: iOS 26 or later, in a binary that
 * has the native module. A development build made before the module was added
 * doesn't, and asking it throws.
 */
export function hasLiquidGlass() {
  return (
    requireOptionalNativeModule("ExpoGlassEffect") !== null &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable()
  )
}

export { GlassView }
