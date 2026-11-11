// The component groups shared by the docs sidebar and the homepage gallery.
// Basics are the building blocks other components are made of; the other
// groups are what a reader is trying to build.

export const COMPONENT_GROUPS = [
  "Basics",
  "Forms",
  "Overlays",
  "Structure",
  "Content",
  "Chat",
] as const

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number]

const GROUP_BY_SLUG: Record<string, ComponentGroup> = {
  // Basics
  // Text and FabricatorRoot exist on React Native only; web has the DOM's.
  text: "Basics",
  density: "Basics",
  "fabricator-root": "Structure",
  direction: "Structure",
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
  "number-field": "Forms",
  "file-upload": "Forms",
  "color-picker": "Forms",
  editor: "Forms",
  "button-group": "Forms",
  "toggle-group": "Forms",
  calendar: "Forms",
  "date-picker": "Forms",
  "month-input": "Forms",
  "time-input": "Forms",
  "time-wheel": "Forms",
  // Overlays
  dialog: "Overlays",
  "alert-dialog": "Overlays",
  sheet: "Overlays",
  drawer: "Overlays",
  popover: "Overlays",
  "hover-card": "Overlays",
  tooltip: "Overlays",
  "dropdown-menu": "Overlays",
  "context-menu": "Overlays",
  menubar: "Overlays",
  command: "Overlays",
  // Structure
  sidebar: "Structure",
  "app-shell": "Structure",
  "app-nav": "Structure",
  "file-tree": "Structure",
  "tab-strip": "Structure",
  "workspace-switcher": "Structure",
  "user-menu": "Structure",
  "navigation-menu": "Structure",
  tabs: "Structure",
  breadcrumb: "Structure",
  pagination: "Structure",
  accordion: "Structure",
  collapsible: "Structure",
  resizable: "Structure",
  card: "Structure",
  item: "Structure",
  carousel: "Structure",
  // Content
  table: "Content",
  "data-table": "Content",
  alert: "Content",
  toast: "Content",
  sonner: "Content",
  progress: "Content",
  empty: "Content",
  "video-player": "Content",
  "syntax-highlight": "Content",
  markdown: "Content",
  // Chat
  "bot-face": "Chat",
  "chat-input": "Chat",
  "model-picker": "Chat",
  message: "Chat",
  "message-scroller": "Chat",
  bubble: "Chat",
  attachment: "Chat",
  marker: "Chat",
  questionnaire: "Chat",
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
