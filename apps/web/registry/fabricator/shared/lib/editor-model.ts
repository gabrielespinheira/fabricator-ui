// The document the Editor edits and Markdown renders: a flat list of blocks
// holding runs of marked text. Pure TypeScript with no React, DOM or React
// Native, so the website and the native tree install this same file.
//
// Both editing surfaces see the document as one string ("flat text"): blocks
// joined by "\n", a line break inside a block as U+2028, and one U+FFFC per
// image, divider or table. They report edits as ranges of that string, which
// the helpers below map back to blocks.

type EditorJson =
  | string
  | number
  | boolean
  | null
  | readonly EditorJson[]
  | { readonly [key: string]: EditorJson }

type EditorMark = {
  /** bold, italic, strike, code, link, or a kit's mark. */
  type: string
  /** A link's `href` and `title`. */
  attrs?: Readonly<Record<string, string>>
}

type EditorInline = {
  /** "\n" is a line break inside the block. */
  text: string
  marks?: readonly EditorMark[]
  /** Markdown kept verbatim because the model can't represent it. */
  raw?: true
}

type EditorBlockType =
  | "paragraph"
  | "heading"
  | "bulleted"
  | "numbered"
  | "task"
  | "quote"
  | "code"
  | "divider"
  | "image"
  | "table"
  | "raw"
  | (string & {})

/** The Markdown a block was parsed from, so an unchanged block saves as it was. */
type EditorSource = {
  /** The block's exact source text. */
  text: string
  /** What separated it from the block before (blank lines, a list's newline). */
  before: string
  /** `getBlockFingerprint` of the block as parsed. */
  fingerprint: string
}

type EditorBlock = {
  /** Stable for the block's life; later block features key on it. */
  id: string
  type: EditorBlockType
  /** List nesting, 0 at the top. */
  indent: number
  /** Empty for void blocks. */
  content: readonly EditorInline[]
  /** level, checked, language, src, alt, rows, start, and recorded source style. */
  attrs: Readonly<Record<string, EditorJson>>
  source?: EditorSource
}

type EditorDocument = {
  /** YAML between the opening `---` lines, verbatim, or null. */
  frontmatter: string | null
  /** The source text of the frontmatter block, fences included. */
  frontmatterSource?: string
  blocks: readonly EditorBlock[]
  /** Whatever followed the last block (a final newline). */
  trailing?: string
}

type EditorPosition = { blockId: string; offset: number }

type EditorSelection = { anchor: EditorPosition; focus: EditorPosition }

const BLOCK_SEPARATOR = "\n"
const LINE_BREAK = "\u2028"
const OBJECT_CHARACTER = "\uFFFC"

const VOID_BLOCK_TYPES: ReadonlySet<string> = new Set([
  "divider",
  "image",
  "table",
])

/** The order marks are kept in, so equal sets compare equal. */
const MARK_ORDER = ["link", "bold", "italic", "strike", "code"]

function isVoidBlock(block: Pick<EditorBlock, "type">) {
  return VOID_BLOCK_TYPES.has(block.type)
}

let idCounter = 0

/** A short id, unique within a session. Hermes has no `crypto`, so no UUIDs. */
function createBlockId() {
  idCounter = (idCounter + 1) % 1_679_616
  return (
    Math.random().toString(36).slice(2, 10) +
    idCounter.toString(36).padStart(4, "0")
  )
}

function createBlock(
  block: Partial<Omit<EditorBlock, "content">> & Pick<EditorBlock, "type">,
  text?: string
): EditorBlock {
  return {
    id: block.id ?? createBlockId(),
    type: block.type,
    indent: block.indent ?? 0,
    content: text ? [{ text }] : [],
    attrs: block.attrs ?? {},
    ...(block.source ? { source: block.source } : {}),
  }
}

function getMarkRank(mark: EditorMark) {
  const index = MARK_ORDER.indexOf(mark.type)
  return index === -1 ? MARK_ORDER.length : index
}

function compareMarks(a: EditorMark, b: EditorMark) {
  return getMarkRank(a) - getMarkRank(b) || a.type.localeCompare(b.type)
}

function sortMarks(marks: readonly EditorMark[] | undefined) {
  if (!marks || marks.length === 0) return undefined
  return [...marks].sort(compareMarks)
}

function isSameMark(a: EditorMark, b: EditorMark) {
  if (a.type !== b.type) return false
  return stableStringify(a.attrs ?? {}) === stableStringify(b.attrs ?? {})
}

function hasSameMarks(
  a: readonly EditorMark[] | undefined,
  b: readonly EditorMark[] | undefined
) {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  return left.every((mark, index) => isSameMark(mark, right[index]))
}

function hasMark(run: EditorInline, type: string) {
  return run.marks?.some((mark) => mark.type === type) ?? false
}

