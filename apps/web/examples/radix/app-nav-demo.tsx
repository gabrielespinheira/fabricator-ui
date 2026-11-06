"use client"

import * as React from "react"
import {
  ArchiveIcon,
  BoxIcon,
  CopyIcon,
  FileIcon,
  FileTextIcon,
  HomeIcon,
  InboxIcon,
  NewspaperIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react"

import {
  EMPTY_NAV_PREFERENCES,
  type NavPreferences,
} from "@/styles/radix-fabricator/lib/app-shell-model"
import {
  AppNav,
  AppNavCustomize,
  type AppNavGroup,
  type AppNavItem,
} from "@/styles/radix-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/styles/radix-fabricator/ui/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/styles/radix-fabricator/ui/sidebar"

const projectActions = (name: string) => [
  {
    id: "rename",
    label: "Rename",
    icon: PencilIcon,
    shortcut: "F2",
    onSelect: () => {},
  },
  { id: "duplicate", label: "Duplicate", icon: CopyIcon, onSelect: () => {} },
  { id: "archive", label: "Archive", icon: ArchiveIcon, onSelect: () => {} },
  {
    id: "delete",
    label: `Delete ${name}`,
    icon: TrashIcon,
    destructive: true,
    separatorBefore: true,
    onSelect: () => {},
  },
]

function project(name: string): AppNavItem {
  const id = name.toLowerCase().replace(/\s+/g, "-")
  return {
    id,
    label: name,
    href: `/p/${id}`,
    icon: BoxIcon,
    actions: projectActions(name),
  }
}

const groups: AppNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/", icon: HomeIcon },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: InboxIcon,
        badge: 3,
      },
      { id: "search", label: "Search", href: "/search", icon: SearchIcon },
    ],
  },
  {
    id: "favorites",
    label: "Favorites",
    collapsible: true,
    reorderable: true,
    items: [
      {
        id: "launch",
        label: "Q4 launch",
        href: "/p/launch",
        icon: StarIcon,
        status: "unread",
        actions: projectActions("Q4 launch"),
      },
      {
        id: "roadmap",
        label: "Roadmap",
        href: "/p/roadmap",
        icon: StarIcon,
        actions: projectActions("Roadmap"),
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    collapsible: true,
    reorderable: true,
    actions: [
      { id: "new", label: "New project", icon: PlusIcon, onSelect: () => {} },
    ],
    items: [
      {
        ...project("Website"),
        // Items nest to any depth: Website › Pages › Pricing.
        children: [
          {
            id: "website-pages",
            label: "Pages",
            href: "/p/website/pages",
            icon: FileTextIcon,
            children: [
              {
                id: "website-home",
                label: "Home page",
                href: "/p/website/pages/home",
                icon: FileIcon,
              },
              {
                id: "website-pricing",
                label: "Pricing",
                href: "/p/website/pages/pricing",
                icon: FileIcon,
              },
            ],
          },
          {
            id: "website-blog",
            label: "Blog",
            href: "/p/website/blog",
            icon: NewspaperIcon,
            badge: 2,
          },
        ],
      },
      ...["Mobile app", "Design system", "Billing"].map(project),
    ],
  },
]

export function AppNavDemo() {
  const [path, setPath] = React.useState("/p/website/pages/pricing")
  const [preferences, setPreferences] = React.useState<NavPreferences>(
    EMPTY_NAV_PREFERENCES
  )

  return (
    <AppShell storageKey="app-nav-demo" storage={null}>
      <Sidebar>
        <SidebarContent>
          <AppNav
            groups={groups}
            pathname={path}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            customizable
            renderLink={(item) => (
              <a
                href={item.href}
                onClick={(event) => {
                  event.preventDefault()
                  setPath(item.href ?? "/")
                }}
              />
            )}
          />
        </SidebarContent>
        <SidebarFooter>
          <AppNavCustomize
            groups={groups}
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <AppShellMain>
        <AppShellHeader>
          <span className="text-sm font-medium">{path}</span>
        </AppShellHeader>
        <AppShellContent className="flex flex-col gap-3 p-6 text-sm text-muted-foreground">
          <p>
            Rows nest to any depth. Hover a row with children for its chevron,
            or focus it and press → to open it and ← to close it or go back to
            its parent.
          </p>
          <p>
            Drag rows to reorder Favorites and Projects, children among their
            siblings. Focus a row and press ⌥⇧↑ or ⌥⇧↓ to move it from the
            keyboard, or use Move to in its menu to send it to the other group.
          </p>
          <p>
            Right-click a row, or use its ⋯ button, for its actions: move, pin
            to top, hide, and the project&apos;s own.
          </p>
          <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
