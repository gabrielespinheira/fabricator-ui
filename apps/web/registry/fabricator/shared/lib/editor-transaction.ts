// Operations on an EditorDocument, the transactions that carry them and the
// undo history. Every operation is a plain object (serialisable), applies
// purely, and has an inverse computed against the document it applies to.
// Blocks an operation doesn't touch keep their identity, so a view re-renders
// only the blocks that changed; a changed block keeps its `source`, which the
// serializer compares by fingerprint.

import {
  createBlock,
  createBlockId,
  getBlockIndex,
  getRunsText,
  isVoidBlock,
  normalizeIndents,
  normalizeRuns,
  sliceRuns,
  stableStringify,
  type EditorBlock,
  type EditorBlockType,
  type EditorDocument,
  type EditorInline,
  type EditorJson,
  type EditorMark,
  type EditorPosition,
  type EditorSelection,
} from "./editor-model"

type EditorAttrs = Readonly<Record<string, EditorJson>>

type EditorBlockChanges = {
  type?: EditorBlockType
  /** Replaces the attrs; callers merge when they mean to keep some. */
  attrs?: EditorAttrs
  indent?: number
}

type EditorOperation =
  | {
      kind: "replaceRange"
      from: EditorPosition
      to: EditorPosition
      content: readonly EditorInline[]
    }
  | {
      kind: "setMarks"
      from: EditorPosition
      to: EditorPosition
      mark: EditorMark
      on: boolean
    }
  | {
      kind: "splitBlock"
      position: EditorPosition
      newBlockId: string
      newType?: EditorBlockType
      newAttrs?: EditorAttrs
    }
  | { kind: "joinBlocks"; firstId: string; secondId: string }
  | { kind: "setBlock"; id: string; changes: EditorBlockChanges }
  | { kind: "insertBlocks"; index: number; blocks: readonly EditorBlock[] }
  | { kind: "removeBlocks"; index: number; count: number }
  | { kind: "setFrontmatter"; frontmatter: string | null }

type EditorOrigin = "input" | "command" | "paste" | "rule" | "ai" | "history"

type EditorTransaction = {
  operations: readonly EditorOperation[]
  selectionBefore: EditorSelection | null
  selectionAfter: EditorSelection | null
  /** Marks for the next typed text. Left out, the state's stored marks clear. */
  storedMarks?: readonly EditorMark[] | null
  origin: EditorOrigin
  time: number
}

type EditorHistoryStep = {
  /** The step's transactions merged into one. */
  transaction: EditorTransaction
  /** Undoes the step, in order. */
  inverse: readonly EditorOperation[]
  /** The block typing in this step stays in, or null when it can't grow. */
  group: string | null
}

type EditorHistory = {
  undo: readonly EditorHistoryStep[]
  redo: readonly EditorHistoryStep[]
}

type EditorState = {
  document: EditorDocument
  selection: EditorSelection | null
  storedMarks: readonly EditorMark[] | null
  history: EditorHistory
}

type EditorDraft = {
  getDocument: () => EditorDocument
  getOperations: () => readonly EditorOperation[]
  apply: (operation: EditorOperation) => EditorDocument
}

const HISTORY_DEPTH = 200
const TYPING_PAUSE = 500

class EditorOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EditorOperationError"
  }
}

// MARK: Operation creators

function replaceRange(
  from: EditorPosition,
  to: EditorPosition,
  content: readonly EditorInline[] = []
): EditorOperation {
  return { kind: "replaceRange", from, to, content }
}

function setMarks(
  from: EditorPosition,
  to: EditorPosition,
  mark: EditorMark,
  on: boolean
): EditorOperation {
  return { kind: "setMarks", from, to, mark, on }
}

function splitBlock(
  position: EditorPosition,
  newBlockId: string,
  newType?: EditorBlockType,
  newAttrs?: EditorAttrs
): EditorOperation {
  return {
    kind: "splitBlock",
    position,
    newBlockId,
    ...(newType === undefined ? {} : { newType }),
    ...(newAttrs === undefined ? {} : { newAttrs }),
  }
}