/** Sorted marks, empty runs dropped, neighbours with equal marks merged. */
function normalizeRuns(runs: readonly EditorInline[]): EditorInline[] {
  const result: EditorInline[] = []
  for (const run of runs) {
    if (run.text === "") continue
    const marks = sortMarks(run.marks)
    const previous = result[result.length - 1]
    if (
      previous &&
      Boolean(previous.raw) === Boolean(run.raw) &&
      hasSameMarks(previous.marks, marks)
    ) {
      result[result.length - 1] = {
        ...previous,
        text: previous.text + run.text,
      }
      continue
    }
    result.push({
      text: run.text,
      ...(marks ? { marks } : {}),
      ...(run.raw ? { raw: true as const } : {}),
    })
  }
  return result
}

function getRunsText(runs: readonly EditorInline[]) {
  return runs.map((run) => run.text).join("")
}

function getBlockText(block: EditorBlock) {
  return getRunsText(block.content)
}

/** The runs between two offsets of their joined text. */
function sliceRuns(
  runs: readonly EditorInline[],
  from: number,
  to: number
): EditorInline[] {
  const result: EditorInline[] = []
  let start = 0
  for (const run of runs) {
    const end = start + run.text.length
    const sliceFrom = Math.max(from, start)
    const sliceTo = Math.min(to, end)
    if (sliceFrom < sliceTo) {
      result.push({
        ...run,
        text: run.text.slice(sliceFrom - start, sliceTo - start),
      })
    }
    start = end
  }
  return normalizeRuns(result)
}

/** A block's length in flat text: its text, or one character for a void block. */
function getBlockLength(block: EditorBlock) {
  return isVoidBlock(block) ? 1 : getBlockText(block).length
}

function getBlockFlatText(block: EditorBlock) {
  if (isVoidBlock(block)) return OBJECT_CHARACTER
  return getBlockText(block).replaceAll("\n", LINE_BREAK)
}

function getFlatText(document: Pick<EditorDocument, "blocks">) {
  return document.blocks.map(getBlockFlatText).join(BLOCK_SEPARATOR)
}

// Transactions replace blocks and their array. Weak keys let selection changes
// and block subscribers reuse the index without retaining old undo documents.
const blockIndexes = new WeakMap<readonly EditorBlock[], Map<string, number>>()
const blockLayouts = new WeakMap<
  readonly EditorBlock[],
  { starts: number[]; lengths: number[]; end: number }
>()

function getBlockLayout({ blocks }: Pick<EditorDocument, "blocks">) {
  const cached = blockLayouts.get(blocks)
  if (cached) return cached
  const starts: number[] = []
  const lengths: number[] = []
  let offset = 0
  for (const block of blocks) {
    const length = getBlockLength(block)
    starts.push(offset)
    lengths.push(length)
    offset += length + BLOCK_SEPARATOR.length
  }
  const layout = { starts, lengths, end: offset - BLOCK_SEPARATOR.length }
  blockLayouts.set(blocks, layout)
  return layout
}

/** Where each block starts in flat text. The caller owns the returned array. */
function getBlockStarts(document: Pick<EditorDocument, "blocks">) {
  return [...getBlockLayout(document).starts]
}

function getBlockIndex({ blocks }: Pick<EditorDocument, "blocks">, id: string) {
  let indexes = blockIndexes.get(blocks)
  if (!indexes) {
    indexes = new Map()
    for (const [index, block] of blocks.entries()) indexes.set(block.id, index)
    blockIndexes.set(blocks, indexes)
  }
  return indexes.get(id) ?? -1
}

function toFlatOffset(
  document: Pick<EditorDocument, "blocks">,
  position: EditorPosition
) {
  const layout = getBlockLayout(document)
  const index = getBlockIndex(document, position.blockId)
  if (index === -1) return layout.end
  return (
    layout.starts[index] +
    Math.min(Math.max(position.offset, 0), layout.lengths[index])
  )
}

function fromFlatOffset(
  document: Pick<EditorDocument, "blocks">,
  offset: number
): EditorPosition {
  const { blocks } = document
  if (blocks.length === 0)
    throw new Error("An editor document needs at least one block.")
  const { starts, lengths } = getBlockLayout(document)
  let low = 0
  let high = blocks.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (offset <= starts[middle] + lengths[middle]) high = middle
    else low = middle + 1
  }
  return {
    blockId: blocks[low].id,
    offset: Math.min(Math.max(offset - starts[low], 0), lengths[low]),
  }
}

// MARK: Nesting
//
// List items nest by `indent`, and a paragraph with `indent: k > 0` continues
// the nearest list item above it at indent k - 1, as a CommonMark list item's
// continuation paragraph does. Every block may go at most as deep as the block
// before it allows: one deeper than a list item, as deep as a paragraph, and
// nowhere for anything else. Kept to that, every indented paragraph has its
// item directly above it, with only deeper blocks in between.

const LIST_BLOCK_TYPES: ReadonlySet<string> = new Set([
  "bulleted",
  "numbered",
  "task",
])

/** List items and paragraphs: the blocks that take an indent. */
function isNestableBlock(block: Pick<EditorBlock, "type">) {
  return LIST_BLOCK_TYPES.has(block.type) || block.type === "paragraph"
}

