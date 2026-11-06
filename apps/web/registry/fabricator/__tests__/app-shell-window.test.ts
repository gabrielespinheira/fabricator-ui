import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const GUARD = 'data-slot="app-shell-panel-trigger-guard"'

const styleMap = readFileSync(
  path.join(__dirname, "../../styles/fabricator/app-shell.css"),
  "utf8"
)

// A real press in a window goes through the native hit test, which a browser
// test never reaches: Electron applies app-region rects in document order, later
// ones winning, and a press inside a drag rect moves the window and never reaches
// the page. The pinned toggle lives in the main column, ahead of the panel's
// header, so the panel has to give the toggle's spot back after that header.
describe.each(["base", "radix", "aria"])(
  "the pinned panel toggle in a %s window",
  (base) => {
    const source = readFileSync(
      path.join(__dirname, `../${base}/ui/app-shell.tsx`),
      "utf8"
    )
    const panel = source.slice(
      source.indexOf("function AppShellPanel("),
      source.indexOf("function AppShellPanelResizeHandle(")
    )
    // The docked branch: sheets and drawers come first and have no pinned toggle.
    const dockedContent = panel.lastIndexOf("{content}")
    const inner = panel.indexOf('data-slot="app-shell-panel-inner"')

    it("has a guard after the docked panel's content", () => {
      expect(inner).toBeGreaterThan(-1)
      expect(inner).toBeLessThan(dockedContent)
      expect(panel.indexOf(GUARD)).toBeGreaterThan(dockedContent)
    })

    it("keeps the guard on the panel itself, which doesn't slide", () => {
      const closesInner = panel.indexOf("</div>", dockedContent)
      expect(panel.indexOf(GUARD)).toBeGreaterThan(closesInner)
    })
  }
)

// Dialogs, menus and toasts are portalled outside the shell and float over its
// drag regions, which would swallow presses on them in a window.
describe("what floats over the shell", () => {
  // `&` as well as `:has(&)`: the shell can itself be a child of the body, and
  // `:has` doesn't look at the element itself, so the whole shell would match
  // and the window couldn't be dragged at all.
  const outside = ":is(body>:not(&,:has(&)),body>:not(&,:has(&))_*)"

  it("stays out of the drag regions", () => {
    const shell = styleMap.slice(styleMap.indexOf(".cn-app-shell {"))
    const rule = shell.slice(0, shell.indexOf("}"))
    expect(rule).toContain(`[${outside}]:[-webkit-app-region:no-drag]`)
    expect(rule).toContain(`[${outside}]:[app-region:no-drag]`)
  })
})

describe("the guard's rule", () => {
  const rule = styleMap.slice(
    styleMap.indexOf(".cn-app-shell-panel-trigger-guard"),
    styleMap.indexOf(".cn-app-shell-panel-trigger {")
  )

  it("takes the spot out of the drag regions", () => {
    expect(rule).toContain("[-webkit-app-region:no-drag]")
    expect(rule).toContain("[app-region:no-drag]")
  })

  it("only shows beside a pinned toggle", () => {
    expect(rule).toContain("[data-pinned]")
  })
})
