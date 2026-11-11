"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { createPortal } from "react-dom"

import {
  type EditorCommand,
  type EditorCommandArgs,
  type EditorSnapshot,
} from "@/registry/bases/__base__/lib/editor-commands"
import {
  getDomSelection,
  getFlatOffsetFromDom,
  readDomFlatText,
  setDomSelection,
} from "@/registry/bases/__base__/lib/editor-dom"
import { getTextEdit } from "@/registry/bases/__base__/lib/editor-input"
import {
  resolveKits,
  starterKit,
  type EditorKit,
  type EditorKitRuntime,
} from "@/registry/bases/__base__/lib/editor-kit"
import {
  createBlock,
  getBlockText,
  getFlatText,
  isVoidBlock,
  toFlatOffset,
  type EditorBlock,
  type EditorDocument,
} from "@/registry/bases/__base__/lib/editor-model"
import {
  createEditorStore,
  useEditorSelector,
  useEditorSnapshot,
  type EditorStore,
} from "@/registry/bases/__base__/lib/editor-store"
import {
  getKeyboardBarLayout,
  getShortcutPlatform,
} from "@/registry/bases/__base__/lib/editor-surface-model"
import {
  getTableDraft,
  insertTableColumn,
  insertTableRow,
  moveTableCell,
  removeTableColumn,
  removeTableRow,
  setTableAlign,
  setTableCell,
  updateTableBlock,
  type TableCellPosition,
  type TableDraft,
} from "@/registry/bases/__base__/lib/editor-table"
import {
  applyTransaction,
  createEditorState,
  setBlock,
} from "@/registry/bases/__base__/lib/editor-transaction"
import {
  parseMarkdown,
  type MarkdownSyntax,
} from "@/registry/bases/__base__/lib/markdown-parse"
import { serializeMarkdown } from "@/registry/bases/__base__/lib/markdown-serialize"
import {
  getHeadingLevel,
  getMarkdownTree,
  getStringAttribute,
  isTaskChecked,
  type MarkdownTableAlign,
  type MarkdownTreeNode,
} from "@/registry/bases/__base__/lib/markdown-tree"
import {
  getCodeLanguage,
  getLanguageLabel,
  highlightCode,
  type SyntaxTokenKind,
} from "@/registry/bases/__base__/lib/syntax-highlight-model"
import {
  MarkdownBlock,
  MarkdownInline,
  MarkdownTaskCheck,
  markdownVariants,
  type MarkdownSize,
} from "@/registry/bases/__base__/ui/markdown"
import { toggleVariants } from "@/registry/bases/__base__/ui/toggle"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A rich text editor whose value is Markdown. The document lives in a store
// (lib/editor-store.ts) and every rule about typing, Enter, Backspace,
// shortcuts and commands is in the shared core, which React Native runs too.
// This file is the web's surface: one contenteditable root drawn with the
// Markdown component's typography, which cancels what the browser lets it
// cancel and reads back what it can't (compositions, Android's Backspace).

type EditorContextValue = {
  store: EditorStore
  readOnly: boolean
  placeholder?: string
  contentRef: React.RefObject<HTMLDivElement | null>
  isFocused: boolean
  setFocused: (isFocused: boolean) => void
  isComposingRef: React.RefObject<boolean>
  link: EditorLinkState | null
  openLink: (anchor?: DOMRect) => void
  /** The table being edited in place, by block id. */
  editingTableId: string | null
  setEditingTableId: (id: string | null) => void
  closeLink: () => void
  /** Focuses the surface and puts the model's selection back in the DOM. */
  focusContent: () => void
}

type EditorLinkState = { anchor: DOMRect }

const EditorContext = React.createContext<EditorContextValue | null>(null)

function useEditorContext() {
  const context = React.use(EditorContext)
  if (!context) throw new Error("Editor parts must be used within <Editor>.")
  return context
}

/** The editor's store and helpers, for parts of your own. */
function useEditor() {
  const { store, focusContent } = useEditorContext()
  return React.useMemo(
    () => ({
      store,
      focus: focusContent,
      run: (id: string, args?: EditorCommandArgs) => {
        const hasRun = store.runCommand(id, args)
        focusContent()
        return hasRun
      },
      getMarkdown: () => serializeMarkdown(store.getState().document),
    }),
    [store, focusContent]
  )
}

function getPlatform() {
  if (typeof navigator === "undefined") return "other"
  return getShortcutPlatform(navigator.platform)
}

function isFinePointer() {
  if (typeof window === "undefined") return true
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}

/** Calls `onValueChange` with the document's Markdown after edits, once per frame burst. */
function useMarkdownValue(
  store: EditorStore,
  value: string | undefined,
  onValueChange: ((value: string) => void) | undefined,
  syntax: readonly MarkdownSyntax[] | undefined
) {
  const lastValueRef = React.useRef(value)
  const onValueChangeRef = React.useRef(onValueChange)
  React.useEffect(() => {
    onValueChangeRef.current = onValueChange
  })

  React.useEffect(() => {
    if (value === undefined || value === lastValueRef.current) return
    lastValueRef.current = value
    store.setDocument(parseMarkdown(value, { syntax }))
  }, [store, value, syntax])

  React.useEffect(() => {
    let document = store.getState().document
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().document
      if (next === document) return
      document = next
      clearTimeout(timer)
      timer = setTimeout(() => {
        const markdown = serializeMarkdown(document, { syntax })
        if (markdown === lastValueRef.current) return
        lastValueRef.current = markdown
        onValueChangeRef.current?.(markdown)
      }, 0)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [store, syntax])
}

/**
 * The first document gets ids from its block order, so the server and the
 * client render the same `data-block-id`s and hydration matches. Blocks
 * made later take random ids, which never look like these.
 */
function withStableIds(document: EditorDocument): EditorDocument {
  const blocks =
    document.blocks.length > 0
      ? document.blocks
      : [createBlock({ type: "paragraph" })]
  return {
    ...document,
    blocks: blocks.map((block, index) => ({ ...block, id: `block-${index}` })),
  }
}

function Editor({
  value,
  defaultValue,
  onValueChange,
  kits,
  syntax,
  readOnly = false,
  placeholder,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue"> & {
  /** The document as Markdown, when the editor is controlled. */
  value?: string
  defaultValue?: string
  /** Called with the Markdown after edits. */
  onValueChange?: (value: string) => void
  /** Extra marks, blocks, commands and shortcuts. The starter kit is always on. */
  kits?: readonly EditorKit[]
  /** Extra Markdown block syntax, as Markdown takes. */
  syntax?: readonly MarkdownSyntax[]
  readOnly?: boolean
  placeholder?: string
}) {
  const [store] = React.useState(() =>
    createEditorStore({
      state: createEditorState(
        withStableIds(parseMarkdown(value ?? defaultValue ?? "", { syntax }))
      ),
      kit: resolveKits([starterKit, ...(kits ?? [])]),
      platform: getPlatform(),
    })
  )
  useMarkdownValue(store, value, onValueChange, syntax)

  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const isComposingRef = React.useRef(false)
  const [isFocused, setFocused] = React.useState(false)
  const [link, setLink] = React.useState<EditorLinkState | null>(null)
  const [editingTableId, setEditingTableId] = React.useState<string | null>(
    null
  )

  const focusContent = React.useCallback(() => {
    const root = contentRef.current
    if (!root) return
    root.focus({ preventScroll: true })
    const { document, selection } = store.getState()
    if (!selection) return
    setDomSelection(
      root,
      document,
      toFlatOffset(document, selection.anchor),
      toFlatOffset(document, selection.focus)
    )
  }, [store])

  const openLink = React.useCallback((anchor?: DOMRect) => {
    const fallback = contentRef.current?.getBoundingClientRect()
    const rect =
      anchor ?? getSelectionRect() ?? fallback ?? new DOMRect(0, 0, 0, 0)
    setLink({ anchor: rect })
  }, [])

  const closeLink = React.useCallback(() => setLink(null), [])

  const context = React.useMemo<EditorContextValue>(
    () => ({
      store,
      readOnly,
      placeholder,
      contentRef,
      isFocused,
      setFocused,
      isComposingRef,
      link,
      openLink,
      closeLink,
      editingTableId,
      setEditingTableId,
      focusContent,
    }),
    [
      store,
      readOnly,
      placeholder,
      isFocused,
      link,
      openLink,
      closeLink,
      editingTableId,
      focusContent,
    ]
  )

  return (
    <EditorContext value={context}>
      <div
        data-slot="editor"
        data-readonly={readOnly || undefined}
        className={cn("cn-editor flex min-w-0 flex-col", className)}
        {...props}
      >
        {children ?? <EditorContent />}
      </div>
    </EditorContext>
  )
}

// MARK: Content

function getSelectionRect() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return rect
}

