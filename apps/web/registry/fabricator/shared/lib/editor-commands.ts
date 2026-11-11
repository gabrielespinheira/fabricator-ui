// Commands drive every editor surface: the toolbar, the selection bar, the
// keyboard bar, the insert and block-type menus, and keyboard shortcuts. Each
// reads a small snapshot of the state to show itself and returns the next
// state when run.

import {
  getIndentOperations,
  getMarksAt,
  getSelectedBlockIndices,
  getSelectionRange,
  getTypingAt,
  isPlainTextBlock,
  shiftListItems,
} from "./editor-input"
import type { EditorKitRuntime } from "./editor-kit"
import {
  createBlock,
  createBlockId,
  fromFlatOffset,
  getBlockText,
  getIndentLimit,
  getRunsText,
  hasMark,
  isNestableBlock,
  isSameMark,
  isVoidBlock,
  sliceRuns,
  sortMarks,
  stableStringify,
  toFlatOffset,
  type EditorBlock,
  type EditorBlockType,
  type EditorDocument,
  type EditorInline,
  type EditorMark,
  type EditorPosition,
  type EditorSelection,
} from "./editor-model"
import { insertTable } from "./editor-table"
import {
  applyTransaction,
  canRedo,
  canUndo,
  createEditorDraft,
  createSelection,
  insertBlocks,
  redo,
  replaceRange,
  setBlock,
  setMarks,
  splitBlock,
  undo,
  type EditorAttrs,
  type EditorOperation,
  type EditorState,
} from "./editor-transaction"

type EditorCommandSurface =
  | "toolbar"
  | "bubble"
  | "keyboard-bar"
  | "insert"
  | "block-type"

type EditorCommandArgs = Readonly<
  Record<string, string | number | boolean | null>
>

type EditorCommandContext = {
  args?: EditorCommandArgs
  /** The transaction's time; commands never merge into typing, so 0 is fine. */
  now?: number
  kit?: EditorKitRuntime
  createId?: () => string
}

type EditorSnapshot = {
  /** Mark types on the whole selection, or what typing at the caret takes. */
  activeMarks: readonly string[]
  link: { href: string } | null
  /** Shared by every selected block, or null when they differ. */
  blockType: EditorBlockType | null
  headingLevel: number | null
  /** Every selected block is a checked task. */
  isChecked: boolean
  /** Indent or outdent would change the selected list items or paragraphs. */
  canIndent: boolean
  canOutdent: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  isCollapsed: boolean
  selectionText: string
}

type EditorCommand = {
  id: string
  label: string
  keywords?: readonly string[]
  group?: string
  /** Like "mod+shift+s"; see matchShortcut. */
  shortcut?: string
  /** The Markdown that does the same, shown in menus. */
  markdownShortcut?: string
  surfaces?: readonly EditorCommandSurface[]
  isActive?: (snapshot: EditorSnapshot) => boolean
  canRun?: (snapshot: EditorSnapshot) => boolean
  run: (
    state: EditorState,
    context?: EditorCommandContext
  ) => EditorState | null
}

type EditorPlatform = "apple" | "other"

