// The desktop example (/desktop): which shell hosts the page, and the window
// the App Shell lays out around. The explorer's navigation is in
// lib/component-explorer, shared with the React Native example. The Electron
// and Tauri shells live in apps/desktop.

import type { AppShellWindow } from "@/styles/base-fabricator/ui/app-shell"

export {
  getAppearanceSetter,
  getDesktopWindow,
  getPlatform,
  getTrafficLightsSetter,
  isFullscreenWindow,
  readDesktopRuntime,
  type DesktopHost,
  type DesktopPlatform,
  type DesktopRuntime,
} from "@/registry/fabricator/shared/lib/desktop-window"

/** The window with its glass, or with an opaque frame over it. */
export function withGlass(
  shellWindow: AppShellWindow | undefined,
  hasGlass: boolean
): AppShellWindow | undefined {
  if (!shellWindow) return undefined
  return {
    ...shellWindow,
    isTranslucent: Boolean(shellWindow.isTranslucent) && hasGlass,
  }
}
