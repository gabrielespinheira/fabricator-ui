// The native text view behind the editor: one UITextView (TextKit 2) holding
// the whole document as one flat string. JS owns the model; the view shows it,
// reports edits as ranges of that string and reports the caret.
import type { Ref } from "react"
import { requireNativeView } from "expo"
import type { ViewProps } from "react-native"

type EditorNativeSpan = {
  /** UTF-16 offsets in `text`. */
  start: number
  end: number
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  /** The link's href. */
  link?: string
  /** Monospace and muted: Markdown the model shows as its source. */
  raw?: boolean
  /** A code block's syntax colour: the token kind, coloured from `theme.syntax`. */
  token?: EditorNativeTokenKind
}

/** Syntax Highlight's token kinds. */
type EditorNativeTokenKind =
  | "comment"
  | "keyword"
  | "string"
  | "constant"
  | "function"
  | "type"
  | "tag"
  | "attribute"
  | "property"
  | "variable"
  | "regex"
  | "operator"
  | "punctuation"
  | "inserted"
  | "deleted"
  | "heading"
  | "link"

type EditorNativeParagraphKind =
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

type EditorNativeParagraph = {
  /** Offsets of the paragraph's text, without its trailing "\n". */
  start: number
  end: number
  kind: EditorNativeParagraphKind
  /** Heading level, 1 to 6. */
  level?: number
  /** List nesting, 0 at the top. */
  indent?: number
  /** What a list draws in the margin: "•", "◦", "12.". */
  marker?: string
  /** Whether a task is done. */
  checked?: boolean
  /** What a table draws: each cell's plain text, row 0 the header. */
  table?: EditorNativeTable
  /** What a code block shows in its top-end corner: its language's name. */
  label?: string
}

type EditorNativeTableAlign = "left" | "center" | "right" | null

type EditorNativeTable = {
  /** Each cell as plain text, without its Markdown; row 0 is the header. */
  rows: string[][]
  /** Each column's alignment; null is left. */
  align: EditorNativeTableAlign[]
}

type EditorNativeContent = {
  /** Increases whenever JS sends new content. */
  version: number
  /**
   * The document's flat text: paragraphs joined by "\n", a line break inside
   * a paragraph as U+2028, and U+FFFC for a divider, an image or a table.
   */
  text: string
  spans: EditorNativeSpan[]
  paragraphs: EditorNativeParagraph[]
}

type EditorNativeColors = {
  foreground: string
  muted: string
  link: string
  codeBackground: string
  quoteBar: string
  border: string
  caret: string
  selection: string
  placeholder: string
  checkbox: string
  /** The table's header row; the code background when left out. */
  tableHeader?: string
  /** Inline code's chip; the code background when left out. */
  inlineCode?: string
  /** The check in a done task's box; white or black on the box when left out. */
  checkboxForeground?: string
  /** An open task's outline; the foreground at 25% when left out. */
  checkboxBorder?: string
}

type EditorNativeTheme = {
  /** PostScript names; the system font stands in for one that's missing. */
  fontFamily: string
  fontFamilyMedium: string
  fontFamilySemibold: string
  fontFamilyMono: string
  /** The body size, in points. */
  fontSize: number
  /** A multiple of each paragraph's font size, as CSS's unitless line-height. */
  lineHeight: number
  /** [h1, h2, h3, h4, h5, h6], in points. */
  headingSizes: number[]
  /** Points between paragraphs. */
  paragraphSpacing: number
  /** Points per list level. */
  indentWidth: number
  /** "#RRGGBB" or "#RRGGBBAA". */
  colors: EditorNativeColors
  /** Each token kind's colour, "#RRGGBB" or "#RRGGBBAA"; a kind left out draws in the foreground. */
  syntax?: Partial<Record<EditorNativeTokenKind, string>>
}

type EditorNativeSelection = { start: number; end: number; version: number }

type EditorNativeKeyModifier = "command" | "shift" | "alt" | "control"

