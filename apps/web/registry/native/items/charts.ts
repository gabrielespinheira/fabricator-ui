import { type Registry } from "shadcn/schema"

import { docs } from "./shared"

// Charts: SVG drawn from the website's chart models, so a chart lays out the
// same on every platform. The kit holds the parts every chart shares.
// Expo installs the type packages with the copied source because shadcn's
// Expo adapter cannot install registry devDependencies.
export const chartItems: Registry["items"] = [
  {
    name: "chart-kit",
    type: "registry:lib",
    title: "Chart Kit",
    description:
      "What every chart is drawn with: series colours from the chart palette, number formatting, value scales, the tooltip, the legend, axes and an inspector a finger scrubs and VoiceOver adjusts.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-scale@4.0.3",
      "react-native-gesture-handler",
      "react-native-reanimated",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-scale@4.0.9",
    ],
    registryDependencies: [
      "@fabricator/feedback",
      "@fabricator/motion",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/chart-kit.tsx", type: "registry:ui" },
      { path: "lib/chart-model.ts", type: "registry:lib" },
      { path: "lib/chart-cartesian-model.ts", type: "registry:lib" },
    ],
  },
  {
    name: "area-chart",
    type: "registry:ui",
    title: "Area Chart",
    description:
      "Change over time as filled areas, stacked or stretched to 100%, with a crosshair and tooltip a finger scrubs, a legend that hides series, a draw-in and morphing data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-shape@3.2.1",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-shape@3.2.0",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/area-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-line-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-line-model.ts", type: "registry:lib" },
    ],
    meta: docs("area-chart"),
  },
  {
    name: "line-chart",
    type: "registry:ui",
    title: "Line Chart",
    description:
      "Change over time as lines for comparing series, with dashed targets, a crosshair and tooltip a finger scrubs, a legend that hides series, a draw-in and morphing data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-shape@3.2.1",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-shape@3.2.0",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/line-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-line-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-line-model.ts", type: "registry:lib" },
    ],
    meta: docs("line-chart"),
  },
  {
    name: "bar-chart",
    type: "registry:ui",
    title: "Bar Chart",
    description:
      "Magnitude by category, side by side or stacked, as columns or rows, with a highlight and tooltip a finger scrubs, a legend that hides series, bars that grow in and morph with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/bar-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-bar-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-bar-model.ts", type: "registry:lib" },
    ],
    meta: docs("bar-chart"),
  },
  {
    name: "composition-chart",
    type: "registry:ui",
    title: "Composition Chart",
    description:
      "How the mix of a whole changes over time as 100% columns, with a legend of each part's share that follows a finger's scrub, a tooltip, columns that grow in and morph with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: [
      "@fabricator/chart-kit",
      "@fabricator/feedback",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/composition-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-bar-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-bar-model.ts", type: "registry:lib" },
      { path: "lib/chart-composition-model.ts", type: "registry:lib" },
    ],
    meta: docs("composition-chart"),
  },
  {
    name: "candlestick-chart",
    type: "registry:ui",
    title: "Candlestick Chart",
    description:
      "Open, high, low and close per period in the success and destructive colours, with a volume band, a dashed last-close line and price, a crosshair and tooltip with the signed change a finger scrubs, bodies that grow in and candles that slide when a period is added.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit", "@fabricator/text"],
    files: [
      { path: "ui/candlestick-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-candlestick-model.ts", type: "registry:lib" },
    ],
    meta: docs("candlestick-chart"),
  },
  {
    name: "bump-chart",
    type: "registry:ui",
    title: "Bump Chart",
    description:
      "Rank over time as lines through each series' place, ranks given or scores ranked per index, with rings holding each rank, names at the line ends, a finger that dims the other lines, a tooltip with each move, a sweep-in and points that move to their new places.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-shape@3.2.1",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-shape@3.2.0",
    ],
    registryDependencies: [
      "@fabricator/chart-kit",
      "@fabricator/feedback",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/bump-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-bump-model.ts", type: "registry:lib" },
    ],
    meta: docs("bump-chart"),
  },
  {
    name: "pie-chart",
    type: "registry:ui",
    title: "Pie Chart",
    description:
      "Parts of one whole: slices clockwise from 12 o'clock as one unbroken disc, the smallest past seven folded into Other, shares printed inside on request, a slice that lifts under the finger with a tooltip, a legend, a sweep-in and slices that turn with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-shape@3.2.1",
      "react-native-reanimated",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-shape@3.2.0",
    ],
    registryDependencies: [
      "@fabricator/chart-kit",
      "@fabricator/motion",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/pie-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-pie-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-pie-model.ts", type: "registry:lib" },
    ],
    meta: docs("pie-chart"),
  },
  {
    name: "donut-chart",
    type: "registry:ui",
    title: "Donut Chart",
    description:
      "Parts of one whole as a ring with the total in the centre, which swaps to the slice under the finger, and a value list with share bars beside or under it, a sweep-in and slices that turn with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-shape@3.2.1",
      "react-native-reanimated",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-shape@3.2.0",
    ],
    registryDependencies: [
      "@fabricator/chart-kit",
      "@fabricator/motion",
      "@fabricator/text",
    ],
    files: [
      { path: "ui/donut-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-pie-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-pie-model.ts", type: "registry:lib" },
    ],
    meta: docs("donut-chart"),
  },
  {
    name: "radial-chart",
    type: "registry:ui",
    title: "Radial Chart",
    description:
      "Progress of a few values against their target as concentric rings, round a full circle or a half gauge, with the first ring's share in the centre, a tooltip, a legend, arcs that sweep in and turn with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-shape@3.2.1",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-shape@3.2.0",
    ],
    registryDependencies: ["@fabricator/chart-kit", "@fabricator/text"],
    files: [
      { path: "ui/radial-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-radial-model.ts", type: "registry:lib" },
    ],
    meta: docs("radial-chart"),
  },
  {
    name: "radar-chart",
    type: "registry:ui",
    title: "Radar Chart",
    description:
      "Several measures of one or more subjects on shared axes, with a hairline grid, a washed polygon per series, an inspector a finger moves round the axes, a legend, polygons that grow in and morph with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/radar-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-radar-model.ts", type: "registry:lib" },
    ],
    meta: docs("radar-chart"),
  },
  {
    name: "heat-calendar",
    type: "registry:ui",
    title: "Heat Calendar",
    description:
      "A value per day over months, as a grid of weeks by weekdays in five levels of one hue, that scrolls sideways on a phone from the latest week, with a lifted day and tooltip a tap or a press and hold moves, a diagonal draw-in and levels that ease with the data.",
    dependencies: [
      "@date-fns/tz@1.5.0",
      "class-variance-authority",
      "cn",
      "date-fns",
      "react-native-reanimated",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit", "@fabricator/text"],
    files: [
      { path: "ui/heat-calendar.tsx", type: "registry:ui" },
      { path: "lib/chart-heat-calendar-model.ts", type: "registry:lib" },
    ],
    meta: docs("heat-calendar"),
  },
  {
    name: "status-bar",
    type: "registry:ui",
    title: "Status Bar",
    description:
      "Uptime as one tall pill per day, coloured by status, with the uptime share, a legend naming each status, a lifted pill and tooltip with the day's note a finger scrubs, pills that rise in a wave and crossfade when a status changes.",
    dependencies: [
      "@date-fns/tz@1.5.0",
      "class-variance-authority",
      "cn",
      "date-fns",
      "react-native-reanimated",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit", "@fabricator/text"],
    files: [
      { path: "ui/status-bar.tsx", type: "registry:ui" },
      { path: "lib/chart-status-bar-model.ts", type: "registry:lib" },
    ],
    meta: docs("status-bar"),
  },
  {
    name: "treemap",
    type: "registry:ui",
    title: "Treemap",
    description:
      "Hierarchical parts of a whole: a cell per leaf sized by its value, washed in its top-level group's colour with its name and value inside when they fit, a deeper wash and tooltip under the finger, a legend that hides groups, cells that scale in and re-lay smoothly with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "d3-hierarchy@3.1.3",
      "react-native-svg",
      "uniwind@1.14.0",
      "@types/d3-hierarchy@3.1.7",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/treemap.tsx", type: "registry:ui" },
      { path: "lib/chart-treemap-model.ts", type: "registry:lib" },
    ],
    meta: docs("treemap"),
  },
  {
    name: "funnel-chart",
    type: "registry:ui",
    title: "Funnel Chart",
    description:
      "Ordered stages losing volume, vertical or horizontal: one shape split into stages joined by smooth tapers, in one hue that lightens stage by stage, each value on a pill and each conversion beside its taper, a highlight and tooltip a finger scrubs, stages that grow in and morph with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/funnel-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-funnel-model.ts", type: "registry:lib" },
    ],
    meta: docs("funnel-chart"),
  },
  {
    name: "sankey-chart",
    type: "registry:ui",
    title: "Sankey Chart",
    description:
      "Flow volumes between stages: nodes in columns sized by what flows through them, ribbons as thick as each flow in their source's colour, labels beside the nodes, a finger on a node or link lighting what it touches with a tooltip, links that extend from their sources and morph with the data.",
    dependencies: [
      "class-variance-authority",
      "cn",
      "react-native-svg",
      "uniwind@1.14.0",
    ],
    registryDependencies: ["@fabricator/chart-kit"],
    files: [
      { path: "ui/sankey-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-sankey-model.ts", type: "registry:lib" },
    ],
    meta: docs("sankey-chart"),
  },
  // MARK: next chart
]
