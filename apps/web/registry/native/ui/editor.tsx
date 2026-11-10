import * as React from "react"
import {
  EditorNativeTextView,
  type EditorNativeBlockPressEvent,
  type EditorNativeContent,
  type EditorNativeInputEvent,
  type EditorNativeParagraph,
  type EditorNativeParagraphKind,
  type EditorNativeSelection,
  type EditorNativeTextReplaceEvent,
  type EditorNativeTextViewRef,
} from "@fabricator-ui/editor-native"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CheckIcon,
  ChevronDownIcon,
  CodeIcon,
  CopyIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  IconProvider,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  ItalicIcon,
  KeyboardOffIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  MinusIcon,
  PilcrowIcon,
  PlusIcon,
  Redo2Icon,
  SquareCodeIcon,
  StrikethroughIcon,
  TableIcon,
  TextQuoteIcon,
  Undo2Icon,
} from "@fabricator-ui/icons-react-native"
import { Portal } from "@rn-primitives/portal"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import * as Clipboard from "expo-clipboard"
import {
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native"
import {
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller"
import Animated, { useAnimatedStyle } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  getEditorSnapshot,
  type EditorCommand,
  type EditorCommandArgs,
  type EditorSnapshot,
} from "@/registry/fabricator/shared/lib/editor-commands"
import {
  resolveKits,
  starterKit,
  type EditorKit,
  type EditorKitRuntime,
} from "@/registry/fabricator/shared/lib/editor-kit"
import {
  fromFlatOffset,
  getBlockIndex,
  getBlockText,
  getFlatText,
  toFlatOffset,
  type EditorDocument,
} from "@/registry/fabricator/shared/lib/editor-model"
import { getNativeEditorContent } from "@/registry/fabricator/shared/lib/editor-native-content"
import {
  createEditorStore,
  useEditorSelector,
  useEditorSnapshot,
  type EditorStore,
} from "@/registry/fabricator/shared/lib/editor-store"
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
} from "@/registry/fabricator/shared/lib/editor-table"
import {
  applyTransaction,
  createEditorState,
  setBlock,
  type EditorState,
} from "@/registry/fabricator/shared/lib/editor-transaction"
import {
  parseMarkdown,
  type MarkdownSyntax,
} from "@/registry/fabricator/shared/lib/markdown-parse"
import { serializeMarkdown } from "@/registry/fabricator/shared/lib/markdown-serialize"
import {
  getStringAttribute,
  type MarkdownTableAlign,
} from "@/registry/fabricator/shared/lib/markdown-tree"
import {
  getLanguageLabel,
  type SyntaxTokenKind,
} from "@/registry/fabricator/shared/lib/syntax-highlight-model"
import { useBottomBarClaim } from "@/registry/native/lib/bottom-bar"
import { applyDataVariants } from "@/registry/native/lib/data-variants"
import { getTouchSlop } from "@/registry/native/lib/density-scale"
import {
  countWords,
  getDeleteInput,
  getEditorFonts,
  getEditorTheme,
  getMinimumContentHeight,
  getNativeKeyCommands,
  getShortcutKey,
  isPastedText,
  isSameRange,
  toNativeHexColor,
  withAlphaShare,
  type FlatRange,
} from "@/registry/native/lib/editor-native-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { usePressScale } from "@/registry/native/lib/motion"
import { StateFill } from "@/registry/native/lib/press-wash"
import { SheetSurfaceScrollView } from "@/registry/native/lib/sheet-surface"
import { Button } from "@/registry/native/ui/button"
import {
  DensityScope,
  useControlSize,
  useDensity,
} from "@/registry/native/ui/density"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/native/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/native/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { Input } from "@/registry/native/ui/input"
import { Markdown, type MarkdownSize } from "@/registry/native/ui/markdown"
import { Text, TextStyle } from "@/registry/native/ui/text"
import { ToggleGroup, ToggleGroupItem } from "@/registry/native/ui/toggle-group"

// The website's Editor on React Native, from the same store and rules (the
// shared core in lib/editor-*.ts). Its surface is our own native text view,
// one UITextView holding the whole document: the view reports edits as
// ranges of the document's flat text, the store turns them into
// transactions, and the view draws what the store holds. iOS only for now;
// elsewhere the content shows the document read-only.

type EditorContextValue = {
  store: EditorStore
  readOnly: boolean
  placeholder?: string
  autoFocus: boolean
  syntax?: readonly MarkdownSyntax[]
  viewRef: React.RefObject<EditorNativeTextViewRef | null>
  isFocused: boolean
  setFocused: (isFocused: boolean) => void
  isLinkOpen: boolean
  openLink: () => void
  closeLink: () => void
  /** Focuses the text view, which keeps its own selection. */
  focusContent: () => void
}

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

const PLATFORM = Platform.OS === "ios" ? "apple" : "other"

// The native view exists on iOS only for now.
const HAS_NATIVE_VIEW = Platform.OS === "ios"

/** Calls `onValueChange` with the document's Markdown after edits, once per burst. */
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

function Editor({
  value,
  defaultValue,
  onValueChange,
  kits,
  syntax,
  readOnly = false,
  placeholder,
  autoFocus = false,
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
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
  /** Focuses the document when it mounts. */
  autoFocus?: boolean
}) {
  const [store] = React.useState(() =>
    createEditorStore({
      state: createEditorState(
        parseMarkdown(value ?? defaultValue ?? "", { syntax })
      ),
      kit: resolveKits([starterKit, ...(kits ?? [])]),
      platform: PLATFORM,
    })
  )
  useMarkdownValue(store, value, onValueChange, syntax)

  const viewRef = React.useRef<EditorNativeTextViewRef | null>(null)
  const [isFocused, setFocused] = React.useState(false)
  const [isLinkOpen, setIsLinkOpen] = React.useState(false)

  const focusContent = React.useCallback(() => {
    viewRef.current?.focus().catch(() => undefined)
  }, [])
  const openLink = React.useCallback(() => setIsLinkOpen(true), [])
  const closeLink = React.useCallback(() => setIsLinkOpen(false), [])

  const context = React.useMemo<EditorContextValue>(
    () => ({
      store,
      readOnly,
      placeholder,
      autoFocus,
      syntax,
      viewRef,
      isFocused,
      setFocused,
      isLinkOpen,
      openLink,
      closeLink,
      focusContent,
    }),
    [
      store,
      readOnly,
      placeholder,
      autoFocus,
      syntax,
      isFocused,
      isLinkOpen,
      openLink,
      closeLink,
      focusContent,
    ]
  )

  return (
    <EditorContext value={context}>
      <View
        data-slot="editor"
        data-readonly={readOnly}
        data-focused={isFocused}
        className={cn("cn-editor min-w-0 flex-col", className)}
        {...props}
      >
        {children ?? <EditorContent />}
      </View>
    </EditorContext>
  )
}

