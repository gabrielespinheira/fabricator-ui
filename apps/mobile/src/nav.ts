// The example's navigation: the desktop example's component explorer
// (lib/component-explorer), with the library's icons. The app adds what only it
// has: its native Icons screen.
import { NATIVE_EXAMPLES } from "@/examples/native/__index__"
import {
  BoxIcon,
  ChartColumnIcon,
  HomeIcon,
  LayersIcon,
  PanelLeftIcon,
  SparklesIcon,
  TextCursorInputIcon,
} from "@fabricator-ui/icons-react-native"

import { getExplorerNavGroups } from "@/lib/component-explorer"
import type { ComponentGroup } from "@/lib/component-groups"
import type {
  AppNavGroup,
  AppNavIcon,
  AppNavItem,
} from "@/registry/native/ui/app-nav"

import { getExplorerComponents } from "./components/component-model"

export const WORKSPACES = [
  { id: "acme", name: "Acme Inc", description: "Enterprise" },
  { id: "studio", name: "Fabricator Studio", description: "Pro" },
  { id: "lab", name: "Side Lab", description: "Free" },
]

export const USER = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }

export const EXPLORER_COMPONENTS = getExplorerComponents(
  Object.keys(NATIVE_EXAMPLES)
)

const EXPLORER_ICONS: {
  overview: AppNavIcon
  groups: Partial<Record<ComponentGroup, AppNavIcon>>
} = {
  overview: HomeIcon,
  groups: {
    Basics: BoxIcon,
    Forms: TextCursorInputIcon,
    Overlays: LayersIcon,
    Structure: PanelLeftIcon,
    Content: ChartColumnIcon,
    Chat: SparklesIcon,
  },
}

const APP_PAGES: AppNavItem[] = [
  {
    id: "icons",
    label: "Icons",
    href: "/icons",
    icon: SparklesIcon,
    mobile: "tab",
  },
]

export function getNavGroups({
  reorderable,
}: {
  reorderable: boolean
}): AppNavGroup[] {
  return getExplorerNavGroups(EXPLORER_COMPONENTS, EXPLORER_ICONS, {
    reorderable,
    pages: APP_PAGES,
  })
}

/** The component groups' rows, each holding its components. */
export const GROUP_ROWS = getNavGroups({ reorderable: false }).flatMap(
  (group) => group.items.filter((item) => item.children)
)