/** The deepest indent a nestable block may take after `previous`. */
function getIndentLimit(
  previous: Pick<EditorBlock, "type" | "indent"> | undefined
) {
  if (!previous) return 0
  if (LIST_BLOCK_TYPES.has(previous.type)) return previous.indent + 1
  if (previous.type === "paragraph") return previous.indent
  return 0
}

/**
 * The blocks with every indent the model can't hold clamped, the blocks
 * nested under a clamped one moving with it. Returns `blocks` itself when
 * nothing changes.
 */
function normalizeIndents(
  blocks: readonly EditorBlock[]
): readonly EditorBlock[] {
  // How far each enclosing block moved, by its indent before the change, so
  // siblings and children of a clamped block move as far as it did.
  const shifts: { indent: number; shift: number }[] = []
  let result: EditorBlock[] | null = null
  for (const [index, block] of blocks.entries()) {
    const previous = result ? result[index - 1] : blocks[index - 1]
    const original = Math.max(0, Math.floor(block.indent))
    while (shifts.length > 0 && shifts[shifts.length - 1].indent > original) {
      shifts.pop()
    }
    const top = shifts.at(-1)
    const inherited = top ? top.shift : 0
    if (top && top.indent === original) shifts.pop()
    const indent = isNestableBlock(block)
      ? Math.min(Math.max(original - inherited, 0), getIndentLimit(previous))
      : 0
    shifts.push({ indent: original, shift: original - indent })
    if (indent === block.indent && !result) continue
    result ??= blocks.slice(0, index)
    result.push(indent === block.indent ? block : { ...block, indent })
  }
  return result ?? blocks
}

// MARK: Characters
//
// A person sees one character where JavaScript may count several UTF-16
// units: surrogate pairs, emoji joined by U+200D, skin tones, variation
// selectors, flags and combining accents. Hermes has no Intl.Segmenter, so
// this covers what Latin text and emoji need.

function getCodePoint(text: string, offset: number) {
  return text.codePointAt(offset) ?? 0
}

function getCodePointLength(codePoint: number) {
  return codePoint > 0xffff ? 2 : 1
}

function isRegionalIndicator(codePoint: number) {
  return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
}

function isExtender(codePoint: number) {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f) ||
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) ||
    (codePoint >= 0xe0020 && codePoint <= 0xe007f)
  )
}

const ZERO_WIDTH_JOINER = 0x200d

function getNextCharacterOffset(text: string, offset: number) {
  if (offset >= text.length) return text.length
  const first = getCodePoint(text, offset)
  let index = offset + getCodePointLength(first)
  if (
    isRegionalIndicator(first) &&
    isRegionalIndicator(getCodePoint(text, index))
  ) {
    index += 2
  }
  while (index < text.length) {
    const codePoint = getCodePoint(text, index)
    if (codePoint === ZERO_WIDTH_JOINER) {
      index += 1
      if (index < text.length)
        index += getCodePointLength(getCodePoint(text, index))
      continue
    }
    if (!isExtender(codePoint)) break
    index += getCodePointLength(codePoint)
  }
  return index
}

/** The largest character boundary at or before `offset`. */
function snapToCharacter(text: string, offset: number) {
  if (offset <= 0) return 0
  if (offset >= text.length) return text.length
  let boundary = 0
  while (boundary < offset) {
    const next = getNextCharacterOffset(text, boundary)
    if (next > offset) return boundary
    boundary = next
  }
  return boundary
}

function getPreviousCharacterOffset(text: string, offset: number) {
  if (offset <= 0) return 0
  return snapToCharacter(
    text,
    snapToCharacter(text, offset) === offset ? offset - 1 : offset
  )
}

// MARK: Fingerprints

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

/** What a block holds, without its id or source: equal when nothing was edited. */
function getBlockFingerprint(block: EditorBlock) {
  return stableStringify([
    block.type,
    block.indent,
    normalizeRuns(block.content),
    block.attrs,
  ])
}

export {
  BLOCK_SEPARATOR,
  LINE_BREAK,
  MARK_ORDER,
  OBJECT_CHARACTER,
  createBlock,
  createBlockId,
  fromFlatOffset,
  getBlockFingerprint,
  getBlockFlatText,
  getBlockIndex,
  getBlockLength,
  getBlockStarts,
  getBlockText,
  getFlatText,
  getIndentLimit,
  getNextCharacterOffset,
  getPreviousCharacterOffset,
  getRunsText,
  hasMark,
  hasSameMarks,
  isNestableBlock,
  isSameMark,
  isVoidBlock,
  normalizeIndents,
  normalizeRuns,
  sliceRuns,
  snapToCharacter,
  sortMarks,
  stableStringify,
  toFlatOffset,
}
export type {
  EditorBlock,
  EditorBlockType,
  EditorDocument,
  EditorInline,
  EditorJson,
  EditorMark,
  EditorPosition,
  EditorSelection,
  EditorSource,
}