type EditorKeyEvent = {
  key: string
  code: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

// MARK: Snapshot

function getSelectedBlocks(
  document: EditorDocument,
  selection: EditorSelection
) {
  const { fromIndex, toIndex } = getSelectedBlockIndices(document, selection)
  return document.blocks.slice(fromIndex, toIndex + 1)
}

/** Each text block's part of a range, leaving out code blocks. */
function getTextSegments(
  document: EditorDocument,
  from: EditorPosition,
  to: EditorPosition
) {
  const segments: { block: EditorBlock; start: number; end: number }[] = []
  const fromIndex = document.blocks.findIndex(
    (block) => block.id === from.blockId
  )
  const toIndex = document.blocks.findIndex((block) => block.id === to.blockId)
  for (let index = fromIndex; index <= toIndex; index += 1) {
    const block = document.blocks[index]
    if (!isPlainTextBlock(block)) continue
    const length = getRunsText(block.content).length
    const start = index === fromIndex ? from.offset : 0
    const end = index === toIndex ? to.offset : length
    if (start < end) segments.push({ block, start, end })
  }
  return segments
}

function getSegmentRuns(segment: {
  block: EditorBlock
  start: number
  end: number
}) {
  return sliceRuns(segment.block.content, segment.start, segment.end).filter(
    (run) => !run.raw
  )
}

function getSharedMarkTypes(runs: readonly EditorInline[]) {
  const [first, ...rest] = runs
  if (!first) return []
  return (first.marks ?? [])
    .map((mark) => mark.type)
    .filter((type) => rest.every((run) => hasMark(run, type)))
}

function getLinkMark(run: EditorInline | undefined) {
  return run?.marks?.find((mark) => mark.type === "link")
}

function getRunAt(runs: readonly EditorInline[], offset: number) {
  let start = 0
  for (const run of runs) {
    const end = start + run.text.length
    if (offset >= start && offset < end) return run
    start = end
  }
  return undefined
}

function toLink(mark: EditorMark | undefined) {
  return mark ? { href: mark.attrs?.href ?? "" } : null
}

function getCaretLink(document: EditorDocument, position: EditorPosition) {
  const block = document.blocks.find((item) => item.id === position.blockId)
  if (!block || isVoidBlock(block)) return null
  const before =
    position.offset > 0
      ? getRunAt(block.content, position.offset - 1)
      : undefined
  return toLink(
    getLinkMark(before) ?? getLinkMark(getRunAt(block.content, position.offset))
  )
}

function getSelectedText(
  document: EditorDocument,
  from: EditorPosition,
  to: EditorPosition
) {
  const fromIndex = document.blocks.findIndex(
    (block) => block.id === from.blockId
  )
  const toIndex = document.blocks.findIndex((block) => block.id === to.blockId)
  const parts: string[] = []
  for (let index = fromIndex; index <= toIndex; index += 1) {
    const block = document.blocks[index]
    if (isVoidBlock(block)) continue
    const text = getBlockText(block)
    const start = index === fromIndex ? from.offset : 0
    const end = index === toIndex ? to.offset : text.length
    parts.push(text.slice(start, end))
  }
  return parts.join("\n")
}

function getSharedValue<T>(values: readonly T[]) {
  const [first, ...rest] = values
  if (first === undefined) return null
  return rest.every((value) => value === first) ? first : null
}

function getEditorSnapshot(
  state: EditorState,
  kit?: EditorKitRuntime
): EditorSnapshot {
  const { document, selection } = state
  const history = { canUndo: canUndo(state), canRedo: canRedo(state) }
  if (!selection) {
    return {
      activeMarks: [],
      link: null,
      blockType: null,
      headingLevel: null,
      isChecked: false,
      canIndent: false,
      canOutdent: false,
      ...history,
      hasSelection: false,
      isCollapsed: true,
      selectionText: "",
    }
  }
  const range = getSelectionRange(document, selection)
  const blocks = getSelectedBlocks(document, selection)
  const { fromIndex, toIndex } = getSelectedBlockIndices(document, selection)
  const canShift = (delta: 1 | -1) =>
    getIndentOperations(document, fromIndex, toIndex, delta).length > 0
  const blockType = getSharedValue(blocks.map((block) => block.type))
  const level = getSharedValue(blocks.map((block) => block.attrs.level))
  const segments = range.isCollapsed
    ? []
    : getTextSegments(document, range.from, range.to)
  const runs = segments.flatMap(getSegmentRuns)
  return {
    activeMarks: range.isCollapsed
      ? getMarksAt(state, range.from, kit).map((mark) => mark.type)
      : getSharedMarkTypes(runs),
    link: range.isCollapsed
      ? getCaretLink(document, range.from)
      : toLink(getLinkMark(runs[0])),
    blockType,
    headingLevel:
      blockType === "heading" && typeof level === "number" ? level : null,
    isChecked:
      blockType === "task" &&
      blocks.every((block) => block.attrs.checked === true),
    canIndent: canShift(1),
    canOutdent: canShift(-1),
    ...history,
    hasSelection: true,
    isCollapsed: range.isCollapsed,
    selectionText: range.isCollapsed
      ? ""
      : getSelectedText(document, range.from, range.to),
  }
}

// MARK: Marks

function commitCommand(
  state: EditorState,
  operations: readonly EditorOperation[],
  context: EditorCommandContext | undefined,
  selectionAfter: EditorSelection | null = state.selection
) {
  return applyTransaction(state, {
    operations,
    selectionBefore: state.selection,
    selectionAfter,
    origin: "command",
    time: context?.now ?? 0,
  })
}

function getSegmentOperations(
  segments: readonly { block: EditorBlock; start: number; end: number }[],
  mark: EditorMark,
  on: boolean
) {
  return segments.map(({ block, start, end }) =>
    setMarks(
      { blockId: block.id, offset: start },
      { blockId: block.id, offset: end },
      mark,
      on
    )
  )
}

function toggleMark(type: string): EditorCommand["run"] {
  return (state, context) => {
    if (!state.selection) return null
    const range = getSelectionRange(state.document, state.selection)
    if (range.isCollapsed) {
      const block = state.document.blocks.find(
        (item) => item.id === range.from.blockId
      )
      if (!block || !isPlainTextBlock(block)) return null
      const marks = getMarksAt(state, range.from, context?.kit)
      const isActive = marks.some((mark) => mark.type === type)
      const storedMarks = isActive
        ? marks.filter((mark) => mark.type !== type)
        : (sortMarks([...marks, { type }]) ?? [])
      return applyTransaction(state, {
        operations: [],
        selectionBefore: state.selection,
        selectionAfter: state.selection,
        storedMarks,
        origin: "command",
        time: context?.now ?? 0,
      })
    }
    const segments = getTextSegments(state.document, range.from, range.to)
    if (segments.length === 0) return null
    const isActive = segments
      .flatMap(getSegmentRuns)
      .every((run) => hasMark(run, type))
    return commitCommand(
      state,
      getSegmentOperations(segments, { type }, !isActive),
      context
    )
  }
}

function isMarkActive(type: string) {
  return (snapshot: EditorSnapshot) => snapshot.activeMarks.includes(type)
}

/** The extent of the link touching a caret. */
function getLinkExtent(document: EditorDocument, position: EditorPosition) {
  const block = document.blocks.find((item) => item.id === position.blockId)
  if (!block || isVoidBlock(block)) return null
  const runs = block.content
  let start = 0
  const spans = runs.map((run) => {
    const span = { run, start, end: start + run.text.length }
    start = span.end
    return span
  })
  const touching =
    spans.find(
      (span) => position.offset > span.start && position.offset <= span.end
    ) ?? spans.find((span) => position.offset === span.start)
  const link = getLinkMark(touching?.run)
  if (!touching || !link) return null
  const sharesLink = (run: EditorInline) =>
    run.marks?.some((mark) => isSameMark(mark, link)) ?? false
  let first = spans.indexOf(touching)
  let last = first
  while (first > 0 && sharesLink(spans[first - 1].run)) first -= 1
  while (last < spans.length - 1 && sharesLink(spans[last + 1].run)) last += 1
  return { block, start: spans[first].start, end: spans[last].end }
}

function runLink(state: EditorState, context?: EditorCommandContext) {
  if (!state.selection) return null
  const { document } = state
  const range = getSelectionRange(document, state.selection)
  const href = context?.args?.href
  const segments = range.isCollapsed
    ? []
    : getTextSegments(document, range.from, range.to)
  const extent = range.isCollapsed ? getLinkExtent(document, range.from) : null
  const targets = extent ? [extent] : segments
  if (typeof href !== "string" || href === "") {
    const linked = targets.filter((segment) =>
      getSegmentRuns(segment).some((run) => hasMark(run, "link"))
    )
    if (linked.length === 0) return null
    return commitCommand(
      state,
      getSegmentOperations(linked, { type: "link" }, false),
      context
    )
  }
  const mark = { type: "link", attrs: { href } }
  if (targets.length > 0) {
    return commitCommand(
      state,
      getSegmentOperations(targets, mark, true),
      context
    )
  }
  if (!range.isCollapsed) return null
  const block = document.blocks.find((item) => item.id === range.from.blockId)
  if (!block || !isPlainTextBlock(block)) return null
  // No text to link: the address itself becomes the link's text.
  const typing = getTypingAt(document, range.from, context?.kit).marks.filter(
    (item) => item.type !== "link"
  )
  const content = [{ text: href, marks: sortMarks([...typing, mark]) }]
  const after = { blockId: block.id, offset: range.from.offset + href.length }
  return commitCommand(
    state,
    [replaceRange(range.from, range.from, content)],
    context,
    createSelection(after)
  )
}

// MARK: Blocks

function hasAttrs(block: EditorBlock, attrs: EditorAttrs) {
  return Object.entries(attrs).every(
    ([key, value]) =>
      stableStringify(block.attrs[key]) === stableStringify(value)
  )
}

/** Keeps the selection on the same characters after blocks merge into one. */
function mapSelection(
  before: EditorDocument,
  after: EditorDocument,
  selection: EditorSelection
): EditorSelection {
  return createSelection(
    fromFlatOffset(after, toFlatOffset(before, selection.anchor)),
    fromFlatOffset(after, toFlatOffset(before, selection.focus))
  )
}

function toCodeBlock(
  state: EditorState,
  targets: readonly { block: EditorBlock; index: number }[],
  context?: EditorCommandContext
) {
  const isContiguous = targets.every(
    (target, position) =>
      position === 0 || target.index === targets[position - 1].index + 1
  )
  const groups = isContiguous ? [targets] : targets.map((target) => [target])
  const draft = createEditorDraft(state.document)
  for (const group of groups) {
    const first = group[0].block
    const last = group[group.length - 1].block
    const text = group.map(({ block }) => getBlockText(block)).join("\n")
    // Code holds plain text: one block, no marks.
    draft.apply(
      replaceRange(
        { blockId: first.id, offset: 0 },
        { blockId: last.id, offset: getBlockText(last).length },
        [{ text }]
      )
    )
    draft.apply(setBlock(first.id, { type: "code", attrs: {}, indent: 0 }))
  }
  const selection =
    state.selection &&
    mapSelection(state.document, draft.getDocument(), state.selection)
  return commitCommand(state, draft.getOperations(), context, selection)
}

function setBlockType(
  type: EditorBlockType,
  attrs: EditorAttrs = {},
  matchAttrs: EditorAttrs = attrs
): EditorCommand["run"] {
  return (state, context) => {
    if (!state.selection) return null
    const { document } = state
    const { fromIndex, toIndex } = getSelectedBlockIndices(
      document,
      state.selection
    )
    const targets = document.blocks
      .map((block, index) => ({ block, index }))
      .slice(fromIndex, toIndex + 1)
      .filter(({ block }) => !isVoidBlock(block))
    if (targets.length === 0) return null
    const isActive = targets.every(
      ({ block }) => block.type === type && hasAttrs(block, matchAttrs)
    )
    const nextType = isActive && type !== "paragraph" ? "paragraph" : type
    const nextAttrs = nextType === type ? attrs : {}
    if (nextType === "code") return toCodeBlock(state, targets, context)
    const indents = document.blocks.map((block) => block.indent)
    const types = document.blocks.map((block) => block.type)
    const operations: EditorOperation[] = []
    for (const { block, index } of targets) {
      // List items and paragraphs keep their nesting where it stays valid.
      const maximum =
        index > 0
          ? getIndentLimit({
              type: types[index - 1],
              indent: indents[index - 1],
            })
          : 0
      const indent = isNestableBlock({ type: nextType })
        ? Math.min(block.indent, maximum)
        : 0
      const blockAttrs =
        block.type === nextType ? { ...block.attrs, ...nextAttrs } : nextAttrs
      indents[index] = indent
      types[index] = nextType
      const isSame =
        block.type === nextType &&
        indent === block.indent &&
        stableStringify(blockAttrs) === stableStringify(block.attrs)
      if (isSame) continue
      operations.push(
        setBlock(block.id, { type: nextType, attrs: blockAttrs, indent })
      )
    }
    if (operations.length === 0) return null
    return commitCommand(state, operations, context)
  }
}

function isBlockTypeActive(type: EditorBlockType, level?: number) {
  return (snapshot: EditorSnapshot) =>
    snapshot.blockType === type &&
    (level === undefined || snapshot.headingLevel === level)
}

function runToggleTask(state: EditorState, context?: EditorCommandContext) {
  if (!state.selection) return null
  const tasks = getSelectedBlocks(state.document, state.selection).filter(
    (block) => block.type === "task"
  )
  if (tasks.length === 0) return null
  const checked = !tasks.every((block) => block.attrs.checked === true)
  return commitCommand(
    state,
    tasks.map((block) =>
      setBlock(block.id, { attrs: { ...block.attrs, checked } })
    ),
    context
  )
}

function runDivider(state: EditorState, context?: EditorCommandContext) {
  if (!state.selection) return null
  const createId = context?.createId ?? createBlockId
  const { document } = state
  const caret = getSelectionRange(document, state.selection).to
  const index = document.blocks.findIndex((block) => block.id === caret.blockId)
  const block = document.blocks[index]
  const divider = createBlock({ id: createId(), type: "divider" })
  const draft = createEditorDraft(document)
  const isAtEnd =
    isVoidBlock(block) || caret.offset >= getBlockText(block).length
  if (caret.offset === 0 && !isVoidBlock(block)) {
    draft.apply(insertBlocks(index, [divider]))
    return commitCommand(
      state,
      draft.getOperations(),
      context,
      createSelection(caret)
    )
  }
  if (isAtEnd) {
    const paragraph = createBlock({ id: createId(), type: "paragraph" })
    draft.apply(insertBlocks(index + 1, [divider, paragraph]))
    const after = { blockId: paragraph.id, offset: 0 }
    return commitCommand(
      state,
      draft.getOperations(),
      context,
      createSelection(after)
    )
  }
  const tailId = createId()
  draft.apply(splitBlock(caret, tailId))
  draft.apply(insertBlocks(index + 1, [divider]))
  const after = { blockId: tailId, offset: 0 }
  return commitCommand(
    state,
    draft.getOperations(),
    context,
    createSelection(after)
  )
}

// MARK: Shortcuts

const NAMED_CODES: Readonly<Record<string, string>> = {
  period: "Period",
  comma: "Comma",
  slash: "Slash",
  backslash: "Backslash",
  semicolon: "Semicolon",
  quote: "Quote",
  minus: "Minus",
  equal: "Equal",
  bracketleft: "BracketLeft",
  bracketright: "BracketRight",
  backquote: "Backquote",
}

const NAMED_KEYS: Readonly<Record<string, string>> = {
  enter: "Enter",
  tab: "Tab",
  escape: "Escape",
  esc: "Escape",
  backspace: "Backspace",
  delete: "Delete",
  space: " ",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
}

function matchShortcutKey(event: EditorKeyEvent, key: string) {
  const expectedCode = /^[a-z]$/.test(key)
    ? `Key${key.toUpperCase()}`
    : /^[0-9]$/.test(key)
      ? `Digit${key}`
      : NAMED_CODES[key]
  if (expectedCode) {
    // Without a code (some native keyboards), the key is the best we have.
    if (event.code === "") return event.key.toLowerCase() === key
    return event.code === expectedCode
  }
  const expectedKey = NAMED_KEYS[key]
  if (!expectedKey) return false
  return event.key.toLowerCase() === expectedKey.toLowerCase()
}

/**
 * Whether a key event is `shortcut`, like "mod+shift+s". `mod` is Cmd on
 * Apple platforms and Ctrl elsewhere; letters and digits match by
 * `event.code`, so Option on a Mac or another layout's symbols don't matter.
 */
function matchShortcut(
  event: EditorKeyEvent,
  shortcut: string,
  platform: EditorPlatform
) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
  const key = parts.pop()
  if (!key) return false
  const wanted = { meta: false, ctrl: false, alt: false, shift: false }
  for (const part of parts) {
    if (part === "mod") {
      if (platform === "apple") wanted.meta = true
      else wanted.ctrl = true
    } else if (part === "cmd" || part === "meta") wanted.meta = true
    else if (part === "ctrl" || part === "control") wanted.ctrl = true
    else if (part === "alt" || part === "option") wanted.alt = true
    else if (part === "shift") wanted.shift = true
    else return false
  }
  if (
    event.metaKey !== wanted.meta ||
    event.ctrlKey !== wanted.ctrl ||
    event.altKey !== wanted.alt ||
    event.shiftKey !== wanted.shift
  ) {
    return false
  }
  return matchShortcutKey(event, key)
}

