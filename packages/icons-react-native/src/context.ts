import { createContext, createElement, useContext, type ReactNode } from "react"
import { useColorScheme } from "react-native"

/** Fabricator's `--foreground` in each scheme: React Native has no colour inheritance. */
export const FOREGROUND = { light: "#171717", dark: "#f5f5f5" } as const

export type ColorScheme = "light" | "dark"

export type IconDefaults = {
  color?: string
  size?: number
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
  /** Overrides the device scheme, for apps that pick their own theme. */
  colorScheme?: ColorScheme
}

const IconContext = createContext<IconDefaults>({})

/** Sets default props for every icon below it. */
export function IconProvider({
  children,
  ...defaults
}: IconDefaults & { children?: ReactNode }) {
  const parent = useContext(IconContext)
  return createElement(
    IconContext.Provider,
    { value: { ...parent, ...defaults } },
    children
  )
}

/** The provider's defaults, with the colour scheme resolved. */
export function useIconDefaults() {
  const defaults = useContext(IconContext)
  const deviceScheme = useColorScheme()
  const colorScheme: ColorScheme =
    defaults.colorScheme ?? (deviceScheme === "dark" ? "dark" : "light")
  return {
    ...defaults,
    colorScheme,
    foreground: defaults.color ?? FOREGROUND[colorScheme],
  }
}

export type ResolvedIconDefaults = ReturnType<typeof useIconDefaults>