function joinBlocks(firstId: string, secondId: string): EditorOperation {
  return { kind: "joinBlocks", firstId, secondId }
}

function setBlock(id: string, changes: EditorBlockChanges): EditorOperation {
  return { kind: "setBlock", id, changes }
}

function insertBlocks(
  index: number,
  blocks: readonly EditorBlock[]
): EditorOperation {
  return { kind: "insertBlocks", index, blocks }
}

function removeBlocks(index: number, count: number): EditorOperation {
  return { kind: "removeBlocks", index, count }
}

function setFrontmatter(frontmatter: string | null): EditorOperation {
  return { kind: "setFrontmatter", frontmatter }
}

// MARK: Helpers

function requireBlockIndex(document: EditorDocument, id: string) {
  const index = getBlockIndex(document, id)
  if (index === -1) throw new EditorOperationError(`No block "${id}".`)
  return index
}

function requireTextBlock(document: EditorDocument, id: string) {
  const index = requireBlockIndex(document, id)
  const block = document.blocks[index]
  if (isVoidBlock(block)) {
    throw new EditorOperationError(`Block "${id}" is void and holds no text.`)
  }
  return { index, block }
}

function getTextLength(block: EditorBlock) {
  return getRunsText(block.content).length
}

function clampOffset(block: EditorBlock, offset: number) {
  return Math.min(Math.max(offset, 0), getTextLength(block))
}

function hasSameRuns(a: readonly EditorInline[], b: readonly EditorInline[]) {
  return stableStringify(a) === stableStringify(b)
}

function normalizeBlock(block: EditorBlock): EditorBlock {
  const content = normalizeRuns(block.content)
  return hasSameRuns(content, block.content) ? block : { ...block, content }
}

function spliceBlocks(
  document: EditorDocument,
  index: number,
  count: number,
  blocks: readonly EditorBlock[]
): EditorDocument {
  const next = [...document.blocks]
  next.splice(index, count, ...blocks)
  return { ...document, blocks: next }
}

function getRangeIndices(
  document: EditorDocument,
  from: EditorPosition,
  to: EditorPosition
) {
  const fromIndex = requireBlockIndex(document, from.blockId)
  const toIndex = requireBlockIndex(document, to.blockId)
  if (
    toIndex < fromIndex ||
    (toIndex === fromIndex && to.offset < from.offset)
  ) {
    throw new EditorOperationError("A range must not end before it starts.")
  }
  return { fromIndex, toIndex }
}

/** The part of each text block a range covers, for marking. */
function getMarkedRanges(
  document: EditorDocument,
  from: EditorPosition,
  to: EditorPosition
) {
  const { fromIndex, toIndex } = getRangeIndices(document, from, to)
  const ranges: { index: number; start: number; end: number }[] = []
  for (let index = fromIndex; index <= toIndex; index += 1) {
    const block = document.blocks[index]
    if (isVoidBlock(block)) continue
    const start = index === fromIndex ? clampOffset(block, from.offset) : 0
    const end =
      index === toIndex ? clampOffset(block, to.offset) : getTextLength(block)
    if (start < end) ranges.push({ index, start, end })
  }
  return ranges
}

function markRun(run: EditorInline, mark: EditorMark, on: boolean) {
  if (run.raw) return run
  const others = (run.marks ?? []).filter((item) => item.type !== mark.type)
  return { ...run, marks: on ? [...others, mark] : others }
}

// MARK: Apply