function getDeleteUnit(inputType: string) {
  if (inputType.includes("Word")) return "word" as const
  if (inputType.includes("Line")) return "line" as const
  return "character" as const
}

/** Text and line breaks of one block, with a filler so empty lines keep their height. */
function EditorBlockText({ block }: { block: EditorBlock }) {
  const text = getBlockText(block)
  return (
    <>
      <MarkdownInline runs={block.content} />
      {text === "" || text.endsWith("\n") ? <br data-editor-filler="" /> : null}
    </>
  )
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const

const EditorBlockElement = React.memo(function EditorBlockElement({
  block,
  placeholder,
}: {
  block: EditorBlock
  placeholder?: string
}) {
  if (block.type === "table") return <EditorTableBlock block={block} />
  if (isVoidBlock(block)) {
    return (
      <div
        data-block-id={block.id}
        data-void="true"
        contentEditable={false}
        data-slot="editor-void"
        className="cn-editor-void"
      >
        <MarkdownBlock block={block} />
      </div>
    )
  }
  const shared = {
    "data-block-id": block.id,
    "data-placeholder": placeholder,
  }
  const text = <EditorBlockText block={block} />
  switch (block.type) {
    case "heading": {
      const level = getHeadingLevel(block)
      const Heading = HEADINGS[level - 1]
      return (
        <Heading
          {...shared}
          data-slot="markdown-heading"
          data-level={level}
          className="cn-markdown-heading cn-editor-text"
        >
          {text}
        </Heading>
      )
    }
    case "quote":
      return (
        <blockquote data-slot="markdown-quote" className="cn-markdown-quote">
          <p {...shared} className="cn-editor-text">
            {text}
          </p>
        </blockquote>
      )
    case "code":
      return <EditorCodeBlock block={block} placeholder={placeholder} />
    case "raw":
      return (
        <pre
          {...shared}
          data-slot="markdown-raw"
          className="cn-markdown-raw-block cn-editor-text"
        >
          {text}
        </pre>
      )
    default:
      return (
        <p
          {...shared}
          data-slot="markdown-paragraph"
          data-checked={
            (block.type === "task" && isTaskChecked(block)) || undefined
          }
          className="cn-markdown-paragraph cn-editor-text"
        >
          {text}
        </p>
      )
  }
})

// MARK: Code

const TOKEN_CLASS_NAMES: Record<SyntaxTokenKind, () => string> = {
  plain: cva(""),
  comment: cva("cn-syntax-highlight-token-comment"),
  keyword: cva("cn-syntax-highlight-token-keyword"),
  string: cva("cn-syntax-highlight-token-string"),
  constant: cva("cn-syntax-highlight-token-constant"),
  function: cva("cn-syntax-highlight-token-function"),
  type: cva("cn-syntax-highlight-token-type"),
  tag: cva("cn-syntax-highlight-token-tag"),
  attribute: cva("cn-syntax-highlight-token-attribute"),
  property: cva("cn-syntax-highlight-token-property"),
  variable: cva("cn-syntax-highlight-token-variable"),
  regex: cva("cn-syntax-highlight-token-regex"),
  operator: cva("cn-syntax-highlight-token-operator"),
  punctuation: cva("cn-syntax-highlight-token-punctuation"),
  inserted: cva("cn-syntax-highlight-token-inserted"),
  deleted: cva("cn-syntax-highlight-token-deleted"),
  heading: cva("cn-syntax-highlight-token-heading"),
  link: cva("cn-syntax-highlight-token-link"),
}

/**
 * The languages the picker offers, as the ids written after the fence.
 * Others typed after ``` still colour, from Syntax Highlight's grammars.
 */
const CODE_LANGUAGES: readonly (string | null)[] = [
  null,
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "css",
  "scss",
  "html",
  "md",
  "bash",
  "python",
  "go",
  "rust",
  "swift",
  "kotlin",
  "java",
  "c",
  "cpp",
  "cs",
  "php",
  "ruby",
  "sql",
  "graphql",
  "yaml",
  "toml",
  "diff",
  "dockerfile",
]

/** The code's text as coloured tokens: the same text nodes, in spans. */
function renderCodeTokens(code: string, language: string | null) {
  return highlightCode(code, getCodeLanguage(language ?? undefined)).flatMap(
    (line, lineIndex) => [
      lineIndex > 0 ? "\n" : null,
      ...line.tokens.map((token, index) =>
        token.kind === "plain" ? (
          token.content
        ) : (
          <span
            key={`${lineIndex}:${index}`}
            data-token={token.kind}
            className={TOKEN_CLASS_NAMES[token.kind]()}
          >
            {token.content}
          </span>
        )
      ),
    ]
  )
}

/** Picks a code block's language; the fence in the Markdown follows. */
function EditorCodeLanguage({ block }: { block: EditorBlock }) {
  const { store, readOnly, focusContent } = useEditorContext()
  const [isOpen, setOpen] = React.useState(false)
  const language = getStringAttribute(block, "language")
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isOpen) return
    listRef.current
      ?.querySelector<HTMLButtonElement>("[aria-checked=true]")
      ?.focus()
  }, [isOpen])

  const pick = (next: string | null) => {
    store.apply((state, now) =>
      applyTransaction(state, {
        operations: [
          setBlock(block.id, { attrs: { ...block.attrs, language: next } }),
        ],
        selectionBefore: state.selection,
        selectionAfter: state.selection,
        origin: "command",
        time: now,
      })
    )
    setOpen(false)
    focusContent()
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setOpen(false)
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Language, now ${getLanguageLabel(language)}`}
        disabled={readOnly}
        className={cn(
          toggleVariants({ size: "sm" }),
          "cn-editor-code-language"
        )}
        onClick={() => setOpen((value) => !value)}
      >
        {getLanguageLabel(language)}
        {readOnly ? null : (
          <IconPlaceholder
            lucide="ChevronDownIcon"
            tabler="IconChevronDown"
            hugeicons="ArrowDown01Icon"
            phosphor="CaretDownIcon"
            remixicon="RiArrowDownSLine"
            data-icon="inline-end"
          />
        )}
      </button>
      {isOpen ? (
        <div
          ref={listRef}
          role="menu"
          aria-label="Language"
          className="cn-editor-block-type-menu absolute start-0 top-full z-50 flex flex-col"
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "[role=menuitemradio]"
              )
            )
            const index = items.findIndex(
              (item) => item === event.currentTarget.ownerDocument.activeElement
            )
            if (event.key === "Escape") {
              event.preventDefault()
              setOpen(false)
              focusContent()
              return
            }
            const step =
              event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0
            if (step === 0) return
            event.preventDefault()
            items[(index + step + items.length) % items.length]?.focus()
          }}
        >
          {CODE_LANGUAGES.map((option) => (
            <button
              key={option ?? "plain"}
              type="button"
              role="menuitemradio"
              aria-checked={(language ?? null) === option}
              className="cn-editor-block-type-item flex items-center text-start"
              onClick={() => pick(option)}
            >
              <span className="flex-1">{getLanguageLabel(option)}</span>
              {option ? (
                <span
                  aria-hidden
                  className="cn-editor-block-type-shortcut font-mono"
                >
                  {option}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * A code block: Syntax Highlight's panel and colours around editable code,
 * with the language and Copy in a strip above it.
 */
function EditorCodeBlock({
  block,
  placeholder,
}: {
  block: EditorBlock
  placeholder?: string
}) {
  const code = getBlockText(block)
  const language = getStringAttribute(block, "language")
  const [isCopied, setCopied] = React.useState(false)
  return (
    <div data-slot="editor-code-block" className="cn-editor-code-block">
      <div
        data-editor-island=""
        contentEditable={false}
        data-slot="editor-code-header"
        className="cn-editor-code-header flex items-center"
      >
        <EditorCodeLanguage block={block} />
        <button
          type="button"
          aria-label={isCopied ? "Copied" : "Copy code"}
          data-copied={isCopied || undefined}
          className={cn(
            toggleVariants({ size: "sm" }),
            "cn-editor-code-copy ms-auto"
          )}
          onClick={() => {
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        >
          {isCopied ? (
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
            />
          ) : (
            <IconPlaceholder
              lucide="CopyIcon"
              tabler="IconCopy"
              hugeicons="Copy01Icon"
              phosphor="CopyIcon"
              remixicon="RiFileCopyLine"
            />
          )}
        </button>
      </div>
      <pre className="cn-editor-code-pre">
        <code
          data-block-id={block.id}
          data-placeholder={placeholder}
          data-language={language ?? undefined}
          className="cn-editor-text block"
        >
          {renderCodeTokens(code, language)}
          {code === "" || code.endsWith("\n") ? (
            <br data-editor-filler="" />
          ) : null}
        </code>
      </pre>
    </div>
  )
}

// MARK: Tables

/** Events from inside a table's grid editor belong to its inputs, not the surface. */
function isInIsland(target: EventTarget | null) {
  return (
    target instanceof Element && target.closest("[data-editor-island]") !== null
  )
}

const ALIGN_OPTIONS: readonly {
  value: MarkdownTableAlign
  label: string
  icon: React.ReactNode
}[] = [
  {
    value: null,
    label: "Align left",
    icon: (
      <IconPlaceholder
        lucide="AlignLeftIcon"
        tabler="IconAlignLeft"
        hugeicons="TextAlignLeftIcon"
        phosphor="TextAlignLeftIcon"
        remixicon="RiAlignLeft"
      />
    ),
  },
  {
    value: "center",
    label: "Align center",
    icon: (
      <IconPlaceholder
        lucide="AlignCenterIcon"
        tabler="IconAlignCenter"
        hugeicons="TextAlignCenterIcon"
        phosphor="TextAlignCenterIcon"
        remixicon="RiAlignCenter"
      />
    ),
  },
  {
    value: "right",
    label: "Align right",
    icon: (
      <IconPlaceholder
        lucide="AlignRightIcon"
        tabler="IconAlignRight"
        hugeicons="TextAlignRightIcon"
        phosphor="TextAlignRightIcon"
        remixicon="RiAlignRight"
      />
    ),
  },
]

function EditorTableAction({
  label,
  isPressed,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { label: string; isPressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isPressed}
      className={cn(toggleVariants(), "cn-editor-table-action", className)}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * A table being edited in place: its cells as inputs holding Markdown, a
 * toolbar for rows, columns and alignment, and Done. Tab moves along the
 * cells (past the last one it adds a row), Enter moves down, Escape cancels,
 * Mod+Enter or a click elsewhere saves, as one undo step.
 */
function EditorTableEditor({ block }: { block: EditorBlock }) {
  const { store, setEditingTableId, focusContent } = useEditorContext()
  const [draft, setDraft] = React.useState<TableDraft>(() =>
    getTableDraft(block)
  )
  const [position, setPosition] = React.useState<TableCellPosition>({
    row: 0,
    column: 0,
  })
  const rootRef = React.useRef<HTMLDivElement>(null)
  const draftRef = React.useRef(draft)
  React.useEffect(() => {
    draftRef.current = draft
  }, [draft])
  const hasClosedRef = React.useRef(false)

  React.useEffect(() => {
    rootRef.current
      ?.querySelector<HTMLInputElement>(
        `[data-cell="${position.row}:${position.column}"]`
      )
      ?.focus()
  }, [position])

  const close = (shouldSave: boolean) => {
    if (hasClosedRef.current) return
    hasClosedRef.current = true
    if (shouldSave) {
      store.apply((state, now) =>
        updateTableBlock(state, block.id, draftRef.current, now)
      )
    }
    setEditingTableId(null)
    focusContent()
  }

  const update = (next: TableDraft, nextPosition?: TableCellPosition) => {
    setDraft(next)
    if (nextPosition) setPosition(nextPosition)
  }

  const onCellKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === "Escape") {
      event.preventDefault()
      close(false)
      return
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      close(true)
      return
    }
    if (event.key === "Tab") {
      event.preventDefault()
      const moved = moveTableCell(
        draft,
        position,
        event.shiftKey ? "previous" : "next"
      )
      update(moved.draft, moved.position)
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const row = position.row + 1
      const next =
        row >= draft.cells.length ? insertTableRow(draft, row) : draft
      update(next, { row, column: position.column })
    }
  }

  const columns = draft.align.length
  const focusedAlign = draft.align[position.column] ?? null
  return (
    <div
      ref={rootRef}
      data-editor-island=""
      data-slot="editor-table-editor"
      contentEditable={false}
      className="cn-editor-table-editor flex flex-col"
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && rootRef.current?.contains(next)) return
        close(true)
      }}
    >
      <div
        role="toolbar"
        aria-label="Table"
        data-slot="editor-table-toolbar"
        className="cn-editor-table-toolbar flex items-center"
        onKeyDown={onToolbarKeyDown}
      >
        <EditorTableAction
          label="Add row below"
          onClick={() =>
            update(insertTableRow(draft, position.row + 1), {
              row: Math.max(position.row + 1, 1),
              column: position.column,
            })
          }
        >
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
          Row
        </EditorTableAction>
        <EditorTableAction
          label="Add column to the right"
          onClick={() =>
            update(insertTableColumn(draft, position.column + 1), {
              row: position.row,
              column: position.column + 1,
            })
          }
        >
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
          Column
        </EditorTableAction>
        <EditorTableAction
          label="Remove row"
          disabled={draft.cells.length <= 1}
          onClick={() =>
            update(removeTableRow(draft, position.row), {
              row: Math.max(Math.min(position.row, draft.cells.length - 2), 0),
              column: position.column,
            })
          }
        >
          <IconPlaceholder
            lucide="MinusIcon"
            tabler="IconMinus"
            hugeicons="MinusSignIcon"
            phosphor="MinusIcon"
            remixicon="RiSubtractLine"
          />
          Row
        </EditorTableAction>
        <EditorTableAction
          label="Remove column"
          disabled={columns <= 1}
          onClick={() =>
            update(removeTableColumn(draft, position.column), {
              row: position.row,
              column: Math.max(Math.min(position.column, columns - 2), 0),
            })
          }
        >
          <IconPlaceholder
            lucide="MinusIcon"
            tabler="IconMinus"
            hugeicons="MinusSignIcon"
            phosphor="MinusIcon"
            remixicon="RiSubtractLine"
          />
          Column
        </EditorTableAction>
        <EditorToolbarSeparator />
        {ALIGN_OPTIONS.map((option) => (
          <EditorTableAction
            key={option.label}
            label={option.label}
            isPressed={focusedAlign === option.value}
            onClick={() =>
              update(
                setTableAlign(draft, position.column, option.value),
                position
              )
            }
          >
            {option.icon}
          </EditorTableAction>
        ))}
        <button
          type="button"
          className={cn(toggleVariants(), "cn-editor-table-done ms-auto")}
          onClick={() => close(true)}
        >
          Done
        </button>
      </div>
      <div className="cn-markdown-table">
        <table>
          <tbody>
            {draft.cells.map((row, rowIndex) => (
              <tr key={rowIndex} className="cn-markdown-table-row">
                {row.map((cell, column) => {
                  const Cell = rowIndex === 0 ? "th" : "td"
                  return (
                    <Cell
                      key={column}
                      data-align={draft.align[column] ?? undefined}
                      className={cn(
                        rowIndex === 0
                          ? "cn-markdown-table-head"
                          : "cn-markdown-table-cell",
                        "cn-editor-table-cell"
                      )}
                    >
                      <input
                        data-cell={`${rowIndex}:${column}`}
                        value={cell}
                        aria-label={`${rowIndex === 0 ? "Header" : `Row ${rowIndex}`}, column ${column + 1}`}
                        className="cn-editor-table-input w-full min-w-0 bg-transparent outline-none"
                        style={{ textAlign: draft.align[column] ?? "start" }}
                        onFocus={() => setPosition({ row: rowIndex, column })}
                        onChange={(event) =>
                          setDraft(
                            setTableCell(
                              draft,
                              rowIndex,
                              column,
                              event.target.value
                            )
                          )
                        }
                        onKeyDown={onCellKeyDown}
                      />
                    </Cell>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** A table in the document: drawn like Markdown's, edited in place on a click. */
function EditorTableBlock({ block }: { block: EditorBlock }) {
  const { readOnly, editingTableId, setEditingTableId } = useEditorContext()
  const isEditing = editingTableId === block.id
  return (
    <div
      data-block-id={block.id}
      data-void="true"
      data-editor-island=""
      data-editing={isEditing || undefined}
      contentEditable={false}
      data-slot="editor-table"
      className="cn-editor-table relative"
    >
      {isEditing ? (
        <EditorTableEditor block={block} />
      ) : (
        <>
          <div
            title={readOnly ? undefined : "Click to edit"}
            onClick={() => {
              if (!readOnly) setEditingTableId(block.id)
            }}
          >
            <MarkdownBlock block={block} />
          </div>
          {readOnly ? null : (
            <button
              type="button"
              className={cn(
                toggleVariants({ size: "sm" }),
                "cn-editor-table-edit absolute"
              )}
              onClick={() => setEditingTableId(block.id)}
            >
              <IconPlaceholder
                lucide="TableIcon"
                tabler="IconTable"
                hugeicons="TableIcon"
                phosphor="TableIcon"
                remixicon="RiTableLine"
              />
              Edit table
            </button>
          )}
        </>
      )}
    </div>
  )
}

function EditorTaskCheckbox({ block }: { block: EditorBlock }) {
  const { store, readOnly, focusContent } = useEditorContext()
  const isChecked = isTaskChecked(block)
  return (
    <span
      contentEditable={false}
      data-slot="editor-task-checkbox"
      className="cn-editor-task-checkbox"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={readOnly}
        aria-label={isChecked ? "Done" : "Not done"}
        data-checked={isChecked || undefined}
        className="cn-markdown-task-checkbox cn-editor-task-checkbox-input group/task-check"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          const { document } = store.getState()
          const offset = toFlatOffset(document, {
            blockId: block.id,
            offset: 0,
          })
          store.dispatch({ kind: "select", anchor: offset, focus: offset })
          store.runCommand("toggle-task")
          focusContent()
        }}
      >
        <MarkdownTaskCheck />
      </button>
    </span>
  )
}

function EditorNodes({
  nodes,
  placeholderId,
  placeholder,
}: {
  nodes: readonly MarkdownTreeNode[]
  placeholderId: string | null
  placeholder?: string
}) {
  return nodes.map((node) => {
    if (node.kind === "block") {
      return (
        <EditorBlockElement
          key={node.block.id}
          block={node.block}
          placeholder={
            node.block.id === placeholderId ? placeholder : undefined
          }
        />
      )
    }
    const List = node.ordered ? "ol" : "ul"
    return (
      <List
        key={`list-${node.items[0]?.block.id}`}
        data-slot="markdown-list"
        data-ordered={node.ordered}
        start={node.ordered && node.start !== 1 ? node.start : undefined}
        className="cn-markdown-list"
      >
        {node.items.map(({ block, children }) => (
          <li
            key={block.id}
            data-slot="markdown-list-item"
            data-task={block.type === "task" || undefined}
            className="cn-markdown-list-item"
          >
            {block.type === "task" ? (
              <EditorTaskCheckbox block={block} />
            ) : null}
            <EditorBlockElement
              block={block}
              placeholder={block.id === placeholderId ? placeholder : undefined}
            />
            <EditorNodes
              nodes={children}
              placeholderId={placeholderId}
              placeholder={placeholder}
            />
          </li>
        ))}
      </List>
    )
  })
}

/** The empty document's only block shows the placeholder. */
function getPlaceholderId(document: EditorDocument) {
  const [first] = document.blocks
  if (document.blocks.length !== 1 || !first) return null
  if (first.type !== "paragraph" || getBlockText(first) !== "") return null
  return first.id
}

function useSurfaceEvents(root: React.RefObject<HTMLDivElement | null>) {
  const { store, readOnly, isComposingRef, setFocused, openLink } =
    useEditorContext()
  const [epoch, setEpoch] = React.useState(0)

  React.useEffect(() => {
    const element = root.current
    if (!element || readOnly) return
    let isPlainPaste = false

    const getModelFlatSelection = () => {
      const { document, selection } = store.getState()
      if (!selection) return null
      const anchor = toFlatOffset(document, selection.anchor)
      const focus = toFlatOffset(document, selection.focus)
      return { from: Math.min(anchor, focus), to: Math.max(anchor, focus) }
    }

    // The browser changed the DOM itself: read its text back, turn the
    // difference into one replace, and redraw from the model.
    const reconcile = () => {
      const { document } = store.getState()
      const before = getFlatText(document)
      const after = readDomFlatText(element, document)
      const edit = getTextEdit(before, after, getModelFlatSelection(), null)
      if (edit) store.dispatch({ kind: "replace", ...edit })
      setEpoch((value) => value + 1)
    }

    // The range the browser means to replace, which differs from the
    // selection for autocorrect and spelling suggestions.
    const getTargetRange = (event: InputEvent) => {
      const [range] = event.getTargetRanges()
      if (!range) return getModelFlatSelection()
      const { document } = store.getState()
      const from = getFlatOffsetFromDom(element, document, {
        node: range.startContainer,
        offset: range.startOffset,
      })
      const to = getFlatOffsetFromDom(element, document, {
        node: range.endContainer,
        offset: range.endOffset,
      })
      if (from === null || to === null) return getModelFlatSelection()
      return { from: Math.min(from, to), to: Math.max(from, to) }
    }

    // selectionchange fires asynchronously, so a key can arrive before the
    // model has heard where the caret went. Read it first.
    const syncSelection = () => {
      if (isComposingRef.current) return
      const { document } = store.getState()
      const flat = getDomSelection(element, document)
      if (!flat) return
      store.dispatch({ kind: "select", anchor: flat.anchor, focus: flat.focus })
    }

    const onBeforeInput = (event: InputEvent) => {
      if (isInIsland(event.target)) return
      if (event.isComposing || event.inputType === "insertCompositionText") {
        return
      }
      syncSelection()
      const { inputType } = event
      const handle = (input: Parameters<EditorStore["dispatch"]>[0]) => {
        event.preventDefault()
        store.dispatch(input)
      }
      switch (inputType) {
        case "insertText":
        case "insertReplacementText":
        case "insertFromYank": {
          const text =
            event.data ?? event.dataTransfer?.getData("text/plain") ?? ""
          const range = getTargetRange(event)
          if (!range) return
          handle({ kind: "replace", from: range.from, to: range.to, text })
          return
        }
        case "insertParagraph":
          handle({ kind: "split" })
          return
        case "insertLineBreak":
          handle({ kind: "softBreak" })
          return
        case "deleteByCut":
        case "deleteByDrag":
        case "deleteContent": {
          const range = getModelFlatSelection()
          if (!range) return
          handle({ kind: "replace", from: range.from, to: range.to, text: "" })
          return
        }
        case "formatBold":
          event.preventDefault()
          store.runCommand("bold")
          return
        case "formatItalic":
          event.preventDefault()
          store.runCommand("italic")
          return
        case "formatStrikeThrough":
          event.preventDefault()
          store.runCommand("strike")
          return
        case "historyUndo":
          event.preventDefault()
          store.runCommand("undo")
          return
        case "historyRedo":
          event.preventDefault()
          store.runCommand("redo")
          return
        case "insertFromPaste":
        case "insertFromDrop":
          // Handled by the paste and drop events, which can read the data.
          event.preventDefault()
          return
        default:
          if (inputType.startsWith("delete")) {
            const isForward = inputType.includes("Forward")
            const selection = getModelFlatSelection()
            if (selection && selection.from !== selection.to) {
              handle({
                kind: "replace",
                from: selection.from,
                to: selection.to,
                text: "",
              })
              return
            }
            handle({
              kind: isForward ? "deleteForward" : "deleteBackward",
              unit: getDeleteUnit(inputType),
            })
            return
          }
          // Formatting the model doesn't have (underline, colours): ignore.
          event.preventDefault()
      }
    }

    const onInput = (event: Event) => {
      if (isInIsland(event.target)) return
      if (isComposingRef.current) return
      if (event instanceof InputEvent && event.isComposing) return
      // Every input the surface handles is cancelled, so an input event
      // means the browser changed the DOM anyway (Chromium on Android
      // ignores the cancel on Backspace) and the DOM no longer matches.
      reconcile()
    }

    const onCompositionStart = (event: CompositionEvent) => {
      if (isInIsland(event.target)) return
      isComposingRef.current = true
      store.dispatch({ kind: "compositionStart" })
    }

    const onCompositionEnd = (event: CompositionEvent) => {
      if (isInIsland(event.target)) return
      isComposingRef.current = false
      store.dispatch({ kind: "compositionEnd" })
      reconcile()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isInIsland(event.target)) return
      if (event.isComposing || event.keyCode === 229) return
      syncSelection()
      const isModifier = event.metaKey || event.ctrlKey
      if (isModifier && event.shiftKey && event.code === "KeyV") {
        isPlainPaste = true
        return
      }
      if (
        isModifier &&
        !event.shiftKey &&
        !event.altKey &&
        event.code === "KeyK"
      ) {
        event.preventDefault()
        openLink()
        return
      }
      const isHandled = store.dispatch({
        kind: "key",
        key: event.key,
        code: event.code,
        modifiers: {
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
        },
      })
      if (isHandled) event.preventDefault()
    }

    const onPaste = (event: ClipboardEvent) => {
      if (isInIsland(event.target)) return
      event.preventDefault()
      const text = event.clipboardData?.getData("text/plain") ?? ""
      const isPlain = isPlainPaste
      isPlainPaste = false
      if (text === "") return
      if (isPlain) {
        store.dispatch({ kind: "paste", text })
        return
      }
      store.dispatch({
        kind: "paste",
        text,
        blocks: parseMarkdown(text).blocks,
      })
    }

    const onCopy = (event: ClipboardEvent) => {
      if (isInIsland(event.target)) return
      const selection = element.ownerDocument.getSelection()
      if (!selection || selection.isCollapsed || !event.clipboardData) return
      event.preventDefault()
      event.clipboardData.setData("text/plain", selection.toString())
      const holder = element.ownerDocument.createElement("div")
      holder.append(selection.getRangeAt(0).cloneContents())
      for (const node of holder.querySelectorAll("[contenteditable]")) {
        node.removeAttribute("contenteditable")
      }
      event.clipboardData.setData("text/html", holder.innerHTML)
    }

    const onSelectionChange = () => {
      const selection = element.ownerDocument.getSelection()
      if (!selection?.anchorNode || !element.contains(selection.anchorNode)) {
        return
      }
      const anchor = selection.anchorNode
      const anchorElement =
        anchor instanceof Element ? anchor : anchor.parentElement
      if (isInIsland(anchorElement)) return
      syncSelection()
    }

    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)

    element.addEventListener("beforeinput", onBeforeInput)
    element.addEventListener("input", onInput)
    element.addEventListener("compositionstart", onCompositionStart)
    element.addEventListener("compositionend", onCompositionEnd)
    element.addEventListener("keydown", onKeyDown)
    element.addEventListener("paste", onPaste)
    element.addEventListener("copy", onCopy)
    element.addEventListener("focus", onFocus)
    element.addEventListener("blur", onBlur)
    element.ownerDocument.addEventListener("selectionchange", onSelectionChange)
    return () => {
      element.removeEventListener("beforeinput", onBeforeInput)
      element.removeEventListener("input", onInput)
      element.removeEventListener("compositionstart", onCompositionStart)
      element.removeEventListener("compositionend", onCompositionEnd)
      element.removeEventListener("keydown", onKeyDown)
      element.removeEventListener("paste", onPaste)
      element.removeEventListener("copy", onCopy)
      element.removeEventListener("focus", onFocus)
      element.removeEventListener("blur", onBlur)
      element.ownerDocument.removeEventListener(
        "selectionchange",
        onSelectionChange
      )
    }
  }, [root, store, readOnly, isComposingRef, setFocused, openLink])

  return epoch
}

function EditorContent({
  size = "default",
  className,
  "aria-label": ariaLabel = "Editor",
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** The document type role, as Markdown's. */
  size?: MarkdownSize
}) {
  const {
    store,
    readOnly,
    placeholder,
    contentRef,
    isComposingRef,
    isFocused,
  } = useEditorContext()
  const document = useEditorSelector(store, (state) => state.document)
  const selection = useEditorSelector(store, (state) => state.selection)
  const epoch = useSurfaceEvents(contentRef)

  // After every render, put the model's selection back into the DOM when
  // they differ, unless an input method is composing.
  React.useLayoutEffect(() => {
    const root = contentRef.current
    if (!root || !selection || isComposingRef.current) return
    if (root.ownerDocument.activeElement !== root) return
    const anchor = toFlatOffset(document, selection.anchor)
    const focus = toFlatOffset(document, selection.focus)
    const current = getDomSelection(root, document)
    if (current && current.anchor === anchor && current.focus === focus) return
    setDomSelection(root, document, anchor, focus)
  }, [document, selection, epoch, contentRef, isComposingRef])

  return (
    <div
      ref={contentRef}
      data-slot="editor-content"
      data-size={size}
      data-focused={isFocused || undefined}
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      aria-readonly={readOnly || undefined}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck
      className={cn(
        markdownVariants({ size }),
        "cn-editor-content outline-none",
        className
      )}
      {...props}
    >
      <React.Fragment key={epoch}>
        <EditorNodes
          nodes={getMarkdownTree(document.blocks)}
          placeholderId={getPlaceholderId(document)}
          placeholder={placeholder}
        />
      </React.Fragment>
    </div>
  )
}

// MARK: Commands and icons

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  "heading-1": (
    <IconPlaceholder
      lucide="Heading1Icon"
      tabler="IconH1"
      hugeicons="Heading01Icon"
      phosphor="TextHOneIcon"
      remixicon="RiH1"
    />
  ),
  "heading-2": (
    <IconPlaceholder
      lucide="Heading2Icon"
      tabler="IconH2"
      hugeicons="Heading02Icon"
      phosphor="TextHTwoIcon"
      remixicon="RiH2"
    />
  ),
  "heading-3": (
    <IconPlaceholder
      lucide="Heading3Icon"
      tabler="IconH3"
      hugeicons="Heading03Icon"
      phosphor="TextHThreeIcon"
      remixicon="RiH3"
    />
  ),
  "heading-4": (
    <IconPlaceholder
      lucide="Heading4Icon"
      tabler="IconH4"
      hugeicons="Heading04Icon"
      phosphor="TextHFourIcon"
      remixicon="RiH4"
    />
  ),
  "heading-5": (
    <IconPlaceholder
      lucide="Heading5Icon"
      tabler="IconH5"
      hugeicons="Heading05Icon"
      phosphor="TextHFiveIcon"
      remixicon="RiH5"
    />
  ),
  "heading-6": (
    <IconPlaceholder
      lucide="Heading6Icon"
      tabler="IconH6"
      hugeicons="Heading06Icon"
      phosphor="TextHSixIcon"
      remixicon="RiH6"
    />
  ),
  paragraph: (
    <IconPlaceholder
      lucide="PilcrowIcon"
      tabler="IconPilcrow"
      hugeicons="ParagraphIcon"
      phosphor="ParagraphIcon"
      remixicon="RiParagraph"
    />
  ),
  bold: (
    <IconPlaceholder
      lucide="BoldIcon"
      tabler="IconBold"
      hugeicons="TextBoldIcon"
      phosphor="TextBIcon"
      remixicon="RiBold"
    />
  ),
  italic: (
    <IconPlaceholder
      lucide="ItalicIcon"
      tabler="IconItalic"
      hugeicons="TextItalicIcon"
      phosphor="TextItalicIcon"
      remixicon="RiItalic"
    />
  ),
  strike: (
    <IconPlaceholder
      lucide="StrikethroughIcon"
      tabler="IconStrikethrough"
      hugeicons="TextStrikethroughIcon"
      phosphor="TextStrikethroughIcon"
      remixicon="RiStrikethrough"
    />
  ),
  code: (
    <IconPlaceholder
      lucide="CodeIcon"
      tabler="IconCode"
      hugeicons="CodeIcon"
      phosphor="CodeIcon"
      remixicon="RiCodeLine"
    />
  ),
  link: (
    <IconPlaceholder
      lucide="LinkIcon"
      tabler="IconLink"
      hugeicons="LinkIcon"
      phosphor="LinkIcon"
      remixicon="RiLinksLine"
    />
  ),
  bulleted: (
    <IconPlaceholder
      lucide="ListIcon"
      tabler="IconList"
      hugeicons="Menu01Icon"
      phosphor="ListIcon"
      remixicon="RiListUnordered"
    />
  ),
  numbered: (
    <IconPlaceholder
      lucide="ListOrderedIcon"
      tabler="IconListNumbers"
      hugeicons="LeftToRightListNumberIcon"
      phosphor="ListNumbersIcon"
      remixicon="RiListOrdered"
    />
  ),
  task: (
    <IconPlaceholder
      lucide="ListTodoIcon"
      tabler="IconListCheck"
      hugeicons="CheckListIcon"
      phosphor="ListChecksIcon"
      remixicon="RiListCheck3"
    />
  ),
  quote: (
    <IconPlaceholder
      lucide="TextQuoteIcon"
      tabler="IconBlockquote"
      hugeicons="QuoteDownIcon"
      phosphor="QuotesIcon"
      remixicon="RiDoubleQuotesL"
    />
  ),
  "code-block": (
    <IconPlaceholder
      lucide="SquareCodeIcon"
      tabler="IconSourceCode"
      hugeicons="SourceCodeIcon"
      phosphor="CodeBlockIcon"
      remixicon="RiCodeBoxLine"
    />
  ),
  divider: (
    <IconPlaceholder
      lucide="MinusIcon"
      tabler="IconMinus"
      hugeicons="MinusSignIcon"
      phosphor="MinusIcon"
      remixicon="RiSubtractLine"
    />
  ),
  table: (
    <IconPlaceholder
      lucide="TableIcon"
      tabler="IconTable"
      hugeicons="TableIcon"
      phosphor="TableIcon"
      remixicon="RiTableLine"
    />
  ),
  indent: (
    <IconPlaceholder
      lucide="IndentIncreaseIcon"
      tabler="IconIndentIncrease"
      hugeicons="TextIndentMoreIcon"
      phosphor="TextIndentIcon"
      remixicon="RiIndentIncrease"
    />
  ),
  outdent: (
    <IconPlaceholder
      lucide="IndentDecreaseIcon"
      tabler="IconIndentDecrease"
      hugeicons="TextIndentLessIcon"
      phosphor="TextOutdentIcon"
      remixicon="RiIndentDecrease"
    />
  ),
  undo: (
    <IconPlaceholder
      lucide="Undo2Icon"
      tabler="IconArrowBackUp"
      hugeicons="Undo02Icon"
      phosphor="ArrowUUpLeftIcon"
      remixicon="RiArrowGoBackLine"
    />
  ),
  redo: (
    <IconPlaceholder
      lucide="Redo2Icon"
      tabler="IconArrowForwardUp"
      hugeicons="Redo02Icon"
      phosphor="ArrowUUpRightIcon"
      remixicon="RiArrowGoForwardLine"
    />
  ),
}

const DEFAULT_TOOLBAR: readonly (readonly string[])[] = [
  [
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "heading-5",
    "heading-6",
  ],
  ["bold", "italic", "strike", "code", "link"],
  ["bulleted", "numbered", "task"],
  ["indent", "outdent"],
  ["quote", "code-block", "divider", "table"],
  ["undo", "redo"],
]

const KEYBOARD_BAR_CARET: readonly string[] = [
  "heading-1",
  "heading-2",
  "bulleted",
  "numbered",
  "task",
  "quote",
  "code-block",
  "table",
  "indent",
  "outdent",
  "undo",
  "redo",
]

const KEYBOARD_BAR_SELECTION: readonly string[] = [
  "bold",
  "italic",
  "strike",
  "code",
  "link",
]

function formatShortcut(shortcut: string, platform: "apple" | "other") {
  const isApple = platform === "apple"
  return shortcut
    .split("+")
    .map((key) => {
      if (key === "mod") return isApple ? "⌘" : "Ctrl+"
      if (key === "alt") return isApple ? "⌥" : "Alt+"
      if (key === "shift") return isApple ? "⇧" : "Shift+"
      if (key === "Period") return "."
      return key.length === 1 ? key.toUpperCase() : key
    })
    .join("")
}

function isCommandActive(command: EditorCommand, snapshot: EditorSnapshot) {
  return command.isActive?.(snapshot) ?? false
}

function isCommandEnabled(command: EditorCommand, snapshot: EditorSnapshot) {
  return command.canRun?.(snapshot) ?? true
}

/** Keeps focus and the text selection in the surface when a control is pressed. */
function keepSelection(event: React.PointerEvent) {
  event.preventDefault()
}

function EditorToolbarButton({
  command: commandId,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> & {
  /** The id of the command this button runs and shows the state of. */
  command: string
}) {
  const { store, readOnly, focusContent, openLink } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const command = store.kit.getCommand(commandId)
  if (!command) return null
  const isActive = isCommandActive(command, snapshot)
  const shortcut = command.shortcut
    ? formatShortcut(command.shortcut, store.platform)
    : undefined
  return (
    <button
      type="button"
      data-slot="editor-toolbar-button"
      data-command={command.id}
      aria-label={command.label}
      aria-pressed={command.isActive ? isActive : undefined}
      aria-keyshortcuts={command.shortcut}
      title={shortcut ? `${command.label} (${shortcut})` : command.label}
      disabled={readOnly || !isCommandEnabled(command, snapshot)}
      className={cn(toggleVariants(), "cn-editor-toolbar-button", className)}
      onPointerDown={keepSelection}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (command.id === "link") {
          openLink(event.currentTarget.getBoundingClientRect())
          return
        }
        store.runCommand(command.id)
        focusContent()
      }}
      {...props}
    >
      {children ?? COMMAND_ICONS[command.id] ?? command.label}
    </button>
  )
}

/** Arrow keys move between a toolbar's controls (WAI-ARIA toolbar pattern). */
function onToolbarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"]
  if (!keys.includes(event.key)) return
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)"
    )
  )
  const index = buttons.findIndex(
    (button) => button === event.currentTarget.ownerDocument.activeElement
  )
  const last = buttons.length - 1
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? last
        : event.key === "ArrowRight"
          ? index >= last
            ? 0
            : index + 1
          : index <= 0
            ? last
            : index - 1
  event.preventDefault()
  buttons[next]?.focus()
}

function EditorToolbarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="editor-toolbar-group"
      className={cn("cn-editor-toolbar-group flex items-center", className)}
      {...props}
    />
  )
}

function EditorToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-slot="editor-toolbar-separator"
      className={cn("cn-editor-toolbar-separator shrink-0", className)}
      {...props}
    />
  )
}

function useToolbarGroups(defaults: readonly (readonly string[])[]) {
  const { store } = useEditorContext()
  const listed = new Set(defaults.flat())
  const extra = store.kit
    .getCommandsFor("toolbar")
    .map((command) => command.id)
    .filter((id) => !listed.has(id))
  const groups = defaults.map((group) =>
    group.filter((id) => store.kit.getCommand(id))
  )
  return [...groups, extra].filter((group) => group.length > 0)
}

function EditorToolbar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const groups = useToolbarGroups(DEFAULT_TOOLBAR)
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      tabIndex={0}
      data-slot="editor-toolbar"
      className={cn(
        "cn-editor-toolbar flex items-center overflow-x-auto",
        className
      )}
      onKeyDown={onToolbarKeyDown}
      {...props}
    >
      {children ??
        groups.map((group, index) => (
          <React.Fragment key={group.join()}>
            {index > 0 ? <EditorToolbarSeparator /> : null}
            <EditorToolbarGroup>
              {group.map((id) => (
                <EditorToolbarButton key={id} command={id} />
              ))}
            </EditorToolbarGroup>
          </React.Fragment>
        ))}
    </div>
  )
}

// MARK: Floating parts

function useSelectionRect(isEnabled: boolean) {
  const { store } = useEditorContext()
  const selection = useEditorSelector(store, (state) => state.selection)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  React.useLayoutEffect(() => {
    if (!isEnabled) {
      setRect(null)
      return
    }
    const update = () => setRect(getSelectionRect())
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [isEnabled, selection])
  return rect
}

function useFinePointer() {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(hover: hover) and (pointer: fine)")
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    isFinePointer,
    () => true
  )
}

const BUBBLE_COMMANDS: readonly string[] = [
  "bold",
  "italic",
  "strike",
  "code",
  "link",
]

const BLOCK_TYPE_COMMANDS: readonly string[] = [
  "paragraph",
  "heading-1",
  "heading-2",
  "heading-3",
  "heading-4",
  "heading-5",
  "heading-6",
  "bulleted",
  "numbered",
  "task",
  "quote",
  "code-block",
]

/**
 * "Turn into": the block type at the selection as a button, opening a menu
 * of every type (WAI-ARIA menu button). Arrow keys move, Enter picks,
 * Escape closes. The menu opens inside the control, so a bar holding it
 * keeps focus within itself.
 */
function EditorBlockTypeMenu({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { store, readOnly, focusContent } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const [isOpen, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuId = React.useId()
  const commands = BLOCK_TYPE_COMMANDS.flatMap((id) => {
    const command = store.kit.getCommand(id)
    return command ? [command] : []
  })
  const currentIndex = commands.findIndex((command) =>
    isCommandActive(command, snapshot)
  )
  const current = commands[currentIndex]

  React.useEffect(() => {
    if (!isOpen) return
    menuRef.current
      ?.querySelector<HTMLButtonElement>(`[data-index="${active}"]`)
      ?.focus()
  }, [isOpen, active])

  const open = () => {
    setActive(Math.max(currentIndex, 0))
    setOpen(true)
  }
  const close = (shouldReturnFocus: boolean) => {
    setOpen(false)
    if (shouldReturnFocus) triggerRef.current?.focus()
  }
  const pick = (command: EditorCommand) => {
    store.runCommand(command.id)
    setOpen(false)
    focusContent()
  }

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = commands.length - 1
    const moves: Record<string, number> = {
      ArrowDown: active >= last ? 0 : active + 1,
      ArrowUp: active <= 0 ? last : active - 1,
      Home: 0,
      End: last,
    }
    const move = moves[event.key]
    if (move !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      setActive(move)
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      close(true)
      return
    }
    if (event.key === "Tab") close(false)
  }

  return (
    <div
      data-slot="editor-block-type"
      className={cn("cn-editor-block-type relative", className)}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setOpen(false)
      }}
      {...props}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Turn into, now ${current?.label ?? "mixed"}`}
        disabled={readOnly}
        className={cn(toggleVariants(), "cn-editor-block-type-trigger")}
        onPointerDown={keepSelection}
        onClick={() => (isOpen ? close(false) : open())}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return
          event.preventDefault()
          open()
        }}
      >
        {current?.label ?? "Mixed"}
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconChevronDown"
          hugeicons="ArrowDown01Icon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
          data-icon="inline-end"
        />
      </button>
      {isOpen ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Turn into"
          data-slot="editor-block-type-menu"
          className="cn-editor-block-type-menu absolute start-0 top-full z-50 flex flex-col"
          onKeyDown={onMenuKeyDown}
        >
          {commands.map((command, index) => (
            <button
              key={command.id}
              type="button"
              role="menuitemradio"
              aria-checked={index === currentIndex}
              tabIndex={index === active ? 0 : -1}
              data-index={index}
              data-slot="editor-block-type-item"
              className="cn-editor-block-type-item flex items-center text-start"
              onPointerDown={keepSelection}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(command)}
            >
              <span aria-hidden className="cn-editor-block-type-icon flex">
                {COMMAND_ICONS[command.id]}
              </span>
              <span className="flex-1">{command.label}</span>
              {command.markdownShortcut ? (
                <span
                  aria-hidden
                  className="cn-editor-block-type-shortcut font-mono"
                >
                  {command.markdownShortcut.trim()}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Formatting over a text selection, for mouse and trackpad (touch uses the
 * keyboard bar). By default: Turn into, then the marks and any kit command
 * with the `bubble` surface. Pass children to choose its controls.
 */
function EditorBubbleMenu({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { store, isFocused, readOnly, link } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const isFine = useFinePointer()
  const [hasFocusWithin, setHasFocusWithin] = React.useState(false)
  const isOpen =
    isFine &&
    !readOnly &&
    !link &&
    ((isFocused && !snapshot.isCollapsed) || hasFocusWithin)
  const rect = useSelectionRect(isOpen)
  if (!isOpen || !rect) return null
  const listed = new Set(BUBBLE_COMMANDS)
  const extra = store.kit
    .getCommandsFor("bubble")
    .map((command) => command.id)
    .filter((id) => !listed.has(id))
  const isAbove = rect.top > 56
  return createPortal(
    <div
      role="toolbar"
      aria-label="Selection formatting"
      data-slot="editor-bubble-menu"
      data-side={isAbove ? "top" : "bottom"}
      className={cn(
        "cn-editor-bubble-menu fixed z-50 flex items-center",
        className
      )}
      style={{
        left: rect.left + rect.width / 2,
        top: isAbove ? rect.top : rect.bottom,
        translate: isAbove ? "-50% calc(-100% - 8px)" : "-50% 8px",
      }}
      onKeyDown={onToolbarKeyDown}
      onFocus={() => setHasFocusWithin(true)}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setHasFocusWithin(false)
      }}
      {...props}
    >
      {children ?? (
        <>
          <EditorBlockTypeMenu />
          <EditorToolbarSeparator />
          {[...BUBBLE_COMMANDS, ...extra].map((id) => (
            <EditorToolbarButton key={id} command={id} />
          ))}
        </>
      )}
    </div>,
    document.body
  )
}

function EditorLinkForm({ className, ...props }: React.ComponentProps<"form">) {
  const { store, link, closeLink, focusContent } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const [href, setHref] = React.useState(snapshot.link?.href ?? "")
  if (!link) return null
  const close = () => {
    closeLink()
    focusContent()
  }
  return (
    <form
      role="dialog"
      aria-label="Link"
      data-slot="editor-link"
      className={cn("cn-editor-link fixed z-50 flex items-center", className)}
      style={{ left: link.anchor.left, top: link.anchor.bottom + 8 }}
      onSubmit={(event) => {
        event.preventDefault()
        const value = href.trim()
        store.runCommand("link", value ? { href: value } : undefined)
        close()
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        close()
      }}
      {...props}
    >
      <input
        autoFocus
        type="url"
        inputMode="url"
        value={href}
        placeholder="Paste or type a link"
        aria-label="Link address"
        className="cn-editor-link-input min-w-0 flex-1 outline-none"
        onChange={(event) => setHref(event.target.value)}
      />
      <button
        type="submit"
        className={cn(toggleVariants({ size: "sm" }), "cn-editor-link-action")}
      >
        Apply
      </button>
      {snapshot.link ? (
        <button
          type="button"
          className={cn(
            toggleVariants({ size: "sm" }),
            "cn-editor-link-action"
          )}
          onClick={() => {
            store.runCommand("link")
            close()
          }}
        >
          Remove
        </button>
      ) : null}
    </form>
  )
}

/** Edits the link at the selection; opens from the toolbar or Mod+K. */
function EditorLinkPopover(props: React.ComponentProps<"form">) {
  const { link } = useEditorContext()
  if (!link) return null
  return createPortal(<EditorLinkForm {...props} />, document.body)
}

function useKeyboardBarLayout(isEnabled: boolean) {
  const [layout, setLayout] = React.useState({ isVisible: false, bottom: 0 })
  React.useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport || !isEnabled) {
      setLayout({ isVisible: false, bottom: 0 })
      return
    }
    const update = () =>
      setLayout(
        getKeyboardBarLayout({
          isFocused: isEnabled,
          layoutHeight: window.innerHeight,
          viewportHeight: viewport.height,
          viewportOffsetTop: viewport.offsetTop,
        })
      )
    update()
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    return () => {
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
    }
  }, [isEnabled])
  return layout
}

/** The bar on top of a phone's keyboard. Nothing with a mouse or trackpad. */
function EditorKeyboardBar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { store, isFocused, readOnly, contentRef } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const isFine = useFinePointer()
  const layout = useKeyboardBarLayout(!isFine && isFocused && !readOnly)
  if (!layout.isVisible) return null
  const ids = snapshot.isCollapsed ? KEYBOARD_BAR_CARET : KEYBOARD_BAR_SELECTION
  return createPortal(
    <div
      role="toolbar"
      aria-label="Formatting"
      data-slot="editor-keyboard-bar"
      className={cn(
        "cn-editor-keyboard-bar fixed inset-x-0 z-50 flex items-center",
        className
      )}
      style={{ bottom: layout.bottom }}
      onKeyDown={onToolbarKeyDown}
      {...props}
    >
      <div className="cn-editor-keyboard-bar-commands flex min-w-0 flex-1 items-center overflow-x-auto">
        {ids
          .filter((id) => store.kit.getCommand(id))
          .map((id) => (
            <EditorToolbarButton key={id} command={id} />
          ))}
      </div>
      <button
        type="button"
        aria-label="Hide keyboard"
        className={cn(toggleVariants(), "cn-editor-toolbar-button")}
        onPointerDown={keepSelection}
        onClick={() => contentRef.current?.blur()}
      >
        <IconPlaceholder
          lucide="KeyboardOffIcon"
          tabler="IconKeyboardOff"
          hugeicons="KeyboardIcon"
          phosphor="KeyboardIcon"
          remixicon="RiKeyboardLine"
        />
      </button>
    </div>,
    document.body
  )
}

// MARK: Footer

function countWords(text: string) {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

function EditorFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="editor-footer"
      className={cn("cn-editor-footer flex items-center", className)}
      {...props}
    />
  )
}

function EditorWordCount({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { store } = useEditorContext()
  const words = useEditorSelector(store, (state) =>
    countWords(getFlatText(state.document).replace(/[\u2028\uFFFC]/g, " "))
  )
  return (
    <span
      data-slot="editor-word-count"
      aria-live="polite"
      className={cn("cn-editor-word-count tabular-nums", className)}
      {...props}
    >
      {words === 1 ? "1 word" : `${words} words`}
    </span>
  )
}

export {
  Editor,
  EditorBlockTypeMenu,
  EditorBubbleMenu,
  EditorContent,
  EditorFooter,
  EditorKeyboardBar,
  EditorLinkPopover,
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarGroup,
  EditorToolbarSeparator,
  EditorWordCount,
  useEditor,
}
export type { EditorKit, EditorKitRuntime }
