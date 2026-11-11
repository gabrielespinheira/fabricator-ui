// Turns what an editing surface reports into transactions. Every rule about
// typing, Enter, Backspace, Tab, paste, marks and Markdown shortcuts lives
// here once, for the website's contenteditable root and the native text view.
// Offsets in inputs are flat-text offsets (see editor-model).
//
// handleInput returns the state it was given when an input changes nothing,
// so a surface can let the platform handle it (Tab moving focus, say).

import type {
  EditorBlockPrefixRule,
  EditorInlineWrapRule,
  EditorKitRuntime,
} from "./editor-kit"
import {
  BLOCK_SEPARATOR,
  createBlock,
  createBlockId,
  fromFlatOffset,
  getBlockIndex,
  getBlockLength,
  getBlockText,
  getIndentLimit,
  getNextCharacterOffset,
  getPreviousCharacterOffset,
  getRunsText,
  hasMark,
  isNestableBlock,
  isSameMark,
  isVoidBlock,
  LINE_BREAK,
  normalizeRuns,
  OBJECT_CHARACTER,
  sliceRuns,
  snapToCharacter,
  toFlatOffset,
  type EditorBlock,
  type EditorDocument,
  type EditorInline,
  type EditorMark,
  type EditorPosition,
  type EditorSelection,
} from "./editor-model"
import {
  applyTransaction,
  createEditorDraft,
  createSelection,
  EditorOperationError,
  insertBlocks,
  isSamePosition,
  isSameSelection,
  joinBlocks,
  removeBlocks,
  replaceRange,
  setBlock,
  setMarks,
  splitBlock,
  undo,
  type EditorDraft,
  type EditorOperation,
  type EditorOrigin,
  type EditorState,
} from "./editor-transaction"

