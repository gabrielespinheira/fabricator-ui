// The component explorer's navigation and tabs, shared by the desktop example
// (/desktop) and the React Native example (apps/mobile): an overview, then a
// row per component group holding its components. Pure, so React Native can
// import it.

import type {
  NavGroup,
  NavItem,
} from "@/registry/fabricator/shared/lib/app-shell-model"

import { COMPONENT_GROUPS, type ComponentGroup } from "./component-groups"

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

type ExplorerIcons<TIcon> = {
  overview: TIcon
  groups: Partial<Record<ComponentGroup, TIcon>>
}

/** A group's id in the navigation: `Overlays & Menus` → `group-overlays-menus`. */
export function getGroupNavId(group: ComponentGroup) {
  return `group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
}

/**
 * An overview row (a phone's first tab) and the app's own pages, then one row
 * per component group (in the docs' order, with its count) holding its
 * components, titles A to Z. Empty groups are left out.
 */
export function getExplorerNavGroups<TIcon>(
  components: ExplorerComponent[],
  icons: ExplorerIcons<TIcon>,
  {
    reorderable = false,
    pages = [],
  }: { reorderable?: boolean; pages?: NavItem<TIcon>[] } = {}
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
        id: getGroupNavId(group),
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
        {
          id: "overview",
          label: "Overview",
          href: "/",
          icon: icons.overview,
          mobile: "tab",
        },
        ...pages,
      ],
    },
    { id: "components", label: "Components", reorderable, items: groupRows },
  ]
}
