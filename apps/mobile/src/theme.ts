// Fabricator's tokens for native views. React Native has no CSS variables or
// OKLCH, so these are the website's values resolved to hex: the same surfaces
// (the frame a step below surface 1, the app's content on surface 1),
// foregrounds and interaction fills, in the spacious density a touch screen
// wants (38pt rows, 15pt text, 18pt icons).
import { useColorScheme } from "react-native"

export type Theme = {
  isDark: boolean
  frame: string
  main: string
  popover: string
  foreground: string
  foregroundSoft: string
  muted: string
  mutedOnFrame: string
  border: string
  cardEdge: string
  hover: string
  active: string
  wash: string
  mark: string
  markForeground: string
}

const DARK: Theme = {
  isDark: true,
  frame: "#101010",
  main: "#171717",
  popover: "#262626",
  foreground: "#fafafa",
  foregroundSoft: "rgba(250, 250, 250, 0.8)",
  muted: "#a1a1a1",
  mutedOnFrame: "#a1a1a1",
  border: "rgba(255, 255, 255, 0.1)",
  cardEdge: "rgba(255, 255, 255, 0.06)",
  hover: "rgba(255, 255, 255, 0.06)",
  active: "rgba(255, 255, 255, 0.1)",
  wash: "rgba(255, 255, 255, 0.03)",
  mark: "#fafafa",
  markForeground: "#171717",
}

const LIGHT: Theme = {
  isDark: false,
  frame: "#ededed",
  main: "#fafafa",
  popover: "#ffffff",
  foreground: "#0a0a0a",
  foregroundSoft: "rgba(10, 10, 10, 0.8)",
  muted: "#737373",
  // Muted text on the frame darkens a step to keep 4.5:1, as on the web.
  mutedOnFrame: "#666666",
  border: "rgba(0, 0, 0, 0.1)",
  cardEdge: "rgba(0, 0, 0, 0.06)",
  hover: "rgba(0, 0, 0, 0.04)",
  active: "rgba(0, 0, 0, 0.07)",
  wash: "rgba(0, 0, 0, 0.02)",
  mark: "#0a0a0a",
  markForeground: "#fafafa",
}

/** Spacious density: Fabricator's sizes for touch. */
export const SIZE = {
  row: 38,
  text: 15,
  small: 13,
  caption: 12,
  icon: 18,
  nestedIcon: 16,
  indent: 16,
  gutter: 6,
  radius: 12,
  rowRadius: 10,
  header: 52,
  tabBar: 49,
  statusBar: 36,
} as const

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? DARK : LIGHT
}
