import type {
  NavGroup,
  NavItem,
} from "@/registry/fabricator/shared/lib/app-shell-model"

import { formatChangelogDate, sortNewestFirst } from "./changelog-order"
import { getExplorerNavGroups, getGroupNavId } from "./component-explorer"
import { getComponentGroup } from "./component-groups"
import { getCurrentBase } from "./page-tree"

/** `date` is a changelog entry's day, `yyyy-MM-dd`. */
export type ExplorerPage = { url: string; title: string; date?: string }

const CHANGELOG_URL = "/docs/changelog"
export const APP_SHELL_NAV_ID = "group-app-shell"
const APP_SHELL_REFERENCE_PATH = "/docs/app-shell/"
export const ADVANCED_REFERENCE_PATH = "/docs/advanced/"
const APP_SHELL_COMPANIONS = [
  "sidebar",
  "app-nav",
  "tab-strip",
  "workspace-switcher",
  "user-menu",
]
const APP_SHELL_REFERENCES = [
  "main",
  "header",
  "breadcrumb",
  "header-actions",
  "content",
  "page-title",
  "panel",
  "panel-trigger",
  "panel-header",
  "panel-title",
  "panel-tabs",
  "panel-close",
  "panel-content",
  "panel-view",
  "bottom-nav",
  "bottom-nav-item",
  "status-bar",
  "titlebar",
  "icon-slot",
]

const GUIDE_SECTIONS = [
  {
    label: "Get started",
    prefixes: [
      "/docs/installation",
      "/docs/dark-mode",
      "/docs/monorepo",
      "/docs/components-json",
      "/docs/package-imports",
    ],
  },
  { label: "Foundations", prefixes: ["/docs/foundations/"] },
  { label: "Icons", prefixes: ["/docs/icons"] },
  {
    label: "Tooling",
    prefixes: [
      "/docs/cli",
      "/docs/registry",
      "/docs/mcp",
      "/docs/agent",
      "/docs/skill",
      "/docs/utils/",
    ],
  },
  { label: "Changelog", prefixes: [CHANGELOG_URL] },
]

/** The docs sidebar and pagination share the same section and page order. */
export function getDocsExplorerGroups(
  pages: ExplorerPage[],
  base: string
): NavGroup<undefined>[] {
  const componentPath = `/docs/components/${base}/`
  const appShellHref = `${componentPath}app-shell`
  const byUrl = new Map(pages.map((page) => [page.url, page]))
  const shellSubpages = new Set([
    ...APP_SHELL_COMPANIONS.map((slug) => componentPath + slug),
    ...APP_SHELL_REFERENCES.map((slug) => APP_SHELL_REFERENCE_PATH + slug),
  ])
  const components = pages.filter(
    (page) =>
      page.url.startsWith(componentPath) &&
      page.url !== appShellHref &&
      !shellSubpages.has(page.url)
  )
  const [overview, componentSection] = getExplorerNavGroups(
    components.map((page) => {
      const slug = page.url.slice(componentPath.length)
      return { slug, title: page.title, group: getComponentGroup(slug) }
    }),
    { overview: undefined, groups: {} },
    { overviewHref: "/docs", componentPath }
  )
  const referencesByComponent = new Map<string, NavItem<undefined>[]>()
  for (const page of pages) {
    if (!page.url.startsWith(ADVANCED_REFERENCE_PATH)) continue
    const slug = page.url.slice(ADVANCED_REFERENCE_PATH.length).split("/")[0]
    const references = referencesByComponent.get(slug) ?? []
    references.push(getPageItem(page))
    referencesByComponent.set(slug, references)
  }
  const advanced = componentSection.items.find(
    (item) => item.id === getGroupNavId("Advanced")
  )
  if (advanced) {
    advanced.children = advanced.children?.map((item) => {
      const references = referencesByComponent.get(item.id)
      return references
        ? {
            ...item,
            children: references.sort((a, b) => a.label.localeCompare(b.label)),
          }
        : item
    })
  }
  const appShell = byUrl.get(appShellHref)
  if (appShell) {
    const children = [...shellSubpages].flatMap((url) => {
      const page = byUrl.get(url)
      return page ? [getPageItem(page)] : []
    })
    const basicsIndex = componentSection.items.findIndex(
      (item) => item.id === getGroupNavId("Basics")
    )
    componentSection.items.splice(basicsIndex + 1, 0, {
      id: APP_SHELL_NAV_ID,
      label: appShell.title,
      href: appShell.url,
      badge: children.length,
      children,
    })
  }
  const guidePages = pages.filter(
    (page) =>
      page.url !== "/docs" &&
      page.url !== "/docs/components" &&
      page.url !== "/docs/new" &&
      page.url !== "/docs/rtl" &&
      !page.url.startsWith(APP_SHELL_REFERENCE_PATH) &&
      !page.url.startsWith(ADVANCED_REFERENCE_PATH) &&
      !page.url.startsWith("/docs/components/")
  )
  const otherPages = guidePages.filter(
    (page) =>
      !GUIDE_SECTIONS.some((section) =>
        section.prefixes.some((prefix) => page.url.startsWith(prefix))
      )
  )
  return [
    overview,
    componentSection,
    {
      id: "guides",
      label: "Documentation",
      items: GUIDE_SECTIONS.flatMap((section) => {
        const sectionPages = guidePages.filter((page) =>
          section.prefixes.some((prefix) => page.url.startsWith(prefix))
        )
        const children =
          section.label === "Changelog"
            ? getChangelogItems(sectionPages)
            : sectionPages.map(getPageItem)
        return children.length
          ? [{ id: section.label, label: section.label, children }]
          : []
      }).concat(
        otherPages.length
          ? [
              {
                id: "more-guides",
                label: "More guides",
                children: otherPages.map(getPageItem),
              },
            ]
          : []
      ),
    },
  ]
}

function getPageItem(page: ExplorerPage): NavItem<undefined> {
  return { id: page.url, label: page.title, href: page.url }
}

// The overview, unreleased changes, then releases newest first with their
// release day as the badge.
function getChangelogItems(pages: ExplorerPage[]): NavItem<undefined>[] {
  const overview = pages.filter((page) => page.url === CHANGELOG_URL)
  const entries = sortNewestFirst(
    pages.filter((page) => page.url !== CHANGELOG_URL)
  )
  return [
    ...overview.map((page) => ({
      id: page.url,
      label: "All releases",
      href: page.url,
    })),
    ...entries.map((page) => ({
      id: page.url,
      label: page.title,
      href: page.url,
      badge: page.date ? formatChangelogDate(page.date, "short") : undefined,
    })),
  ]
}

function getLinkedDocsPages(items: NavItem<undefined>[]): ExplorerPage[] {
  return items.flatMap((item) => [
    ...(item.href ? [{ url: item.href, title: item.label }] : []),
    ...getLinkedDocsPages(item.children ?? []),
  ])
}

export function getDocsNeighbours(pages: ExplorerPage[], url: string) {
  const orderedPages = getDocsExplorerGroups(
    pages,
    getCurrentBase(url)
  ).flatMap((group) => getLinkedDocsPages(group.items))
  const index = orderedPages.findIndex((page) => page.url === url)
  if (index === -1) return { previous: undefined, next: undefined }
  return { previous: orderedPages[index - 1], next: orderedPages[index + 1] }
}
