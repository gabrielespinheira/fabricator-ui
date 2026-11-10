import * as React from "react"
import { createRoot } from "react-dom/client"

import { AppShell, useAppShell } from "../base/ui/app-shell"
import { Calendar } from "../base/ui/calendar"
import {
  getDomPointFromFlat,
  getFlatOffsetFromDom,
} from "../shared/lib/editor-dom"
import { createBlock } from "../shared/lib/editor-model"
import { FileTree } from "../shared/ui/file-tree"

const nodes = Array.from({ length: 1000 }, (_, index) => ({
  id: String(index),
  name: `file-${index}.ts`,
}))
let iconRenders = 0
function renderIcon() {
  document.body.dataset.iconRenders = String(++iconRenders)
  return <svg />
}
function ShellContent() {
  const { sidebarWidth } = useAppShell()
  return (
    <div id="shell-content" data-sidebar-width={sidebarWidth}>
      Content
    </div>
  )
}

function checkEditorOffsets() {
  let reads = 0
  const root = document.createElement("div")
  document.body.append(root)
  const blocks = Array.from({ length: 100 }, (_, index) => {
    const element = document.createElement("p")
    element.dataset.blockId = String(index)
    element.textContent = "Text"
    root.append(element)
    return {
      ...createBlock({ type: "paragraph" }, "Text"),
      get id() {
        reads += 1
        return String(index)
      },
    }
  })
  const model = { frontmatter: null, blocks }
  for (let index = 0; index < blocks.length; index += 1) {
    const offset = index * 5 + 2
    const point = getDomPointFromFlat(root, model, offset)
    if (!point || getFlatOffsetFromDom(root, model, point) !== offset)
      throw new Error(`Editor offset ${offset} did not round-trip`)
  }
  document.body.dataset.editorReads = String(reads)
  root.remove()
}
checkEditorOffsets()
function Probe() {
  const [selected, setSelected] = React.useState<Date>()
  return (
    <>
      <AppShell storage={null} shortcut={null}>
        <ShellContent />
      </AppShell>
      <FileTree nodes={nodes} renderIcon={renderIcon} />
      <button id="select" onClick={() => setSelected(new Date(2026, 10, 10))}>
        Select
      </button>
      <Calendar
        month={new Date(2026, 10, 1)}
        mode="single"
        selected={selected}
        onSelect={setSelected}
      />
    </>
  )
}
const root = document.getElementById("root")
if (root) createRoot(root).render(<Probe />)
