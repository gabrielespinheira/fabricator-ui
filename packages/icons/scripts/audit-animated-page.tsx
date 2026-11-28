/** The page `audit-animated.ts` opens: every animated icon, or its outline twin, in a grid. */
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import * as Animated from "../src/animated.js"
import type { AnimatedIconHandle } from "../src/animated.js"
import { animatedCatalog } from "../src/generated/catalog-data.js"
import * as Duotone from "../src/generated/duotone.js"
import * as Fill from "../src/generated/fill.js"
import * as Outline from "../src/generated/outline.js"
import { getExportNames } from "../src/generated/runtime/names.js"

export type AuditPage = {
  names: string[]
  start: (names?: string[]) => void
  stop: (names?: string[]) => void
  setPanelOpen: (open: boolean) => void
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

const params = new URLSearchParams(location.search)
const mode = params.get("mode")
const weight = params.get("weight")
const variant = weight === "fill" || weight === "duotone" ? weight : "outline"
const isStatic = mode === "outline"
const samples = [
  "arrow-up-right",
  "arrow-down-left",
  "arrow-big-right",
  "arrow-left-right",
  "circle-arrow-right",
  "circle-check",
  "download",
  "mail",
  "eye",
  "menu",
  "activity",
  "house",
  "sliders-horizontal",
  "panel-left",
  "panel-right",
  "sidebar-toggle",
  "toggle-right",
]
const names = mode?.startsWith("samples")
  ? samples
  : animatedCatalog.map((entry) => entry.name)
const animated = new Map(Object.entries(Animated))
const still = new Map(
  Object.entries(
    variant === "fill" ? Fill : variant === "duotone" ? Duotone : Outline
  )
)
const handles = new Map<string, AnimatedIconHandle>()

function Cell({ name, open }: { name: string; open?: boolean }) {
  const [component = ""] = getExportNames(name)
  const Moving = animated.get(component)
  const Still = still.get(component)
  if (!Moving || !Still) throw new Error(`${name} isn't exported`)
  const isPanel = /^(panel-(left|right)|sidebar-toggle)$/.test(name)
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
      {isStatic ? (
        <Still size={48} />
      ) : mode === "hover" ? (
        <Moving size={48} />
      ) : (
        <Moving
          size={48}
          strokeWidth={mode === "samples" ? 3 : undefined}
          variant={variant}
          loop={params.get("loop") === name}
          {...(isPanel && { open })}
          ref={(handle: AnimatedIconHandle | null) => {
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
  start: (selection = names) =>
    selection.forEach((name) => handles.get(name)?.startAnimation()),
  stop: (selection = names) =>
    selection.forEach((name) => handles.get(name)?.stopAnimation()),
  setPanelOpen: () => undefined,
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

function Audit() {
  const [open, setOpen] = useState<boolean>()
  useEffect(() => {
    window.audit.setPanelOpen = setOpen
  }, [])

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(24, 64px)",
        background: "#fff",
      }}
    >
      {names.map((name) => (
        <Cell key={name} name={name} open={open} />
      ))}
    </div>
  )
}

const root = document.getElementById("root")
if (!root) throw new Error("The page has no root")
createRoot(root).render(<Audit />)
