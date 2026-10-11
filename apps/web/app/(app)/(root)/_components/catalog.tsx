"use client"

import * as React from "react"

// Every other component, shown with its docs demo (the Fabricator copy the
// docs render). Demos load lazily, so the homepage only downloads a demo's
// code when its card scrolls near the viewport.

type DemoModule = Record<string, unknown>

type CatalogSource = {
  slug: string
  title: string
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
    height: "md",
    // Homepage demo: the status alerts, in both contrasts.
    load: () =>
      import("./demos-status").then((mod) => ({
        AlertStatusDemo: mod.AlertStatusDemo,
      })),
  },
  {
    slug: "aspect-ratio",
    title: "Aspect Ratio",
    height: "md",
    // A homepage demo: the photo reshapes between landscape, square and
    // portrait.
    load: () => import("./demos-media"),
  },
  {
    slug: "attachment",
    title: "Attachment",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/attachment-demo"),
  },
  {
    slug: "avatar",
    title: "Avatar",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/avatar-demo"),
  },
  {
    slug: "badge",
    title: "Badge",
    height: "sm",
    // Homepage demo: every variant, including the statuses.
    load: () =>
      import("./demos-status").then((mod) => ({
        BadgeStatusDemo: mod.BadgeStatusDemo,
      })),
  },
  {
    slug: "breadcrumb",
    title: "Breadcrumb",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/breadcrumb-demo"),
  },
  {
    slug: "bubble",
    title: "Bubble",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/bubble-demo"),
  },
  {
    slug: "button-group",
    title: "Button Group",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/button-group-demo"),
  },
  {
    slug: "card",
    title: "Card",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/card-demo"),
  },
  {
    slug: "carousel",
    title: "Carousel",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/carousel-demo"),
  },
  {
    slug: "collapsible",
    title: "Collapsible",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/collapsible-demo"),
  },
  {
    slug: "context-menu",
    title: "Context Menu",
    height: "sm",
    load: () =>
      import("@/examples/__styles__/base-fabricator/context-menu-demo"),
  },
  {
    slug: "data-table",
    title: "Data Table",
    height: "lg",
    zoom: 0.82,
    load: () => import("@/examples/__styles__/base-fabricator/data-table-demo"),
  },
  {
    slug: "date-picker",
    title: "Date Picker",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/date-picker-demo"),
  },
  {
    slug: "dialog",
    title: "Dialog",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/dialog-demo"),
  },
  {
    slug: "drawer",
    title: "Drawer",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/drawer-demo"),
  },
  {
    slug: "empty",
    title: "Empty",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/empty-demo"),
  },
  {
    slug: "field",
    title: "Field",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/field-demo"),
  },
  {
    slug: "hover-card",
    title: "Hover Card",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/hover-card-demo"),
  },
  {
    slug: "input",
    title: "Input",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/input-demo"),
  },
  {
    slug: "item",
    title: "Item",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/item-demo"),
  },
  {
    slug: "kbd",
    title: "Kbd",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/kbd-demo"),
  },
  {
    slug: "label",
    title: "Label",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/label-demo"),
  },
  {
    slug: "marker",
    title: "Marker",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/marker-demo"),
  },
  {
    slug: "menubar",
    title: "Menubar",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/menubar-demo"),
  },
  {
    slug: "message",
    title: "Message",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/message-demo"),
  },
  {
    slug: "message-scroller",
    title: "Message Scroller",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/message-scroller-demo"),
  },
  {
    slug: "navigation-menu",
    title: "Navigation Menu",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/navigation-menu-demo"),
  },
  {
    slug: "pagination",
    title: "Pagination",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/pagination-demo"),
  },
  {
    slug: "popover",
    title: "Popover",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/popover-demo"),
  },
  {
    slug: "questionnaire",
    title: "Questionnaire",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/questionnaire-demo"),
  },
  {
    slug: "resizable",
    title: "Resizable",
    height: "lg",
    load: () => import("@/examples/__styles__/base-fabricator/resizable-demo"),
  },
  {
    slug: "scroll-area",
    title: "Scroll Area",
    height: "lg",
    load: () =>
      import("@/examples/__styles__/base-fabricator/scroll-area-demo"),
  },
  {
    slug: "separator",
    title: "Separator",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/separator-demo"),
  },
  {
    slug: "sheet",
    title: "Sheet",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/sheet-demo"),
  },
  {
    slug: "skeleton",
    title: "Skeleton",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/skeleton-demo"),
  },
  {
    slug: "spinner",
    title: "Spinner",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/spinner-demo"),
  },
  {
    slug: "textarea",
    title: "Textarea",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/textarea-demo"),
  },
  {
    slug: "toggle",
    title: "Toggle",
    height: "sm",
    load: () => import("@/examples/__styles__/base-fabricator/toggle-demo"),
  },
  {
    slug: "typography",
    title: "Typography",
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
