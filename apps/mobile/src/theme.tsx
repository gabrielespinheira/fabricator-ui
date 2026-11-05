import * as React from "react"
import {
  AccessibilityInfo,
  Appearance,
  Linking,
  useColorScheme,
} from "react-native"

import { Uniwind } from "uniwind"

import type { FabricatorLook } from "@/registry/fabricator/look"
import {
  DEFAULT_NATIVE_LOOK,
  getLookFromUrl,
  getNativeTheme,
  type NativeTheme,
} from "@/registry/fabricator/native-theme"
import { applyLook } from "@/registry/native/lib/apply-look"

export type Theme = NativeTheme
export type ThemeChoice = "system" | "light" | "dark"

/**
 * Inter, embedded by the expo-font plugin (app.json), by PostScript name. The
 * website's variable font sets medium at 450 and semibold at 550; the static
 * cuts closest to them are 500 and 600.
 */
export const FONT = {
  regular: "Inter-Regular",
  medium: "Inter-Medium",
  semibold: "Inter-SemiBold",
}

// Slows every animation down, to review it: fabricator-ui://motion?scale=8
const MOTION_SCALE_LINK = /^fabricator-ui:\/\/motion\?scale=(\d+(?:\.\d+)?)$/

type ThemeContextValue = {
  theme: Theme
  look: FabricatorLook
  setLook: (look: FabricatorLook) => void
  themeChoice: ThemeChoice
  setThemeChoice: (choice: ThemeChoice) => void
  isSoundOn: boolean
  setIsSoundOn: (isOn: boolean) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [look, setLook] = React.useState(DEFAULT_NATIVE_LOOK)
  const [themeChoice, setThemeChoice] = React.useState<ThemeChoice>("system")
  const [isSoundOn, setIsSoundOn] = React.useState(true)
  const [motionScale, setMotionScale] = React.useState(1)
  const scheme = useColorScheme()
  const mode = scheme === "dark" ? "dark" : "light"

  // Overriding the system's scheme also moves what the OS draws: sheets,
  // action sheets, the status bar. useColorScheme follows it.
  React.useEffect(() => {
    Appearance.setColorScheme(
      themeChoice === "system" ? "unspecified" : themeChoice
    )
  }, [themeChoice])

  // The registry's components read the theme through Uniwind.
  React.useEffect(() => {
    applyLook(look)
    if (motionScale === 1) return
    const scale = { "--motion-scale": motionScale }
    Uniwind.updateCSSVariables("light", scale)
    Uniwind.updateCSSVariables("dark", scale)
  }, [look, motionScale])

  // A browser's settings can't reach the app; a link carries them.
  React.useEffect(() => {
    const applyLink = (url: string | null | undefined) => {
      const linked = url ? getLookFromUrl(url) : null
      if (linked) setLook(linked)
      const scale = url ? MOTION_SCALE_LINK.exec(url) : null
      if (scale) setMotionScale(Number(scale[1]))
    }
    void Linking.getInitialURL().then(applyLink)
    const subscription = Linking.addEventListener("url", ({ url }) =>
      applyLink(url)
    )
    return () => subscription.remove()
  }, [])

  const value = React.useMemo(
    () => ({
      theme: getNativeTheme(mode, look),
      look,
      setLook,
      themeChoice,
      setThemeChoice,
      isSoundOn,
      setIsSoundOn,
    }),
    [mode, look, themeChoice, isSoundOn]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeSettings() {
  const value = React.use(ThemeContext)
  if (!value) throw new Error("useThemeSettings needs a ThemeProvider")
  return value
}

export function useTheme() {
  return useThemeSettings().theme
}

/** Whether the person asked for reduced motion in the system's settings. */
export function useReducedMotion() {
  const [isReduced, setIsReduced] = React.useState(false)
  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setIsReduced)
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsReduced
    )
    return () => subscription.remove()
  }, [])
  return isReduced
}

/** Styles built from the theme, rebuilt only when the theme changes. */
export function useStyles<Styles>(build: (theme: Theme) => Styles) {
  const theme = useTheme()
  return React.useMemo(() => build(theme), [build, theme])
}