type EditorNativeKeyCommand = {
  id: string
  /** A character, or "up" | "down" | "left" | "right" | "tab" | "escape" | "enter" | "backspace". */
  input: string
  modifiers: EditorNativeKeyModifier[]
}

type EditorNativeTextReplaceEvent = {
  nativeEvent: {
    from: number
    to: number
    text: string
    selectionStart: number
    selectionEnd: number
    isComposing: boolean
  }
}

type EditorNativeInputKind =
  | "split"
  | "softBreak"
  | "deleteBackward"
  | "deleteForward"

type EditorNativeInputEvent = {
  nativeEvent: { kind: EditorNativeInputKind; from: number; to: number }
}

type EditorNativeSelectionChangeEvent = {
  nativeEvent: { start: number; end: number }
}

type EditorNativeKeyCommandEvent = { nativeEvent: { id: string } }

type EditorNativeCaretRectEvent = {
  nativeEvent: { x: number; y: number; width: number; height: number }
}

type EditorNativeContentHeightEvent = { nativeEvent: { height: number } }

type EditorNativeTaskToggleEvent = { nativeEvent: { paragraphStart: number } }

/** What a tap reports instead of moving the caret: a block, or a code block's language or Copy. */
type EditorNativeBlockKind =
  | "divider"
  | "image"
  | "table"
  | "code-language"
  | "code-copy"

type EditorNativeBlockPressEvent = {
  nativeEvent: { paragraphStart: number; kind: EditorNativeBlockKind }
}

/** What a ref to the view can do. */
type EditorNativeTextViewRef = {
  focus: () => Promise<void>
  blur: () => Promise<void>
}

type EditorNativeTextViewProps = ViewProps & {
  ref?: Ref<EditorNativeTextViewRef>
  content: EditorNativeContent
  theme: EditorNativeTheme
  /** Applied when its version changes, in the same update as `content`. */
  selection?: EditorNativeSelection
  placeholder?: string
  editable?: boolean
  /** false: the view sizes to its content and reports its height. */
  scrollEnabled?: boolean
  /** false turns off smart quotes, smart dashes and smart insert and delete. */
  smartPunctuation?: boolean
  keyCommands?: EditorNativeKeyCommand[]
  autoFocus?: boolean
  onTextReplace?: (event: EditorNativeTextReplaceEvent) => void
  onEditorInput?: (event: EditorNativeInputEvent) => void
  onSelectionChange?: (event: EditorNativeSelectionChangeEvent) => void
  onKeyCommand?: (event: EditorNativeKeyCommandEvent) => void
  onCaretRect?: (event: EditorNativeCaretRectEvent) => void
  onContentHeight?: (event: EditorNativeContentHeightEvent) => void
  onTaskToggle?: (event: EditorNativeTaskToggleEvent) => void
  /** A tap on a divider, an image, a table, or a code block's language or Copy; the caret stays where it was. */
  onBlockPress?: (event: EditorNativeBlockPressEvent) => void
  onEditorFocus?: () => void
  onEditorBlur?: () => void
}

const EditorNativeTextView = requireNativeView<EditorNativeTextViewProps>(
  "EditorNative",
  "EditorNativeTextView"
)

export {
  EditorNativeTextView,
  type EditorNativeBlockKind,
  type EditorNativeBlockPressEvent,
  type EditorNativeCaretRectEvent,
  type EditorNativeColors,
  type EditorNativeContent,
  type EditorNativeContentHeightEvent,
  type EditorNativeInputEvent,
  type EditorNativeInputKind,
  type EditorNativeKeyCommand,
  type EditorNativeKeyCommandEvent,
  type EditorNativeKeyModifier,
  type EditorNativeParagraph,
  type EditorNativeParagraphKind,
  type EditorNativeSelection,
  type EditorNativeSelectionChangeEvent,
  type EditorNativeSpan,
  type EditorNativeTable,
  type EditorNativeTableAlign,
  type EditorNativeTaskToggleEvent,
  type EditorNativeTextReplaceEvent,
  type EditorNativeTextViewProps,
  type EditorNativeTextViewRef,
  type EditorNativeTheme,
  type EditorNativeTokenKind,
}
