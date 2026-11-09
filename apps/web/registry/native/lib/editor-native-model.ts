// What the native Editor needs that isn't the shared core's: the Document type
// role in points, colours in the form the native text view reads, key
// commands from the kit's shortcuts, and how the view's events become inputs.
// Pure, so the website's Vitest runs it.

type DocumentSize = "sm" | "default" | "lg"

type DocumentType = {
  /** The body size, in points. */
  body: number
  /** [h1, h2, h3, h4, h5, h6], in points. */
  headings: number[]
  /** A multiple of each paragraph's font size. */
  lineHeight: number
  /** Points between blocks. */
  blockGap: number
  /** Points per list level. */
  indent: number
}

/**
 * The website's Document role in points: Markdown's em steps (1.875, 1.5,
 * 1.25, 1.125 for h1 to h4; the small size keeps them closer) of a 14, 16 or
 * 18pt body, blocks 0.75em apart and each list level 1.75em in (the list's
 * 1.5em and the item's 0.25em). The line heights are what the website draws:
 * 1.6 and 1.7 at the small and large sizes, and 1.5 at the default size,
 * where its `text-base` sets the line height after Markdown's 1.65. Documents
 * keep their size whatever the density, as on the website.
 */
const DOCUMENT_TYPE: Record<DocumentSize, DocumentType> = {
  sm: {
    body: 14,
    headings: [20, 17, 15, 15.75, 14, 12.25],
    lineHeight: 1.6,
    blockGap: 10.5,
    indent: 24.5,
  },
  default: {
    body: 16,
    headings: [30, 24, 20, 18, 16, 14],
    lineHeight: 1.65,
    blockGap: 12,
    indent: 28,
  },
  lg: {
    body: 18,
    headings: [33.75, 27, 22.5, 20.25, 18, 15.75],
    lineHeight: 1.7,
    blockGap: 13.5,
    indent: 31.5,
  },
}

/** The website's `min-h-[6lh]`: six lines of body text. */
function getMinimumContentHeight(size: DocumentSize) {
  const type = DOCUMENT_TYPE[size]
  return Math.round(type.body * type.lineHeight * 6)
}

// MARK: Colours

function toHexChannel(value: number) {
  const clamped = Math.min(Math.max(Math.round(value), 0), 255)
  return clamped.toString(16).padStart(2, "0").toUpperCase()
}

function parseChannel(value: string, scale: number) {
  const trimmed = value.trim()
  if (trimmed.endsWith("%")) {
    return (Number.parseFloat(trimmed) / 100) * scale
  }
  return Number.parseFloat(trimmed)
}

/**
 * A resolved colour as "#RRGGBBAA", what the native text view reads. Takes the
 * forms the theme resolves to: hex (3, 4, 6 or 8 digits) and `rgb()` or
 * `rgba()`, with commas or spaces. Anything else is null.
 */
function toNativeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null
  const color = value.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3,8})$/.exec(color)?.[1]
  if (hex) {
    if (hex.length === 3 || hex.length === 4) {
      const expanded = [...hex].map((digit) => digit + digit).join("")
      return toNativeHexColor(`#${expanded}`)
    }
    if (hex.length === 6) return `#${hex.toUpperCase()}FF`
    if (hex.length === 8) return `#${hex.toUpperCase()}`
    return null
  }
  const body = /^rgba?\(([^)]+)\)$/.exec(color)?.[1]
  if (!body) return null
  const [channels = "", slashAlpha] = body.split("/")
  const parts = channels
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
  const [red, green, blue, commaAlpha] = parts
  if (red === undefined || green === undefined || blue === undefined) {
    return null
  }
  const alphaText = slashAlpha ?? commaAlpha
  const alpha = alphaText === undefined ? 1 : parseChannel(alphaText, 1)
  const values = [
    parseChannel(red, 255),
    parseChannel(green, 255),
    parseChannel(blue, 255),
    alpha * 255,
  ]
  if (values.some((channel) => Number.isNaN(channel))) return null
  return `#${values.map(toHexChannel).join("")}`
}

/** A "#RRGGBBAA" colour at a share of its alpha. */
function withAlphaShare(hex: string, share: number) {
  const alpha = Number.parseInt(hex.slice(7, 9), 16)
  return `${hex.slice(0, 7)}${toHexChannel(alpha * share)}`
}

// MARK: Theme

