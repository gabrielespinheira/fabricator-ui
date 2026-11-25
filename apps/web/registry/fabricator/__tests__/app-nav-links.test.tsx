import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  AppNav as AriaAppNav,
  AppNavBottomBar as AriaAppNavBottomBar,
} from "@/registry/fabricator/aria/ui/app-nav"
import { AppShell as AriaAppShell } from "@/registry/fabricator/aria/ui/app-shell"
import { SidebarProvider as AriaSidebarProvider } from "@/registry/fabricator/aria/ui/sidebar"
import {
  AppNav as BaseAppNav,
  AppNavBottomBar as BaseAppNavBottomBar,
} from "@/registry/fabricator/base/ui/app-nav"
import { AppShell as BaseAppShell } from "@/registry/fabricator/base/ui/app-shell"
import { SidebarProvider as BaseSidebarProvider } from "@/registry/fabricator/base/ui/sidebar"
import {
  AppNav as RadixAppNav,
  AppNavBottomBar as RadixAppNavBottomBar,
} from "@/registry/fabricator/radix/ui/app-nav"
import { AppShell as RadixAppShell } from "@/registry/fabricator/radix/ui/app-shell"
import { SidebarProvider as RadixSidebarProvider } from "@/registry/fabricator/radix/ui/sidebar"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const BASES = [
  ["base", BaseAppNav, BaseSidebarProvider],
  ["radix", RadixAppNav, RadixSidebarProvider],
  ["aria", AriaAppNav, AriaSidebarProvider],
] as const

type LinkItem = { href?: string; label: string }

// A router's link often comes with its own text, which must not replace the
// row's icon.
const LINKS = [
  ["the default link", undefined],
  [
    "a link without children",
    (item: LinkItem) => React.createElement("a", { href: item.href }),
  ],
  [
    "a link with children",
    (item: LinkItem) => <a href={item.href}>{item.label}</a>,
  ],
] as const

const GROUPS = [
  {
    id: "main",
    items: [
      {
        id: "chats",
        label: "Chats",
        href: "/chats",
        badge: 4,
        mobile: "tab" as const,
        icon: <svg data-testid="chats-icon" />,
      },
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        icon: ProjectsIcon,
        defaultOpen: true,
        children: [
          {
            id: "launch",
            label: "Launch",
            href: "/projects/launch",
            icon: <svg data-testid="launch-icon" />,
          },
        ],
      },
    ],
  },
]

function ProjectsIcon() {
  return <svg data-testid="projects-icon" />
}

/** The markup inside the link to `href`. */
function getLinkContent(html: string, href: string) {
  const match = new RegExp(`<a[^>]*href="${href}"[^>]*>(.*?)</a>`).exec(html)
  return match?.[1] ?? ""
}

describe.each(BASES)("%s navigation rows", (_, AppNav, SidebarProvider) => {
  it.each(LINKS)("keep their icon and label inside %s", (_name, renderLink) => {
    const html = renderToStaticMarkup(
      <SidebarProvider persist={false} shortcut={null}>
        <AppNav groups={GROUPS} renderLink={renderLink} />
      </SidebarProvider>
    )
    for (const [href, label, icon] of [
      ["/chats", "Chats", "chats-icon"],
      ["/projects", "Projects", "projects-icon"],
      ["/projects/launch", "Launch", "launch-icon"],
    ] as const) {
      const content = getLinkContent(html, href)
      expect(content).toContain(icon)
      expect(content.split(label)).toHaveLength(2)
    }
    expect(html).toContain('data-slot="sidebar-menu-badge"')
  })
})

const BOTTOM_BARS = [
  ["base", BaseAppNavBottomBar, BaseAppShell],
  ["radix", RadixAppNavBottomBar, RadixAppShell],
  ["aria", AriaAppNavBottomBar, AriaAppShell],
] as const

describe.each(BOTTOM_BARS)("%s bottom bar", (_, AppNavBottomBar, AppShell) => {
  it.each(LINKS)("keeps its icon and label inside %s", (_name, renderLink) => {
    const html = renderToStaticMarkup(
      <AppShell storageKey="test">
        <AppNavBottomBar groups={GROUPS} renderLink={renderLink} />
      </AppShell>
    )
    const content = getLinkContent(html, "/chats")
    expect(content).toContain("chats-icon")
    expect(content.split("Chats")).toHaveLength(2)
  })
})
