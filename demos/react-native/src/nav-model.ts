import {
  getActiveNavItem,
  type NavGroup,
  type NavItem,
} from "@/registry/fabricator/shared/lib/app-shell-model"

import { COMPONENTS_HREF } from "./components/component-model"

const COMPONENTS_NAV_ID = "component-directory"

/** A native tab controller always has a selection, including on blank pages. */
export function getNativeTabIndex(
  items: readonly { id: string }[],
  activeId: string | null,
  previousIndex: number
) {
  const index = items.findIndex((item) => item.id === activeId)
  return index >= 0 ? index : previousIndex
}

export function getMobilePages<TIcon>(icons: {
  components: TIcon
  icons: TIcon
}): NavItem<TIcon>[] {
  return [
    {
      id: COMPONENTS_NAV_ID,
      label: "Components",
      href: COMPONENTS_HREF,
      icon: icons.components,
      mobile: "tab",
    },
    {
      id: "icons",
      label: "Icons",
      href: "/icons",
      icon: icons.icons,
      mobile: "tab",
    },
  ]
}

/** The directory owns its demos in the bottom bar; the sidebar selects the demo. */
export function getMobileActiveId<TIcon>(
  groups: NavGroup<TIcon>[],
  pathname: string
) {
  if (
    pathname === COMPONENTS_HREF ||
    pathname.startsWith(`${COMPONENTS_HREF}/`)
  ) {
    return COMPONENTS_NAV_ID
  }
  return getActiveNavItem(groups, pathname)
}
