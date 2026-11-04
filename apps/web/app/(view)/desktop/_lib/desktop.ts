// The desktop example (/desktop): which shell hosts the page, the window the
// App Shell lays out around, and the explorer's navigation. The Electron
// and Tauri shells live in apps/desktop.

import { COMPONENT_GROUPS, type ComponentGroup } from "@/lib/component-groups"
import type { NavGroup } from "@/styles/base-fabricator/lib/app-shell-model"
import type { AppShellWindow } from "@/styles/base-fabricator/ui/app-shell"

export type DesktopRuntime = "electron" | "tauri" | "browser"
export type DesktopPlatform = "mac" | "windows" | "linux"

export type DesktopHost = {
  runtime: DesktopRuntime
  platform: DesktopPlatform
}

/** Where the shells put the traffic lights: apps/desktop's Electron main and Tauri config. */
const TRAFFIC_LIGHTS = { x: 16, y: 23 }

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

/** The window the App Shell lays out around in each shell. */
export function getDesktopWindow({
  runtime,
  platform,
  isFullscreen,
}: DesktopHost & { isFullscreen: boolean }): AppShellWindow | undefined {
  if (runtime === "browser") return undefined
  if (platform === "mac") {
    return {
      controls: "macos",
      isFullscreen,
      trafficLights: TRAFFIC_LIGHTS,
      isTranslucent: true,
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

export type ExplorerComponent = {
  slug: string
  title: string
  group: ComponentGroup
}

export const COMPONENT_PATH = "/components/"

type ExplorerIcons<TIcon> = {
  overview: TIcon
  groups: Partial<Record<ComponentGroup, TIcon>>
}

/**
 * An overview row, then one row per component group (in the docs' order,
 * with its count) holding its components, titles A to Z. Empty groups are
 * left out.
 */
export function getExplorerNavGroups<TIcon>(
  components: ExplorerComponent[],
  icons: ExplorerIcons<TIcon>
): NavGroup<TIcon>[] {
  const groupRows = COMPONENT_GROUPS.flatMap((group) => {
    const children = components
      .filter((component) => component.group === group)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((component) => ({
        id: component.slug,
        label: component.title,
        href: `${COMPONENT_PATH}${component.slug}`,
      }))
    if (children.length === 0) return []
    return [
      {
        id: `group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        label: group,
        icon: icons.groups[group],
        badge: children.length,
        children,
      },
    ]
  })
  return [
    {
      id: "explorer",
      items: [
        { id: "overview", label: "Overview", href: "/", icon: icons.overview },
      ],
    },
    { id: "components", label: "Components", items: groupRows },
  ]
}
