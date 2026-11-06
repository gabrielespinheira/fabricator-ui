// The desktop example (/desktop): which shell hosts the page, the window the
// App Shell lays out around, and the explorer's navigation. The Electron
// and Tauri shells live in apps/desktop.

import { COMPONENT_GROUPS, type ComponentGroup } from "@/lib/component-groups"
import type { NavGroup } from "@/styles/base-fabricator/lib/app-shell-model"
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

export type ExplorerComponent = {
  slug: string
  title: string
  group: ComponentGroup
}

export const COMPONENT_PATH = "/components/"

/** The tab a navigation link opens: a component, the overview, or none. */
export function getExplorerTabId(href: string | undefined) {
  if (href === "/") return "overview"
  if (href?.startsWith(COMPONENT_PATH)) return href.slice(COMPONENT_PATH.length)
  return null
}

const NEW_TAB_PREFIX = "new-"

/**
 * The first free id for a blank tab. Pass the closed tabs too: they keep their
 * ids, so reopening one never collides.
 */
export function getNewTabId(taken: string[]) {
  let index = 1
  while (taken.includes(`${NEW_TAB_PREFIX}${index}`)) index += 1
  return `${NEW_TAB_PREFIX}${index}`
}

export function isNewTab(id: string | null) {
  return id?.startsWith(NEW_TAB_PREFIX) ?? false
}

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
  icons: ExplorerIcons<TIcon>,
  { reorderable = false }: { reorderable?: boolean } = {}
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
    { id: "components", label: "Components", reorderable, items: groupRows },
  ]
}