function findShortcutCommand(
  kit: EditorKitRuntime,
  event: EditorKeyEvent,
  platform: EditorPlatform
) {
  for (const binding of kit.shortcuts) {
    if (binding.platform && binding.platform !== platform) continue
    if (matchShortcut(event, binding.shortcut, platform)) {
      return kit.getCommand(binding.command)
    }
  }
  return undefined
}

// MARK: Starter commands

const canFormat = (snapshot: EditorSnapshot) =>
  snapshot.hasSelection && snapshot.blockType !== "code"

const MARK_SURFACES: readonly EditorCommandSurface[] = [
  "toolbar",
  "bubble",
  "keyboard-bar",
]

function createMarkCommand(
  id: string,
  label: string,
  shortcut: string,
  markdownShortcut: string
): EditorCommand {
  return {
    id,
    label,
    group: "marks",
    shortcut,
    markdownShortcut,
    surfaces: MARK_SURFACES,
    isActive: isMarkActive(id),
    canRun: canFormat,
    run: toggleMark(id),
  }
}

function createBlockCommand(command: {
  id: string
  label: string
  type: EditorBlockType
  attrs?: EditorAttrs
  matchAttrs?: EditorAttrs
  level?: number
  shortcut: string
  markdownShortcut?: string
  surfaces: readonly EditorCommandSurface[]
  group?: string
}): EditorCommand {
  return {
    id: command.id,
    label: command.label,
    group: command.group ?? "blocks",
    shortcut: command.shortcut,
    ...(command.markdownShortcut
      ? { markdownShortcut: command.markdownShortcut }
      : {}),
    surfaces: command.surfaces,
    isActive: isBlockTypeActive(command.type, command.level),
    canRun: (snapshot) => snapshot.hasSelection,
    run: setBlockType(command.type, command.attrs, command.matchAttrs),
  }
}

