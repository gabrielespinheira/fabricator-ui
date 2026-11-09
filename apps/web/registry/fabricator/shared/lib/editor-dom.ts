// Maps between the web editing surface's DOM and flat-text offsets. Each
// block renders one element with `data-block-id`; inside it, text nodes and
// `<br>`s are its text. Anything marked `contenteditable="false"` (a task's
// checkbox) and filler `<br data-editor-filler>` (which only gives an empty
// line its height) count for nothing.
import {
  BLOCK_SEPARATOR,
  getBlockLength,
  getBlockStarts,
  getFlatText,
  LINE_BREAK,
  type EditorDocument,
} from "./editor-model"
import {
  getSegmentAtOffset,
  getSegmentStart,
  type EditorSegment,
} from "./editor-surface-model"

type DomSegment = EditorSegment & {
  node: Node
  /** The text it stands for: a text node's value, or "\n" for a `<br>`. */
  text: string
}

type DomPoint = { node: Node; offset: number }

const BLOCK_SELECTOR = "[data-block-id]"

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

function isIgnored(element: Element) {
  return element.getAttribute("contenteditable") === "false"
}

function getBlockSegments(blockElement: Element): DomSegment[] {
  const segments: DomSegment[] = []
  const visit = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (isText(child)) {
        const text = child.data
        segments.push({ node: child, length: text.length, text })
        continue
      }
      if (!isElement(child) || isIgnored(child)) continue
      if (child.tagName === "BR") {
        const isFiller = child.hasAttribute("data-editor-filler")
        segments.push({
          node: child,
          length: isFiller ? 0 : 1,
          text: isFiller ? "" : "\n",
        })
        continue
      }
      if (child.matches(BLOCK_SELECTOR)) continue
      visit(child)
    }
  }
  visit(blockElement)
  return segments
}

function getBlockElement(root: Element, id: string) {
  return root.querySelector(`[data-block-id="${CSS.escape(id)}"]`)
}

function getBlockStartById(document: EditorDocument) {
  const starts = getBlockStarts(document)
  return new Map(
    document.blocks.map((block, index) => [block.id, starts[index]])
  )
}

/** Text length of the segments that sit before a DOM point inside a block. */
function getLocalOffset(blockElement: Element, point: DomPoint) {
  const segments = getBlockSegments(blockElement)
  const textIndex = segments.findIndex((segment) => segment.node === point.node)
  if (textIndex >= 0 && isText(point.node)) {
    return getSegmentStart(segments, textIndex) + point.offset
  }
  const range = blockElement.ownerDocument.createRange()
  range.setStart(point.node, point.offset)
  let offset = 0
  for (const segment of segments) {
    if (range.comparePoint(segment.node, 0) >= 0) break
    offset += segment.length
  }
  return offset
}

/** The block element a DOM point belongs to, looking forward from a container. */
function findBlockForPoint(root: Element, point: DomPoint) {
  const start = isElement(point.node) ? point.node : point.node.parentElement
  const owner = start?.closest(BLOCK_SELECTOR)
  if (owner && root.contains(owner)) return { element: owner, isAfter: false }
  if (!isElement(point.node)) return null
  const child = point.node.childNodes[point.offset]
  if (child) {
    const next = isElement(child)
      ? child.matches(BLOCK_SELECTOR)
        ? child
        : child.querySelector(BLOCK_SELECTOR)
      : null
    if (next) return { element: next, isAfter: false }
  }
  const before = Array.from(point.node.querySelectorAll(BLOCK_SELECTOR)).at(-1)
  return before ? { element: before, isAfter: true } : null
}

/** A DOM point as a flat-text offset, or null when it's outside the surface. */
function getFlatOffsetFromDom(
  root: Element,
  document: EditorDocument,
  point: DomPoint
): number | null {
  if (!root.contains(point.node)) return null
  const found = findBlockForPoint(root, point)
  if (!found) return null
  const id = found.element.getAttribute("data-block-id")
  const block = document.blocks.find((candidate) => candidate.id === id)
  const start = id ? getBlockStartById(document).get(id) : undefined
  if (!block || start === undefined) return null
  const length = getBlockLength(block)
  if (found.isAfter) return start + length
  if (found.element.getAttribute("data-void") === "true") return start
  return start + Math.min(getLocalOffset(found.element, point), length)
}

/** Where a flat-text offset sits in the DOM. */
function getDomPointFromFlat(
  root: Element,
  document: EditorDocument,
  offset: number
): DomPoint | null {
  const starts = getBlockStarts(document)
  let index = document.blocks.length - 1
  for (const [position, start] of starts.entries()) {
    const block = document.blocks[position]
    if (offset <= start + getBlockLength(block)) {
      index = position
      break
    }
  }
  const block = document.blocks[index]
  if (!block) return null
  const element = getBlockElement(root, block.id)
  if (!element) return null
  const local = Math.max(offset - starts[index], 0)
  if (element.getAttribute("data-void") === "true") {
    const parent = element.parentNode
    if (!parent) return null
    const position = Array.from(parent.childNodes).indexOf(element)
    return { node: parent, offset: position + (local > 0 ? 1 : 0) }
  }
  const segments = getBlockSegments(element)
  const found = getSegmentAtOffset(segments, local)
  if (!found) return { node: element, offset: 0 }
  const segment = segments[found.index]
  if (isText(segment.node)) return { node: segment.node, offset: found.offset }
  const parent = segment.node.parentNode
  if (!parent) return null
  const position = Array.from(parent.childNodes).findIndex(
    (child) => child === segment.node
  )
  return { node: parent, offset: position + (found.offset > 0 ? 1 : 0) }
}

function getDomSelection(root: Element, document: EditorDocument) {
  const selection = root.ownerDocument.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode) {
    return null
  }
  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection
  if (!focusNode) return null
  const anchor = getFlatOffsetFromDom(root, document, {
    node: anchorNode,
    offset: anchorOffset,
  })
  const focus = getFlatOffsetFromDom(root, document, {
    node: focusNode,
    offset: focusOffset,
  })
  if (anchor === null || focus === null) return null
  return { anchor, focus }
}

function setDomSelection(
  root: Element,
  document: EditorDocument,
  anchor: number,
  focus: number
) {
  const selection = root.ownerDocument.getSelection()
  const anchorPoint = getDomPointFromFlat(root, document, anchor)
  const focusPoint = getDomPointFromFlat(root, document, focus)
  if (!selection || !anchorPoint || !focusPoint) return
  selection.setBaseAndExtent(
    anchorPoint.node,
    anchorPoint.offset,
    focusPoint.node,
    focusPoint.offset
  )
}

/**
 * The surface's text as the browser left it, in flat-text form, for input
 * the browser applied itself (compositions, Android's Backspace). Blocks the
 * browser removed are left out, which is how a merge shows up.
 */
function readDomFlatText(root: Element, document: EditorDocument) {
  const parts: string[] = []
  for (const block of document.blocks) {
    const element = getBlockElement(root, block.id)
    if (!element) continue
    if (element.getAttribute("data-void") === "true") {
      parts.push(getFlatText({ blocks: [block] }))
      continue
    }
    parts.push(
      getBlockSegments(element)
        .map((segment) => segment.text)
        .join("")
        .replaceAll("\n", LINE_BREAK)
    )
  }
  return parts.join(BLOCK_SEPARATOR)
}

export {
  getDomPointFromFlat,
  getDomSelection,
  getFlatOffsetFromDom,
  readDomFlatText,
  setDomSelection,
}
export type { DomPoint }