type EditorThemeColors = {
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
  /** The table's header row. */
  tableHeader: string
  /** Inline code's chip. */
  inlineCode: string
  /** The check in a done task's box. */
  checkboxForeground: string
  /** An open task's outline. */
  checkboxBorder: string
}

type EditorThemeFonts = {
  regular: string
  medium: string
  semibold: string
  mono: string
}

/** The native text view's theme, structurally the module's EditorNativeTheme. */
type EditorTheme = {
  fontFamily: string
  fontFamilyMedium: string
  fontFamilySemibold: string
  fontFamilyMono: string
  fontSize: number
  lineHeight: number
  headingSizes: number[]
  paragraphSpacing: number
  indentWidth: number
  colors: EditorThemeColors
  /** Each syntax token kind's colour. */
  syntax: Record<string, string>
}

const WEIGHT_SUFFIXES = {
  regular: "Regular",
  medium: "Medium",
  semibold: "SemiBold",
} as const

/**
 * PostScript names for a family the theme names (`--font-sans: Inter`), the
 * way its static cuts are named. The view falls back to the system font for
 * a name it can't find.
 */
function getEditorFonts(sans: unknown, mono: unknown): EditorThemeFonts {
  const family =
    typeof sans === "string" && sans.trim() !== ""
      ? (sans
          .split(",")[0]
          ?.trim()
          .replace(/^["']|["']$/g, "") ?? "Inter")
      : "Inter"
  const monoFamily =
    typeof mono === "string" && mono.trim() !== ""
      ? (mono
          .split(",")[0]
          ?.trim()
          .replace(/^["']|["']$/g, "") ?? "Menlo")
      : "Menlo"
  return {
    regular: `${family}-${WEIGHT_SUFFIXES.regular}`,
    medium: `${family}-${WEIGHT_SUFFIXES.medium}`,
    semibold: `${family}-${WEIGHT_SUFFIXES.semibold}`,
    mono: `${monoFamily}-Regular`,
  }
}

function getEditorTheme(
  size: DocumentSize,
  fonts: EditorThemeFonts,
  syntax: Record<string, string>,
  colors: EditorThemeColors
): EditorTheme {
  const type = DOCUMENT_TYPE[size]
  return {
    fontFamily: fonts.regular,
    fontFamilyMedium: fonts.medium,
    fontFamilySemibold: fonts.semibold,
    fontFamilyMono: fonts.mono,
    fontSize: type.body,
    lineHeight: type.lineHeight,
    headingSizes: type.headings,
    paragraphSpacing: type.blockGap,
    indentWidth: type.indent,
    colors,
    syntax,
  }
}

// MARK: Key commands

type EditorKeyModifier = "command" | "shift" | "alt" | "control"

type EditorKeyCommand = {
  /** The shortcut it stands for, which the key command event reports back. */
  id: string
  input: string
  modifiers: EditorKeyModifier[]
}

type EditorShortcutKey = {
  key: string
  modifiers: {
    metaKey: boolean
    ctrlKey: boolean
    altKey: boolean
    shiftKey: boolean
  }
}

type EditorPlatformName = "apple" | "other"

// Shortcut key names, as the kit writes them, to what the native view and
// the shared core's key events call them.
const NAMED_KEYS: Readonly<Record<string, { input: string; key: string }>> = {
  period: { input: ".", key: "." },
  comma: { input: ",", key: "," },
  slash: { input: "/", key: "/" },
  backslash: { input: "\\", key: "\\" },
  semicolon: { input: ";", key: ";" },
  quote: { input: "'", key: "'" },
  minus: { input: "-", key: "-" },
  equal: { input: "=", key: "=" },
  bracketleft: { input: "[", key: "[" },
  bracketright: { input: "]", key: "]" },
  backquote: { input: "`", key: "`" },
  enter: { input: "enter", key: "Enter" },
  tab: { input: "tab", key: "Tab" },
  escape: { input: "escape", key: "Escape" },
  esc: { input: "escape", key: "Escape" },
  backspace: { input: "backspace", key: "Backspace" },
  arrowup: { input: "up", key: "ArrowUp" },
  arrowdown: { input: "down", key: "ArrowDown" },
  arrowleft: { input: "left", key: "ArrowLeft" },
  arrowright: { input: "right", key: "ArrowRight" },
}

function readShortcut(shortcut: string, platform: EditorPlatformName) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
  const name = parts.pop()
  if (!name) return null
  const named = NAMED_KEYS[name]
  const key = /^[a-z0-9]$/.test(name) ? { input: name, key: name } : named
  if (!key) return null
  const modifiers = new Set<EditorKeyModifier>()
  for (const part of parts) {
    if (part === "mod")
      modifiers.add(platform === "apple" ? "command" : "control")
    else if (part === "cmd" || part === "meta") modifiers.add("command")
    else if (part === "ctrl" || part === "control") modifiers.add("control")
    else if (part === "alt" || part === "option") modifiers.add("alt")
    else if (part === "shift") modifiers.add("shift")
    else return null
  }
  return { ...key, modifiers }
}

/**
 * The view's key commands for the kit's shortcuts on this platform, one per
 * shortcut, each with the shortcut as its id. `skip` leaves out commands the
 * view already handles (its undo manager reports Cmd+Z), and `extra` adds
 * shortcuts that aren't commands (Tab, Escape).
 */
function getNativeKeyCommands(
  bindings: readonly {
    shortcut: string
    command: string
    platform?: EditorPlatformName
  }[],
  platform: EditorPlatformName,
  options: { skip?: readonly string[]; extra?: readonly string[] } = {}
): EditorKeyCommand[] {
  const skip = new Set(options.skip ?? [])
  const shortcuts = [
    ...bindings
      .filter((binding) => !binding.platform || binding.platform === platform)
      .filter((binding) => !skip.has(binding.command))
      .map((binding) => binding.shortcut),
    ...(options.extra ?? []),
  ]
  const seen = new Set<string>()
  const commands: EditorKeyCommand[] = []
  for (const shortcut of shortcuts) {
    const id = shortcut.toLowerCase()
    if (seen.has(id)) continue
    const key = readShortcut(id, platform)
    if (!key) continue
    seen.add(id)
    commands.push({ id, input: key.input, modifiers: [...key.modifiers] })
  }
  return commands
}

/** The key event a key command's id stands for, as the shared core reads keys. */
function getShortcutKey(
  shortcut: string,
  platform: EditorPlatformName
): EditorShortcutKey | null {
  const key = readShortcut(shortcut, platform)
  if (!key) return null
  return {
    key: key.key,
    modifiers: {
      metaKey: key.modifiers.has("command"),
      ctrlKey: key.modifiers.has("control"),
      altKey: key.modifiers.has("alt"),
      shiftKey: key.modifiers.has("shift"),
    },
  }
}

// MARK: Events

type FlatRange = { start: number; end: number }

function isSameRange(a: FlatRange | null, b: FlatRange | null) {
  if (!a || !b) return a === b
  return (
    Math.min(a.start, a.end) === Math.min(b.start, b.end) &&
    Math.max(a.start, a.end) === Math.max(b.start, b.end)
  )
}

type DeleteKind = "deleteBackward" | "deleteForward"

type DeleteInput =
  | { kind: "replace"; from: number; to: number; text: "" }
  | { kind: DeleteKind; caret: number }

/**
 * What a delete the view reported means. With a caret, deleting one
 * character (Backspace at a paragraph's start) is the core's delete, so its
 * rules apply: a list item outdents, a heading turns into a paragraph. A
 * selection, or a longer range (a word across a paragraph's start), is
 * removed as it is.
 */
function getDeleteInput(
  kind: DeleteKind,
  range: { from: number; to: number },
  viewSelection: FlatRange | null
): DeleteInput {
  const from = Math.min(range.from, range.to)
  const to = Math.max(range.from, range.to)
  const isCaret = !viewSelection || viewSelection.start === viewSelection.end
  if (isCaret && to - from <= 1) {
    const caret =
      viewSelection?.start ?? (kind === "deleteBackward" ? to : from)
    return { kind, caret }
  }
  return { kind: "replace", from, to, text: "" }
}

/**
 * Whether text the view inserted is a paste: typing never brings a line
 * break, since the view reports Return as a split.
 */
function isPastedText(text: string) {
  return /[\r\n]/.test(text)
}

/** The website's word count: runs of text holding a letter or a digit. */
function countWords(flatText: string) {
  return flatText
    .replace(/[\u2028\uFFFC]/g, " ")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

export {
  countWords,
  DOCUMENT_TYPE,
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
}
export type {
  DeleteInput,
  DocumentSize,
  DocumentType,
  EditorKeyCommand,
  EditorShortcutKey,
  EditorTheme,
  EditorThemeColors,
  EditorThemeFonts,
  FlatRange,
}
