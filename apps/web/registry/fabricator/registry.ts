// Registry items and overrides that exist only in Fabricator styles.
//
// Fabricator styles compile from the same base sources as the upstream styles,
// plus an overlay:
//
// - registry/fabricator/shared/<path>: files used by every base.
// - registry/fabricator/<base>/<path>: per-base files. A file with the same
//   path as an upstream source (e.g. ui/dropdown-menu.tsx) replaces it in the
//   Fabricator style only, so upstream styles keep their exact output.
//
// Overlay files import other registry files through
// `@/registry/bases/__base__/…`; the build substitutes the base being compiled.
// See AGENTS.md, "Fabricator overrides".

import { type Registry } from "shadcn/schema"

import { FABRICATOR_FOUNDATIONS } from "@/registry/fabricator/foundations"

export const fabricatorItems = [
  {
    name: "foundations",
    type: "registry:lib",
    title: "Foundations",
    description:
      "Fabricator surfaces, colour roles, interaction tokens, focus colour, motion, densities and scrollbars.",
    cssVars: FABRICATOR_FOUNDATIONS.cssVars,
    css: FABRICATOR_FOUNDATIONS.css,
  },
  {
    name: "density",
    type: "registry:ui",
    title: "Density",
    description:
      "DensityProvider sets compact, default or spacious for everything inside it, including the popups and dialogs it opens.",
    files: [{ path: "ui/density.tsx", type: "registry:ui" }],
    categories: ["layout"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/foundations/density",
      },
    },
  },
  {
    name: "fluid-hover",
    type: "registry:lib",
    title: "Fluid Hover",
    description:
      "One highlight that glides to the item nearest the pointer, and a selection background that slides between selected items.",
    files: [{ path: "lib/fluid-hover.tsx", type: "registry:lib" }],
  },
  {
    name: "sounds",
    type: "registry:lib",
    title: "Sounds",
    description:
      "Interface sounds synthesized with the Web Audio API, and <SoundEffects /> to play them for every component. On by default.",
    files: [
      { path: "lib/sound-recipes.ts", type: "registry:lib" },
      { path: "lib/sounds.ts", type: "registry:lib" },
      { path: "components/sound-effects.tsx", type: "registry:component" },
    ],
  },
  {
    name: "desktop-window",
    type: "registry:hook",
    title: "Desktop Window",
    description:
      "Finds the Electron or Tauri window hosting the page and gives the App Shell what to lay out around, so one layout serves a browser and a desktop app.",
    files: [
      { path: "hooks/use-desktop-window.ts", type: "registry:hook" },
      { path: "lib/desktop-window.ts", type: "registry:lib" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "search",
    type: "registry:ui",
    title: "Search",
    description:
      "A search button that springs open into a search field as one object. Escape clears, then closes.",
    files: [{ path: "ui/search.tsx", type: "registry:ui" }],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/search",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/search#examples",
      },
    },
  },
  {
    name: "file-upload",
    type: "registry:ui",
    title: "File Upload",
    description:
      "A file picker with a drop zone: type, size and count checks with reasons, and the picked files as Attachment rows.",
    registryDependencies: ["attachment", "button"],
    files: [{ path: "ui/file-upload.tsx", type: "registry:ui" }],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/file-upload",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/file-upload#examples",
      },
    },
  },
  {
    name: "chat-input",
    type: "registry:ui",
    title: "Chat Input",
    description:
      "The message box of a chat: a raised card whose field grows with the draft, a compact pill that stacks once it wraps, and a send button that turns into stop while a reply streams.",
    registryDependencies: ["button", "spinner"],
    files: [{ path: "ui/chat-input.tsx", type: "registry:ui" }],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/chat-input",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/chat-input#examples",
      },
    },
  },
  {
    name: "number-field",
    type: "registry:ui",
    title: "Number Field",
    description:
      "A number input with decrement and increment steppers, min, max and step, keyboard stepping, and locale formatting for currency, percent and units.",
    registryDependencies: ["input-group"],
    files: [{ path: "ui/number-field.tsx", type: "registry:ui" }],
    categories: ["forms"],
    meta: {
      fabricator: true,
      // Radix has no number field: the radix item is the Base UI
      // implementation, and the build adds Base UI's packages to it.
      implementation: { radix: "base" },
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/number-field",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/number-field#examples",
      },
    },
  },
  {
    name: "date-picker",
    type: "registry:ui",
    title: "Date Picker",
    description:
      "A date field: type a date or pick one from a calendar, with a display format, a minimum and maximum, and a form value.",
    // @internationalized/date is for the React Aria calendar; date-fns reads
    // and writes the text in every base.
    dependencies: ["date-fns", "@internationalized/date"],
    registryDependencies: ["calendar", "input-group", "popover"],
    files: [
      { path: "ui/date-picker.tsx", type: "registry:ui" },
      { path: "lib/date-picker-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/date-picker",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/date-picker#examples",
      },
    },
  },
  {
    name: "month-input",
    type: "registry:ui",
    title: "Month Input",
    description:
      "A text field that takes a typed month or one picked from a year of months, with a display format, a range and a form value.",
    dependencies: ["date-fns"],
    registryDependencies: ["button", "input-group", "popover", "fluid-hover"],
    files: [
      { path: "ui/month-input.tsx", type: "registry:ui" },
      { path: "lib/month-input-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/month-input",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/month-input#examples",
      },
    },
  },
  {
    name: "time-input",
    type: "registry:ui",
    title: "Time Input",
    description:
      "A text field that takes a typed time or one picked from a list, in 12- or 24-hour form, with steps, a range and a form value.",
    registryDependencies: ["input-group", "popover", "fluid-hover"],
    files: [
      { path: "ui/time-input.tsx", type: "registry:ui" },
      { path: "lib/time-input-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/time-input",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/time-input#examples",
      },
    },
  },
  {
    name: "color-picker",
    type: "registry:ui",
    title: "Color Picker",
    description:
      "A color picker with a saturation area, hue and alpha sliders, HEX, RGB, HSL and OKLCH fields, swatches and the eyedropper, inline or in a popover.",
    registryDependencies: [
      "button",
      "button-group",
      "input-group",
      "popover",
      "select",
      "slider",
      "tooltip",
      "fluid-hover",
    ],
    files: [
      { path: "ui/color-picker.tsx", type: "registry:ui" },
      { path: "lib/color-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/color-picker",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/color-picker#examples",
      },
    },
  },
  {
    name: "app-shell-model",
    type: "registry:lib",
    title: "App Shell model",
    description:
      "The App Shell's behaviour as plain data and pure functions: navigation, tabs, panels, layout, shortcuts, resize and breadcrumbs. No DOM, so a React Native shell can share it.",
    files: [{ path: "lib/app-shell-model.ts", type: "registry:lib" }],
  },
  {
    name: "sidebar-model",
    type: "registry:lib",
    title: "Sidebar model",
    description:
      "The Sidebar's plain data and rules: its toggle's glyph, and how the phone sidebar's reveal moves and settles. No DOM, so a React Native shell can share it.",
    files: [{ path: "lib/sidebar-model.ts", type: "registry:lib" }],
  },
  {
    name: "sortable",
    type: "registry:lib",
    title: "Sortable",
    description:
      "The one drag-and-drop adapter: pointer sorting in lists and between groups, used by Tab Strip and App Nav.",
    // Pinned exactly: @dnd-kit/react is pre-1.0 and changes its API between
    // minors. This file is the only one that imports it.
    dependencies: [
      "@dnd-kit/react@0.5.3",
      "@dnd-kit/dom@0.5.3",
      "@dnd-kit/abstract@0.5.3",
    ],
    files: [{ path: "lib/sortable.tsx", type: "registry:lib" }],
  },
  {
    name: "app-shell",
    type: "registry:ui",
    title: "App Shell",
    description:
      "The frame an app lives in: sidebar, main column with header and breadcrumb, panels that dock or float by the room left, one shortcut registry, and native-window chrome for Electron and Tauri.",
    registryDependencies: [
      "app-shell-model",
      "sidebar",
      "breadcrumb",
      "button",
      "drawer",
      "dropdown-menu",
      "kbd",
      "sheet",
      "tabs",
      "tooltip",
    ],
    files: [{ path: "ui/app-shell.tsx", type: "registry:ui" }],
    categories: ["layout"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/app-shell",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/app-shell#examples",
      },
    },
  },
  {
    name: "tab-strip",
    type: "registry:ui",
    title: "Tab Strip",
    description:
      "Document tabs as in a browser or an editor: pinned and preview tabs, drag to reorder, close variants, reopen, rename and the usual shortcuts.",
    registryDependencies: [
      "app-shell-model",
      "app-shell",
      "sortable",
      "fluid-hover",
      "button",
      "context-menu",
      "dropdown-menu",
      "spinner",
      "tooltip",
    ],
    files: [{ path: "ui/tab-strip.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/tab-strip",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/tab-strip#examples",
      },
    },
  },
  {
    name: "app-nav",
    type: "registry:component",
    title: "App Nav",
    description:
      "Renders a navigation model into the Sidebar: groups, badges, statuses, children, row actions, reordering, pinning and hiding.",
    registryDependencies: [
      "app-shell-model",
      "app-shell",
      "sortable",
      "sidebar",
      "button",
      "context-menu",
      "dialog",
      "dropdown-menu",
      "switch",
    ],
    files: [{ path: "ui/app-nav.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/app-nav",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/app-nav#examples",
      },
    },
  },
  {
    name: "workspace-switcher",
    type: "registry:component",
    title: "Workspace Switcher",
    description:
      "Switches the organization or workspace: a menu for a few, a searchable dialog for many, and an overlay while the next one loads.",
    registryDependencies: [
      "app-shell",
      "sidebar",
      "command",
      "dropdown-menu",
      "spinner",
      "tooltip",
    ],
    files: [{ path: "ui/workspace-switcher.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/workspace-switcher",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/workspace-switcher#examples",
      },
    },
  },
  {
    name: "user-menu",
    type: "registry:component",
    title: "User Menu",
    description:
      "The signed-in person's menu, as a sidebar row or an avatar mark.",
    registryDependencies: ["sidebar", "avatar", "dropdown-menu"],
    files: [{ path: "ui/user-menu.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/user-menu",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/user-menu#examples",
      },
    },
  },
  ...[
    {
      name: "app-shell-01",
      title: "App Shell 01",
      description:
        "A workspace app: account and organization in the sidebar's first row, customizable grouped navigation, a breadcrumb that hands over to the page title, and a details panel.",
      registryDependencies: [
        "app-shell",
        "app-nav",
        "workspace-switcher",
        "user-menu",
      ],
    },
    {
      name: "app-shell-02",
      title: "App Shell 02",
      description:
        "A workbench: document tabs above the content, a resources panel switched from the tab row, a status bar, and a sidebar that peeks.",
      registryDependencies: ["app-shell", "app-nav", "tab-strip"],
    },
    {
      name: "app-shell-03",
      title: "App Shell 03",
      description:
        "A classic SaaS layout: team switcher on top, the person's menu at the bottom, and a sidebar that collapses to icons.",
      registryDependencies: [
        "app-shell",
        "app-nav",
        "workspace-switcher",
        "user-menu",
      ],
    },
    {
      name: "app-shell-04",
      title: "App Shell 04",
      description:
        "A desktop app for Electron or Tauri: tabs in a titlebar row that clears the native window controls, with drag regions.",
      registryDependencies: ["app-shell", "app-nav", "tab-strip"],
    },
    {
      name: "app-shell-05",
      title: "App Shell 05",
      description:
        "Mobile first: a tab bar and a floating primary action on phones, and a message that swaps in over the list.",
      registryDependencies: ["app-shell", "app-nav"],
    },
  ].map((block) => ({
    ...block,
    type: "registry:block" as const,
    files: [
      {
        path: `blocks/${block.name}/page.tsx`,
        type: "registry:page" as const,
        target: "app/dashboard/page.tsx",
      },
    ],
    categories: ["app-shell", "dashboard"],
    meta: { fabricator: true },
  })),
  {
    name: "radius-pill",
    type: "registry:theme",
    title: "Pill radius",
    description:
      "Sets --radius to 1.25rem: controls become full pills and containers stay concentric. The default is 0.5rem.",
    cssVars: {
      light: { radius: "1.25rem" },
    },
  },
] satisfies Registry["items"]