type EditorModifiers = {
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

type EditorDeleteUnit = "character" | "word" | "line"

type EditorInput =
  | { kind: "replace"; from: number; to: number; text: string }
  | { kind: "split" }
  | { kind: "softBreak" }
  | { kind: "deleteBackward" | "deleteForward"; unit: EditorDeleteUnit }
  | { kind: "select"; anchor: number; focus: number }
  | {
      kind: "key"
      key: string
      /** `KeyboardEvent.code`, which shortcuts match letters and digits by. */
      code?: string
      modifiers: EditorModifiers
    }
  | { kind: "paste"; text: string; blocks?: readonly EditorBlock[] }
  | { kind: "compositionStart" | "compositionEnd" | "focus" | "blur" }

type EditorInputOptions = {
  kit: EditorKitRuntime
  now: number
  /** Ids for new blocks; tests pass a counter. */
  createId?: () => string
}

type EditorRange = {
  from: EditorPosition
  to: EditorPosition
  isCollapsed: boolean
}

type EditorTyping = { marks: readonly EditorMark[]; isRaw: boolean }

type EditorTextEdit = { from: number; to: number; text: string }

type EditorTextSelection = { from: number; to: number }

type EditorContext = {
  kit?: EditorKitRuntime
  now: number
  createId: () => string
}

const LIST_BLOCK_TYPES: ReadonlySet<string> = new Set([
  "bulleted",
  "numbered",
  "task",
])

/** Marks typed text doesn't continue past their end, without a kit saying otherwise. */
const NON_INCLUSIVE_MARKS: ReadonlySet<string> = new Set(["link", "code"])

const CODE_INDENT = "  "

function isListBlock(block: Pick<EditorBlock, "type">) {
  return LIST_BLOCK_TYPES.has(block.type)
}

function isPlainTextBlock(block: Pick<EditorBlock, "type">) {
  return !isVoidBlock(block) && block.type !== "code" && block.type !== "raw"
}

// MARK: Positions and selections

function requireBlock(document: EditorDocument, id: string) {
  const index = getBlockIndex(document, id)
  if (index === -1) throw new EditorOperationError(`No block "${id}".`)
  return { index, block: document.blocks[index] }
}

function getTextLength(block: EditorBlock) {
  return getRunsText(block.content).length
}

function getBlockEnd(block: EditorBlock): EditorPosition {
  return { blockId: block.id, offset: getBlockLength(block) }
}

function normalizePosition(
  document: EditorDocument,
  position: EditorPosition
): EditorPosition {
  return fromFlatOffset(document, toFlatOffset(document, position))
}

/** The selection's ends in document order. */
function getSelectionRange(
  document: EditorDocument,
  selection: EditorSelection
): EditorRange {
  const anchor = normalizePosition(document, selection.anchor)
  const focus = normalizePosition(document, selection.focus)
  const anchorOffset = toFlatOffset(document, anchor)
  const focusOffset = toFlatOffset(document, focus)
  const isForward = anchorOffset <= focusOffset
  return {
    from: isForward ? anchor : focus,
    to: isForward ? focus : anchor,
    isCollapsed: anchorOffset === focusOffset,
  }
}

/** The blocks a selection touches; a range ending at a block's start leaves it out. */
function getSelectedBlockIndices(
  document: EditorDocument,
  selection: EditorSelection
) {
  const { from, to, isCollapsed } = getSelectionRange(document, selection)
  const fromIndex = getBlockIndex(document, from.blockId)
  const toIndex = getBlockIndex(document, to.blockId)
  const endsAtStart = !isCollapsed && toIndex > fromIndex && to.offset === 0
  return { fromIndex, toIndex: endsAtStart ? toIndex - 1 : toIndex }
}

function snapUpToCharacter(text: string, offset: number) {
  const start = snapToCharacter(text, offset)
  return start === offset ? offset : getNextCharacterOffset(text, start)
}

function removeLoneSurrogates(text: string) {
  return [...text]
    .filter(
      (character) =>
        character.length === 2 || !/[\uD800-\uDFFF]/.test(character)
    )
    .join("")
}

function toFlatText(text: string) {
  return text.replaceAll("\n", LINE_BREAK)
}

// MARK: Marks

function isInclusiveMark(type: string, kit?: EditorKitRuntime) {
  const spec = kit?.marks.get(type)
  return spec ? spec.inclusive : !NON_INCLUSIVE_MARKS.has(type)
}

/** The run holding the character at `offset`. */
function getRunAt(runs: readonly EditorInline[], offset: number) {
  let start = 0
  for (const run of runs) {
    const end = start + run.text.length
    if (offset >= start && offset < end) return run
    start = end
  }
  return undefined
}

/** What text typed at `position` takes, before stored marks. */
function getTypingAt(
  document: EditorDocument,
  position: EditorPosition,
  kit?: EditorKitRuntime
): EditorTyping {
  const index = getBlockIndex(document, position.blockId)
  const block = document.blocks.at(index)
  if (index === -1 || !block || !isPlainTextBlock(block)) {
    return { marks: [], isRaw: false }
  }
  const before =
    position.offset > 0
      ? getRunAt(block.content, position.offset - 1)
      : undefined
  const after = getRunAt(block.content, position.offset)
  const isRaw = Boolean(before?.raw && after?.raw)
  const afterMarks = after?.marks ?? []
  if (!before) {
    return {
      marks: afterMarks.filter((mark) => isInclusiveMark(mark.type, kit)),
      isRaw,
    }
  }
  const marks = (before.marks ?? []).filter(
    (mark) =>
      isInclusiveMark(mark.type, kit) ||
      afterMarks.some((other) => isSameMark(other, mark))
  )
  return { marks, isRaw }
}

/** The marks the next typed text takes at `position`: stored marks first. */
function getMarksAt(
  state: EditorState,
  position: EditorPosition,
  kit?: EditorKitRuntime
): readonly EditorMark[] {
  const { block } = requireBlock(state.document, position.blockId)
  if (!isPlainTextBlock(block)) return []
  return state.storedMarks ?? getTypingAt(state.document, position, kit).marks
}

/** Typed text replacing a range takes the marks of the text it replaces. */
function getReplaceTyping(
  state: EditorState,
  from: EditorPosition,
  to: EditorPosition,
  kit?: EditorKitRuntime
): EditorTyping {
  const { block } = requireBlock(state.document, from.blockId)
  if (!isPlainTextBlock(block)) return { marks: [], isRaw: false }
  if (state.storedMarks) return { marks: state.storedMarks, isRaw: false }
  if (from.blockId === to.blockId && from.offset < to.offset) {
    const run = getRunAt(block.content, from.offset)
    if (run) return { marks: run.marks ?? [], isRaw: Boolean(run.raw) }
  }
  return getTypingAt(state.document, from, kit)
}

function createRuns(text: string, typing: EditorTyping): EditorInline[] {
  if (text === "") return []
  return [
    {
      text,
      ...(typing.marks.length > 0 ? { marks: typing.marks } : {}),
      ...(typing.isRaw ? { raw: true as const } : {}),
    },
  ]
}

/** Whether a block's range holds no inline code or raw Markdown. */
function isPlainRange(block: EditorBlock, from: number, to: number) {
  return sliceRuns(block.content, from, to).every(
    (run) => !run.raw && !hasMark(run, "code")
  )
}

// MARK: Transactions

function getContext(options: EditorInputOptions): EditorContext {
  return {
    kit: options.kit,
    now: options.now,
    createId: options.createId ?? createBlockId,
  }
}

function commit(
  state: EditorState,
  draft: EditorDraft,
  selectionAfter: EditorSelection | null,
  origin: EditorOrigin,
  context: EditorContext,
  storedMarks?: readonly EditorMark[] | null
): EditorState {
  const operations = draft.getOperations()
  if (
    operations.length === 0 &&
    storedMarks === undefined &&
    isSameSelection(state.selection, selectionAfter)
  ) {
    return state
  }
  return applyTransaction(state, {
    operations: [...operations],
    selectionBefore: state.selection,
    selectionAfter,
    origin,
    time: context.now,
    ...(storedMarks === undefined ? {} : { storedMarks }),
  })
}

function select(
  state: EditorState,
  selection: EditorSelection,
  context: EditorContext
) {
  return commit(
    state,
    createEditorDraft(state.document),
    selection,
    "input",
    context
  )
}

// MARK: Editing steps
//
// Each step applies operations to a draft and returns where the caret lands.

/** Removes blocks; a document left empty gets an empty paragraph. */
function removeBlocksAt(
  draft: EditorDraft,
  index: number,
  count: number,
  context: EditorContext
): EditorPosition {
  const document = draft.apply(removeBlocks(index, count))
  if (document.blocks.length === 0) {
    const paragraph = createBlock({ id: context.createId(), type: "paragraph" })
    draft.apply(insertBlocks(0, [paragraph]))
    return { blockId: paragraph.id, offset: 0 }
  }
  const next = document.blocks.at(index)
  if (next && !isVoidBlock(next)) return { blockId: next.id, offset: 0 }
  const previous = index > 0 ? document.blocks.at(index - 1) : undefined
  if (previous) return getBlockEnd(previous)
  return { blockId: document.blocks[0].id, offset: 0 }
}

/** Deletes a range; void blocks it covers go whole, and never join text. */
function deleteRange(
  draft: EditorDraft,
  range: { from: EditorPosition; to: EditorPosition },
  context: EditorContext
): EditorPosition {
  const document = draft.getDocument()
  let { from, to } = range
  if (isSamePosition(from, to)) return from
  let fromIndex = getBlockIndex(document, from.blockId)
  let toIndex = getBlockIndex(document, to.blockId)
  if (
    isVoidBlock(document.blocks[fromIndex]) &&
    from.offset > 0 &&
    fromIndex < toIndex
  ) {
    fromIndex += 1
    from = { blockId: document.blocks[fromIndex].id, offset: 0 }
  }
  if (
    isVoidBlock(document.blocks[toIndex]) &&
    to.offset === 0 &&
    toIndex > fromIndex
  ) {
    toIndex -= 1
    to = getBlockEnd(document.blocks[toIndex])
  }
  if (isSamePosition(from, to)) return from
  const first = document.blocks[fromIndex]
  const last = document.blocks[toIndex]
  const startsInVoid = isVoidBlock(first)
  const endsInVoid = isVoidBlock(last)
  if (!startsInVoid && !endsInVoid) {
    draft.apply(replaceRange(from, to))
    return from
  }
  if (fromIndex === toIndex) return removeBlocksAt(draft, fromIndex, 1, context)
  if (!startsInVoid) {
    draft.apply(replaceRange(from, getBlockEnd(first)))
    draft.apply(removeBlocks(fromIndex + 1, toIndex - fromIndex))
    return from
  }
  if (!endsInVoid) {
    const start = { blockId: last.id, offset: 0 }
    draft.apply(replaceRange(start, to))
    draft.apply(removeBlocks(fromIndex, toIndex - fromIndex))
    return start
  }
  return removeBlocksAt(draft, fromIndex, toIndex - fromIndex + 1, context)
}

/** The type and attrs of the block Enter makes after `block`. */
function getContinuation(block: EditorBlock, isAtEnd: boolean) {
  if (block.type === "heading" && isAtEnd) {
    return { type: "paragraph", attrs: {} }
  }
  if (block.type === "task") {
    return { type: block.type, attrs: { ...block.attrs, checked: false } }
  }
  if (block.type === "numbered") {
    // Numbers after the first are counted when rendering.
    const attrs = Object.fromEntries(
      Object.entries(block.attrs).filter(([key]) => key !== "number")
    )
    return { type: block.type, attrs }
  }
  return { type: block.type, attrs: block.attrs }
}

function splitAt(
  draft: EditorDraft,
  position: EditorPosition,
  context: EditorContext
): EditorPosition {
  const { block } = requireBlock(draft.getDocument(), position.blockId)
  const id = context.createId()
  const shape = getContinuation(block, position.offset >= getTextLength(block))
  draft.apply(splitBlock(position, id, shape.type, shape.attrs))
  return { blockId: id, offset: 0 }
}

/** Inserts flat text: "\n" splits blocks, U+2028 is a line break inside one. */
function insertFlatText(
  draft: EditorDraft,
  position: EditorPosition,
  flatText: string,
  typing: EditorTyping,
  context: EditorContext
): EditorPosition {
  const text = flatText.replaceAll(OBJECT_CHARACTER, "")
  if (text === "") return position
  let caret = position
  const { index, block } = requireBlock(draft.getDocument(), caret.blockId)
  if (isVoidBlock(block)) {
    const paragraph = createBlock({ id: context.createId(), type: "paragraph" })
    draft.apply(insertBlocks(index + (caret.offset > 0 ? 1 : 0), [paragraph]))
    caret = { blockId: paragraph.id, offset: 0 }
  }
  for (const [segmentIndex, segment] of text.split(BLOCK_SEPARATOR).entries()) {
    if (segmentIndex > 0) caret = splitAt(draft, caret, context)
    const content = segment.replaceAll(LINE_BREAK, "\n")
    if (content === "") continue
    draft.apply(replaceRange(caret, caret, createRuns(content, typing)))
    caret = { blockId: caret.blockId, offset: caret.offset + content.length }
  }
  return caret
}

function insertParagraph(
  draft: EditorDraft,
  index: number,
  context: EditorContext
): EditorPosition {
  const paragraph = createBlock({ id: context.createId(), type: "paragraph" })
  draft.apply(insertBlocks(index, [paragraph]))
  return { blockId: paragraph.id, offset: 0 }
}

// MARK: Indent

/**
 * Indents or outdents the list items and paragraphs in a block range,
 * carrying the blocks nested under them. A block goes at most as deep as the
 * block before it allows (see getIndentLimit): one level under a list item,
 * so a paragraph indented under an item continues it.
 */
function getIndentOperations(
  document: EditorDocument,
  fromIndex: number,
  toIndex: number,
  delta: 1 | -1
): EditorOperation[] {
  const { blocks } = document
  const canShift = (block: EditorBlock) =>
    delta > 0 ? isNestableBlock(block) : !isVoidBlock(block) && block.indent > 0
  let first = -1
  let last = -1
  for (let index = fromIndex; index <= toIndex; index += 1) {
    if (!canShift(blocks[index])) continue
    if (first === -1) first = index
    last = index
  }
  if (first === -1) return []
  if (delta > 0) {
    const previous = first > 0 ? blocks.at(first - 1) : undefined
    if (blocks[first].indent + 1 > getIndentLimit(previous)) return []
  }
  let minimum = Infinity
  for (let index = first; index <= last; index += 1) {
    if (canShift(blocks[index]))
      minimum = Math.min(minimum, blocks[index].indent)
  }
  let end = last
  while (end + 1 < blocks.length && blocks[end + 1].indent > minimum) end += 1
  const operations: EditorOperation[] = []
  for (let index = first; index <= end; index += 1) {
    const block = blocks[index]
    const isNested = block.indent > minimum
    if (!canShift(block) && !isNested) continue
    operations.push(
      setBlock(block.id, { indent: Math.max(0, block.indent + delta) })
    )
  }
  return operations
}

/** Indents (1) or outdents (-1) the selected list items and paragraphs, or returns null. */
function shiftListItems(
  state: EditorState,
  delta: 1 | -1,
  options: { now: number; origin?: EditorOrigin }
): EditorState | null {
  if (!state.selection) return null
  const { fromIndex, toIndex } = getSelectedBlockIndices(
    state.document,
    state.selection
  )
  const operations = getIndentOperations(
    state.document,
    fromIndex,
    toIndex,
    delta
  )
  if (operations.length === 0) return null
  return applyTransaction(state, {
    operations,
    selectionBefore: state.selection,
    selectionAfter: state.selection,
    origin: options.origin ?? "command",
    time: options.now,
  })
}

// MARK: Input rules

function applyBlockPrefixRule(
  state: EditorState,
  block: EditorBlock,
  caret: EditorPosition,
  rule: EditorBlockPrefixRule,
  context: EditorContext
) {
  if (rule.trigger !== "text" || !rule.from.includes(block.type)) return null
  const match = rule.pattern.exec(getBlockText(block).slice(0, caret.offset))
  if (!match || !isPlainRange(block, 0, caret.offset)) return null
  const draft = createEditorDraft(state.document)
  const start = { blockId: block.id, offset: 0 }
  draft.apply(replaceRange(start, caret))
  draft.apply(
    setBlock(block.id, { type: rule.type, attrs: rule.getAttrs(match) })
  )
  return commit(state, draft, createSelection(start), "rule", context)
}

const WORD_CHARACTER = /[\p{L}\p{N}]/u

/** Where a wrap typed just before the caret opens and closes, or null. */
function findInlineWrap(text: string, delimiter: string) {
  if (!text.endsWith(delimiter)) return null
  const close = text.length - delimiter.length
  const marker = delimiter[0]
  // The closing delimiter is part of a longer run, like the first `*` of `**`.
  if (text[close - 1] === marker) return null
  const open = text.lastIndexOf(delimiter, close - delimiter.length - 1)
  if (open === -1 || open + delimiter.length >= close) return null
  if (open > 0 && text[open - 1] === marker) return null
  const content = text.slice(open + delimiter.length, close)
  if (/^\s|\s$|\n/u.test(content)) return null
  if (open > 0 && WORD_CHARACTER.test(text[open - 1])) return null
  return { open, close }
}

function applyInlineWrapRule(
  state: EditorState,
  block: EditorBlock,
  caret: EditorPosition,
  rule: EditorInlineWrapRule,
  context: EditorContext
) {
  const wrap = findInlineWrap(
    getBlockText(block).slice(0, caret.offset),
    rule.delimiter
  )
  if (!wrap || !isPlainRange(block, wrap.open, caret.offset)) return null
  const size = rule.delimiter.length
  const at = (offset: number) => ({ blockId: block.id, offset })
  const draft = createEditorDraft(state.document)
  draft.apply(replaceRange(at(wrap.close), at(wrap.close + size)))
  draft.apply(replaceRange(at(wrap.open), at(wrap.open + size)))
  const end = at(wrap.close - size)
  const document = draft.apply(
    setMarks(at(wrap.open), end, { type: rule.mark }, true)
  )
  // Text typed next continues what was around the wrap, not the new mark.
  const storedMarks = getTypingAt(document, end, context.kit).marks.filter(
    (mark) => mark.type !== rule.mark
  )
  return commit(
    state,
    draft,
    createSelection(end),
    "rule",
    context,
    storedMarks
  )
}

/** Markdown shortcuts that fire on typing, each its own `rule` transaction. */
function applyTypingRules(state: EditorState, context: EditorContext) {
  const { selection } = state
  if (!selection || !isSamePosition(selection.anchor, selection.focus))
    return state
  const caret = selection.focus
  const { block } = requireBlock(state.document, caret.blockId)
  if (!isPlainTextBlock(block)) return state
  for (const rule of context.kit?.inputRules ?? []) {
    const next =
      rule.kind === "blockPrefix"
        ? applyBlockPrefixRule(state, block, caret, rule, context)
        : applyInlineWrapRule(state, block, caret, rule, context)
    if (next) return next
  }
  return state
}

/** Markdown shortcuts that fire on Enter at a paragraph's end (fences, `---`). */
function applyEnterRules(
  state: EditorState,
  caret: EditorPosition,
  context: EditorContext
) {
  const { index, block } = requireBlock(state.document, caret.blockId)
  const text = getBlockText(block)
  if (caret.offset !== text.length) return null
  for (const rule of context.kit?.inputRules ?? []) {
    if (rule.kind !== "blockPrefix" || rule.trigger !== "enter") continue
    if (!rule.from.includes(block.type)) continue
    const match = rule.pattern.exec(text)
    if (!match || !isPlainRange(block, 0, text.length)) continue
    const draft = createEditorDraft(state.document)
    const start = { blockId: block.id, offset: 0 }
    draft.apply(replaceRange(start, caret))
    draft.apply(
      setBlock(block.id, { type: rule.type, attrs: rule.getAttrs(match) })
    )
    const after = isVoidBlock({ type: rule.type })
      ? insertParagraph(draft, index + 1, context)
      : start
    return commit(state, draft, createSelection(after), "rule", context)
  }
  return null
}

// MARK: Replace

function replaceText(
  state: EditorState,
  range: { from: EditorPosition; to: EditorPosition },
  flatText: string,
  origin: EditorOrigin,
  context: EditorContext
) {
  const typing = getReplaceTyping(state, range.from, range.to, context.kit)
  const draft = createEditorDraft(state.document)
  const caret = deleteRange(draft, range, context)
  const end = insertFlatText(draft, caret, flatText, typing, context)
  return commit(state, draft, createSelection(end), origin, context)
}

/** Widens an edit that would split a character, keeping what the edit meant. */
function snapEdit(
  document: EditorDocument,
  from: EditorPosition,
  to: EditorPosition,
  text: string
) {
  const fromBlock = requireBlock(document, from.blockId).block
  const toBlock = requireBlock(document, to.blockId).block
  if (isVoidBlock(fromBlock) || isVoidBlock(toBlock)) return { from, to, text }
  const fromText = getBlockText(fromBlock)
  const start = snapToCharacter(fromText, from.offset)
  // Text typed inside a character goes before it.
  if (isSamePosition(from, to)) {
    const position = { blockId: from.blockId, offset: start }
    return { from: position, to: position, text }
  }
  // A range inside a character widens to it, keeping the parts left outside
  // the range, so removing an accent leaves its letter.
  const toText = getBlockText(toBlock)
  const end = snapUpToCharacter(toText, to.offset)
  return {
    from: { blockId: from.blockId, offset: start },
    to: { blockId: to.blockId, offset: end },
    text: removeLoneSurrogates(
      toFlatText(fromText.slice(start, from.offset)) +
        text +
        toFlatText(toText.slice(to.offset, end))
    ),
  }
}

function handleReplace(
  state: EditorState,
  input: Extract<EditorInput, { kind: "replace" }>,
  context: EditorContext
) {
  const { document } = state
  const edit = snapEdit(
    document,
    fromFlatOffset(document, Math.min(input.from, input.to)),
    fromFlatOffset(document, Math.max(input.from, input.to)),
    input.text
  )
  if (isSamePosition(edit.from, edit.to) && edit.text === "") return state
  const next = replaceText(state, edit, edit.text, "input", context)
  if (input.text === "" || input.text.includes(BLOCK_SEPARATOR)) return next
  return applyTypingRules(next, context)
}

function handleSoftBreak(state: EditorState, context: EditorContext) {
  if (!state.selection) return state
  const range = getSelectionRange(state.document, state.selection)
  return replaceText(state, range, LINE_BREAK, "input", context)
}

// MARK: Enter

function leaveCodeBlock(state: EditorState, context: EditorContext) {
  if (!state.selection) return state
  const { index, block } = requireBlock(
    state.document,
    state.selection.focus.blockId
  )
  if (block.type !== "code") return state
  const draft = createEditorDraft(state.document)
  const caret = insertParagraph(draft, index + 1, context)
  return commit(state, draft, createSelection(caret), "input", context)
}

function splitCodeBlock(
  state: EditorState,
  draft: EditorDraft,
  caret: EditorPosition,
  context: EditorContext
) {
  const { index, block } = requireBlock(draft.getDocument(), caret.blockId)
  const text = getBlockText(block)
  // Enter on an empty last line leaves the block, taking that line with it.
  if (text !== "" && text.endsWith("\n") && caret.offset === text.length) {
    draft.apply(
      replaceRange({ blockId: block.id, offset: text.length - 1 }, caret)
    )
    const after = insertParagraph(draft, index + 1, context)
    return commit(state, draft, createSelection(after), "input", context)
  }
  draft.apply(replaceRange(caret, caret, [{ text: "\n" }]))
  const after = { blockId: block.id, offset: caret.offset + 1 }
  return commit(state, draft, createSelection(after), "input", context)
}

function handleSplit(state: EditorState, context: EditorContext) {
  if (!state.selection) return state
  const range = getSelectionRange(state.document, state.selection)
  if (range.isCollapsed) {
    const ruled = applyEnterRules(state, range.from, context)
    if (ruled) return ruled
  }
  const draft = createEditorDraft(state.document)
  // Enter on a selected image or divider keeps it and adds a paragraph after.
  const isVoidSelected =
    range.from.blockId === range.to.blockId &&
    isVoidBlock(requireBlock(state.document, range.from.blockId).block)
  const caret = isVoidSelected ? range.to : deleteRange(draft, range, context)
  const document = draft.getDocument()
  const { index, block } = requireBlock(document, caret.blockId)
  if (isVoidBlock(block)) {
    if (caret.offset === 0) {
      insertParagraph(draft, index, context)
      return commit(state, draft, createSelection(caret), "input", context)
    }
    const after = insertParagraph(draft, index + 1, context)
    return commit(state, draft, createSelection(after), "input", context)
  }
  if (block.type === "code") return splitCodeBlock(state, draft, caret, context)
  const text = getBlockText(block)
  // An empty indented paragraph steps out of its list item, as an item does.
  const isEmptyItem =
    text === "" &&
    (isListBlock(block) ||
      block.type === "quote" ||
      (block.type === "paragraph" && block.indent > 0))
  if (range.isCollapsed && isEmptyItem) {
    if (block.indent > 0) {
      for (const operation of getIndentOperations(document, index, index, -1)) {
        draft.apply(operation)
      }
    } else {
      draft.apply(
        setBlock(block.id, { type: "paragraph", attrs: {}, indent: 0 })
      )
    }
    return commit(state, draft, createSelection(caret), "input", context)
  }
  // Enter at a heading's start pushes it down, leaving a paragraph above.
  if (block.type === "heading" && caret.offset === 0 && text !== "") {
    const paragraph = createBlock({ id: context.createId(), type: "paragraph" })
    draft.apply(insertBlocks(index, [paragraph]))
    return commit(state, draft, createSelection(caret), "input", context)
  }
  const marks =
    state.storedMarks ?? getTypingAt(document, caret, context.kit).marks
  const after = splitAt(draft, caret, context)
  // Formatting carries into the new empty block, as it would into typed text.
  const isEmpty =
    getTextLength(requireBlock(draft.getDocument(), after.blockId).block) === 0
  const storedMarks = isEmpty && marks.length > 0 ? marks : undefined
  return commit(
    state,
    draft,
    createSelection(after),
    "input",
    context,
    storedMarks
  )
}

// MARK: Delete

function isSpaceCharacter(character: string) {
  return /^\s/u.test(character)
}

function isWordCharacter(character: string) {
  return /^[\p{L}\p{N}\p{M}_'’]/u.test(character)
}

function getWordBoundary(
  text: string,
  offset: number,
  direction: "backward" | "forward"
) {
  const isBackward = direction === "backward"
  const edge = isBackward ? 0 : text.length
  const step = (at: number) =>
    isBackward
      ? getPreviousCharacterOffset(text, at)
      : getNextCharacterOffset(text, at)
  const characterAt = (at: number) =>
    isBackward ? text.slice(step(at), at) : text.slice(at, step(at))
  let index = offset
  while (index !== edge && isSpaceCharacter(characterAt(index)))
    index = step(index)
  if (index === edge) return index
  const isWord = isWordCharacter(characterAt(index))
  while (index !== edge) {
    const character = characterAt(index)
    if (isSpaceCharacter(character) || isWordCharacter(character) !== isWord)
      break
    index = step(index)
  }
  return index
}

function getLineBoundary(
  text: string,
  offset: number,
  direction: "backward" | "forward"
) {
  if (direction === "backward") {
    if (text[offset - 1] === "\n") return offset - 1
    return text.lastIndexOf("\n", offset - 1) + 1
  }
  if (text[offset] === "\n") return offset + 1
  const index = text.indexOf("\n", offset)
  return index === -1 ? text.length : index
}

/** Where deleting one unit from `offset` stops, never inside a character. */
function getDeleteBoundary(
  text: string,
  offset: number,
  unit: EditorDeleteUnit,
  direction: "backward" | "forward"
) {
  if (unit === "line") return getLineBoundary(text, offset, direction)
  if (unit === "word") return getWordBoundary(text, offset, direction)
  return direction === "backward"
    ? getPreviousCharacterOffset(text, offset)
    : getNextCharacterOffset(text, offset)
}

function selectBlock(
  state: EditorState,
  block: EditorBlock,
  context: EditorContext
) {
  return select(
    state,
    createSelection(
      { blockId: block.id, offset: 0 },
      { blockId: block.id, offset: 1 }
    ),
    context
  )
}

function deleteBackwardAtStart(
  state: EditorState,
  block: EditorBlock,
  index: number,
  context: EditorContext
) {
  const { document } = state
  const draft = createEditorDraft(document)
  const caret = { blockId: block.id, offset: 0 }
  if (!isVoidBlock(block) && block.indent > 0) {
    for (const operation of getIndentOperations(document, index, index, -1)) {
      draft.apply(operation)
    }
    return commit(state, draft, createSelection(caret), "input", context)
  }
  if (
    !isVoidBlock(block) &&
    block.type !== "paragraph" &&
    block.type !== "raw"
  ) {
    draft.apply(setBlock(block.id, { type: "paragraph", attrs: {} }))
    return commit(state, draft, createSelection(caret), "input", context)
  }
  const previous = index > 0 ? document.blocks.at(index - 1) : undefined
  if (!previous) return state
  if (isVoidBlock(previous)) return selectBlock(state, previous, context)
  if (getTextLength(previous) === 0) {
    draft.apply(removeBlocks(index - 1, 1))
    return commit(state, draft, createSelection(caret), "input", context)
  }
  if (isVoidBlock(block))
    return select(state, createSelection(getBlockEnd(previous)), context)
  draft.apply(joinBlocks(previous.id, block.id))
  return commit(
    state,
    draft,
    createSelection(getBlockEnd(previous)),
    "input",
    context
  )
}

function deleteForwardAtEnd(
  state: EditorState,
  block: EditorBlock,
  index: number,
  context: EditorContext
) {
  const { document } = state
  const next = document.blocks.at(index + 1)
  if (!next) return state
  if (isVoidBlock(next)) return selectBlock(state, next, context)
  const draft = createEditorDraft(document)
  if (getTextLength(next) === 0) {
    draft.apply(removeBlocks(index + 1, 1))
    return commit(state, draft, state.selection, "input", context)
  }
  if (isVoidBlock(block)) return state
  if (getTextLength(block) === 0) {
    draft.apply(removeBlocks(index, 1))
    return commit(
      state,
      draft,
      createSelection({ blockId: next.id, offset: 0 }),
      "input",
      context
    )
  }
  draft.apply(joinBlocks(block.id, next.id))
  return commit(state, draft, state.selection, "input", context)
}

function handleDelete(
  state: EditorState,
  input: Extract<EditorInput, { kind: "deleteBackward" | "deleteForward" }>,
  context: EditorContext
) {
  if (!state.selection) return state
  const range = getSelectionRange(state.document, state.selection)
  const draft = createEditorDraft(state.document)
  if (!range.isCollapsed) {
    const caret = deleteRange(draft, range, context)
    return commit(state, draft, createSelection(caret), "input", context)
  }
  const isBackward = input.kind === "deleteBackward"
  const last = state.history.undo.at(-1)
  // Backspace straight after a Markdown shortcut gives back what was typed.
  if (
    isBackward &&
    last?.transaction.origin === "rule" &&
    isSameSelection(state.selection, last.transaction.selectionAfter)
  ) {
    return undo(state)
  }
  const caret = range.from
  const { index, block } = requireBlock(state.document, caret.blockId)
  if (isVoidBlock(block) && caret.offset === (isBackward ? 1 : 0)) {
    const after = removeBlocksAt(draft, index, 1, context)
    return commit(state, draft, createSelection(after), "input", context)
  }
  const text = isVoidBlock(block) ? "" : getBlockText(block)
  const isAtEdge = isBackward ? caret.offset === 0 : caret.offset >= text.length
  if (isAtEdge) {
    return isBackward
      ? deleteBackwardAtStart(state, block, index, context)
      : deleteForwardAtEnd(state, block, index, context)
  }
  const direction = isBackward ? "backward" : "forward"
  const boundary = getDeleteBoundary(text, caret.offset, input.unit, direction)
  const target = { blockId: block.id, offset: boundary }
  draft.apply(
    isBackward ? replaceRange(target, caret) : replaceRange(caret, target)
  )
  return commit(
    state,
    draft,
    createSelection(isBackward ? target : caret),
    "input",
    context
  )
}

// MARK: Keys

function outdentCodeLine(state: EditorState, context: EditorContext) {
  if (!state.selection) return state
  const caret = normalizePosition(state.document, state.selection.focus)
  const { block } = requireBlock(state.document, caret.blockId)
  const text = getBlockText(block)
  const lineStart = text.lastIndexOf("\n", caret.offset - 1) + 1
  const spaces = /^ {1,2}/.exec(text.slice(lineStart))?.[0].length ?? 0
  if (spaces === 0) return state
  const draft = createEditorDraft(state.document)
  draft.apply(
    replaceRange(
      { blockId: block.id, offset: lineStart },
      { blockId: block.id, offset: lineStart + spaces }
    )
  )
  const after = {
    blockId: block.id,
    offset: Math.max(lineStart, caret.offset - spaces),
  }
  return commit(state, draft, createSelection(after), "input", context)
}

function handleTab(state: EditorState, delta: 1 | -1, context: EditorContext) {
  if (!state.selection) return state
  const { block } = requireBlock(state.document, state.selection.focus.blockId)
  if (block.type === "code") {
    if (delta < 0) return outdentCodeLine(state, context)
    const range = getSelectionRange(state.document, state.selection)
    return replaceText(state, range, CODE_INDENT, "input", context)
  }
  return (
    shiftListItems(state, delta, { now: context.now, origin: "input" }) ?? state
  )
}

function handleKey(
  state: EditorState,
  input: Extract<EditorInput, { kind: "key" }>,
  context: EditorContext
) {
  const { key, modifiers } = input
  const hasCommandKey = modifiers.metaKey || modifiers.ctrlKey
  if (key === "Tab" && !hasCommandKey && !modifiers.altKey) {
    return handleTab(state, modifiers.shiftKey ? -1 : 1, context)
  }
  if (key === "Enter" && hasCommandKey) return leaveCodeBlock(state, context)
  return state
}

// MARK: Paste

function toPastedFlatText(text: string, isCode: boolean) {
  const normalized = text.replace(/\r\n?/g, "\n")
  if (isCode) return toFlatText(normalized)
  return normalized
    .split(/\n{2,}/)
    .map(toFlatText)
    .join(BLOCK_SEPARATOR)
}

/** A pasted block gets a fresh id and loses the source it was parsed from. */
function copyPastedBlock(
  block: EditorBlock,
  context: EditorContext
): EditorBlock {
  return {
    id: context.createId(),
    type: block.type,
    indent: block.indent,
    content: normalizeRuns(block.content),
    attrs: block.attrs,
  }
}

function insertPastedBlocks(
  draft: EditorDraft,
  caret: EditorPosition,
  pasted: readonly EditorBlock[],
  context: EditorContext
): EditorPosition {
  const blocks = pasted.map((block) => copyPastedBlock(block, context))
  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  const { index, block: current } = requireBlock(
    draft.getDocument(),
    caret.blockId
  )
  if (isVoidBlock(current)) {
    draft.apply(insertBlocks(index + (caret.offset > 0 ? 1 : 0), blocks))
    return getBlockEnd(last)
  }
  if (current.type === "paragraph" && getTextLength(current) === 0) {
    draft.apply(removeBlocks(index, 1))
    draft.apply(insertBlocks(index, blocks))
    return getBlockEnd(last)
  }
  const mergesFirst = isPlainTextBlock(first)
  if (blocks.length === 1 && mergesFirst) {
    draft.apply(replaceRange(caret, caret, first.content))
    return {
      blockId: caret.blockId,
      offset: caret.offset + getTextLength(first),
    }
  }
  const mergesLast = blocks.length > 1 && isPlainTextBlock(last)
  const tailId = context.createId()
  const shape = mergesLast
    ? { type: last.type, attrs: last.attrs }
    : getContinuation(current, caret.offset >= getTextLength(current))
  draft.apply(splitBlock(caret, tailId, shape.type, shape.attrs))
  if (mergesLast && last.indent !== current.indent) {
    draft.apply(setBlock(tailId, { indent: last.indent }))
  }
  if (mergesFirst) draft.apply(replaceRange(caret, caret, first.content))
  const middle = blocks.slice(mergesFirst ? 1 : 0, mergesLast ? -1 : undefined)
  if (middle.length > 0) draft.apply(insertBlocks(index + 1, middle))
  const tailStart = { blockId: tailId, offset: 0 }
  if (!mergesLast) return tailStart
  draft.apply(replaceRange(tailStart, tailStart, last.content))
  return { blockId: tailId, offset: getTextLength(last) }
}

function handlePaste(
  state: EditorState,
  input: Extract<EditorInput, { kind: "paste" }>,
  context: EditorContext
) {
  if (!state.selection) return state
  const range = getSelectionRange(state.document, state.selection)
  const typing = getReplaceTyping(state, range.from, range.to, context.kit)
  const draft = createEditorDraft(state.document)
  const caret = deleteRange(draft, range, context)
  const { block } = requireBlock(draft.getDocument(), caret.blockId)
  const blocks = input.blocks ?? []
  if (blocks.length === 0 || block.type === "code") {
    const text = toPastedFlatText(input.text, block.type === "code")
    const end = insertFlatText(draft, caret, text, typing, context)
    return commit(state, draft, createSelection(end), "paste", context)
  }
  const end = insertPastedBlocks(draft, caret, blocks, context)
  return commit(state, draft, createSelection(end), "paste", context)
}

// MARK: Select

function toSnappedPosition(document: EditorDocument, offset: number) {
  const position = fromFlatOffset(document, offset)
  const { block } = requireBlock(document, position.blockId)
  if (isVoidBlock(block)) return position
  return {
    blockId: position.blockId,
    offset: snapToCharacter(getBlockText(block), position.offset),
  }
}

function handleSelect(
  state: EditorState,
  input: Extract<EditorInput, { kind: "select" }>,
  context: EditorContext
) {
  const selection = createSelection(
    toSnappedPosition(state.document, input.anchor),
    toSnappedPosition(state.document, input.focus)
  )
  if (isSameSelection(state.selection, selection)) return state
  return select(state, selection, context)
}

function handleInput(
  state: EditorState,
  input: EditorInput,
  options: EditorInputOptions
): EditorState {
  const context = getContext(options)
  switch (input.kind) {
    case "replace":
      return handleReplace(state, input, context)
    case "split":
      return handleSplit(state, context)
    case "softBreak":
      return handleSoftBreak(state, context)
    case "deleteBackward":
    case "deleteForward":
      return handleDelete(state, input, context)
    case "select":
      return handleSelect(state, input, context)
    case "key":
      return handleKey(state, input, context)
    case "paste":
      return handlePaste(state, input, context)
    case "compositionStart":
    case "compositionEnd":
    case "focus":
    case "blur":
      return state
  }
}

// MARK: Text edits

/** Where an ambiguous insertion or deletion most likely started. */
function getPreferredStart(
  delta: number,
  selectionBefore: EditorTextSelection | null,
  selectionAfter: EditorTextSelection | null
) {
  if (delta > 0) {
    if (selectionAfter && selectionAfter.from === selectionAfter.to) {
      return selectionAfter.from - delta
    }
    return selectionBefore ? selectionBefore.from : null
  }
  if (selectionAfter) return selectionAfter.from
  if (!selectionBefore) return null
  const isCaret = selectionBefore.from === selectionBefore.to
  // A caret deletion is most often Backspace, ending where the caret was.
  return isCaret ? selectionBefore.from + delta : selectionBefore.from
}

/**
 * The smallest replace turning `before` into `after`, both flat text. Where
 * several fit (typing "l" into "hello"), the selections place it. The edit
 * never starts or ends inside a character.
 */
function getTextEdit(
  before: string,
  after: string,
  selectionBefore: EditorTextSelection | null,
  selectionAfter: EditorTextSelection | null
): EditorTextEdit | null {
  if (before === after) return null
  const shortest = Math.min(before.length, after.length)
  let prefix = 0
  while (prefix < shortest && before[prefix] === after[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < shortest &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1
  }
  let from = prefix
  if (prefix + suffix > shortest) {
    const delta = after.length - before.length
    const lowest = shortest - suffix
    const preferred = getPreferredStart(delta, selectionBefore, selectionAfter)
    from = Math.min(Math.max(preferred ?? prefix, lowest), prefix)
    suffix = shortest - from
  }
  from = Math.min(snapToCharacter(before, from), snapToCharacter(after, from))
  const endBefore = snapUpToCharacter(before, before.length - suffix)
  const endAfter = snapUpToCharacter(after, after.length - suffix)
  const tail = Math.min(before.length - endBefore, after.length - endAfter)
  return {
    from,
    to: before.length - tail,
    text: after.slice(from, after.length - tail),
  }
}

export {
  getDeleteBoundary,
  getIndentOperations,
  getMarksAt,
  getSelectedBlockIndices,
  getSelectionRange,
  getTextEdit,
  getTypingAt,
  handleInput,
  isInclusiveMark,
  isListBlock,
  isPlainTextBlock,
  shiftListItems,
}
export type {
  EditorDeleteUnit,
  EditorInput,
  EditorInputOptions,
  EditorModifiers,
  EditorRange,
  EditorTextEdit,
  EditorTextSelection,
  EditorTyping,
}
