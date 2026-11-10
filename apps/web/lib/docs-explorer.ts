import type { NavGroup } from "@/registry/fabricator/shared/lib/app-shell-model"

import { getExplorerNavGroups } from "./component-explorer"
import { getComponentGroup } from "./component-groups"

export type ExplorerPage = { url: string; title: string }

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
  { label: "Changelog", prefixes: ["/docs/changelog"] },
]

/** Docs keep their URLs and guides; component navigation is the app explorer's. */
export function getDocsExplorerGroups(
  pages: ExplorerPage[],
  base: string
): NavGroup<undefined>[] {
  const componentPath = `/docs/components/${base}/`
  const components = pages.filter((page) => page.url.startsWith(componentPath))
  const groups = getExplorerNavGroups(
    components.map((page) => {
      const slug = page.url.slice(componentPath.length)
      return { slug, title: page.title, group: getComponentGroup(slug) }
    }),
    { overview: undefined, groups: {} },
    {
      overviewHref: "/docs",
      componentPath,
      pages: [
        {
          id: "library",
          label: "Library",
          href: "/docs/components",
          mobile: "tab",
        },
      ],
    }
  )
  const guidePages = pages.filter(
    (page) =>
      page.url !== "/docs" &&
      page.url !== "/docs/components" &&
      page.url !== "/docs/new" &&
      page.url !== "/docs/rtl" &&
      !page.url.startsWith("/docs/components/")
  )
  const otherPages = guidePages.filter(
    (page) =>
      !GUIDE_SECTIONS.some((section) =>
        section.prefixes.some((prefix) => page.url.startsWith(prefix))
      )
  )
  return [
    ...groups,
    {
      id: "guides",
      label: "Documentation",
      items: GUIDE_SECTIONS.flatMap((section) => {
        const children = guidePages
          .filter((page) =>
            section.prefixes.some((prefix) => page.url.startsWith(prefix))
          )
          .map((page) => ({ id: page.url, label: page.title, href: page.url }))
        return children.length
          ? [{ id: section.label, label: section.label, children }]
          : []
      }).concat(
        otherPages.length
          ? [
              {
                id: "more-guides",
                label: "More guides",
                children: otherPages.map((page) => ({
                  id: page.url,
                  label: page.title,
                  href: page.url,
                })),
              },
            ]
          : []
      ),
    },
  ]
}