// MARK: Content

const PARAGRAPH_KINDS: ReadonlySet<string> = new Set<EditorNativeParagraphKind>(
  [
    "paragraph",
    "heading",
    "bulleted",
    "numbered",
    "task",
    "quote",
    "code",
    "divider",
    "image",
    "table",
    "raw",
  ]
)

function isParagraphKind(kind: string): kind is EditorNativeParagraphKind {
  return PARAGRAPH_KINDS.has(kind)
}

// Every new document the view is sent gets a higher version than the last.
let lastContentVersion = 0
const contentVersions = new WeakMap<EditorDocument, number>()

function getContentVersion(document: EditorDocument) {
  const known = contentVersions.get(document)
  if (known !== undefined) return known
  lastContentVersion += 1
  contentVersions.set(document, lastContentVersion)
  return lastContentVersion
}

/** What the view draws for a document. A kit's own block draws as a paragraph. */
function toViewContent(document: EditorDocument): EditorNativeContent {
  const content = getNativeEditorContent(document, getContentVersion(document))
  return {
    ...content,
    paragraphs: content.paragraphs.map(
      (paragraph): EditorNativeParagraph => ({
        ...paragraph,
        kind: isParagraphKind(paragraph.kind) ? paragraph.kind : "paragraph",
      })
    ),
  }
}

function getFlatSelection(state: EditorState): FlatRange | null {
  const { document, selection } = state
  if (!selection) return null
  const anchor = toFlatOffset(document, selection.anchor)
  const focus = toFlatOffset(document, selection.focus)
  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) }
}

const selectDocument = (state: EditorState) => state.document

/**
 * The selection the view is sent. Its version goes up only when the model's
 * selection differs from where the view last put its own, so the caret never
 * fights the person typing: a Markdown shortcut or a toolbar command moves
 * it, typing doesn't.
 */
function useViewSelection(store: EditorStore) {
  const viewSelection = React.useRef<FlatRange | null>(null)
  const [selection, setSelection] = React.useState<EditorNativeSelection>()
  React.useEffect(
    () =>
      store.subscribe(() => {
        const model = getFlatSelection(store.getState())
        if (!model) {
          // Undo back to before the first selection leaves the model with
          // none while the view keeps its caret: the view's is the truth.
          const view = viewSelection.current
          if (view) {
            store.dispatch({
              kind: "select",
              anchor: view.start,
              focus: view.end,
            })
          }
          return
        }
        if (isSameRange(model, viewSelection.current)) return
        // The view applies it with the content of the same render.
        viewSelection.current = model
        setSelection((current) => ({
          ...model,
          version: (current?.version ?? 0) + 1,
        }))
      }),
    [store]
  )
  return { selection, viewSelection }
}

/** Colours from the style map, as the view reads them. */
function useResolvedColor(
  className: string,
  property: "color" | "backgroundColor" | "borderColor"
) {
  const style = useResolveClassNames(className)
  return toNativeHexColor(style[property])
}

const editorTextVariants = cva("cn-editor-text")
const editorPlaceholderVariants = cva("cn-editor-placeholder")
const editorCaretVariants = cva("cn-editor-caret")
const editorSelectionVariants = cva("cn-editor-selection")
const editorCheckboxVariants = cva("cn-editor-task-checkbox-input")
const editorMutedVariants = cva("cn-markdown-raw")
const editorLinkVariants = cva("cn-markdown-link")
const editorInlineCodeVariants = cva("cn-markdown-code")
const editorCheckVariants = cva("cn-markdown-task-check")
const editorCheckboxBorderVariants = cva("cn-markdown-task-checkbox")
// The text view draws code on the website's code panel, read from the rule
// the website's editable code block uses.
const editorCodeVariants = cva("cn-editor-code-block")
const editorQuoteVariants = cva("cn-markdown-quote")
const editorDividerVariants = cva("cn-markdown-divider")
const editorTableHeaderVariants = cva("cn-markdown-table-head")

// Syntax Highlight's token colours, from its own rules, so code in the
// editor reads as it does in Syntax Highlight. One cva each, where the build
// reaches the placeholder.
const syntaxCommentVariants = cva("cn-syntax-highlight-token-comment")
const syntaxKeywordVariants = cva("cn-syntax-highlight-token-keyword")
const syntaxStringVariants = cva("cn-syntax-highlight-token-string")
const syntaxConstantVariants = cva("cn-syntax-highlight-token-constant")
const syntaxFunctionVariants = cva("cn-syntax-highlight-token-function")
const syntaxTypeVariants = cva("cn-syntax-highlight-token-type")
const syntaxTagVariants = cva("cn-syntax-highlight-token-tag")
const syntaxAttributeVariants = cva("cn-syntax-highlight-token-attribute")
const syntaxPropertyVariants = cva("cn-syntax-highlight-token-property")
const syntaxVariableVariants = cva("cn-syntax-highlight-token-variable")
const syntaxRegexVariants = cva("cn-syntax-highlight-token-regex")
const syntaxOperatorVariants = cva("cn-syntax-highlight-token-operator")
const syntaxPunctuationVariants = cva("cn-syntax-highlight-token-punctuation")
const syntaxInsertedVariants = cva("cn-syntax-highlight-token-inserted")
const syntaxDeletedVariants = cva("cn-syntax-highlight-token-deleted")
const syntaxHeadingVariants = cva("cn-syntax-highlight-token-heading")
const syntaxLinkVariants = cva("cn-syntax-highlight-token-link")

