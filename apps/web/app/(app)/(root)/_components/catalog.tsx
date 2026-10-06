"use client"

import * as React from "react"

// Every other component, shown with its docs demo (the Fabricator copy the
// docs render). Demos load lazily, so the homepage only downloads a demo's
// code when its card scrolls near the viewport.

export type CatalogCategory =
  | "Menus"
  | "Forms"
  | "Navigation"
  | "Overlays"
  | "Data"
  | "Feedback"
  | "Chat"
  | "Layout"

type DemoModule = Record<string, unknown>

type CatalogSource = {
  slug: string
  title: string
  category: CatalogCategory
  height: "sm" | "md" | "lg"
  /** Scales a demo that is wider than a card. */
  zoom?: number
  load: () => Promise<DemoModule>
}

export type CatalogEntry = Omit<CatalogSource, "load"> & {
  /** Lazy: loads nothing until it first renders. */
  Demo: React.LazyExoticComponent<React.ComponentType>
}

const SOURCES: CatalogSource[] = [
  {
    slug: "alert",
    title: "Alert",
    category: "Feedback",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/alert-demo"),
  },
  {
    slug: "aspect-ratio",
    title: "Aspect Ratio",
    category: "Layout",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/aspect-ratio-demo"),
  },
  {
    slug: "attachment",
    title: "Attachment",
    category: "Chat",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/attachment-demo"),
  },
  {
    slug: "avatar",
    title: "Avatar",
    category: "Data",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/avatar-demo"),
  },
  {
    slug: "badge",
    title: "Badge",
    category: "Data",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/badge-demo"),
  },
  {
    slug: "breadcrumb",
    title: "Breadcrumb",
    category: "Navigation",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/breadcrumb-demo"),
  },
  {
    slug: "bubble",
    title: "Bubble",
    category: "Chat",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/bubble-demo"),
  },
  {
    slug: "button-group",
    title: "Button Group",
    category: "Forms",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/button-group-demo"),
  },
  {
    slug: "card",
    title: "Card",
    category: "Layout",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/card-demo"),
  },
  {
    slug: "carousel",
    title: "Carousel",
    category: "Navigation",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/carousel-demo"),
  },
  {
    slug: "chart",
    title: "Chart",
    category: "Data",
    height: "lg",
    // The lead chart demo is a full-width dashboard card; this one fits.
    load: () =>
      import("@/examples/__styles__/base-fabricator/chart-example-legend"),
  },
  {
    slug: "collapsible",
    title: "Collapsible",
    category: "Navigation",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/collapsible-demo"),
  },
  {
    slug: "context-menu",
    title: "Context Menu",
    category: "Menus",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/context-menu-demo"),
  },
  {
    slug: "data-table",
    title: "Data Table",
    category: "Data",
    height: "lg",
    zoom: 0.82,
    load: () => import("@/examples/__styles__/base-fabricator/data-table-demo"),
  },
  {
    slug: "date-picker",
    title: "Date Picker",
    category: "Forms",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/date-picker-demo"),
  },
  {
    slug: "dialog",
    title: "Dialog",
    category: "Overlays",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/dialog-demo"),
  },
  {
    slug: "drawer",
    title: "Drawer",
    category: "Overlays",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/drawer-demo"),
  },
  {
    slug: "empty",
    title: "Empty",
    category: "Feedback",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/empty-demo"),
  },
  {
    slug: "field",
    title: "Field",
    category: "Forms",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/field-demo"),
  },
  {
    slug: "hover-card",
    title: "Hover Card",
    category: "Overlays",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/hover-card-demo"),
  },
  {
    slug: "input",
    title: "Input",
    category: "Forms",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/input-demo"),
  },
  {
    slug: "item",
    title: "Item",
    category: "Data",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/item-demo"),
  },
  {
    slug: "kbd",
    title: "Kbd",
    category: "Data",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/kbd-demo"),
  },
  {
    slug: "label",
    title: "Label",
    category: "Forms",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/label-demo"),
  },
  {
    slug: "marker",
    title: "Marker",
    category: "Data",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/marker-demo"),
  },
  {
    slug: "menubar",
    title: "Menubar",
    category: "Menus",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/menubar-demo"),
  },
  {
    slug: "message",
    title: "Message",
    category: "Chat",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/message-demo"),
  },
  {
    slug: "message-scroller",
    title: "Message Scroller",
    category: "Chat",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/message-scroller-demo"),
  },
  {
    slug: "navigation-menu",
    title: "Navigation Menu",
    category: "Navigation",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/navigation-menu-demo"),
  },
  {
    slug: "pagination",
    title: "Pagination",
    category: "Navigation",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/pagination-demo"),
  },
  {
    slug: "popover",
    title: "Popover",
    category: "Overlays",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/popover-demo"),
  },
  {
    slug: "questionnaire",
    title: "Questionnaire",
    category: "Forms",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/questionnaire-demo"),
  },
  {
    slug: "resizable",
    title: "Resizable",
    category: "Layout",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/resizable-demo"),
  },
  {
    slug: "scroll-area",
    title: "Scroll Area",
    category: "Layout",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/scroll-area-demo"),
  },
  {
    slug: "separator",
    title: "Separator",
    category: "Layout",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/separator-demo"),
  },
  {
    slug: "sheet",
    title: "Sheet",
    category: "Overlays",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/sheet-demo"),
  },
  {
    slug: "skeleton",
    title: "Skeleton",
    category: "Feedback",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/skeleton-demo"),
  },
  {
    slug: "spinner",
    title: "Spinner",
    category: "Feedback",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/spinner-demo"),
  },
  {
    slug: "textarea",
    title: "Textarea",
    category: "Forms",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/textarea-demo"),
  },
  {
    slug: "toggle",
    title: "Toggle",
    category: "Forms",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/toggle-demo"),
  },
  {
    slug: "typography",
    title: "Typography",
    category: "Layout",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/typography-demo"),
  },
]

// Demos export their component as the default, as a named `…Demo`, or as
// their only named function.
function pickComponent(mod: DemoModule) {
  const functions = Object.entries(mod).filter(
    ([, value]) => typeof value === "function"
  )
  const candidate =
    mod.default ??
    functions.find(([name]) => name.endsWith("Demo"))?.[1] ??
    functions[0]?.[1]
  if (!candidate) throw new Error("The demo module exports no component.")
  return candidate as React.ComponentType
}

export const CATALOG: CatalogEntry[] = SOURCES.map(({ load, ...entry }) => ({
  ...entry,
  Demo: React.lazy(async () => ({ default: pickComponent(await load()) })),
}))
