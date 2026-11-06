/** The page `audit-animated.ts` opens: every animated icon, or its outline twin, in a grid. */
import { createRoot } from "react-dom/client"

import * as Animated from "../src/animated.js"
import type { AnimatedIconHandle } from "../src/animated.js"
import { animatedCatalog } from "../src/generated/catalog-data.js"
import * as Outline from "../src/generated/outline.js"
import { getExportNames } from "../src/generated/runtime/names.js"

export type AuditPage = {
  names: string[]
  start: () => void
  stop: () => void
  /** Records everything that changes from now on, in one cell or the whole page. */
  watch: (name?: string) => void
  /** DOM changes since `watch`, plus animations running now: Motion runs opacity and transforms through the Web Animations API, which changes no DOM. */
  activity: () => number
}

declare global {
  interface Window {
    audit: AuditPage
  }
}

const mode = new URLSearchParams(location.search).get("mode")
const names = animatedCatalog.map((entry) => entry.name)
const animated = new Map(Object.entries(Animated))
const outline = new Map(Object.entries(Outline))
const handles = new Map<string, AnimatedIconHandle>()

function Cell({ name }: { name: string }) {
  const [component = ""] = getExportNames(name)
  const Moving = animated.get(component)
  const Still = outline.get(component)
  if (!Moving || !Still) throw new Error(`${name} isn't exported`)
  return (
    <div
      data-name={name}
      style={{
        width: 64,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#000",
      }}
    >
      {mode === "outline" ? (
        <Still size={48} />
      ) : mode === "hover" ? (
        <Moving size={48} />
      ) : (
        <Moving
          size={48}
          ref={(handle) => {
            if (handle) handles.set(name, handle)
          }}
        />
      )}
    </div>
  )
}

let changes = 0
let scope: Element = document.body
let observer: MutationObserver | undefined

window.audit = {
  names,
  start: () => handles.forEach((handle) => handle.startAnimation()),
  stop: () => handles.forEach((handle) => handle.stopAnimation()),
  watch: (name) => {
    observer?.disconnect()
    changes = 0
    scope =
      (name && document.querySelector(`[data-name="${name}"]`)) || document.body
    observer = new MutationObserver((records) => {
      changes += records.length
    })
    observer.observe(scope, {
      attributes: true,
      childList: true,
      subtree: true,
    })
  },
  activity: () => changes + scope.getAnimations({ subtree: true }).length,
}

const root = document.getElementById("root")
if (!root) throw new Error("The page has no root")
createRoot(root).render(
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(24, 64px)",
      background: "#fff",
    }}
  >
    {names.map((name) => (
      <Cell key={name} name={name} />
    ))}
  </div>
)