/** Each token kind's colour as the view reads it; a kind with none is left out. */
function useSyntaxColors() {
  const colors: Partial<Record<SyntaxTokenKind, string | null>> = {
    comment: useResolvedColor(syntaxCommentVariants(), "color"),
    keyword: useResolvedColor(syntaxKeywordVariants(), "color"),
    string: useResolvedColor(syntaxStringVariants(), "color"),
    constant: useResolvedColor(syntaxConstantVariants(), "color"),
    function: useResolvedColor(syntaxFunctionVariants(), "color"),
    type: useResolvedColor(syntaxTypeVariants(), "color"),
    tag: useResolvedColor(syntaxTagVariants(), "color"),
    attribute: useResolvedColor(syntaxAttributeVariants(), "color"),
    property: useResolvedColor(syntaxPropertyVariants(), "color"),
    variable: useResolvedColor(syntaxVariableVariants(), "color"),
    regex: useResolvedColor(syntaxRegexVariants(), "color"),
    operator: useResolvedColor(syntaxOperatorVariants(), "color"),
    punctuation: useResolvedColor(syntaxPunctuationVariants(), "color"),
    inserted: useResolvedColor(syntaxInsertedVariants(), "color"),
    deleted: useResolvedColor(syntaxDeletedVariants(), "color"),
    heading: useResolvedColor(syntaxHeadingVariants(), "color"),
    link: useResolvedColor(syntaxLinkVariants(), "color"),
  }
  const key = JSON.stringify(colors)
  // One object while the colours stay, so the view doesn't restyle.
  return React.useMemo(() => getSyntaxColors(key), [key])
}

/** The resolved colours, without the kinds that resolved to nothing. */
function getSyntaxColors(json: string): Record<string, string> {
  const parsed: unknown = JSON.parse(json)
  if (typeof parsed !== "object" || parsed === null) return {}
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  )
}

/**
 * The view's theme: the Document role's sizes, the theme's fonts, and
 * colours from the same rules the Markdown preview draws with, so what you
 * edit looks like what the preview shows.
 */
function useEditorTheme(size: MarkdownSize) {
  const [sans, mono] = useCSSVariable(["--font-sans", "--font-mono"])
  const foreground =
    useResolvedColor(editorTextVariants(), "color") ?? "#000000FF"
  const caret = useResolvedColor(editorCaretVariants(), "color") ?? foreground
  const muted = useResolvedColor(editorMutedVariants(), "color") ?? foreground
  const link = useResolvedColor(editorLinkVariants(), "color") ?? foreground
  const codeBackground =
    useResolvedColor(editorCodeVariants(), "backgroundColor") ??
    withAlphaShare(foreground, 0.04)
  // The quote and divider rules size by data-size; only their colour is read.
  const quoteBar =
    useResolvedColor(
      applyDataVariants(editorQuoteVariants(), {}),
      "borderColor"
    ) ?? withAlphaShare(foreground, 0.12)
  const border =
    useResolvedColor(
      applyDataVariants(editorDividerVariants(), {}),
      "backgroundColor"
    ) ?? withAlphaShare(foreground, 0.12)
  const selection =
    useResolvedColor(editorSelectionVariants(), "backgroundColor") ??
    withAlphaShare(caret, 0.2)
  const placeholder =
    useResolvedColor(editorPlaceholderVariants(), "color") ?? muted
  const checkbox =
    useResolvedColor(editorCheckboxVariants(), "backgroundColor") ?? caret
  // The header row's tint, from the rule the Markdown preview's table uses.
  const tableHeader =
    useResolvedColor(
      applyDataVariants(editorTableHeaderVariants(), {}),
      "backgroundColor"
    ) ?? codeBackground
  const inlineCode =
    useResolvedColor(editorInlineCodeVariants(), "backgroundColor") ??
    codeBackground
  // The check inside a done task's box, from Markdown's own check.
  const checkboxForeground =
    useResolvedColor(editorCheckVariants(), "color") ?? foreground
  // An open task's outline, from Markdown's box; its rule sizes by data-size.
  const checkboxBorder =
    useResolvedColor(
      applyDataVariants(editorCheckboxBorderVariants(), {}),
      "borderColor"
    ) ?? withAlphaShare(foreground, 0.25)
  const syntax = useSyntaxColors()
  // One object while nothing changes, so the view doesn't restyle.
  return React.useMemo(
    () =>
      getEditorTheme(size, getEditorFonts(sans, mono), syntax, {
        foreground,
        muted,
        link,
        codeBackground,
        quoteBar,
        border,
        caret,
        selection,
        placeholder,
        checkbox,
        tableHeader,
        inlineCode,
        checkboxForeground,
        checkboxBorder,
      }),
    [
      size,
      sans,
      mono,
      foreground,
      muted,
      link,
      codeBackground,
      quoteBar,
      border,
      caret,
      selection,
      placeholder,
      checkbox,
      tableHeader,
      inlineCode,
      checkboxForeground,
      checkboxBorder,
      syntax,
    ]
  )
}

// Commands the view's own undo manager reports (Cmd+Z, shake, the iPad's
// shortcuts bar), and keys that aren't commands.
const VIEW_HANDLED_COMMANDS = ["undo", "redo"]
const EXTRA_KEYS = ["tab", "shift+tab", "escape"]

