import { type Registry } from "shadcn/schema"

import { docs, OVERLAY_REGISTRY_DEPENDENCIES } from "./shared"

// Overlays and pickers: they portal to the root and set their own density.
export const overlayItems: Registry["items"] = [
  {
    name: "dialog",
    type: "registry:ui",
    title: "Dialog",
    description:
      "A window overlaid on the page, which blocks what is under it.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/dialog",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/dialog.tsx", type: "registry:ui" }],
    meta: docs("dialog"),
  },
  {
    name: "sheet-surface",
    type: "registry:lib",
    title: "Sheet Surface",
    description:
      "The panel Sheet, Drawer and a phone's Select slide in on: swipe to dismiss, scrim, Android back, safe areas and keyboard avoidance.",
    dependencies: [
      "@rn-primitives/hooks",
      "@rn-primitives/portal",
      "cn",
      "react-native-gesture-handler",
      "react-native-reanimated",
      "react-native-worklets",
    ],
    registryDependencies: [
      "@fabricator/density",
      "@fabricator/feedback",
      "@fabricator/motion",
    ],
    files: [
      { path: "lib/sheet-surface.tsx", type: "registry:lib" },
      { path: "lib/sheet-model.ts", type: "registry:lib" },
    ],
  },
  {
    name: "overlay-model",
    type: "registry:lib",
    title: "Overlay Model",
    description:
      "What the anchored overlays share: the website's open props over a primitive's trigger, sides, and a node's text.",
    files: [{ path: "lib/overlay-model.ts", type: "registry:lib" }],
  },
  {
    name: "alert-dialog",
    type: "registry:ui",
    title: "Alert Dialog",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
    dependencies: [
      "@rn-primitives/alert-dialog",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/alert-dialog.tsx", type: "registry:ui" }],
    meta: docs("alert-dialog"),
  },
  {
    name: "sheet",
    type: "registry:ui",
    title: "Sheet",
    description:
      "A panel that slides in from an edge of the screen, and swipes away toward it.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/sheet-surface",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/sheet.tsx", type: "registry:ui" }],
    meta: docs("sheet"),
  },
  {
    name: "drawer",
    type: "registry:ui",
    title: "Drawer",
    description: "A drawer that swipes in and out, with a handle bar.",
    dependencies: [
      "@rn-primitives/hooks",
      "@rn-primitives/portal",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/sheet-surface",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/drawer.tsx", type: "registry:ui" }],
    meta: docs("drawer"),
  },
  {
    name: "popover",
    type: "registry:ui",
    title: "Popover",
    description: "Rich content in a surface anchored to its trigger.",
    dependencies: ["@rn-primitives/popover", "cn", "react-native-reanimated"],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/popover.tsx", type: "registry:ui" }],
    meta: docs("popover"),
  },
  {
    name: "tooltip",
    type: "registry:ui",
    title: "Tooltip",
    description:
      "A short label a long press shows, which is also the trigger's accessibility hint.",
    dependencies: ["@rn-primitives/tooltip", "cn", "react-native-reanimated"],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/tooltip.tsx", type: "registry:ui" }],
    meta: docs("tooltip"),
  },
  {
    name: "hover-card",
    type: "registry:ui",
    title: "Hover Card",
    description:
      "A preview a long press opens. A plain tap still goes through to the trigger.",
    dependencies: [
      "@rn-primitives/hover-card",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/hover-card.tsx", type: "registry:ui" }],
    meta: docs("hover-card"),
  },
  {
    name: "dropdown-menu",
    type: "registry:ui",
    title: "Dropdown Menu",
    description:
      "A menu of actions from a button: groups, checkbox and radio items, and submenus that expand inline.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/dropdown-menu",
      "@rn-primitives/hooks",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      "@fabricator/collapsible",
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/fluid-hover",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/dropdown-menu.tsx", type: "registry:ui" }],
    meta: docs("dropdown-menu"),
  },
  {
    name: "context-menu",
    type: "registry:ui",
    title: "Context Menu",
    description:
      "A menu of actions a long press opens, at the finger, where a right click does on the website.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/context-menu",
      "@rn-primitives/hooks",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      "@fabricator/collapsible",
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/fluid-hover",
      "@fabricator/overlay-model",
    ],
    files: [{ path: "ui/context-menu.tsx", type: "registry:ui" }],
    meta: docs("context-menu"),
  },
  {
    name: "select",
    type: "registry:ui",
    title: "Select",
    description:
      "A list of options to choose from: a sheet on phones, a popover from the sm breakpoint up.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "@rn-primitives/popover",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      ...OVERLAY_REGISTRY_DEPENDENCIES,
      "@fabricator/feedback",
      "@fabricator/fluid-hover",
      "@fabricator/overlay-model",
      "@fabricator/sheet-surface",
    ],
    files: [
      { path: "ui/select.tsx", type: "registry:ui" },
      { path: "lib/select-model.ts", type: "registry:lib" },
    ],
    meta: docs("select"),
  },
  {
    name: "questionnaire",
    type: "registry:ui",
    title: "Questionnaire",
    description:
      "One question at a time: single and multiple choice, free text, skipping and validation.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "cn",
      "react-native-reanimated",
      "uniwind@1.13.1",
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/render",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/questionnaire.tsx", type: "registry:ui" },
      { path: "lib/questionnaire-model.ts", type: "registry:lib" },
    ],
    meta: docs("questionnaire"),
  },
]