function applyReplaceRange(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "replaceRange" }>
) {
  const { fromIndex, toIndex } = getRangeIndices(
    document,
    operation.from,
    operation.to
  )
  const first = document.blocks[fromIndex]
  const last = document.blocks[toIndex]
  if (isVoidBlock(first) || isVoidBlock(last)) {
    throw new EditorOperationError(
      "A text range can't start or end in a void block."
    )
  }
  const from = clampOffset(first, operation.from.offset)
  const to = clampOffset(last, operation.to.offset)
  if (fromIndex === toIndex && from === to && operation.content.length === 0) {
    return document
  }
  const content = normalizeRuns([
    ...sliceRuns(first.content, 0, from),
    ...operation.content,
    ...sliceRuns(last.content, to, getTextLength(last)),
  ])
  return spliceBlocks(document, fromIndex, toIndex - fromIndex + 1, [
    { ...first, content },
  ])
}

function applySetMarks(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "setMarks" }>
) {
  const blocks = [...document.blocks]
  let isChanged = false
  for (const { index, start, end } of getMarkedRanges(
    document,
    operation.from,
    operation.to
  )) {
    const block = blocks[index]
    const content = normalizeRuns([
      ...sliceRuns(block.content, 0, start),
      ...sliceRuns(block.content, start, end).map((run) =>
        markRun(run, operation.mark, operation.on)
      ),
      ...sliceRuns(block.content, end, getTextLength(block)),
    ])
    if (hasSameRuns(content, block.content)) continue
    blocks[index] = { ...block, content }
    isChanged = true
  }
  return isChanged ? { ...document, blocks } : document
}

function applySplitBlock(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "splitBlock" }>
) {
  const { index, block } = requireTextBlock(
    document,
    operation.position.blockId
  )
  if (getBlockIndex(document, operation.newBlockId) !== -1) {
    throw new EditorOperationError(`Block "${operation.newBlockId}" exists.`)
  }
  const offset = clampOffset(block, operation.position.offset)
  const second: EditorBlock = {
    id: operation.newBlockId,
    type: operation.newType ?? block.type,
    indent: block.indent,
    content: sliceRuns(block.content, offset, getTextLength(block)),
    attrs: operation.newAttrs ?? block.attrs,
  }
  return spliceBlocks(document, index, 1, [
    { ...block, content: sliceRuns(block.content, 0, offset) },
    second,
  ])
}

function applyJoinBlocks(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "joinBlocks" }>
) {
  const { index, block } = requireTextBlock(document, operation.firstId)
  const second = document.blocks.at(index + 1)
  if (!second || second.id !== operation.secondId) {
    throw new EditorOperationError("Only neighbouring blocks join.")
  }
  const content = normalizeRuns([...block.content, ...second.content])
  return spliceBlocks(document, index, 2, [{ ...block, content }])
}

function applySetBlock(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "setBlock" }>
) {
  const index = requireBlockIndex(document, operation.id)
  const block = document.blocks[index]
  const { type, attrs, indent } = operation.changes
  const next: EditorBlock = {
    ...block,
    ...(type === undefined ? {} : { type }),
    ...(attrs === undefined ? {} : { attrs }),
    ...(indent === undefined ? {} : { indent }),
  }
  if (isVoidBlock(next) && next.content.length > 0) {
    throw new EditorOperationError("A block with text can't become void.")
  }
  return spliceBlocks(document, index, 1, [next])
}

function applyInsertBlocks(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "insertBlocks" }>
) {
  if (operation.index < 0 || operation.index > document.blocks.length) {
    throw new EditorOperationError("Blocks insert inside the document.")
  }
  const ids = new Set(document.blocks.map((block) => block.id))
  for (const block of operation.blocks) {
    if (ids.has(block.id)) {
      throw new EditorOperationError(`Block "${block.id}" exists.`)
    }
    ids.add(block.id)
  }
  return spliceBlocks(
    document,
    operation.index,
    0,
    operation.blocks.map(normalizeBlock)
  )
}

function applyRemoveBlocks(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "removeBlocks" }>
) {
  if (
    operation.index < 0 ||
    operation.count < 0 ||
    operation.index + operation.count > document.blocks.length
  ) {
    throw new EditorOperationError("Removed blocks must exist.")
  }
  return spliceBlocks(document, operation.index, operation.count, [])
}

