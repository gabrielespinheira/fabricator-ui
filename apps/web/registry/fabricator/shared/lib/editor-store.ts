// One store per editor. Surfaces dispatch inputs, toolbars run commands, and
// views read through selectors, so a block re-renders only when its object
// changes (operations keep untouched blocks' identity).

import { useCallback, useMemo, useSyncExternalStore } from "react"

import {
  findShortcutCommand,
  getEditorSnapshot,
  type EditorCommandArgs,
  type EditorKeyEvent,
  type EditorPlatform,
  type EditorSnapshot,
} from "./editor-commands"
import { handleInput, type EditorInput } from "./editor-input"
import type { EditorKitRuntime } from "./editor-kit"
import {
  fromFlatOffset,
  getBlockIndex,
  toFlatOffset,
  type EditorBlock,
  type EditorDocument,
  type EditorSelection,
} from "./editor-model"
import { createEditorState, type EditorState } from "./editor-transaction"

type EditorStoreOptions = {
  state: EditorState
  kit: EditorKitRuntime
  platform?: EditorPlatform
  /** The clock transactions are stamped with. */
  now?: () => number
  createId?: () => string
}

type EditorStore = {
  kit: EditorKitRuntime
  platform: EditorPlatform
  getState: () => EditorState
  /** Returns whether the input was handled, so a surface knows to cancel the event. */
  dispatch: (input: EditorInput) => boolean
  /** Returns whether the command ran. */
  runCommand: (id: string, args?: EditorCommandArgs) => boolean
  /**
   * Applies an update made outside the input and command paths (a table's
   * grid editor saving). Returns whether the state changed.
   */
  apply: (
    update: (state: EditorState, now: number) => EditorState | null
  ) => boolean
  /** Replaces the document without an undo step, clearing history. */
  setDocument: (document: EditorDocument) => void
  subscribe: (listener: () => void) => () => void
}

function getKeyCode(key: string) {
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`
  if (/^[0-9]$/.test(key)) return `Digit${key}`
  if (key === ".") return "Period"
  return ""
}

function toKeyEvent(
  input: Extract<EditorInput, { kind: "key" }>
): EditorKeyEvent {
  return {
    key: input.key,
    code: input.code ?? getKeyCode(input.key),
    ...input.modifiers,
  }
}

/** The selection on a new document, if both its blocks are still there. */
function keepSelection(
  document: EditorDocument,
  selection: EditorSelection | null
): EditorSelection | null {
  if (!selection) return null
  const { anchor, focus } = selection
  if (getBlockIndex(document, anchor.blockId) === -1) return null
  if (getBlockIndex(document, focus.blockId) === -1) return null
  return {
    anchor: fromFlatOffset(document, toFlatOffset(document, anchor)),
    focus: fromFlatOffset(document, toFlatOffset(document, focus)),
  }
}

function createEditorStore(options: EditorStoreOptions): EditorStore {
  const { kit } = options
  const platform = options.platform ?? "other"
  const now = options.now ?? Date.now
  const listeners = new Set<() => void>()
  let state = options.state

  function setState(next: EditorState) {
    if (next === state) return false
    state = next
    for (const listener of listeners) listener()
    return true
  }

  function runCommand(id: string, args?: EditorCommandArgs) {
    const command = kit.getCommand(id)
    if (!command) return false
    if (command.canRun && !command.canRun(getEditorSnapshot(state, kit)))
      return false
    const next = command.run(state, {
      ...(args ? { args } : {}),
      now: now(),
      kit,
      ...(options.createId ? { createId: options.createId } : {}),
    })
    return next ? setState(next) : false
  }

  function dispatch(input: EditorInput) {
    if (input.kind === "key") {
      const command = findShortcutCommand(kit, toKeyEvent(input), platform)
      if (command) {
        runCommand(command.id)
        return true
      }
    }
    return setState(
      handleInput(state, input, {
        kit,
        now: now(),
        ...(options.createId ? { createId: options.createId } : {}),
      })
    )
  }

  return {
    kit,
    platform,
    getState: () => state,
    dispatch,
    runCommand,
    apply(update) {
      const next = update(state, now())
      return next ? setState(next) : false
    },
    setDocument(document) {
      setState(
        createEditorState(document, keepSelection(document, state.selection))
      )
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

// MARK: Hooks

/** Reads a selected value, returning the previous one while it's equal. */
function createSelectionReader<T>(
  store: EditorStore,
  selector: (state: EditorState) => T,
  isEqual: (a: T, b: T) => boolean
) {
  let cached: { state: EditorState; value: T } | null = null
  return () => {
    const state = store.getState()
    if (cached && cached.state === state) return cached.value
    const value = selector(state)
    const next = cached && isEqual(cached.value, value) ? cached.value : value
    cached = { state, value: next }
    return next
  }
}

/**
 * Reads part of the state, re-rendering only when it changes by `isEqual`.
 * Pass a stable `selector` (module level or memoised): a new one each render
 * recomputes the value.
 */
function useEditorSelector<T>(
  store: EditorStore,
  selector: (state: EditorState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const readSelection = useMemo(
    () => createSelectionReader(store, selector, isEqual),
    [store, selector, isEqual]
  )
  return useSyncExternalStore(store.subscribe, readSelection, readSelection)
}

/** A block, identity-stable while it doesn't change. */
function useEditorBlock(
  store: EditorStore,
  id: string
): EditorBlock | undefined {
  const selector = useCallback(
    (state: EditorState) => {
      const index = getBlockIndex(state.document, id)
      return state.document.blocks[index]
    },
    [id]
  )
  return useEditorSelector(store, selector)
}

function isSameSnapshot(a: EditorSnapshot, b: EditorSnapshot) {
  return (
    a.activeMarks.length === b.activeMarks.length &&
    a.activeMarks.every((mark, index) => mark === b.activeMarks[index]) &&
    a.link?.href === b.link?.href &&
    a.blockType === b.blockType &&
    a.headingLevel === b.headingLevel &&
    a.isChecked === b.isChecked &&
    a.canIndent === b.canIndent &&
    a.canOutdent === b.canOutdent &&
    a.canUndo === b.canUndo &&
    a.canRedo === b.canRedo &&
    a.hasSelection === b.hasSelection &&
    a.isCollapsed === b.isCollapsed &&
    a.selectionText === b.selectionText
  )
}

/** What toolbars need, as one object that stays the same while it reads the same. */
function useEditorSnapshot(store: EditorStore): EditorSnapshot {
  const selector = useCallback(
    (state: EditorState) => getEditorSnapshot(state, store.kit),
    [store]
  )
  return useEditorSelector(store, selector, isSameSnapshot)
}

export {
  createEditorStore,
  isSameSnapshot,
  useEditorBlock,
  useEditorSelector,
  useEditorSnapshot,
}
export type { EditorStore, EditorStoreOptions }
