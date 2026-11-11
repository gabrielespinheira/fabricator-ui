import { type Registry } from "shadcn/schema"

import { docs } from "./shared"

const UNIWIND = "uniwind@1.13.1"

// Pickers, feedback, data and scrolling.
export const dataItems: Registry["items"] = [
  {
    name: "combobox",
    type: "registry:ui",
    title: "Combobox",
    description:
      "A field that filters a list as you type, opening it in a dialog on phones.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "cn",
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/dialog",
      "@fabricator/feedback",
      "@fabricator/fluid-hover",
      "@fabricator/render",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/combobox.tsx", type: "registry:ui" },
      { path: "lib/filter-model.ts", type: "registry:lib" },
    ],
    meta: docs("combobox"),
  },
  {
    name: "command",
    type: "registry:ui",
    title: "Command",
    description: "A filtered menu of commands, on its own or in a dialog.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "cn",
    ],
    registryDependencies: [
      "@fabricator/dialog",
      "@fabricator/feedback",
      "@fabricator/fluid-hover",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/command.tsx", type: "registry:ui" },
      { path: "lib/filter-model.ts", type: "registry:lib" },
    ],
    meta: docs("command"),
  },
  {
    name: "search",
    type: "registry:ui",
    title: "Search",
    description: "A search button that opens into a search field.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
    ],
    registryDependencies: [
      "@fabricator/density",
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/search.tsx", type: "registry:ui" },
      { path: "lib/search-model.ts", type: "registry:lib" },
    ],
    meta: docs("search"),
  },
  {
    name: "toast",
    type: "registry:ui",
    title: "Toast",
    description:
      "Short messages at the top of the screen, swiped away or closed on a timer.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/portal",
      "cn",
      "react-native-gesture-handler",
      "react-native-reanimated",
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/density",
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/render",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/toast.tsx", type: "registry:ui" },
      { path: "lib/toast-store.ts", type: "registry:lib" },
      { path: "lib/toast-model.ts", type: "registry:lib" },
    ],
    meta: docs("toast"),
  },
  {
    name: "sonner",
    type: "registry:ui",
    title: "Sonner",
    description: "Sonner's Toaster and toast(), on the same engine as Toast.",
    dependencies: ["cn"],
    registryDependencies: ["@fabricator/button", "@fabricator/toast"],
    files: [{ path: "ui/sonner.tsx", type: "registry:ui" }],
    meta: docs("sonner"),
  },
  {
    name: "calendar",
    type: "registry:ui",
    title: "Calendar",
    description: "A month grid to pick a date, several dates or a range.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "class-variance-authority",
      "cn",
      "date-fns",
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/feedback",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/calendar.tsx", type: "registry:ui" },
      { path: "lib/calendar-model.ts", type: "registry:lib" },
    ],
    meta: docs("calendar"),
  },
  {
    name: "carousel",
    type: "registry:ui",
    title: "Carousel",
    description: "Slides that move with a swipe, the arrows or an API.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "class-variance-authority",
      "cn",
      "react-native-gesture-handler",
      "react-native-reanimated",
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/carousel.tsx", type: "registry:ui" },
      { path: "lib/carousel-model.ts", type: "registry:lib" },
    ],
    meta: docs("carousel"),
  },
  {
    name: "video-player",
    type: "registry:ui",
    title: "Video Player",
    description:
      "A video with its own controls over the picture: a seek bar with chapters, skip, mute, captions from WebVTT files, speed, picture in picture and full screen. A compact variant keeps play, the seek bar, the time, mute and full screen.",
    // expo-video is Expo's maintained player (MIT); expo provides useEvent.
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "cn",
      "expo",
      "expo-linear-gradient",
      "expo-video@58.0.13",
      "react-native-gesture-handler",
      "react-native-reanimated",
      "uniwind@1.13.1",
    ],
    registryDependencies: [
      "@fabricator/density",
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/sheet",
      "@fabricator/spinner",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/video-player.tsx", type: "registry:ui" },
      { path: "lib/video-player-model.ts", type: "registry:lib" },
      { path: "lib/video-captions-model.ts", type: "registry:lib" },
    ],
    meta: docs("video-player"),
  },
  {
    name: "image-compare",
    type: "registry:ui",
    title: "Image Compare",
    description:
      "Two pictures of one scene in a single frame, split by a line you drag. The line bends like jelly and the picture is cut along it; a tap glides it there and a flick sends it to the edge.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "@rn-primitives/hooks",
      "class-variance-authority",
      "cn",
      "react-native-gesture-handler",
      "react-native-reanimated",
      "react-native-svg",
      "uniwind@1.13.1",
    ],
    registryDependencies: [
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/image-compare.tsx", type: "registry:ui" },
      { path: "lib/image-compare-model.ts", type: "registry:lib" },
    ],
    meta: docs("image-compare"),
  },
  {
    name: "table",
    type: "registry:ui",
    title: "Table",
    description:
      "Rows and columns that line up, scrolling sideways when they don't fit.",
    dependencies: ["cn"],
    registryDependencies: ["@fabricator/fluid-hover", "@fabricator/text"],
    files: [
      { path: "ui/table.tsx", type: "registry:ui" },
      { path: "lib/table-model.ts", type: "registry:lib" },
    ],
    meta: docs("table"),
  },
  {
    name: "scroll-area",
    type: "registry:ui",
    title: "Scroll Area",
    description: "Native scrolling with its edges faded.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "expo-linear-gradient",
      "react-native-reanimated",
      UNIWIND,
    ],
    registryDependencies: ["@fabricator/motion", "@fabricator/text"],
    files: [
      { path: "ui/scroll-area.tsx", type: "registry:ui" },
      { path: "lib/scroll-fade-model.ts", type: "registry:lib" },
    ],
    meta: docs("scroll-area"),
  },
  {
    name: "message-scroller",
    type: "registry:ui",
    title: "Message Scroller",
    description: "A conversation that stays on the newest message as it grows.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "class-variance-authority",
      "cn",
      "react-native-reanimated",
      UNIWIND,
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/motion",
      "@fabricator/render",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/message-scroller.tsx", type: "registry:ui" },
      { path: "lib/message-scroller-model.ts", type: "registry:lib" },
    ],
    meta: docs("message-scroller"),
  },
  {
    name: "pagination",
    type: "registry:ui",
    title: "Pagination",
    description: "Page links, with previous and next.",
    dependencies: [
      "@fabricator-ui/icons-react-native",
      "class-variance-authority",
      "cn",
    ],
    registryDependencies: [
      "@fabricator/button",
      "@fabricator/feedback",
      "@fabricator/text",
    ],
    files: [{ path: "ui/pagination.tsx", type: "registry:ui" }],
    meta: docs("pagination"),
  },
  {
    name: "breadcrumb",
    type: "registry:ui",
    title: "Breadcrumb",
    description: "The path to the current page, scrolling when it's too long.",
    dependencies: ["@fabricator-ui/icons-react-native", "cn"],
    registryDependencies: [
      "@fabricator/feedback",
      "@fabricator/render",
      "@fabricator/text",
    ],
    files: [{ path: "ui/breadcrumb.tsx", type: "registry:ui" }],
    meta: docs("breadcrumb"),
  },
  {
    name: "resizable",
    type: "registry:ui",
    title: "Resizable",
    description:
      "Panels whose sizes change by dragging the handles between them.",
    dependencies: ["cn", "react-native-gesture-handler"],
    registryDependencies: ["@fabricator/feedback", "@fabricator/text"],
    files: [
      { path: "ui/resizable.tsx", type: "registry:ui" },
      { path: "lib/resizable-model.ts", type: "registry:lib" },
    ],
    meta: docs("resizable"),
  },
]
