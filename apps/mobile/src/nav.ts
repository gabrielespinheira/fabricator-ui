// The example's navigation: the same model the web playground renders
// (NavGroup from the App Shell model), with lucide's native icons.
import type { NavGroup } from "@fabricator-ui/app-shell-model"
import {
  BoxIcon,
  CalendarIcon,
  ChartLineIcon,
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
  type LucideIcon,
} from "lucide-react-native"

export type NativeNavGroup = NavGroup<LucideIcon>

export const WORKSPACES = [
  { id: "acme", name: "Acme Inc", plan: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", plan: "Pro" },
  { id: "lab", name: "Side Lab", plan: "Free" },
] as const

export const USER = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }

export const NAV_GROUPS: NativeNavGroup[] = [
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
  { value: "details", label: "Details" },
  { value: "activity", label: "Activity" },
  { value: "comments", label: "Comments" },
] as const
