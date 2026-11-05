// The example's navigation: the same model the website's playground renders, with
// the library's icons.
import {
  ActivityIcon,
  BoxIcon,
  CalendarIcon,
  ChartLineIcon,
  FileTextIcon,
  GlobeIcon,
  HomeIcon,
  InboxIcon,
  InfoIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  LifeBuoyIcon,
  ListTodoIcon,
  MessageSquareIcon,
  RocketIcon,
  SettingsIcon,
  SmartphoneIcon,
  StickyNoteIcon,
  UsersIcon,
} from "@fabricator-ui/icons-react-native"

import type { AppNavGroup } from "@/registry/native/ui/app-nav"

export const WORKSPACES = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
  { id: "lab", name: "Side Lab", description: "Free" },
]

export const USER = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }

export const NAV_GROUPS: AppNavGroup[] = [
  {
    id: "library",
    label: "Library",
    items: [
      {
        id: "components",
        label: "Components",
        href: "/components",
        icon: LayoutGridIcon,
        mobile: "tab",
      },
      {
        id: "blocks",
        label: "Blocks",
        href: "/blocks",
        icon: LayoutTemplateIcon,
      },
    ],
  },
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
    items: [
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        icon: BoxIcon,
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
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    collapsible: true,
    items: [
      { id: "help", label: "Help center", href: "/help", icon: LifeBuoyIcon },
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

export const PANEL_VIEWS = [
  { value: "details", label: "Details", icon: InfoIcon },
  { value: "activity", label: "Activity", icon: ActivityIcon },
  { value: "comments", label: "Comments", icon: MessageSquareIcon },
]
