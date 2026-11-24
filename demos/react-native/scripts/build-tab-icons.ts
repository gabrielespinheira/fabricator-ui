import { fileURLToPath } from "node:url"

import { exportPngs } from "../../../packages/icons-static/src/png"

for (const [state, strokeWidth] of [
  ["normal", 1.5],
  ["selected", 2],
] as const) {
  await exportPngs(["home", "boxes", "sparkles"], {
    set: "outline",
    size: 24,
    scales: [1, 2, 3],
    color: "#000000",
    strokeWidth,
    template: false,
    outDir: fileURLToPath(
      new URL(`../assets/tab-bar/${state}/`, import.meta.url)
    ),
  })
}