function applyOperation(
  document: EditorDocument,
  operation: EditorOperation
): EditorDocument {
  switch (operation.kind) {
    case "replaceRange":
      return applyReplaceRange(document, operation)
    case "setMarks":
      return applySetMarks(document, operation)
    case "splitBlock":
      return applySplitBlock(document, operation)
    case "joinBlocks":
      return applyJoinBlocks(document, operation)
    case "setBlock":
      return applySetBlock(document, operation)
    case "insertBlocks":
      return applyInsertBlocks(document, operation)
    case "removeBlocks":
      return applyRemoveBlocks(document, operation)
    case "setFrontmatter":
      return { ...document, frontmatter: operation.frontmatter }
  }
}

// MARK: Invert

function invertReplaceRange(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "replaceRange" }>
): EditorOperation[] {
  const { fromIndex, toIndex } = getRangeIndices(
    document,
    operation.from,
    operation.to
  )
  if (fromIndex !== toIndex) {
    return [
      removeBlocks(fromIndex, 1),
      insertBlocks(fromIndex, document.blocks.slice(fromIndex, toIndex + 1)),
    ]
  }
  const block = document.blocks[fromIndex]
  const from = clampOffset(block, operation.from.offset)
  const to = clampOffset(block, operation.to.offset)
  const inserted = getRunsText(operation.content).length
  return [
    replaceRange(
      { blockId: block.id, offset: from },
      { blockId: block.id, offset: from + inserted },
      sliceRuns(block.content, from, to)
    ),
  ]
}

function invertSetMarks(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "setMarks" }>
): EditorOperation[] {
  return getMarkedRanges(document, operation.from, operation.to).map(
    ({ index, start, end }) => {
      const block = document.blocks[index]
      return replaceRange(
        { blockId: block.id, offset: start },
        { blockId: block.id, offset: end },
        sliceRuns(block.content, start, end)
      )
    }
  )
}

function invertJoinBlocks(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "joinBlocks" }>
): EditorOperation[] {
  const { index, block } = requireTextBlock(document, operation.firstId)
  const second = document.blocks.at(index + 1)
  if (!second || second.id !== operation.secondId) {
    throw new EditorOperationError("Only neighbouring blocks join.")
  }
  const length = getTextLength(block)
  return [
    replaceRange(
      { blockId: block.id, offset: length },
      { blockId: block.id, offset: length + getTextLength(second) }
    ),
    insertBlocks(index + 1, [second]),
  ]
}

function invertSetBlock(
  document: EditorDocument,
  operation: Extract<EditorOperation, { kind: "setBlock" }>
): EditorOperation[] {
  const block = document.blocks[requireBlockIndex(document, operation.id)]
  const { changes } = operation
  return [
    setBlock(block.id, {
      ...(changes.type === undefined ? {} : { type: block.type }),
      ...(changes.attrs === undefined ? {} : { attrs: block.attrs }),
      ...(changes.indent === undefined ? {} : { indent: block.indent }),
    }),
  ]
}

/** Operations that undo `operation`, computed against the document it applies to. */
function invertOperation(
  document: EditorDocument,
  operation: EditorOperation
): EditorOperation[] {
  switch (operation.kind) {
    case "replaceRange":
      return invertReplaceRange(document, operation)
    case "setMarks":
      return invertSetMarks(document, operation)
    case "splitBlock":
      return [joinBlocks(operation.position.blockId, operation.newBlockId)]
    case "joinBlocks":
      return invertJoinBlocks(document, operation)
    case "setBlock":
      return invertSetBlock(document, operation)
    case "insertBlocks":
      return [removeBlocks(operation.index, operation.blocks.length)]
    case "removeBlocks":
      return [
        insertBlocks(
          operation.index,
          document.blocks.slice(
            operation.index,
            operation.index + operation.count
          )
        ),
      ]
    case "setFrontmatter":
      return [setFrontmatter(document.frontmatter)]
  }
}

