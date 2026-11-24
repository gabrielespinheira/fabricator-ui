import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { fileIconCatalogSchema, platformCatalogSchema } from "./schemas"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const registryRoot = path.join(projectRoot, "apps/web/registry/swiftui")
const contract = platformCatalogSchema.parse(
  JSON.parse(
    await readFile(path.join(registryRoot, "resources/contract.json"), "utf8")
  )
)
const fileIcons = fileIconCatalogSchema.parse(
  JSON.parse(
    await readFile(path.join(registryRoot, "resources/file-icons.json"), "utf8")
  )
)
type Item = { name: string; files: string[]; dependencies: string[] }
const foundations: Item = {
  name: "foundations",
  files: [
    "Package.swift",
    "README.md",
    "LICENSE.md",
    "NOTICE.md",
    "manifest.json",
    "parity-exceptions.json",
    "models/component-state.swift",
    "models/calendar-selection.swift",
    "models/motion.swift",
    "models/data-table-engine.swift",
    "models/event-calendar-engine.swift",
    "models/sound.swift",
    "models/spinner-engine.swift",
    "ui/theme.swift",
    "ui/icon.swift",
    "ui/overlay-host.swift",
    "ui/menu.swift",
    "platform/sound-effects.swift",
    "platform/font.swift",
    "resources/contract.json",
    "resources/InterVariable.ttf",
    "resources/InterVariable-Italic.ttf",
    "resources/LICENSE.txt",
    "resources/icons-license.txt",
    "resources/brands-notices.md",
    "tests/component-state-tests.swift",
    "tests/calendar-selection-tests.swift",
    "tests/file-tree-tests.swift",
    "tests/motion-tests.swift",
    "tests/typography-tests.swift",
    "tests/icon-path-tests.swift",
    "tests/block-validation-tests.swift",
  ],
  dependencies: [],
}
const shell = new Set([
  "app-shell",
  "sidebar",
  "app-nav",
  "workspace-switcher",
  "user-menu",
])
const structure = new Set([
  "accordion",
  "breadcrumb",
  "card",
  "carousel",
  "collapsible",
  "direction",
  "item",
  "navigation-menu",
  "pagination",
  "preview-rail",
  "resizable",
  "tab-strip",
  "tabs",
])
const content = new Set([
  "alert",
  "empty",
  "table",
  "audio-player",
  "video-player",
  "image-compare",
])
const controls = new Set([
  "aspect-ratio",
  "avatar",
  "badge",
  "button",
  "checkbox",
  "density",
  "input",
  "kbd",
  "label",
  "radio-group",
  "rating",
  "scroll-area",
  "separator",
  "slider",
  "switch",
  "textarea",
  "theme-toggle",
  "toggle",
  "text",
  "typography",
  "fabricator-root",
  "progress",
  "toggle-group",
])
const items: Item[] = contract.items.map((item) => {
  if (item.name === "time-input")
    return {
      name: item.name,
      files: [
        "ui/time-input.swift",
        "models/time-input-model.swift",
        "tests/time-input-tests.swift",
      ],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/input",
        "@fabricator/time-wheel",
      ],
    }
  if (item.name === "time-wheel")
    return {
      name: item.name,
      files: [
        "ui/time-wheel.swift",
        "models/time-wheel-model.swift",
        "platform/time-wheel-scroll-events.swift",
        "tests/time-wheel-tests.swift",
      ],
      dependencies: ["@fabricator/foundations"],
    }
  if (item.name === "syntax-highlight")
    return {
      name: item.name,
      files: [
        "ui/syntax-highlight.swift",
        "ui/document-text.swift",
        "models/document-rendering.swift",
        "models/document-typography.swift",
        "models/syntax-style.swift",
        "platform/document-engine-adapter.swift",
        "platform/javascript-runtime.swift",
        "platform/clipboard.swift",
        "resources/document-engine.js",
        "resources/document-notices.txt",
        "resources/document-typography.json",
        "resources/GeistMonoVariable.ttf",
        "resources/GeistMonoVariable-Italic.ttf",
        "resources/GeistMono-OFL.txt",
        "tests/document-engine-tests.swift",
      ],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/button",
        "@fabricator/alert",
      ],
    }
  if (item.name === "markdown")
    return {
      name: item.name,
      files: ["ui/markdown.swift"],
      dependencies: ["@fabricator/syntax-highlight"],
    }
  if (item.name === "file-tree")
    return {
      name: item.name,
      files: [
        "ui/file-tree.swift",
        "ui/file-type-icon.swift",
        "models/file-icons.swift",
        "platform/file-icons-adapter.swift",
        "tests/file-icons-tests.swift",
        "resources/file-icons.json",
        "resources/file-icons-license.txt",
        ...fileIcons.names.flatMap((name) =>
          ["light", "dark"].map(
            (scheme) => `resources/fabricator-files-${scheme}-${name}@3x.png`
          )
        ),
      ],
      dependencies: ["@fabricator/foundations"],
    }
  if (item.name === "spinner" || item.name === "skeleton")
    return {
      name: item.name,
      files: ["ui/loading.swift"],
      dependencies: ["@fabricator/foundations"],
    }
  if (item.type === "registry:block")
    return {
      name: item.name,
      files: ["ui/blocks.swift"],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/app-shell",
        "@fabricator/form",
        "@fabricator/calendar",
        "@fabricator/bot-face",
        "@fabricator/card",
        "@fabricator/dialog",
        "@fabricator/file-tree",
      ],
    }
  if (controls.has(item.name))
    return {
      name: item.name,
      files: ["ui/controls.swift", "ui/selection-controls.swift"],
      dependencies: ["@fabricator/foundations", "@fabricator/spinner"],
    }
  if (shell.has(item.name))
    return {
      name: item.name,
      files: ["ui/app-shell.swift"],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/button",
        "@fabricator/breadcrumb",
        "@fabricator/drawer",
      ],
    }
  if (structure.has(item.name))
    return {
      name: item.name,
      files: ["ui/structure.swift"],
      dependencies: ["@fabricator/foundations", "@fabricator/button"],
    }
  if (content.has(item.name))
    return {
      name: item.name,
      files: ["ui/content.swift"],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/button",
        "@fabricator/field",
        "@fabricator/pagination",
      ],
    }
  if (item.name === "data-table")
    return {
      name: item.name,
      files: ["ui/data-table.swift", "platform/clipboard.swift"],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/field",
        "@fabricator/pagination",
      ],
    }
  if (item.name === "calendar")
    return {
      name: item.name,
      files: ["ui/calendar.swift"],
      dependencies: ["@fabricator/foundations", "@fabricator/field"],
    }
  if (item.name === "date-picker")
    return {
      name: item.name,
      files: [
        "ui/date-picker.swift",
        "ui/date-picker-grid.swift",
        "models/date-picker-model.swift",
        "tests/date-picker-grid-tests.swift",
        "platform/date-picker-engine-adapter.swift",
        "platform/javascript-runtime.swift",
        "resources/date-picker-engine.js",
        "resources/date-picker-notices.txt",
        "tests/date-picker-input-tests.swift",
      ],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/field",
        "@fabricator/calendar",
        "@fabricator/time-input",
      ],
    }
  if (item.name === "event-calendar")
    return {
      name: item.name,
      files: [
        "ui/event-calendar.swift",
        "platform/calendar-engine-adapter.swift",
        "platform/javascript-runtime.swift",
        "resources/calendar-engine.js",
        "resources/calendar-notices.txt",
        "tests/calendar-recurrence-tests.swift",
      ],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/calendar",
        "@fabricator/dialog",
        "@fabricator/empty",
      ],
    }
  if (item.name === "editor")
    return {
      name: item.name,
      files: [
        "models/editor-schema.swift",
        "models/editor-presentation.swift",
        "models/syntax-style.swift",
        "models/document-typography.swift",
        "platform/editor.swift",
        "platform/editor-engine-adapter.swift",
        "platform/javascript-runtime.swift",
        "platform/editor-events.swift",
        "platform/editor-platform-view.swift",
        "platform/editor-type-adapter.swift",
        "platform/editor-toolbar.swift",
        "platform/clipboard.swift",
        "platform/editor-core/editor-records.swift",
        "platform/editor-core/editor-document.swift",
        "platform/editor-core/editor-theme.swift",
        "platform/editor-core/editor-styler.swift",
        "platform/editor-core/editor-layout-fragment.swift",
        "platform/editor-core/editor-code-chrome.swift",
        "platform/editor-core/editor-table-layout.swift",
        "platform/editor-core/editor-text-view.swift",
        "platform/editor-core/editor-native-text-view.swift",
        "resources/editor-engine.js",
        "resources/editor-notices.txt",
        "resources/editor-themes.json",
        "resources/GeistMonoVariable.ttf",
        "resources/GeistMonoVariable-Italic.ttf",
        "resources/GeistMono-OFL.txt",
        "tests/editor-engine-tests.swift",
        "tests/editor-rendering-tests.swift",
      ],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/button",
        "@fabricator/field",
        "@fabricator/dialog",
        "@fabricator/alert",
      ],
    }
  if (item.group === "Charts")
    return {
      name: item.name,
      files: [
        "ui/charts.swift",
        "models/chart-engine.swift",
        "models/chart-sankey-engine.swift",
        "tests/chart-engine-tests.swift",
        "tests/chart-sankey-engine-tests.swift",
      ],
      dependencies: ["@fabricator/foundations"],
    }
  if (item.group === "Chat")
    return {
      name: item.name,
      files: ["ui/chat.swift", "resources/bot-face.json"],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/markdown",
        "@fabricator/file-upload",
      ],
    }
  if (item.name === "sounds" || item.name === "sound-effects")
    return {
      name: item.name,
      files: ["ui/controls.swift"],
      dependencies: ["@fabricator/foundations", "@fabricator/spinner"],
    }
  if (
    item.group === "Overlays" ||
    item.name === "sonner" ||
    item.name === "toast"
  )
    return {
      name: item.name,
      files: ["ui/overlays.swift"],
      dependencies: [
        "@fabricator/foundations",
        "@fabricator/card",
        "@fabricator/search",
      ],
    }
  if (item.group === "Forms" || item.name === "form")
    return {
      name: item.name,
      files: ["ui/forms.swift"],
      dependencies: ["@fabricator/foundations", "@fabricator/button"],
    }
  throw new Error(`SwiftUI has no source owner for ${item.name}`)
})
await writeFile(
  path.join(registryRoot, "manifest.json"),
  `${JSON.stringify({ schemaVersion: 1, renderer: "swiftui", items: [foundations, ...items] }, null, 2)}\n`
)
process.stdout.write(
  `SwiftUI manifest: ${items.length} catalog items and foundations.\n`
)