// Extra dependencies for items whose Fabricator source differs from upstream.
// Bare names are namespaced to @fabricator by the build.
// Applied only for bases that have an override file for the item.
export const fabricatorOverrides: Record<
  string,
  { dependencies?: string[]; registryDependencies?: string[] }
> = {
  // Portalled popups, dialogs and sheets read the nearest DensityProvider.
  dialog: { registryDependencies: ["density"] },
  "alert-dialog": { registryDependencies: ["density"] },
  sheet: { registryDependencies: ["density"] },
  drawer: { registryDependencies: ["density"] },
  popover: { registryDependencies: ["density"] },
  "hover-card": { registryDependencies: ["density"] },
  tooltip: { registryDependencies: ["density"] },
  "dropdown-menu": { registryDependencies: ["fluid-hover", "density"] },
  "context-menu": { registryDependencies: ["fluid-hover", "density"] },
  menubar: { registryDependencies: ["fluid-hover", "density"] },
  select: { registryDependencies: ["fluid-hover", "density"] },
  combobox: { registryDependencies: ["fluid-hover", "density"] },
  command: { registryDependencies: ["fluid-hover"] },
  "navigation-menu": { registryDependencies: ["fluid-hover", "density"] },
  tabs: { registryDependencies: ["fluid-hover"] },
  "toggle-group": { registryDependencies: ["fluid-hover"] },
  sidebar: { registryDependencies: ["fluid-hover", "kbd", "sidebar-model"] },
  accordion: { registryDependencies: ["fluid-hover"] },
  table: { registryDependencies: ["fluid-hover"] },
  // The month and year dropdowns are the library's Select.
  calendar: { registryDependencies: ["select"] },
}

/**
 * Upstream items the Fabricator library leaves out of its registry, mapped
 * to the item that replaces them in other items' dependencies (null drops the
 * dependency). The library doesn't ship controls that only restyle a raw
 * native element: Native Select is replaced by Select everywhere. Chart is
 * left out for now, together with the blocks built on it (dashboard-01 and
 * the preview / preview-02 showcase blocks). The upstream styles, compiled
 * only for the parity check, keep every upstream item. Items that used an
 * excluded one get a Fabricator override that
 * uses the replacement (registry/fabricator/<base>/...).
 */
export const FABRICATOR_EXCLUDED_ITEMS: Record<string, string | null> = {
  "native-select": "select",
  "native-select-example": null,
  chart: null,
  "chart-example": null,
  "dashboard-01": null,
  preview: null,
  "preview-02": null,
}

/** Items that every Fabricator component installs alongside itself. */
export const FABRICATOR_REQUIRED_ITEMS = ["foundations"]