function applyOperations(
  document: EditorDocument,
  operations: readonly EditorOperation[]
) {
  return operations.reduce(applyOperation, document)
}

/** Applies operations one by one, so a transaction can be built from what each left. */
function createEditorDraft(document: EditorDocument): EditorDraft {
  let current = document
  const operations: EditorOperation[] = []
  return {
    getDocument: () => current,
    getOperations: () => operations,
    apply(operation) {
      current = applyOperation(current, operation)
      operations.push(operation)
      return current
    },
  }
}

// MARK: Selection

function isSamePosition(a: EditorPosition, b: EditorPosition) {
  return a.blockId === b.blockId && a.offset === b.offset
}

function isSameSelection(a: EditorSelection | null, b: EditorSelection | null) {
  if (!a || !b) return a === b
  return isSamePosition(a.anchor, b.anchor) && isSamePosition(a.focus, b.focus)
}

function createSelection(
  anchor: EditorPosition,
  focus: EditorPosition = anchor
): EditorSelection {
  return { anchor, focus }
}

// MARK: State and history

function createEditorState(
  document: EditorDocument,
  selection: EditorSelection | null = null
): EditorState {
  const blocks =
    document.blocks.length > 0
      ? document.blocks.map(normalizeBlock)
      : [createBlock({ type: "paragraph" })]
  const isChanged =
    blocks.length !== document.blocks.length ||
    blocks.some((block, index) => block !== document.blocks[index])
  return {
    document: isChanged ? { ...document, blocks } : document,
    selection,
    storedMarks: null,
    history: { undo: [], redo: [] },
  }
}

/** The block a typing transaction stays in, or null when it can't merge. */
function getTypingGroup(transaction: EditorTransaction) {
  if (transaction.origin !== "input") return null
  const blockId = transaction.selectionAfter?.focus.blockId
  if (!blockId || transaction.operations.length === 0) return null
  const staysInBlock = transaction.operations.every(
    (operation) =>
      operation.kind === "replaceRange" &&
      operation.from.blockId === blockId &&
      operation.to.blockId === blockId
  )
  return staysInBlock ? blockId : null
}

function isSpaceInsertion(transaction: EditorTransaction) {
  if (transaction.operations.length !== 1) return false
  const [operation] = transaction.operations
  return (
    operation.kind === "replaceRange" &&
    isSamePosition(operation.from, operation.to) &&
    /^[^\S\n]+$/u.test(getRunsText(operation.content))
  )
}

function shouldMergeStep(
  step: EditorHistoryStep,
  transaction: EditorTransaction,
  group: string | null
) {
  if (group === null || step.group !== group) return false
  if (
    !isSameSelection(
      transaction.selectionBefore,
      step.transaction.selectionAfter
    )
  ) {
    return false
  }
  // A word and the space typed after it undo together, however long the pause.
  return (
    transaction.time - step.transaction.time < TYPING_PAUSE ||
    isSpaceInsertion(transaction)
  )
}

function recordHistory(
  history: EditorHistory,
  transaction: EditorTransaction,
  inverse: readonly EditorOperation[]
): EditorHistory {
  if (transaction.operations.length === 0 || transaction.origin === "history") {
    return history
  }
  const group = getTypingGroup(transaction)
  const last = history.undo.at(-1)
  if (last && shouldMergeStep(last, transaction, group)) {
    const merged: EditorHistoryStep = {
      transaction: {
        ...last.transaction,
        operations: [...last.transaction.operations, ...transaction.operations],
        selectionAfter: transaction.selectionAfter,
        time: transaction.time,
      },
      inverse: [...inverse, ...last.inverse],
      group,
    }
    return { undo: [...history.undo.slice(0, -1), merged], redo: [] }
  }
  const step: EditorHistoryStep = { transaction, inverse, group }
  return { undo: [...history.undo, step].slice(-HISTORY_DEPTH), redo: [] }
}

