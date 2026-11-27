// The component groups shared by the docs sidebar and the homepage gallery.
// Basics are the building blocks other components are made of; the middle
// groups are what a reader is trying to build; Charts draw numbers as marks;
// Advanced holds the large, self-contained components that are products of
// their own.

export const COMPONENT_GROUPS = [
  "Basics",
  "Forms",
  "Overlays",
  "Structure",
  "Content",
  "Charts",
  "Chat",
  "Advanced",
] as const

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number]

const GROUP_BY_SLUG: Record<string, ComponentGroup> = {
  // Basics
  // Text and FabricatorRoot exist on React Native only; web has the DOM's.
  text: "Basics",
  density: "Basics",
  "fabricator-root": "Structure",
  direction: "Structure",
  "theme-toggle": "Basics",
  button: "Basics",
  "hold-button": "Basics",
  "slide-to-confirm": "Basics",
  toggle: "Basics",
  badge: "Basics",
  avatar: "Basics",
  kbd: "Basics",
  separator: "Basics",
  spinner: "Basics",
  skeleton: "Basics",
  alert: "Basics",
  toast: "Basics",
  sonner: "Basics",
  empty: "Basics",
  "aspect-ratio": "Basics",
  "scroll-area": "Basics",
  properties: "Forms",
  // Forms
  input: "Forms",
  textarea: "Forms",
  label: "Forms",
  checkbox: "Forms",
  "radio-group": "Forms",
  switch: "Forms",
  slider: "Forms",
  rating: "Forms",
  field: "Forms",
  form: "Forms",
  "input-group": "Forms",
  "input-otp": "Forms",
  select: "Forms",
  combobox: "Forms",
  "number-field": "Forms",
  "password-strength": "Forms",
  "file-upload": "Forms",
  "color-picker": "Forms",
  "button-group": "Forms",
  "toggle-group": "Forms",
  calendar: "Forms",
  "date-picker": "Forms",
  "multi-select": "Forms",
  "time-input": "Forms",
  "time-wheel": "Forms",
  "record-view": "Overlays",
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
  command: "Overlays",
  // Structure
  sidebar: "Structure",
  "app-shell": "Structure",
  "app-nav": "Structure",
  "tab-strip": "Structure",
  "workspace-switcher": "Structure",
  "user-menu": "Structure",
  "navigation-menu": "Structure",
  tabs: "Structure",
  breadcrumb: "Structure",
  stepper: "Structure",
  "bottom-nav": "Structure",
  pagination: "Structure",
  "preview-rail": "Structure",
  accordion: "Structure",
  collapsible: "Structure",
  resizable: "Structure",
  card: "Structure",
  item: "Structure",
  carousel: "Structure",
  // Content
  typography: "Content",
  "text-motion": "Content",
  table: "Content",
  progress: "Content",
  "segmented-meter": "Content",
  folder: "Content",
  markdown: "Content",
  sounds: "Content",
  // Charts
  "area-chart": "Charts",
  "line-chart": "Charts",
  "bar-chart": "Charts",
  "composition-chart": "Charts",
  "candlestick-chart": "Charts",
  "bump-chart": "Charts",
  "pie-chart": "Charts",
  "donut-chart": "Charts",
  "radial-chart": "Charts",
  "radar-chart": "Charts",
  treemap: "Charts",
  "funnel-chart": "Charts",
  "sankey-chart": "Charts",
  "heat-calendar": "Charts",
  "status-bar": "Charts",
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
  kanban: "Advanced",
  // Advanced
  "data-table": "Advanced",
  "event-calendar": "Advanced",
  canvas: "Advanced",
  editor: "Advanced",
  "file-tree": "Advanced",
  "syntax-highlight": "Advanced",
  "image-compare": "Advanced",
  "morph-island": "Advanced",
  "video-player": "Advanced",
  "audio-player": "Advanced",
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
