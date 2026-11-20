import type {
  NavGroup,
  NavItem,
} from "@/registry/fabricator/shared/lib/app-shell-model"

import { formatChangelogDate, sortNewestFirst } from "./changelog-order"
import { getGroupNavId } from "./component-explorer"
import { groupComponentPages } from "./component-groups"
import { getCurrentBase } from "./page-tree"

/** `date` is a changelog entry's day, `yyyy-MM-dd`. */
export type ExplorerPage = { url: string; title: string; date?: string }

const CHANGELOG_URL = "/docs/changelog"
const APP_SHELL_REFERENCE_PATH = "/docs/app-shell/"
const APP_SHELL_COMPONENTS = [
  "app-shell",
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
  const components = pages.filter((page) => page.url.startsWith(componentPath))
  const byUrl = new Map(pages.map((page) => [page.url, page]))
  const shellUrls = new Set([
    ...APP_SHELL_COMPONENTS.map((slug) => componentPath + slug),
    ...APP_SHELL_REFERENCES.map((slug) => APP_SHELL_REFERENCE_PATH + slug),
  ])
  const shellItems = [...shellUrls].flatMap((url) => {
    const page = byUrl.get(url)
    return page ? [getPageItem(page)] : []
  })
  const componentGroups = groupComponentPages(
    components
      .filter((page) => !shellUrls.has(page.url))
      .sort((a, b) => a.title.localeCompare(b.title))
  )
  const guidePages = pages.filter(
    (page) =>
      page.url !== "/docs" &&
      page.url !== "/docs/components" &&
      page.url !== "/docs/new" &&
      page.url !== "/docs/rtl" &&
      !page.url.startsWith(APP_SHELL_REFERENCE_PATH) &&
      !page.url.startsWith("/docs/components/")
  )
  const otherPages = guidePages.filter(
    (page) =>
      !GUIDE_SECTIONS.some((section) =>
        section.prefixes.some((prefix) => page.url.startsWith(prefix))
      )
  )
  return [
    {
      id: "explorer",
      items: [
        {
          id: "overview",
          label: "Overview",
          href: "/docs",
          match: { exact: true },
          mobile: "tab",
        },
      ],
    },
    ...(shellItems.length
      ? [
          {
            id: "group-app-shell",
            label: "App Shell",
            collapsible: true,
            items: shellItems,
          },
        ]
      : []),
    ...componentGroups.map(({ group, pages }) => ({
      id: getGroupNavId(group),
      label: group,
      collapsible: true,
      items: pages.map(getPageItem),
    })),
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