/** Whether an operation can change which blocks there are, or their kind. */
function isStructural(operation: EditorOperation) {
  if (operation.kind === "setMarks" || operation.kind === "setFrontmatter") {
    return false
  }
  if (operation.kind !== "replaceRange") return true
  return operation.from.blockId !== operation.to.blockId
}

/** The setBlock operations that bring every indent back within the model. */
function getIndentRepairs(document: EditorDocument): EditorOperation[] {
  const blocks = normalizeIndents(document.blocks)
  if (blocks === document.blocks) return []
  return blocks.flatMap((block, index) =>
    block === document.blocks[index]
      ? []
      : [setBlock(block.id, { indent: block.indent })]
  )
}

function applyTransaction(
  state: EditorState,
  transaction: EditorTransaction
): EditorState {
  let document = state.document
  const inverses: EditorOperation[][] = []
  let operations = transaction.operations
  for (const operation of operations) {
    inverses.push(invertOperation(document, operation))
    document = applyOperation(document, operation)
  }
  // A paragraph whose list item went away moves out to where it can stay.
  if (operations.some(isStructural)) {
    const repairs = getIndentRepairs(document)
    for (const operation of repairs) {
      inverses.push(invertOperation(document, operation))
      document = applyOperation(document, operation)
    }
    if (repairs.length > 0) operations = [...operations, ...repairs]
  }
  // A document always holds a block, so a caret has somewhere to be.
  if (document.blocks.length === 0) {
    const operation = insertBlocks(0, [
      createBlock({ id: createBlockId(), type: "paragraph" }),
    ])
    inverses.push(invertOperation(document, operation))
    document = applyOperation(document, operation)
    operations = [...operations, operation]
  }
  const recorded =
    operations === transaction.operations
      ? transaction
      : { ...transaction, operations }
  return {
    document,
    selection: transaction.selectionAfter,
    storedMarks: transaction.storedMarks ?? null,
    history: recordHistory(state.history, recorded, inverses.reverse().flat()),
  }
}

function canUndo(state: EditorState) {
  return state.history.undo.length > 0
}

function canRedo(state: EditorState) {
  return state.history.redo.length > 0
}

function undo(state: EditorState): EditorState {
  const step = state.history.undo.at(-1)
  if (!step) return state
  return {
    document: applyOperations(state.document, step.inverse),
    selection: step.transaction.selectionBefore,
    storedMarks: null,
    history: {
      undo: state.history.undo.slice(0, -1),
      redo: [...state.history.redo, step],
    },
  }
}

function redo(state: EditorState): EditorState {
  const step = state.history.redo.at(-1)
  if (!step) return state
  // A redone step never merges with typing that follows it.
  const redone: EditorHistoryStep = { ...step, group: null }
  return {
    document: applyOperations(state.document, step.transaction.operations),
    selection: step.transaction.selectionAfter,
    storedMarks: null,
    history: {
      undo: [...state.history.undo, redone],
      redo: state.history.redo.slice(0, -1),
    },
  }
}

export {
  EditorOperationError,
  HISTORY_DEPTH,
  TYPING_PAUSE,
  applyOperation,
  applyOperations,
  applyTransaction,
  canRedo,
  canUndo,
  createEditorDraft,
  createEditorState,
  createSelection,
  getIndentRepairs,
  insertBlocks,
  invertOperation,
  isSamePosition,
  isSameSelection,
  joinBlocks,
  redo,
  removeBlocks,
  replaceRange,
  setBlock,
  setFrontmatter,
  setMarks,
  splitBlock,
  undo,
}
export type {
  EditorAttrs,
  EditorBlockChanges,
  EditorDraft,
  EditorHistory,
  EditorHistoryStep,
  EditorOperation,
  EditorOrigin,
  EditorState,
  EditorTransaction,
}
