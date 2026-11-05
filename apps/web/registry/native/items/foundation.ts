import { getTokenFile, SHARED_TOKEN_FILES } from "@/scripts/native-registry"
import { type Registry } from "shadcn/schema"

import { docs } from "./shared"

const tokenFile = (name: string) => ({
  path: getTokenFile(name),
  type: "registry:lib" as const,
})

// What every native component builds on.
export const foundationItems: Registry["items"] = [
  {
    name: "index",
    type: "registry:item",
    title: "React Native setup",
    description:
      "What every native component needs: Uniwind, Reanimated, gestures, safe areas, Inter and icons.",
    dependencies: [
      "uniwind@1.13.1",
      "tailwindcss@4",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
      "react-native-worklets",
      "react-native-gesture-handler",
      "react-native-safe-area-context",
      "react-native-svg",
      "expo-font",
      "@expo-google-fonts/inter",
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/portal",
      "@rn-primitives/slot",
    ],
    registryDependencies: ["@fabricator/utils", "@fabricator/fabricator-root"],
  },
  {
    name: "utils",
    type: "registry:lib",
    title: "Utils",
    dependencies: ["cn"],
    files: [{ path: "lib/utils.ts", type: "registry:lib" }],
  },
  {
    name: "motion",
    type: "registry:lib",
    title: "Motion",
    description: "Motion by role, read from the theme's tokens.",
    dependencies: ["cn", "react-native-reanimated", "uniwind@1.13.1"],
    files: [
      { path: "lib/motion.ts", type: "registry:lib" },
      { path: "lib/motion-tokens.ts", type: "registry:lib" },
      { path: "lib/press-wash.tsx", type: "registry:lib" },
      tokenFile("css-object"),
      tokenFile("motion"),
    ],
  },
  {
    name: "native-theme",
    type: "registry:lib",
    title: "Look",
    description:
      "applyLook: changes surface, colour roles, radius, density and motion at runtime.",
    dependencies: ["uniwind@1.13.1"],
    files: [
      ...SHARED_TOKEN_FILES.map((path) => ({
        path,
        type: "registry:lib" as const,
      })),
      { path: "lib/apply-look.ts", type: "registry:lib" },
    ],
  },
  {
    name: "fabricator-root",
    type: "registry:ui",
    title: "Fabricator Root",
    description:
      "Wraps the app once: gestures, safe-area classes and the place overlays render.",
    dependencies: [
      "@rn-primitives/portal",
      "react-native-gesture-handler",
      "react-native-safe-area-context",
      "uniwind@1.13.1",
    ],
    registryDependencies: ["@fabricator/feedback"],
    files: [{ path: "ui/fabricator-root.tsx", type: "registry:ui" }],
    meta: docs("fabricator-root"),
  },
  {
    name: "text",
    type: "registry:ui",
    title: "Text",
    description:
      "React Native draws text only inside Text; this one follows the theme and its control.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
      "uniwind@1.13.1",
    ],
    registryDependencies: ["@fabricator/motion"],
    files: [
      { path: "ui/text.tsx", type: "registry:ui" },
      { path: "lib/text-children.ts", type: "registry:lib" },
      { path: "lib/motion-tokens.ts", type: "registry:lib" },
    ],
    meta: docs("text"),
  },
  {
    name: "density",
    type: "registry:ui",
    title: "Density",
    description:
      "DensityProvider sets compact, default or spacious for everything inside it, including the overlays it opens.",
    dependencies: ["uniwind@1.13.1"],
    files: [
      { path: "ui/density.tsx", type: "registry:ui" },
      { path: "lib/density-scale.ts", type: "registry:lib" },
      { path: "lib/motion-tokens.ts", type: "registry:lib" },
      tokenFile("css-object"),
      tokenFile("density"),
      tokenFile("density-variables"),
    ],
    categories: ["layout"],
    meta: docs("density"),
  },
  {
    name: "button",
    type: "registry:ui",
    title: "Button",
    description: "Displays a button, or a component that looks like a button.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/slot",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      "@fabricator/density",
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/render",
      "@fabricator/text",
    ],
    files: [{ path: "ui/button.tsx", type: "registry:ui" }],
    meta: docs("button"),
  },
  {
    name: "use-mobile",
    type: "registry:hook",
    title: "useIsMobile",
    files: [{ path: "hooks/use-mobile.ts", type: "registry:hook" }],
  },
  {
    name: "feedback",
    type: "registry:lib",
    title: "Feedback",
    description:
      "The hook controls call when they're used. It does nothing until <SoundEffects /> is mounted.",
    files: [{ path: "lib/feedback.ts", type: "registry:lib" }],
  },
  {
    name: "sounds",
    type: "registry:component",
    title: "Sounds",
    description:
      "<SoundEffects /> turns on the website's sounds, and a haptic for each, for every control.",
    dependencies: [
      "expo-asset",
      "expo-audio",
      "expo-file-system",
      "expo-haptics",
    ],
    registryDependencies: ["@fabricator/feedback"],
    files: [
      { path: "lib/sound-recipes.ts", type: "registry:lib" },
      { path: "lib/sound-synth.ts", type: "registry:lib" },
      { path: "lib/sounds.ts", type: "registry:lib" },
      { path: "lib/sounds-model.ts", type: "registry:lib" },
      { path: "components/sound-effects.tsx", type: "registry:component" },
    ],
    meta: docs("sounds"),
  },
  {
    name: "fluid-hover",
    type: "registry:lib",
    title: "Fluid Hover",
    description:
      "One highlight that glides to the row under the finger, and a selection background that slides between selected rows.",
    dependencies: [
      "@rn-primitives/hooks",
      "cn",
      "react-native-gesture-handler",
      "react-native-reanimated",
      "react-native-worklets",
    ],
    registryDependencies: ["@fabricator/feedback", "@fabricator/motion"],
    files: [
      { path: "lib/fluid-hover.tsx", type: "registry:lib" },
      { path: "lib/fluid-hover-model.ts", type: "registry:lib" },
    ],
  },
  {
    name: "sortable",
    type: "registry:lib",
    title: "Sortable",
    description:
      "The one drag-and-drop adapter: a long press starts a drag, and neighbours slide aside.",
    dependencies: ["react-native-gesture-handler", "react-native-reanimated"],
    registryDependencies: ["@fabricator/motion"],
    files: [
      { path: "lib/sortable.tsx", type: "registry:lib" },
      { path: "lib/sortable-model.ts", type: "registry:lib" },
    ],
  },
  {
    name: "app-shell-model",
    type: "registry:lib",
    title: "App Shell Model",
    description:
      "The App Shell's navigation, tabs and panels as plain data and rules. Shared with web apps.",
    files: [{ path: "lib/app-shell-model.ts", type: "registry:lib" }],
  },
  {
    name: "sidebar-model",
    type: "registry:lib",
    title: "Sidebar Model",
    description: "The Sidebar's plain data and rules. Shared with web apps.",
    files: [{ path: "lib/sidebar-model.ts", type: "registry:lib" }],
  },
  {
    name: "render",
    type: "registry:lib",
    title: "Render",
    description:
      "The render and asChild composition props, as the website's components have them.",
    dependencies: ["@rn-primitives/slot"],
    files: [{ path: "lib/render.tsx", type: "registry:lib" }],
  },
]
