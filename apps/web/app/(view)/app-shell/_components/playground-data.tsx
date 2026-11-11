// Sample content for the App Shell playground.

import {
  BoxIcon,
  CalendarIcon,
  ChartLineIcon,
  CodeIcon,
  FileTextIcon,
  GlobeIcon,
  HomeIcon,
  InboxIcon,
  LifeBuoyIcon,
  ListTodoIcon,
  MessageSquareIcon,
  RocketIcon,
  SettingsIcon,
  SmartphoneIcon,
  StickyNoteIcon,
  UsersIcon,
} from "@/lib/site-icons"
import type { AppNavGroup } from "@/styles/base-fabricator/ui/app-nav"

export const WORKSPACES = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
  { id: "lab", name: "Side Lab", description: "Free" },
]

export const USER = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }

export function getNavGroups({
  reorderable,
}: {
  reorderable: boolean
}): AppNavGroup[] {
  return [
    {
      id: "main",
      items: [
        { id: "home", label: "Home", href: "/", icon: HomeIcon, mobile: "tab" },
        {
          id: "inbox",
          label: "Inbox",
          href: "/inbox",
          icon: InboxIcon,
          badge: 4,
          mobile: "tab",
        },
        {
          id: "calendar",
          label: "Calendar",
          href: "/calendar",
          icon: CalendarIcon,
          mobile: "tab",
        },
      ],
    },
    {
      id: "workspace",
      label: "Workspace",
      collapsible: true,
      reorderable,
      items: [
        {
          id: "projects",
          label: "Projects",
          href: "/projects",
          icon: BoxIcon,
          // Four levels: Projects › Q4 launch › Retro › Notes.
          children: [
            {
              id: "launch",
              label: "Q4 launch",
              href: "/projects/launch",
              icon: RocketIcon,
              children: [
                {
                  id: "launch-specs",
                  label: "Specs",
                  href: "/projects/launch/specs",
                  icon: FileTextIcon,
                },
                {
                  id: "launch-tasks",
                  label: "Tasks",
                  href: "/projects/launch/tasks",
                  icon: ListTodoIcon,
                  badge: 3,
                },
                {
                  id: "launch-retro",
                  label: "Retro",
                  href: "/projects/launch/retro",
                  icon: MessageSquareIcon,
                  children: [
                    {
                      id: "launch-retro-notes",
                      label: "Notes",
                      href: "/projects/launch/retro/notes",
                      icon: StickyNoteIcon,
                    },
                  ],
                },
              ],
            },
            {
              id: "website",
              label: "Website",
              href: "/projects/website",
              icon: GlobeIcon,
            },
            {
              id: "mobile",
              label: "Mobile app",
              href: "/projects/mobile",
              icon: SmartphoneIcon,
            },
          ],
        },
        { id: "docs", label: "Documents", href: "/docs", icon: FileTextIcon },
        { id: "team", label: "Team", href: "/team", icon: UsersIcon },
        {
          id: "reports",
          label: "Reports",
          href: "/reports",
          icon: ChartLineIcon,
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
          label: "Help center",
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

export const DOCUMENTS: Record<
  string,
  { title: string; icon: typeof FileTextIcon }
> = {
  plan: { title: "app-shell.md", icon: FileTextIcon },
  shell: { title: "app-shell.tsx", icon: CodeIcon },
  site: { title: "fabricator-ui.vercel.app", icon: GlobeIcon },
}

export const INITIAL_TABS = {
  tabs: ["plan", "shell", "site"],
  pinned: [],
  recent: ["shell"],
  preview: null,
  closed: [],
}
