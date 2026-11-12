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
// See docs/STYLES.md, "Overrides".

import { type Registry } from "shadcn/schema"

import { FABRICATOR_FOUNDATIONS } from "@/registry/fabricator/foundations"

export const fabricatorItems = [
  {
    name: "theme-toggle",
    type: "registry:ui",
    title: "Theme Toggle",
    description:
      "A theme button with a morphing sun and moon, four page reveals that start at the pressed button.",
    dependencies: ["cn"],
    registryDependencies: ["@fabricator/button"],
    files: [
      { path: "ui/theme-toggle.tsx", type: "registry:ui" },
      { path: "lib/theme-toggle-model.ts", type: "registry:lib" },
      { path: "lib/theme-transition.ts", type: "registry:lib" },
    ],
    categories: ["basics"],
    meta: { fabricator: true },
  },
  {
    name: "bot-face",
    type: "registry:ui",
    title: "BotFace",
    description:
      "An animated assistant face with fourteen silhouettes, palette colours, blinking and pointer-following eyes.",
    dependencies: ["cn", "class-variance-authority"],
    files: [
      { path: "ui/bot-face.tsx", type: "registry:ui" },
      { path: "lib/bot-face-model.ts", type: "registry:lib" },
    ],
    categories: ["chat"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/bot-face",
      },
    },
  },
  {
    name: "spinner-model",
    type: "registry:lib",
    title: "Spinner patterns",
    files: [{ path: "lib/spinner-model.ts", type: "registry:lib" }],
  },
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
    name: "file-tree",
    type: "registry:ui",
    title: "File Tree",
    description:
      "A desktop file explorer with folder guides, file-type icons, keyboard navigation, single and range selection, and open and delete callbacks.",
    dependencies: ["@fabricator-ui/icons"],
    registryDependencies: ["fluid-hover"],
    files: [
      { path: "ui/file-tree.tsx", type: "registry:ui" },
      { path: "lib/file-tree-model.ts", type: "registry:lib" },
    ],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/file-tree",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/file-tree#examples",
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
    files: [
      { path: "ui/file-upload.tsx", type: "registry:ui" },
      { path: "lib/file-upload-model.ts", type: "registry:lib" },
    ],
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
      "The message box of a chat: a pill that stacks once the draft wraps, or a large card, attachments with drop and paste, voice chat with a glow and a level-following mic, a context meter, and one send slot that starts voice, sends, queues and stops.",
    // voice-glow (MIT, no runtime dependencies, React 18+) draws the voice
    // chat glow; pinned like Relay, which uses the same version.
    dependencies: ["voice-glow@0.3.0"],
    registryDependencies: ["button", "spinner", "density"],
    files: [
      { path: "ui/chat-input.tsx", type: "registry:ui" },
      { path: "lib/chat-input-model.ts", type: "registry:lib" },
    ],
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
    name: "video-player",
    type: "registry:ui",
    title: "Video Player",
    description:
      "A video with its own controls over the picture: a seek bar with chapters and a time preview, skip, volume, captions, speed, picture in picture, full screen and the common keyboard shortcuts. A compact variant keeps play, the seek bar, the time, mute and full screen.",
    registryDependencies: ["spinner"],
    files: [
      { path: "ui/video-player.tsx", type: "registry:ui" },
      { path: "lib/video-player-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/video-player",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/video-player#examples",
      },
    },
  },
  {
    name: "image-compare",
    type: "registry:ui",
    title: "Image Compare",
    description:
      "Two pictures of one scene in a single frame, split by a line you drag. The line bends like jelly and the picture is cut along it; a click or a key glides it there and a flick sends it to the edge.",
    files: [
      { path: "ui/image-compare.tsx", type: "registry:ui" },
      { path: "lib/image-compare-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/image-compare",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/image-compare#examples",
      },
    },
  },
  {
    name: "model-picker",
    type: "registry:ui",
    title: "Model Picker",
    description:
      "The model switcher's panel: a reasoning effort slider that warms from blue to violet, routing tiles such as Auto, and the models grouped by provider. It goes in a popover of your own.",
    files: [
      { path: "ui/model-picker.tsx", type: "registry:ui" },
      { path: "lib/model-picker-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/model-picker",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/model-picker#examples",
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
      "A date field that opens a calendar, with an optional column of times, a display format, a minimum and maximum, typing on request and a form value.",
    // @internationalized/date is for the React Aria calendar; date-fns reads
    // and writes the text in every base.
    dependencies: ["date-fns", "@internationalized/date"],
    registryDependencies: ["calendar", "input-group", "popover", "time-input"],
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
      "A text field that takes a typed time or one picked on a scroll wheel of hours, minutes and seconds, in 12- or 24-hour form, with a range and a form value.",
    registryDependencies: ["input-group", "popover"],
    files: [
      { path: "ui/time-input.tsx", type: "registry:ui" },
      { path: "ui/time-wheel.tsx", type: "registry:ui" },
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
    name: "syntax-highlight",
    type: "registry:ui",
    title: "Syntax Highlight",
    description:
      "Code coloured by the foundations' syntax tokens, in over 30 languages, read from a name or a file name: a title bar with the file and Copy, line numbers, highlighted, added and removed lines, and wrapping. The same tokenizer runs on React Native.",
    // refractor (MIT, typed, no DOM) reads the code: Prism's grammars as
    // plain ESM, synchronous, so it renders on the server and on React
    // Native alike. Core plus the bundled languages is ~37 kB gzipped.
    // Pinned: the model maps its token names.
    dependencies: ["refractor@5.0.0"],
    registryDependencies: ["button"],
    files: [
      { path: "ui/syntax-highlight.tsx", type: "registry:ui" },
      { path: "lib/syntax-highlight-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/syntax-highlight",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/syntax-highlight#examples",
      },
    },
  },
  {
    name: "markdown",
    type: "registry:ui",
    title: "Markdown",
    description:
      "Markdown drawn with the Editor's document typography in three sizes: headings, lists and tasks, quotes, code, tables, images and links, with anything it doesn't model kept as its source. Its own parser, no dependencies.",
    registryDependencies: ["syntax-highlight"],
    files: [
      { path: "ui/markdown.tsx", type: "registry:ui" },
      { path: "lib/editor-model.ts", type: "registry:lib" },
      { path: "lib/markdown-parse.ts", type: "registry:lib" },
      { path: "lib/markdown-tree.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/markdown",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/markdown#examples",
      },
    },
  },
  {
    name: "editor",
    type: "registry:ui",
    title: "Rich Text Editor",
    description:
      "A rich text editor whose value is Markdown: a toolbar, a selection bar, a keyboard bar on phones, shortcuts and Markdown shortcuts, saving unedited blocks byte for byte. Its own engine, shared with React Native, no dependencies.",
    registryDependencies: ["markdown", "syntax-highlight", "toggle"],
    files: [
      { path: "ui/editor.tsx", type: "registry:ui" },
      { path: "lib/editor-commands.ts", type: "registry:lib" },
      { path: "lib/editor-dom.ts", type: "registry:lib" },
      { path: "lib/editor-input.ts", type: "registry:lib" },
      { path: "lib/editor-kit.ts", type: "registry:lib" },
      { path: "lib/editor-store.ts", type: "registry:lib" },
      { path: "lib/editor-surface-model.ts", type: "registry:lib" },
      { path: "lib/editor-table.ts", type: "registry:lib" },
      { path: "lib/editor-transaction.ts", type: "registry:lib" },
      { path: "lib/markdown-serialize.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/editor",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/editor#examples",
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
    name: "slider-model",
    type: "registry:lib",
    title: "Slider model",
    description:
      "The Slider's step dots and the rule that tells a drag from a press, so a click on the track glides and a drag follows the pointer.",
    files: [
      { path: "lib/slider-model.ts", type: "registry:lib" },
      { path: "hooks/use-slider-drag.ts", type: "registry:hook" },
    ],
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
      "kbd",
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
  spinner: { registryDependencies: ["spinner-model"] },
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
  questionnaire: { registryDependencies: ["fluid-hover"] },
  slider: { registryDependencies: ["slider-model"] },
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
