// Sample content for the App Shell preview on /create: the studio the dashboard
// belongs to.

import {
  BoxIcon,
  ChartBarIcon,
  FileTextIcon,
  GlobeIcon,
  HomeIcon,
  InboxIcon,
  LifeBuoyIcon,
  PlusIcon,
  SettingsIcon,
  SmartphoneIcon,
  UsersIcon,
} from "@/lib/site-icons"
import type { AppNavGroup } from "@/styles/base-fabricator/ui/app-nav"

export const PREVIEW_WORKSPACES = [
  { id: "northwind", name: "Northwind", description: "Studio plan" },
  { id: "personal", name: "Personal", description: "Free plan" },
]

export const PREVIEW_USER = { name: "Ada Park", email: "ada@northwind.io" }

export function getPreviewNavGroups({
  reorderable,
}: {
  reorderable: boolean
}): AppNavGroup[] {
  return [
    {
      id: "main",
      items: [
        {
          id: "overview",
          label: "Overview",
          href: "/",
          icon: HomeIcon,
          mobile: "tab",
        },
        {
          id: "inbox",
          label: "Inbox",
          href: "/inbox",
          icon: InboxIcon,
          badge: 4,
          mobile: "tab",
        },
      ],
    },
    {
      id: "workspace",
      label: "Workspace",
      collapsible: true,
      reorderable,
      actions: [
        {
          id: "new-project",
          label: "New project",
          icon: PlusIcon,
          onSelect: () => {},
        },
      ],
      items: [
        {
          id: "projects",
          label: "Projects",
          href: "/projects",
          icon: BoxIcon,
          badge: 12,
          mobile: "tab",
          children: [
            {
              id: "website",
              label: "Website relaunch",
              href: "/projects/website",
              icon: GlobeIcon,
            },
            {
              id: "brand",
              label: "Brand refresh",
              href: "/projects/brand",
              icon: FileTextIcon,
            },
            {
              id: "mobile",
              label: "Mobile app",
              href: "/projects/mobile",
              icon: SmartphoneIcon,
            },
          ],
        },
        { id: "team", label: "Team", href: "/team", icon: UsersIcon },
        {
          id: "reports",
          label: "Reports",
          href: "/reports",
          icon: ChartBarIcon,
          status: "unread",
        },
      ],
    },
    {
      id: "support",
      label: "Support",
      collapsible: true,
      reorderable,
      items: [
        {
          id: "help",
          label: "Help and support",
          href: "/help",
          icon: LifeBuoyIcon,
        },
        {
          id: "settings",
          label: "Settings",
          href: "/settings",
          icon: SettingsIcon,
          mobile: "tab",
        },
      ],
    },
  ]
}

export const PREVIEW_DOCUMENTS: Record<
  string,
  { title: string; icon: typeof FileTextIcon }
> = {
  website: { title: "Website relaunch", icon: GlobeIcon },
  brand: { title: "Brand refresh", icon: FileTextIcon },
}

export const PREVIEW_TABS = {
  tabs: ["website", "brand"],
  pinned: [],
  recent: ["website"],
  preview: null,
  closed: [],
}
