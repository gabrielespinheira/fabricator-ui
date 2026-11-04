import * as React from "react"
import {
  AccessibilityInfo,
  Appearance,
  Linking,
  useColorScheme,
} from "react-native"

import { DEFAULT_LOOK, type FabricatorLook } from "@/registry/fabricator/look"
import {
  getLookFromUrl,
  getNativeTheme,
  type NativeTheme,
} from "@/registry/fabricator/native-theme"

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

/**
 * The website's default look, at the spacious density: the default's 30pt rows
 * are small for a finger. Settings switches it, and a link sets it.
 */
const DEFAULT_NATIVE_LOOK: FabricatorLook = {
  ...DEFAULT_LOOK,
  density: "spacious",
}

type ThemeContextValue = {
  theme: Theme
  look: FabricatorLook
  setLook: (look: FabricatorLook) => void
  themeChoice: ThemeChoice
  setThemeChoice: (choice: ThemeChoice) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [look, setLook] = React.useState(DEFAULT_NATIVE_LOOK)
  const [themeChoice, setThemeChoice] = React.useState<ThemeChoice>("system")
  const scheme = useColorScheme()
  const mode = scheme === "dark" ? "dark" : "light"

  // Overriding the system's scheme also moves what the OS draws: sheets,
  // action sheets, the status bar. useColorScheme follows it.
  React.useEffect(() => {
    Appearance.setColorScheme(
      themeChoice === "system" ? "unspecified" : themeChoice
    )
  }, [themeChoice])

  // A browser's settings can't reach the app; a link carries them.
  React.useEffect(() => {
    const applyLink = (url: string | null | undefined) => {
      const linked = url ? getLookFromUrl(url) : null
      if (linked) setLook(linked)
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
    }),
    [mode, look, themeChoice]
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
