import type { NavItem } from "@/registry/fabricator/shared/lib/app-shell-model"

import { sortNewestFirst } from "./changelog-order"
import { getGroupNavId } from "./component-explorer"
import { COMPONENT_GROUPS, type ComponentGroup } from "./component-groups"
import { APP_SHELL_NAV_ID, type ExplorerPage } from "./docs-explorer"

const CHANGELOG_PREFIX = "/docs/changelog/"

const GROUP_SUMMARIES: Record<ComponentGroup, string> = {
  Basics:
    "Buttons, badges, avatars, alerts and toasts: the parts every screen uses.",
  Forms:
    "Inputs, selects, pickers and the fields that label and validate them.",
  Overlays: "Dialogs, sheets, popovers, menus and the command palette.",
  Structure:
    "Sidebar, tabs, cards, accordions and the parts that arrange a page.",
  Content: "Typography, tables, progress, Markdown and sounds.",
  Charts:
    "Area, bar, line, pie and more, with tooltips and keyboard inspection.",
  Chat: "Messages, prompt input, attachments and model picking for AI chat.",
  Advanced: "Data table, event calendar, kanban, editor and media players.",
}

const SUMMARIES = new Map<string, string>([
  ...COMPONENT_GROUPS.map(
    (group) => [getGroupNavId(group), GROUP_SUMMARIES[group]] as const
  ),
  [
    APP_SHELL_NAV_ID,
    "The sidebar, header, panels and phone layout around every page.",
  ],
])

export class MissingGroupSummaryError extends Error {
  constructor(id: string) {
    super(`The docs overview has no summary for the "${id}" group.`)
    this.name = "MissingGroupSummaryError"
  }
}

export type DocsOverviewGroup<TIcon> = {
  id: string
  label: string
  href: string
  icon?: TIcon
  description: string
  count: string
}

/** The docs overview's cards, one per component group of the sidebar. */
export function getDocsOverviewGroups<TIcon>(
  items: NavItem<TIcon>[]
): DocsOverviewGroup<TIcon>[] {
  return items.flatMap((item) => {
    const href = item.href ?? item.children?.[0]?.href
    if (!href) return []
    const description = SUMMARIES.get(item.id)
    if (!description) throw new MissingGroupSummaryError(item.id)
    // The same number as the sidebar's badge: the pages listed under the group.
    const total = item.children?.length ?? 0
    const noun = item.id === APP_SHELL_NAV_ID ? "page" : "component"
    return [
      {
        id: item.id,
        label: item.label,
        href,
        icon: item.icon,
        description,
        count: `${total} ${noun}${total === 1 ? "" : "s"}`,
      },
    ]
  })
}

/** The newest shipped release; unreleased changes have no date. */
export function getLatestRelease(pages: ExplorerPage[]) {
  const [latest] = sortNewestFirst(
    pages.filter((page) => page.url.startsWith(CHANGELOG_PREFIX) && page.date)
  )
  return latest && { url: latest.url, title: latest.title }
}
