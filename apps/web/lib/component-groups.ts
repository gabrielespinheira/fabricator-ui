// The component groups shared by the docs sidebar and the homepage gallery.
// Basics are the building blocks other components are made of; the other
// groups are what a reader is trying to build.

export const COMPONENT_GROUPS = [
  "Basics",
  "Forms",
  "Overlays & Menus",
  "Navigation & Layout",
  "Data & Feedback",
  "AI & Chat",
] as const

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number]

const GROUP_BY_SLUG: Record<string, ComponentGroup> = {
  // Basics
  button: "Basics",
  input: "Basics",
  textarea: "Basics",
  label: "Basics",
  checkbox: "Basics",
  "radio-group": "Basics",
  switch: "Basics",
  slider: "Basics",
  toggle: "Basics",
  badge: "Basics",
  avatar: "Basics",
  kbd: "Basics",
  separator: "Basics",
  spinner: "Basics",
  skeleton: "Basics",
  typography: "Basics",
  "aspect-ratio": "Basics",
  "scroll-area": "Basics",
  // Forms
  field: "Forms",
  "input-group": "Forms",
  "input-otp": "Forms",
  select: "Forms",
  combobox: "Forms",
  search: "Forms",
  "button-group": "Forms",
  "toggle-group": "Forms",
  calendar: "Forms",
  "date-picker": "Forms",
  // Overlays & Menus
  dialog: "Overlays & Menus",
  "alert-dialog": "Overlays & Menus",
  sheet: "Overlays & Menus",
  drawer: "Overlays & Menus",
  popover: "Overlays & Menus",
  "hover-card": "Overlays & Menus",
  tooltip: "Overlays & Menus",
  "dropdown-menu": "Overlays & Menus",
  "context-menu": "Overlays & Menus",
  menubar: "Overlays & Menus",
  command: "Overlays & Menus",
  // Navigation & Layout
  sidebar: "Navigation & Layout",
  "navigation-menu": "Navigation & Layout",
  tabs: "Navigation & Layout",
  breadcrumb: "Navigation & Layout",
  pagination: "Navigation & Layout",
  accordion: "Navigation & Layout",
  collapsible: "Navigation & Layout",
  resizable: "Navigation & Layout",
  card: "Navigation & Layout",
  item: "Navigation & Layout",
  carousel: "Navigation & Layout",
  // Data & Feedback
  table: "Data & Feedback",
  "data-table": "Data & Feedback",
  alert: "Data & Feedback",
  toast: "Data & Feedback",
  sonner: "Data & Feedback",
  progress: "Data & Feedback",
  empty: "Data & Feedback",
  // AI & Chat
  message: "AI & Chat",
  "message-scroller": "AI & Chat",
  bubble: "AI & Chat",
  attachment: "AI & Chat",
  marker: "AI & Chat",
  questionnaire: "AI & Chat",
}

export class UngroupedComponentError extends Error {
  constructor(slug: string) {
    super(
      `Component "${slug}" has no group. Add it to GROUP_BY_SLUG in lib/component-groups.ts.`
    )
    this.name = "UngroupedComponentError"
  }
}

export function getComponentGroup(slug: string): ComponentGroup {
  const group = GROUP_BY_SLUG[slug]
  if (!group) throw new UngroupedComponentError(slug)
  return group
}

/** Splits component doc pages into the groups, in group order. */
export function groupComponentPages<Page extends { url: string }>(
  pages: Page[]
) {
  return COMPONENT_GROUPS.map((group) => ({
    group,
    pages: pages.filter(
      (page) => getComponentGroup(page.url.split("/").at(-1) ?? "") === group
    ),
  })).filter(({ pages }) => pages.length > 0)
}
