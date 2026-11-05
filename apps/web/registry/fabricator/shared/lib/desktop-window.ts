// Which desktop window hosts the page, and what the App Shell lays out around.
// The shell never imports Electron or Tauri: Electron's preload exposes
// `window.fabricatorDesktop`, and Tauri injects its internals.

export type DesktopRuntime = "electron" | "tauri" | "browser"
export type DesktopPlatform = "mac" | "windows" | "linux"

export type DesktopHost = {
  runtime: DesktopRuntime
  platform: DesktopPlatform
}

export type DesktopWindow = {
  controls: "macos" | "overlay"
  isFullscreen: boolean
  trafficLights?: { x: number; y: number }
  isTranslucent?: boolean
}

const ELECTRON_PLATFORMS: Record<string, DesktopPlatform> = {
  darwin: "mac",
  win32: "windows",
  linux: "linux",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function getPlatform(userAgent: string): DesktopPlatform {
  if (userAgent.includes("Mac")) return "mac"
  if (userAgent.includes("Windows")) return "windows"
  return "linux"
}

/**
 * Which shell hosts the page: Electron's preload bridge
 * (`window.fabricatorDesktop`), Tauri's injected internals, or neither.
 */
export function readDesktopRuntime(
  host: object,
  userAgent: string
): DesktopHost {
  const bridge = Reflect.get(host, "fabricatorDesktop")
  if (
    isRecord(bridge) &&
    bridge.runtime === "electron" &&
    typeof bridge.platform === "string"
  ) {
    return {
      runtime: "electron",
      platform: ELECTRON_PLATFORMS[bridge.platform] ?? getPlatform(userAgent),
    }
  }
  if ("__TAURI_INTERNALS__" in host) {
    return { runtime: "tauri", platform: getPlatform(userAgent) }
  }
  return { runtime: "browser", platform: getPlatform(userAgent) }
}

/** The Electron bridge's appearance setter, so the native glass follows the page's theme. */
export function getAppearanceSetter(
  host: object
): ((appearance: "light" | "dark") => void) | null {
  const bridge = Reflect.get(host, "fabricatorDesktop")
  if (!isRecord(bridge) || typeof bridge.setAppearance !== "function") {
    return null
  }
  const { setAppearance } = bridge
  return (appearance) => {
    Reflect.apply(setAppearance, bridge, [appearance])
  }
}

/** The Electron bridge's traffic lights setter, for a layout that moves them. */
export function getTrafficLightsSetter(
  host: object
): ((position: { x: number; y: number }) => void) | null {
  const bridge = Reflect.get(host, "fabricatorDesktop")
  if (!isRecord(bridge) || typeof bridge.setTrafficLights !== "function") {
    return null
  }
  const { setTrafficLights } = bridge
  return (position) => {
    Reflect.apply(setTrafficLights, bridge, [position])
  }
}

/**
 * Where the traffic lights sit: beside the main card's top row, or centred in a
 * titlebar row, which is as tall as the lights need (40px here).
 */
export function getTrafficLights(hasTitlebar: boolean) {
  return { x: 16, y: hasTitlebar ? 13 : 23 }
}

/**
 * The window the App Shell lays out around in each shell. The lights start
 * where the Electron main process and the Tauri config put them. Only Electron
 * can move them afterwards, so only its titlebar row gets to be short.
 */
export function getDesktopWindow({
  runtime,
  platform,
  isFullscreen,
  hasTitlebar,
  isTranslucent = true,
}: DesktopHost & {
  isFullscreen: boolean
  hasTitlebar: boolean
  isTranslucent?: boolean
}): DesktopWindow | undefined {
  if (runtime === "browser") return undefined
  if (platform === "mac") {
    return {
      controls: "macos",
      isFullscreen,
      trafficLights: getTrafficLights(runtime === "electron" && hasTitlebar),
      isTranslucent,
    }
  }
  // Electron draws its window buttons over the page (titleBarOverlay); Tauri
  // keeps its own title bar there.
  if (runtime === "electron") return { controls: "overlay", isFullscreen }
  return undefined
}

/** A page filling the whole screen is a fullscreen window. */
export function isFullscreenWindow({
  innerWidth,
  innerHeight,
  screenWidth,
  screenHeight,
}: {
  innerWidth: number
  innerHeight: number
  screenWidth: number
  screenHeight: number
}) {
  return innerWidth === screenWidth && innerHeight === screenHeight
}