const LIST_SURFACES: readonly EditorCommandSurface[] = [
  "toolbar",
  "keyboard-bar",
  "block-type",
]

const starterCommands: readonly EditorCommand[] = [
  createMarkCommand("bold", "Bold", "mod+b", "**text**"),
  createMarkCommand("italic", "Italic", "mod+i", "*text*"),
  createMarkCommand("strike", "Strikethrough", "mod+shift+s", "~~text~~"),
  createMarkCommand("code", "Inline code", "mod+e", "`code`"),
  {
    id: "link",
    label: "Link",
    group: "marks",
    shortcut: "mod+k",
    markdownShortcut: "[text](url)",
    surfaces: MARK_SURFACES,
    isActive: (snapshot) => snapshot.link !== null,
    canRun: canFormat,
    run: runLink,
  },
  createBlockCommand({
    id: "paragraph",
    label: "Text",
    type: "paragraph",
    shortcut: "mod+alt+0",
    surfaces: ["block-type"],
  }),
  ...[1, 2, 3, 4, 5, 6].map((level) =>
    createBlockCommand({
      id: `heading-${level}`,
      label: `Heading ${level}`,
      type: "heading",
      attrs: { level },
      level,
      shortcut: `mod+alt+${level}`,
      markdownShortcut: `${"#".repeat(level)} `,
      surfaces: ["block-type"],
    })
  ),
  createBlockCommand({
    id: "bulleted",
    label: "Bulleted list",
    type: "bulleted",
    shortcut: "mod+shift+8",
    markdownShortcut: "- ",
    surfaces: LIST_SURFACES,
    group: "lists",
  }),
  createBlockCommand({
    id: "numbered",
    label: "Numbered list",
    type: "numbered",
    shortcut: "mod+shift+7",
    markdownShortcut: "1. ",
    surfaces: LIST_SURFACES,
    group: "lists",
  }),
  createBlockCommand({
    id: "task",
    label: "Task list",
    type: "task",
    attrs: { checked: false },
    matchAttrs: {},
    shortcut: "mod+shift+9",
    markdownShortcut: "[] ",
    surfaces: LIST_SURFACES,
    group: "lists",
  }),
  {
    id: "toggle-task",
    label: "Done",
    group: "lists",
    isActive: (snapshot) => snapshot.isChecked,
    canRun: (snapshot) => snapshot.blockType === "task",
    run: runToggleTask,
  },
  createBlockCommand({
    id: "quote",
    label: "Quote",
    type: "quote",
    shortcut: "mod+shift+period",
    markdownShortcut: "> ",
    surfaces: ["block-type"],
  }),
  createBlockCommand({
    id: "code-block",
    label: "Code block",
    type: "code",
    matchAttrs: {},
    shortcut: "mod+alt+c",
    markdownShortcut: "```",
    surfaces: ["block-type", "insert"],
  }),
  {
    id: "divider",
    label: "Divider",
    group: "insert",
    markdownShortcut: "---",
    surfaces: ["insert"],
    canRun: (snapshot) => snapshot.hasSelection,
    run: runDivider,
  },
  {
    id: "table",
    label: "Table",
    group: "insert",
    surfaces: ["toolbar", "insert", "keyboard-bar"],
    canRun: (snapshot) => snapshot.hasSelection,
    run: (state, context) =>
      insertTable(state, context?.now ?? Date.now(), context?.createId),
  },
  {
    id: "indent",
    label: "Indent",
    group: "lists",
    surfaces: ["toolbar", "keyboard-bar"],
    canRun: (snapshot) => snapshot.canIndent,
    run: (state, context) =>
      shiftListItems(state, 1, { now: context?.now ?? 0 }),
  },
  {
    id: "outdent",
    label: "Outdent",
    group: "lists",
    surfaces: ["toolbar", "keyboard-bar"],
    canRun: (snapshot) => snapshot.canOutdent,
    run: (state, context) =>
      shiftListItems(state, -1, { now: context?.now ?? 0 }),
  },
  {
    id: "undo",
    label: "Undo",
    group: "history",
    shortcut: "mod+z",
    surfaces: ["toolbar", "keyboard-bar"],
    canRun: (snapshot) => snapshot.canUndo,
    run: (state) => (canUndo(state) ? undo(state) : null),
  },
  {
    id: "redo",
    label: "Redo",
    group: "history",
    shortcut: "mod+shift+z",
    surfaces: ["toolbar", "keyboard-bar"],
    canRun: (snapshot) => snapshot.canRedo,
    run: (state) => (canRedo(state) ? redo(state) : null),
  },
]

export {
  findShortcutCommand,
  getEditorSnapshot,
  isBlockTypeActive,
  isMarkActive,
  matchShortcut,
  setBlockType,
  starterCommands,
  toggleMark,
}
export type {
  EditorCommand,
  EditorCommandArgs,
  EditorCommandContext,
  EditorCommandSurface,
  EditorKeyEvent,
  EditorPlatform,
  EditorSnapshot,
}