function EditorContent({
  size = "default",
  scrollEnabled = false,
  className,
  style,
  accessibilityLabel = "Editor",
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  /** The document type role, as Markdown's. */
  size?: MarkdownSize
  /** Scrolls inside its own height instead of growing with the document. */
  scrollEnabled?: boolean
}) {
  const {
    store,
    readOnly,
    placeholder,
    autoFocus,
    syntax,
    viewRef,
    isFocused,
    setFocused,
    isLinkOpen,
    openLink,
    closeLink,
    focusContent,
  } = useEditorContext()
  const feedback = useFeedback()
  const table = useBlockSheet<{ draft: TableDraft }>()
  const code = useBlockSheet<{ code: string; language: string | null }>()
  const document = useEditorSelector(store, selectDocument)
  const content = React.useMemo(() => toViewContent(document), [document])
  const { selection, viewSelection } = useViewSelection(store)
  const theme = useEditorTheme(size)
  const [contentHeight, setContentHeight] = React.useState(0)
  const keyCommands = React.useMemo(
    () =>
      getNativeKeyCommands(store.kit.shortcuts, store.platform, {
        skip: VIEW_HANDLED_COMMANDS,
        extra: EXTRA_KEYS,
      }),
    [store]
  )

  /** Puts the model's selection where the view's is before an input that reads it. */
  const syncSelection = (range: FlatRange) => {
    viewSelection.current = range
    const model = getFlatSelection(store.getState())
    if (isSameRange(model, range)) return
    store.dispatch({ kind: "select", anchor: range.start, focus: range.end })
  }

  const onTextReplace = ({ nativeEvent }: EditorNativeTextReplaceEvent) => {
    const { from, to, text, selectionStart, selectionEnd } = nativeEvent
    if (isPastedText(text)) {
      // Pasted text parses as Markdown, as on the website.
      syncSelection({ start: from, end: to })
      const normalized = text.replace(/\r\n?/g, "\n")
      store.dispatch({
        kind: "paste",
        text: normalized,
        blocks: parseMarkdown(normalized, { syntax }).blocks,
      })
      return
    }
    viewSelection.current = { start: selectionStart, end: selectionEnd }
    store.dispatch({ kind: "replace", from, to, text })
  }

  const onEditorInput = ({ nativeEvent }: EditorNativeInputEvent) => {
    const { kind, from, to } = nativeEvent
    if (kind === "split" || kind === "softBreak") {
      syncSelection({ start: from, end: to })
      store.dispatch({ kind })
      return
    }
    const input = getDeleteInput(kind, { from, to }, viewSelection.current)
    if (input.kind === "replace") {
      store.dispatch(input)
      return
    }
    syncSelection({ start: input.caret, end: input.caret })
    store.dispatch({ kind: input.kind, unit: "character" })
  }

  const onKeyCommand = (id: string) => {
    if (id === "undo" || id === "redo") {
      store.runCommand(id)
      return
    }
    if (id === "escape") {
      if (isLinkOpen) closeLink()
      else viewRef.current?.blur().catch(() => undefined)
      return
    }
    const command = store.kit.shortcuts.find(
      (binding) => binding.shortcut.toLowerCase() === id
    )
    if (command?.command === "link") {
      openLink()
      return
    }
    const key = getShortcutKey(id, store.platform)
    if (!key) return
    store.dispatch({ kind: "key", key: key.key, modifiers: key.modifiers })
  }

  const onTaskToggle = (paragraphStart: number) => {
    if (readOnly) return
    store.dispatch({
      kind: "select",
      anchor: paragraphStart,
      focus: paragraphStart,
    })
    if (!store.runCommand("toggle-task")) return
    const { isChecked } = getEditorSnapshot(store.getState(), store.kit)
    feedback(isChecked ? "check" : "uncheck")
  }

  const onBlockPress = ({ nativeEvent }: EditorNativeBlockPressEvent) => {
    if (readOnly) return
    const { document } = store.getState()
    const { blockId } = fromFlatOffset(document, nativeEvent.paragraphStart)
    const block = document.blocks[getBlockIndex(document, blockId)]
    if (nativeEvent.kind === "code-copy" && block?.type === "code") {
      // Copy needs no sheet: the caret and the keyboard stay.
      feedback("tap")
      Clipboard.setStringAsync(getBlockText(block)).catch(() => undefined)
      return
    }
    if (nativeEvent.kind === "table" && block?.type === "table") {
      table.open(block.id, isFocused, { draft: getTableDraft(block) })
    } else if (nativeEvent.kind === "code-language" && block?.type === "code") {
      code.open(block.id, isFocused, {
        code: getBlockText(block),
        language: getStringAttribute(block, "language"),
      })
    } else {
      return
    }
    // The sheet takes the keyboard's place; the caret comes back after.
    if (isFocused) viewRef.current?.blur().catch(() => undefined)
  }

  const closeCode = (language: string | null | undefined) => {
    const edit = code.close()
    if (!edit) return
    if (language !== undefined && language !== edit.language) {
      store.apply((state, now) => {
        const block =
          state.document.blocks[getBlockIndex(state.document, edit.blockId)]
        if (block?.type !== "code") return null
        return applyTransaction(state, {
          operations: [
            setBlock(edit.blockId, { attrs: { ...block.attrs, language } }),
          ],
          selectionBefore: state.selection,
          selectionAfter: state.selection,
          origin: "command",
          time: now,
        })
      })
    }
    if (edit.wasFocused) focusContent()
  }

  const closeTable = (draft: TableDraft | null) => {
    const edit = table.close()
    if (!edit) return
    if (draft && JSON.stringify(draft) !== JSON.stringify(edit.draft)) {
      store.apply((state, now) =>
        updateTableBlock(state, edit.blockId, draft, now)
      )
    }
    if (edit.wasFocused) focusContent()
  }

  const minimumHeight = getMinimumContentHeight(size)

  return (
    <View
      data-slot="editor-content"
      data-size={size}
      data-focused={isFocused}
      data-scroll={scrollEnabled}
      className={cn("cn-editor-content", className)}
      style={style}
      {...props}
    >
      {HAS_NATIVE_VIEW ? (
        <EditorNativeTextView
          ref={viewRef}
          content={content}
          theme={theme}
          selection={selection}
          placeholder={placeholder}
          editable={!readOnly}
          scrollEnabled={scrollEnabled}
          smartPunctuation={false}
          keyCommands={keyCommands}
          autoFocus={autoFocus}
          accessibilityLabel={accessibilityLabel}
          style={
            scrollEnabled
              ? { flex: 1, minHeight: minimumHeight }
              : { height: Math.max(contentHeight, minimumHeight) }
          }
          onTextReplace={onTextReplace}
          onEditorInput={onEditorInput}
          onSelectionChange={({ nativeEvent }) => {
            viewSelection.current = nativeEvent
            store.dispatch({
              kind: "select",
              anchor: nativeEvent.start,
              focus: nativeEvent.end,
            })
          }}
          onKeyCommand={({ nativeEvent }) => onKeyCommand(nativeEvent.id)}
          onTaskToggle={({ nativeEvent }) =>
            onTaskToggle(nativeEvent.paragraphStart)
          }
          onBlockPress={onBlockPress}
          onContentHeight={({ nativeEvent }) =>
            setContentHeight(Math.ceil(nativeEvent.height))
          }
          onEditorFocus={() => setFocused(true)}
          onEditorBlur={() => setFocused(false)}
        />
      ) : (
        <Markdown size={size} syntax={syntax}>
          {serializeMarkdown(document, { syntax })}
        </Markdown>
      )}
      <Drawer
        open={table.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeTable(null)
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit table</DrawerTitle>
          </DrawerHeader>
          {table.edit ? (
            <EditorTableEditor
              key={table.edit.session}
              draft={table.edit.draft}
              size={size}
              onDone={(draft) => closeTable(draft)}
              onCancel={() => closeTable(null)}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
      <Drawer
        open={code.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeCode(undefined)
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Code block</DrawerTitle>
          </DrawerHeader>
          {code.edit ? (
            <EditorCodeLanguage
              key={code.edit.session}
              code={code.edit.code}
              language={code.edit.language}
              onPick={(language) => closeCode(language)}
              onCopied={() => closeCode(undefined)}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
    </View>
  )
}

// MARK: Code

/**
 * The languages the picker offers, as the ids written after the fence, the
 * website's list. Others typed after ``` still colour.
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

/**
 * A code block's sheet, opened by a tap on the language the text view draws
 * in its corner: Copy code, and the language to pick, the current one
 * checked. Picking one rewrites the fence as one undo step.
 */
function EditorCodeLanguage({
  code,
  language,
  onPick,
  onCopied,
}: {
  code: string
  language: string | null
  onPick: (language: string | null) => void
  onCopied: () => void
}) {
  const feedback = useFeedback()
  const current = (language ?? "").trim().toLowerCase() || null
  return (
    <View className="cn-editor-code-sheet shrink flex-col">
      <View
        data-slot="editor-code-header"
        className="cn-editor-code-header flex-row items-center"
      >
        <Text numberOfLines={1} className="cn-editor-code-language flex-1">
          {getLanguageLabel(language)}
        </Text>
        <Button
          variant="outline"
          size="sm"
          accessibilityLabel="Copy code"
          className="cn-editor-code-copy"
          onPress={() => {
            Clipboard.setStringAsync(code)
              .then(onCopied)
              .catch(() => undefined)
          }}
        >
          <CopyIcon />
          <Text>Copy code</Text>
        </Button>
      </View>
      <SheetSurfaceScrollView
        role="radiogroup"
        aria-label="Language"
        className="shrink"
      >
        {CODE_LANGUAGES.map((option) => {
          const isChecked = option === current
          return (
            <Pressable
              key={option ?? "plain"}
              role="radio"
              aria-checked={isChecked}
              data-checked={isChecked}
              className="cn-editor-code-language-option flex-row items-center"
              onPress={() => {
                feedback("pick")
                onPick(option)
              }}
            >
              <View className="cn-editor-code-language-check items-center justify-center">
                {isChecked ? <CheckIcon /> : null}
              </View>
              <Text numberOfLines={1} className="flex-1">
                {getLanguageLabel(option)}
              </Text>
              {option ? (
                <Text aria-hidden className="cn-editor-code-language-id">
                  {option}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </SheetSurfaceScrollView>
    </View>
  )
}

// MARK: Tables

type BlockSheetEdit<T> = T & {
  blockId: string
  /** Whether the text view had focus, so closing gives it back. */
  wasFocused: boolean
  /** A new editor per opening, so its fields start from the block. */
  session: number
}

/**
 * Which block a sheet edits. The last one stays while the sheet slides out,
 * and closing returns it once, however many ways the sheet is closed.
 */
function useBlockSheet<T extends object>() {
  const [edit, setEdit] = React.useState<BlockSheetEdit<T> | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const editRef = React.useRef<BlockSheetEdit<T> | null>(null)
  const isOpenRef = React.useRef(false)
  return {
    edit,
    isOpen,
    open: (blockId: string, wasFocused: boolean, value: T) => {
      const next: BlockSheetEdit<T> = {
        ...value,
        blockId,
        wasFocused,
        session: (editRef.current?.session ?? 0) + 1,
      }
      editRef.current = next
      isOpenRef.current = true
      setEdit(next)
      setIsOpen(true)
    },
    close: () => {
      const current = editRef.current
      if (!current || !isOpenRef.current) return null
      isOpenRef.current = false
      setIsOpen(false)
      return current
    },
  }
}

const TABLE_ALIGN_OPTIONS = [
  { value: "left", label: "Align left", icon: <AlignLeftIcon /> },
  { value: "center", label: "Align center", icon: <AlignCenterIcon /> },
  { value: "right", label: "Align right", icon: <AlignRightIcon /> },
] as const

function toTableAlign(value: string | undefined): MarkdownTableAlign {
  return value === "center" || value === "right" ? value : null
}

// A cell of the sheet's grid draws as the Markdown preview's: the header
// tinted and semibold, hairlines between cells, the focused one washed.
// The header cell's rule is the one the theme reads its tint from: a
// placeholder compiles once per file, so both share this cva.
const editorTableBodyVariants = cva("cn-markdown-table-cell")

/** The narrowest a cell's field gets; a wider table scrolls sideways. */
const TABLE_CELL_MIN_WIDTH = 120

function getCellKey({ row, column }: TableCellPosition) {
  return `${row}:${column}`
}

function getCellLabel({ row, column }: TableCellPosition) {
  return `${row === 0 ? "Header" : `Row ${row}`}, column ${column + 1}`
}

function EditorTableAction({
  label,
  children,
  disabled,
  onPress,
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
  onPress: () => void
}) {
  const feedback = useFeedback()
  return (
    <ToolbarPressable
      isOn={false}
      label={label}
      disabled={disabled}
      className="cn-editor-table-action"
      onPress={() => {
        feedback("tap")
        onPress()
      }}
    >
      {children}
    </ToolbarPressable>
  )
}

/**
 * A table in the sheet: its cells as fields holding Markdown (the header row
 * semibold), a toolbar acting on the focused cell's row and column, and the
 * focused column's alignment. Return moves along the cells and past the last
 * one adds a row. Done saves as one undo step; Cancel drops the changes.
 */
function EditorTableEditor({
  draft: initialDraft,
  size,
  onDone,
  onCancel,
}: {
  draft: TableDraft
  size: MarkdownSize
  onDone: (draft: TableDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = React.useState(initialDraft)
  const [position, setPosition] = React.useState<TableCellPosition>({
    row: 0,
    column: 0,
  })
  const [gridWidth, setGridWidth] = React.useState(0)
  const inputs = React.useRef(
    new Map<string, React.ComponentRef<typeof TextInput>>()
  )
  const hasFocusedCell = React.useRef(false)
  const shouldFocus = React.useRef(false)

  // A move keeps the keyboard on the cell it lands in, once that has rendered.
  React.useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    inputs.current.get(getCellKey(position))?.focus()
  }, [position, draft])

  const update = (next: TableDraft, nextPosition: TableCellPosition) => {
    setDraft(next)
    shouldFocus.current = hasFocusedCell.current
    setPosition(nextPosition)
  }

  const rows = draft.cells.length
  const columns = draft.align.length
  const align = draft.align[position.column] ?? null
  // Columns share the sheet's width, never narrower than a field can use.
  const cellWidth = Math.max(
    TABLE_CELL_MIN_WIDTH,
    Math.floor(Math.max(gridWidth - 2, 0) / Math.max(columns, 1))
  )

  return (
    <View
      data-slot="editor-table-editor"
      className="cn-editor-table-editor shrink flex-col"
    >
      <View
        role="toolbar"
        aria-label="Table"
        data-slot="editor-table-toolbar"
        className="cn-editor-table-toolbar flex-row flex-wrap items-center"
      >
        <EditorTableAction
          label="Add row below"
          onPress={() =>
            update(insertTableRow(draft, position.row + 1), {
              row: Math.max(position.row + 1, 1),
              column: position.column,
            })
          }
        >
          <PlusIcon />
          <Text>Row</Text>
        </EditorTableAction>
        <EditorTableAction
          label="Add column to the right"
          onPress={() =>
            update(insertTableColumn(draft, position.column + 1), {
              row: position.row,
              column: position.column + 1,
            })
          }
        >
          <PlusIcon />
          <Text>Column</Text>
        </EditorTableAction>
        <EditorTableAction
          label="Remove row"
          disabled={rows <= 1}
          onPress={() =>
            update(removeTableRow(draft, position.row), {
              row: Math.max(Math.min(position.row, rows - 2), 0),
              column: position.column,
            })
          }
        >
          <MinusIcon />
          <Text>Row</Text>
        </EditorTableAction>
        <EditorTableAction
          label="Remove column"
          disabled={columns <= 1}
          onPress={() =>
            update(removeTableColumn(draft, position.column), {
              row: position.row,
              column: Math.max(Math.min(position.column, columns - 2), 0),
            })
          }
        >
          <MinusIcon />
          <Text>Column</Text>
        </EditorTableAction>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Column alignment"
          value={[align ?? "left"]}
          onValueChange={(value) => {
            const [picked] = value
            // Pressing the current alignment keeps it.
            if (!picked) return
            update(
              setTableAlign(draft, position.column, toTableAlign(picked)),
              position
            )
          }}
        >
          {TABLE_ALIGN_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              accessibilityLabel={option.label}
            >
              {option.icon}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </View>
      <SheetSurfaceScrollView className="shrink">
        <View
          data-slot="editor-table"
          className="cn-markdown-table cn-editor-table"
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-col">
              {draft.cells.map((cells, row) => (
                <View
                  key={row}
                  data-last={row === rows - 1}
                  className="cn-markdown-table-row flex-row"
                >
                  {cells.map((cell, column) => {
                    const cellPosition = { row, column }
                    const isFocused =
                      position.row === row && position.column === column
                    return (
                      <View
                        key={column}
                        data-focused={isFocused}
                        data-last-column={column === columns - 1}
                        data-size={size}
                        className={cn(
                          row === 0
                            ? editorTableHeaderVariants()
                            : editorTableBodyVariants(),
                          "cn-editor-table-cell"
                        )}
                        style={{ width: cellWidth }}
                      >
                        <TextInput
                          ref={(input) => {
                            const key = getCellKey(cellPosition)
                            if (input) inputs.current.set(key, input)
                            else inputs.current.delete(key)
                          }}
                          value={cell}
                          accessibilityLabel={getCellLabel(cellPosition)}
                          data-header={row === 0}
                          data-size={size}
                          returnKeyType="next"
                          submitBehavior="submit"
                          className="cn-editor-table-input"
                          style={{
                            textAlign: draft.align[column] ?? "left",
                          }}
                          onFocus={() => {
                            hasFocusedCell.current = true
                            setPosition(cellPosition)
                          }}
                          onBlur={() => {
                            hasFocusedCell.current = false
                          }}
                          onChangeText={(text) =>
                            setDraft((current) =>
                              setTableCell(current, row, column, text)
                            )
                          }
                          onSubmitEditing={() => {
                            const moved = moveTableCell(
                              draft,
                              cellPosition,
                              "next"
                            )
                            hasFocusedCell.current = true
                            update(moved.draft, moved.position)
                          }}
                        />
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SheetSurfaceScrollView>
      <DrawerFooter className="flex-row">
        <Button variant="outline" className="flex-1" onPress={onCancel}>
          Cancel
        </Button>
        <Button
          className="cn-editor-table-done flex-1"
          onPress={() => onDone(draft)}
        >
          Done
        </Button>
      </DrawerFooter>
    </View>
  )
}

// MARK: Commands and icons

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  "heading-1": <Heading1Icon />,
  "heading-2": <Heading2Icon />,
  "heading-3": <Heading3Icon />,
  "heading-4": <Heading4Icon />,
  "heading-5": <Heading5Icon />,
  "heading-6": <Heading6Icon />,
  paragraph: <PilcrowIcon />,
  bold: <BoldIcon />,
  italic: <ItalicIcon />,
  strike: <StrikethroughIcon />,
  code: <CodeIcon />,
  link: <LinkIcon />,
  bulleted: <ListIcon />,
  numbered: <ListOrderedIcon />,
  task: <ListTodoIcon />,
  quote: <TextQuoteIcon />,
  "code-block": <SquareCodeIcon />,
  divider: <MinusIcon />,
  table: <TableIcon />,
  indent: <IndentIncreaseIcon />,
  outdent: <IndentDecreaseIcon />,
  undo: <Undo2Icon />,
  redo: <Redo2Icon />,
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

/** Space under the floating bar on screens with no home indicator. */
const FLOATING_BAR_GAP = 12

/** Space between the floating bar and iOS's floating keyboard. */
const KEYBOARD_BAR_GAP = 8

// One steady set on the keyboard bar, so a thumb learns where things are:
// marks (which also set what typing at the caret takes), blocks, nesting,
// then history.
const KEYBOARD_BAR: readonly (readonly string[])[] = [
  ["bold", "italic", "strike", "code", "link"],
  [
    "heading-1",
    "heading-2",
    "heading-3",
    "bulleted",
    "numbered",
    "task",
    "quote",
    "code-block",
    "table",
  ],
  ["indent", "outdent"],
  ["undo", "redo"],
]

function isCommandActive(command: EditorCommand, snapshot: EditorSnapshot) {
  return command.isActive?.(snapshot) ?? false
}

function isCommandEnabled(command: EditorCommand, snapshot: EditorSnapshot) {
  return command.canRun?.(snapshot) ?? true
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// The in-editor toolbar is the website's: 36pt buttons with 16pt icons,
// muted at rest. The keyboard bar a thumb works is bigger and firmer: 40pt
// with 20pt icons in the foreground at 80%.
type ToolbarBar = "toolbar" | "keyboard"

const ToolbarBarContext = React.createContext<ToolbarBar>("toolbar")

// One cva each, so the build reaches both placeholders; the bar isn't a
// variant anyone picks.
const editorToolbarButtonTextVariants = cva("cn-editor-toolbar-button-text")
const editorToolbarButtonFillVariants = cva("cn-editor-toolbar-button-fill")
const editorKeyboardBarButtonFillVariants = cva(
  "cn-editor-keyboard-bar-button-fill"
)
const editorKeyboardBarButtonTextVariants = cva(
  "cn-editor-keyboard-bar-button-text"
)
const editorToolbarButtonOnTextVariants = cva(
  "cn-editor-toolbar-button-text-on"
)

const TOOLBAR_SIZES: Record<ToolbarBar, { button: number; icon: number }> = {
  toolbar: { button: 36, icon: 16 },
  keyboard: { button: 40, icon: 20 },
}

/**
 * The Toggle's ghost look, as a Pressable: it never takes focus, so the text
 * view keeps the keyboard and its selection while a command runs.
 */
function ToolbarPressable({
  isOn,
  label,
  disabled = false,
  className,
  children,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "onPress"> & {
  isOn: boolean
  label: string
  className?: string
  children?: React.ReactNode
  onPress: (event: GestureResponderEvent) => void
}) {
  const press = usePressScale()
  const [isHeld, setIsHeld] = React.useState(false)
  const bar = React.use(ToolbarBarContext)
  const control = useControlSize("sm")
  // Sizes at a phone's small control (36pt), scaled with the density.
  const sizes = TOOLBAR_SIZES[bar]
  const height = Math.round((control.height * sizes.button) / 36)
  const iconSize = Math.round((control.height * sizes.icon) / 36)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  const isForeground = isOn || isHeld
  return (
    <DensityScope density={control.density}>
      <TextStyle
        eases
        className={cn(
          bar === "keyboard"
            ? editorKeyboardBarButtonTextVariants()
            : editorToolbarButtonTextVariants(),
          isForeground ? editorToolbarButtonOnTextVariants() : undefined
        )}
      >
        <IconProvider strokeWidth={isForeground ? 2 : 1.5} size={iconSize}>
          <AnimatedPressable
            accessibilityLabel={label}
            aria-disabled={disabled}
            disabled={disabled}
            data-bar={bar}
            hitSlop={getTouchSlop(height)}
            className={cn(
              "cn-editor-toolbar-button flex-row items-center justify-center",
              className
            )}
            style={pressStyle}
            onPressIn={() => {
              press.onPressIn()
              setIsHeld(true)
            }}
            onPressOut={() => {
              press.onPressOut()
              setIsHeld(false)
            }}
            onPress={onPress}
            {...props}
          >
            <StateFill
              isOn={isOn || isHeld}
              className={
                bar === "keyboard"
                  ? editorKeyboardBarButtonFillVariants()
                  : editorToolbarButtonFillVariants()
              }
            />
            {children}
          </AnimatedPressable>
        </IconProvider>
      </TextStyle>
    </DensityScope>
  )
}

function EditorToolbarButton({
  command: commandId,
  className,
  children,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  /** The id of the command this button runs and shows the state of. */
  command: string
  className?: string
  children?: React.ReactNode
}) {
  const { store, readOnly, openLink } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const feedback = useFeedback()
  const command = store.kit.getCommand(commandId)
  if (!command) return null
  const isActive = isCommandActive(command, snapshot)
  const isToggle = command.isActive !== undefined
  return (
    <ToolbarPressable
      data-slot="editor-toolbar-button"
      data-command={command.id}
      data-state={isActive ? "on" : "off"}
      accessibilityRole={isToggle ? "togglebutton" : "button"}
      aria-checked={isToggle ? isActive : undefined}
      isOn={isActive}
      label={command.label}
      disabled={readOnly || !isCommandEnabled(command, snapshot)}
      className={className}
      onPress={(event) => {
        onPress?.(event)
        if (command.id === "link") {
          feedback("tap")
          openLink()
          return
        }
        feedback(isToggle ? (isActive ? "unlatch" : "latch") : "tap")
        store.runCommand(command.id)
      }}
      {...props}
    >
      {children ?? COMMAND_ICONS[command.id] ?? (
        <Text numberOfLines={1}>{command.label}</Text>
      )}
    </ToolbarPressable>
  )
}

function EditorToolbarGroup({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      role="group"
      data-slot="editor-toolbar-group"
      className={cn("cn-editor-toolbar-group flex-row items-center", className)}
      {...props}
    />
  )
}

function EditorToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const bar = React.use(ToolbarBarContext)
  return (
    <View
      role="separator"
      aria-orientation="vertical"
      data-slot="editor-toolbar-separator"
      data-bar={bar}
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
}: React.ComponentProps<typeof View>) {
  const groups = useToolbarGroups(DEFAULT_TOOLBAR)
  return (
    <View
      role="toolbar"
      aria-label="Formatting"
      data-slot="editor-toolbar"
      className={cn("cn-editor-toolbar", className)}
      {...props}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View className="cn-editor-toolbar-content flex-row items-center">
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
        </View>
      </ScrollView>
    </View>
  )
}

// MARK: Turn into

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
 * of every type with its icon and Markdown shortcut, the current one
 * checked. Picking one runs it and leaves the keyboard on the document.
 */
function EditorBlockTypeMenu({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const { store, readOnly, focusContent } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const commands = BLOCK_TYPE_COMMANDS.flatMap((id) => {
    const command = store.kit.getCommand(id)
    return command ? [command] : []
  })
  const current = commands.find((command) => isCommandActive(command, snapshot))
  return (
    <View
      data-slot="editor-block-type"
      className={cn("cn-editor-block-type", className)}
      {...props}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={readOnly}>
          <ToolbarPressable
            isOn={false}
            label={`Turn into, now ${current?.label ?? "mixed"}`}
            aria-haspopup="menu"
            disabled={readOnly}
            className="cn-editor-block-type-trigger"
            onPress={() => undefined}
          >
            <Text numberOfLines={1}>{current?.label ?? "Mixed"}</Text>
            <ChevronDownIcon />
          </ToolbarPressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-slot="editor-block-type-menu"
          aria-label="Turn into"
          className="cn-editor-block-type-menu"
        >
          <DropdownMenuRadioGroup
            value={current?.id ?? ""}
            onValueChange={(id) => {
              store.runCommand(id)
              focusContent()
            }}
          >
            {commands.map((command) => (
              <DropdownMenuRadioItem
                key={command.id}
                value={command.id}
                closeOnClick
                data-slot="editor-block-type-item"
                className="cn-editor-block-type-item"
              >
                <View
                  aria-hidden
                  className="cn-editor-block-type-icon items-center justify-center"
                >
                  {COMMAND_ICONS[command.id]}
                </View>
                <Text numberOfLines={1} className="shrink-0">
                  {command.label}
                </Text>
                {command.markdownShortcut ? (
                  <Text
                    aria-hidden
                    numberOfLines={1}
                    className="cn-editor-block-type-shortcut"
                  >
                    {command.markdownShortcut.trim()}
                  </Text>
                ) : null}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  )
}

// MARK: Floating parts

/**
 * Formatting over a selection is for a mouse or a trackpad, and the system's
 * own menu sits over a touch selection, so on phones and tablets the keyboard
 * bar carries the marks instead. Kept so shared code renders it.
 */
function EditorBubbleMenu(props: React.ComponentProps<typeof View>) {
  return null
}

function EditorLinkForm({ className }: { className?: string }) {
  const { store, closeLink, focusContent } = useEditorContext()
  const snapshot = useEditorSnapshot(store)
  const [href, setHref] = React.useState(snapshot.link?.href ?? "")
  const close = () => {
    closeLink()
    focusContent()
  }
  const apply = () => {
    const value = href.trim()
    store.runCommand("link", value ? { href: value } : undefined)
    close()
  }
  return (
    <DialogContent
      data-slot="editor-link"
      className={cn("cn-editor-link", className)}
    >
      <DialogHeader>
        <DialogTitle>{snapshot.link ? "Edit link" : "Add link"}</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        value={href}
        placeholder="Paste or type a link"
        aria-label="Link address"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        className="cn-editor-link-input"
        onChangeText={setHref}
        onSubmitEditing={apply}
      />
      <DialogFooter>
        {snapshot.link ? (
          <Button
            variant="outline"
            className="cn-editor-link-action"
            onPress={() => {
              store.runCommand("link")
              close()
            }}
          >
            Remove
          </Button>
        ) : null}
        <Button className="cn-editor-link-action" onPress={apply}>
          Apply
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Edits the link at the selection, in a dialog; opens from the toolbar or Mod+K. */
function EditorLinkPopover({ className }: { className?: string }) {
  const { isLinkOpen, closeLink, focusContent } = useEditorContext()
  return (
    <Dialog
      open={isLinkOpen}
      onOpenChange={(isOpen) => {
        if (isOpen) return
        closeLink()
        focusContent()
      }}
    >
      {isLinkOpen ? <EditorLinkForm className={className} /> : null}
    </Dialog>
  )
}

/** The bar on top of the keyboard, while the document has focus. */
/**
 * The formatting bar of a phone or tablet. While the editor has focus it
 * takes the bottom of the screen from the App Shell's tab bar: a floating
 * capsule in the tab bar's place. While the on-screen keyboard is up it floats
 * just above it on iOS, whose keyboard is a rounded panel of its own, and docks
 * full width on Android's. Losing focus gives the tab bar back.
 */
function EditorKeyboardBar({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const context = useEditorContext()
  const { store, isFocused, readOnly, viewRef } = context
  const density = useDensity()
  const name = React.useId()
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)
  const isActive = isFocused && !readOnly
  const isFloating = !isKeyboardVisible || Platform.OS === "ios"
  useBottomBarClaim(isActive)
  if (!isActive) return null
  const groups = KEYBOARD_BAR.map((group) =>
    group.filter((id) => store.kit.getCommand(id))
  ).filter((group) => group.length > 0)
  return (
    // A portal leaves the React tree, so the bar takes the editor along.
    <Portal name={name}>
      <EditorContext value={context}>
        <DensityScope density={density}>
          <ToolbarBarContext value="keyboard">
            <View
              pointerEvents="box-none"
              className="absolute inset-x-0 bottom-0"
            >
              <KeyboardStickyView
                offset={{
                  closed: -Math.max(insets.bottom, FLOATING_BAR_GAP),
                  opened: isFloating ? -KEYBOARD_BAR_GAP : 0,
                }}
              >
                <View
                  role="toolbar"
                  aria-label="Formatting"
                  data-slot="editor-keyboard-bar"
                  data-docked={isKeyboardVisible}
                  data-floating={isFloating}
                  className={cn(
                    "cn-editor-keyboard-bar flex-row items-center",
                    className
                  )}
                  {...props}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                    className="min-w-0 flex-1"
                  >
                    <View className="cn-editor-keyboard-bar-commands flex-row items-center">
                      <EditorBlockTypeMenu />
                      {groups.map((group) => (
                        <React.Fragment key={group.join()}>
                          <EditorToolbarSeparator />
                          {group.map((id) => (
                            <EditorToolbarButton key={id} command={id} />
                          ))}
                        </React.Fragment>
                      ))}
                    </View>
                  </ScrollView>
                  {/* The scrolling commands end here: Done always stays. */}
                  <EditorToolbarSeparator />
                  <ToolbarPressable
                    isOn={false}
                    label={isKeyboardVisible ? "Hide keyboard" : "Done"}
                    onPress={() => {
                      viewRef.current?.blur().catch(() => undefined)
                    }}
                  >
                    {isKeyboardVisible ? <KeyboardOffIcon /> : <CheckIcon />}
                  </ToolbarPressable>
                </View>
              </KeyboardStickyView>
            </View>
          </ToolbarBarContext>
        </DensityScope>
      </EditorContext>
    </Portal>
  )
}

// MARK: Footer

function EditorFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-editor-footer-text">
      <View
        data-slot="editor-footer"
        className={cn("cn-editor-footer flex-row items-center", className)}
        {...props}
      >
        {children}
      </View>
    </TextStyle>
  )
}

const selectWordCount = (state: EditorState) =>
  countWords(getFlatText(state.document))

function EditorWordCount({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { store } = useEditorContext()
  const words = useEditorSelector(store, selectWordCount)
  return (
    <Text
      data-slot="editor-word-count"
      aria-live="polite"
      numberOfLines={1}
      className={cn("cn-editor-word-count", className)}
      {...props}
    >
      {words === 1 ? "1 word" : `${words} words`}
    </Text>
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
