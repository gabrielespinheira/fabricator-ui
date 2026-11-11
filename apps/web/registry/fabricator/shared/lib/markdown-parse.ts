// Markdown to the editor document, our own: a CommonMark block parser
// (containers first, then leaves) and inline parser (code spans, delimiter
// runs, links, autolinks, escapes, entities, hard breaks) for the subset in
// docs/plans/editor.md §8.2, with GFM tables, task items and strikethrough.
//
// Every block keeps the exact source it came from (§8.3), so an unedited
// document serialises back byte for byte. What the model can't hold becomes
// a raw block or a raw run, verbatim: nothing is dropped.

import {
  createBlockId,
  getBlockFingerprint,
  normalizeRuns,
  type EditorBlock,
  type EditorDocument,
  type EditorInline,
  type EditorJson,
  type EditorMark,
} from "./editor-model"

/** Extra block syntax a kit adds to Markdown. */
type MarkdownSyntax = {
  /**
   * Reads a block that starts at `lines[index]` (the document's lines, line
   * endings removed), before the built-in syntax. `end` is the index after
   * its last line.
   */
  parseBlock?: (
    lines: readonly string[],
    index: number
  ) => { block: EditorBlock; end: number } | null
  /** Writes a block this syntax owns, or null to leave it to the built-ins. */
  serializeBlock?: (block: EditorBlock) => string | null
}

type MarkdownOptions = { syntax?: readonly MarkdownSyntax[] }

// MARK: Characters

const ASCII_PUNCTUATION: ReadonlySet<string> = new Set(
  "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
)
const UNICODE_PUNCTUATION = /^[\p{P}\p{S}]$/u
const UNICODE_WHITESPACE = /^\s$/u
const WORD_CHARACTER = /^[\p{L}\p{N}]$/u

function isAsciiPunctuation(character: string) {
  return ASCII_PUNCTUATION.has(character)
}

/** The start and end of the text count as whitespace. */
function isWhitespaceCharacter(character: string) {
  return character === "" || UNICODE_WHITESPACE.test(character)
}

function isPunctuationCharacter(character: string) {
  return character !== "" && UNICODE_PUNCTUATION.test(character)
}

function isWordCharacter(character: string) {
  return WORD_CHARACTER.test(character)
}

function isSpaceOrTab(character: string | undefined) {
  return character === " " || character === "\t"
}

/** The whole character before `index`, a surrogate pair included. */
function getCharacterBefore(text: string, index: number) {
  if (index <= 0) return ""
  const code = text.charCodeAt(index - 1)
  if (code >= 0xdc00 && code <= 0xdfff && index >= 2) {
    return text.slice(index - 2, index)
  }
  return text.charAt(index - 1)
}

function getCharacterAt(text: string, index: number) {
  if (index >= text.length) return ""
  return String.fromCodePoint(text.codePointAt(index) ?? 0)
}

/** Whether a run of `*`, `_` or `~` between two characters can open or close. */
function getDelimiterAbility(character: string, before: string, after: string) {
  const isLeftFlanking =
    !isWhitespaceCharacter(after) &&
    (!isPunctuationCharacter(after) ||
      isWhitespaceCharacter(before) ||
      isPunctuationCharacter(before))
  const isRightFlanking =
    !isWhitespaceCharacter(before) &&
    (!isPunctuationCharacter(before) ||
      isWhitespaceCharacter(after) ||
      isPunctuationCharacter(after))
  if (character === "_") {
    return {
      canOpen:
        isLeftFlanking && (!isRightFlanking || isPunctuationCharacter(before)),
      canClose:
        isRightFlanking && (!isLeftFlanking || isPunctuationCharacter(after)),
    }
  }
  return { canOpen: isLeftFlanking, canClose: isRightFlanking }
}

// MARK: Entities

const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
  ["ensp", " "],
  ["emsp", " "],
  ["thinsp", " "],
  ["shy", "­"],
  ["zwj", "‍"],
  ["zwnj", "‌"],
  ["copy", "©"],
  ["reg", "®"],
  ["trade", "™"],
  ["hellip", "…"],
  ["mdash", "—"],
  ["ndash", "–"],
  ["lsquo", "‘"],
  ["rsquo", "’"],
  ["ldquo", "“"],
  ["rdquo", "”"],
  ["laquo", "«"],
  ["raquo", "»"],
  ["middot", "·"],
  ["bull", "•"],
  ["times", "×"],
  ["divide", "÷"],
  ["deg", "°"],
  ["plusmn", "±"],
  ["larr", "←"],
  ["rarr", "→"],
  ["uarr", "↑"],
  ["darr", "↓"],
  ["harr", "↔"],
  ["euro", "€"],
  ["pound", "£"],
  ["yen", "¥"],
  ["cent", "¢"],
  ["sect", "§"],
  ["para", "¶"],
])

const ENTITY =
  /&(?:#([0-9]{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,31}));/y

function decodeCodePoint(codePoint: number) {
  const isInvalid =
    codePoint === 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  return isInvalid ? "�" : String.fromCodePoint(codePoint)
}

/** The entity at `index` and its decoded text, when we decode it. */
function matchEntity(text: string, index: number) {
  ENTITY.lastIndex = index
  const match = ENTITY.exec(text)
  if (!match) return null
  const length = match[0].length
  if (match[1]) return { value: decodeCodePoint(Number(match[1])), length }
  if (match[2]) {
    return { value: decodeCodePoint(parseInt(match[2], 16)), length }
  }
  const value = NAMED_ENTITIES.get(match[3])
  return value === undefined ? null : { value, length }
}

/** Backslash escapes and entities, as in link destinations and titles. */
function unescapeString(text: string) {
  let result = ""
  let index = 0
  while (index < text.length) {
    const character = text[index]
    if (character === "\\" && isAsciiPunctuation(text.charAt(index + 1))) {
      result += text[index + 1]
      index += 2
      continue
    }
    if (character === "&") {
      const entity = matchEntity(text, index)
      if (entity) {
        result += entity.value
        index += entity.length
        continue
      }
    }
    result += character
    index += 1
  }
  return result
}

// MARK: Lines

type SourceLine = {
  text: string
  start: number
  /** Where the line ending starts. */
  end: number
  /** Where the next line starts. */
  next: number
}

function splitLines(source: string): SourceLine[] {
  const lines: SourceLine[] = []
  const pattern = /\r\n|\n|\r/g
  let start = 0
  let match = pattern.exec(source)
  while (match) {
    const next = match.index + match[0].length
    lines.push({
      text: source.slice(start, match.index),
      start,
      end: match.index,
      next,
    })
    start = next
    match = pattern.exec(source)
  }
  if (start < source.length) {
    lines.push({
      text: source.slice(start),
      start,
      end: source.length,
      next: source.length,
    })
  }
  return lines
}

// MARK: Frontmatter

const FRONTMATTER_OPEN = /^---[ \t]*$/
const FRONTMATTER_CLOSE = /^(?:---|\.\.\.)[ \t]*$/

/** The closing fence's line, or -1. A blank first line reads as a divider. */
function findFrontmatterEnd(lines: readonly SourceLine[]) {
  if (lines.length < 2 || lines[0].start !== 0) return -1
  if (!FRONTMATTER_OPEN.test(lines[0].text)) return -1
  if (lines[1].text.trim() === "") return -1
  for (let index = 1; index < lines.length; index += 1) {
    if (FRONTMATTER_CLOSE.test(lines[index].text)) return index
  }
  return -1
}

function getFrontmatterText(
  source: string,
  lines: readonly SourceLine[],
  end: number
) {
  return end === 1 ? "" : source.slice(lines[1].start, lines[end - 1].end)
}

/** The YAML inside a frontmatter source, or null when it isn't one. */
function readFrontmatter(frontmatterSource: string) {
  const lines = splitLines(frontmatterSource)
  const end = findFrontmatterEnd(lines)
  if (end < 0) return null
  return getFrontmatterText(frontmatterSource, lines, end)
}

// MARK: Shared syntax

const THEMATIC_BREAK = /^(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/
const ATX_HEADING = /^#{1,6}(?=[ \t]|$)/
const CODE_FENCE = /^(?:`{3,}(?!.*`)|~{3,})/
const SETEXT_UNDERLINE = /^(?:=+|-+)[ \t]*$/
const BULLET_MARKER = /^[*+-]/
const ORDERED_MARKER = /^(\d{1,9})([.)])/
const TABLE_DELIMITER_ROW =
  /^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/
const TASK_PREFIX = /^\[([ xX])\](?:[ \t]+|$)/
const FOOTNOTE_START = /^\[\^[^\]\s]+\]:/
const ALERT_START = /^\[![A-Za-z]+\]/

const HTML_BLOCK_OPEN: readonly RegExp[] = [
  /^<(?:script|pre|textarea|style)(?:\s|>|$)/i,
  /^<!--/,
  /^<[?]/,
  /^<![A-Za-z]/,
  /^<!\[CDATA\[/,
  /^<[/]?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|[/]?>|$)/i,
]

const HTML_BLOCK_CLOSE: readonly RegExp[] = [
  /<\/(?:script|pre|textarea|style)>/i,
  /-->/,
  /\?>/,
  />/,
  /\]\]>/,
]

const TAG_NAME = /[A-Za-z][A-Za-z0-9.-]*/y
const ATTRIBUTE_NAME = /[A-Za-z_:][A-Za-z0-9_.:-]*/y
const UNQUOTED_VALUE = /[^\s"'=<>`]+/y

function skipWhitespace(text: string, index: number) {
  let position = index
  while (position < text.length && /\s/.test(text[position])) position += 1
  return position
}

function skipBraces(text: string, index: number) {
  let depth = 0
  for (let position = index; position < text.length; position += 1) {
    if (text[position] === "{") depth += 1
    if (text[position] === "}") {
      depth -= 1
      if (depth === 0) return position + 1
    }
  }
  return -1
}

/**
 * The end of an HTML or JSX tag starting at `index`, "open" when the text
 * ends inside it (a tag continued on the next line), or -1.
 */
function scanTag(text: string, index: number): number | "open" {
  if (text[index] !== "<") return -1
  let position = index + 1
  const isClosing = text[position] === "/"
  if (isClosing) position += 1
  TAG_NAME.lastIndex = position
  const name = TAG_NAME.exec(text)
  if (!name) return -1
  position += name[0].length
  if (isClosing) {
    position = skipWhitespace(text, position)
    return text[position] === ">" ? position + 1 : -1
  }
  while (position <= text.length) {
    const afterSpace = skipWhitespace(text, position)
    const hasSpace = afterSpace > position
    position = afterSpace
    if (position >= text.length) return "open"
    if (text[position] === ">") return position + 1
    if (text.startsWith("/>", position)) return position + 2
    if (!hasSpace) return -1
    if (text[position] === "{") {
      const end = skipBraces(text, position)
      if (end < 0) return "open"
      position = end
      continue
    }
    ATTRIBUTE_NAME.lastIndex = position
    const attribute = ATTRIBUTE_NAME.exec(text)
    if (!attribute) return -1
    position += attribute[0].length
    const equals = skipWhitespace(text, position)
    if (text[equals] !== "=") continue
    const value = skipWhitespace(text, equals + 1)
    if (value >= text.length) return "open"
    const quote = text[value]
    if (quote === '"' || quote === "'") {
      const close = text.indexOf(quote, value + 1)
      if (close < 0) return "open"
      position = close + 1
      continue
    }
    if (quote === "{") {
      const end = skipBraces(text, value)
      if (end < 0) return "open"
      position = end
      continue
    }
    UNQUOTED_VALUE.lastIndex = value
    const unquoted = UNQUOTED_VALUE.exec(text)
    if (!unquoted) return -1
    position = value + unquoted[0].length
  }
  return "open"
}

/**
 * CommonMark's seventh HTML block start (a whole tag alone on its line),
 * extended for MDX: a JSX tag whose attributes continue on the next lines.
 */
function isTagLine(text: string) {
  const end = scanTag(text, 0)
  if (end === "open") return true
  return end > 0 && text.slice(end).trim() === ""
}

function getHtmlBlockType(text: string) {
  const index = HTML_BLOCK_OPEN.findIndex((pattern) => pattern.test(text))
  if (index >= 0) return index + 1
  return isTagLine(text) ? 7 : 0
}

function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase().toUpperCase()
}

/** A `[label]` at `index`: its raw content and the index after it. */
function scanLinkLabel(text: string, index: number) {
  if (text[index] !== "[") return null
  let position = index + 1
  while (position < text.length) {
    const character = text[position]
    if (character === "\\") {
      position += 2
      continue
    }
    if (character === "[") return null
    if (character === "]") {
      if (position - index - 1 > 999) return null
      return { content: text.slice(index + 1, position), end: position + 1 }
    }
    position += 1
  }
  return null
}

function parseLinkDestination(text: string, index: number) {
  if (text[index] === "<") {
    let position = index + 1
    while (position < text.length) {
      const character = text[position]
      if (character === "\\" && isAsciiPunctuation(text.charAt(position + 1))) {
        position += 2
        continue
      }
      if (character === ">") {
        return {
          value: unescapeString(text.slice(index + 1, position)),
          end: position + 1,
        }
      }
      if (character === "<" || character === "\n") return null
      position += 1
    }
    return null
  }
  let position = index
  let depth = 0
  while (position < text.length) {
    const character = text[position]
    if (character === "\\" && isAsciiPunctuation(text.charAt(position + 1))) {
      position += 2
      continue
    }
    if (character === "(") {
      depth += 1
      if (depth > 32) return null
    } else if (character === ")") {
      if (depth === 0) break
      depth -= 1
    } else if (character <= " " || character === "\u007f") {
      break
    }
    position += 1
  }
  if (position === index || depth !== 0) return null
  return { value: unescapeString(text.slice(index, position)), end: position }
}

function parseLinkTitle(text: string, index: number) {
  const open = text[index]
  const close = open === "(" ? ")" : open
  if (open !== '"' && open !== "'" && open !== "(") return null
  let position = index + 1
  while (position < text.length) {
    const character = text[position]
    if (character === "\\" && isAsciiPunctuation(text.charAt(position + 1))) {
      position += 2
      continue
    }
    if (character === close) {
      return {
        value: unescapeString(text.slice(index + 1, position)),
        end: position + 1,
      }
    }
    if (open === "(" && character === "(") return null
    if (character === "\n" && /^\n[ \t]*\n/.test(text.slice(position))) {
      return null
    }
    position += 1
  }
  return null
}

function skipSpacesAndOneNewline(text: string, index: number) {
  let position = index
  while (isSpaceOrTab(text[position])) position += 1
  if (text[position] === "\n") {
    position += 1
    while (isSpaceOrTab(text[position])) position += 1
  }
  return position
}

/** A link reference definition at the start of `text`: its label and end. */
function scanReferenceDefinition(text: string) {
  const label = scanLinkLabel(text, 0)
  if (!label || text[label.end] !== ":") return null
  if (normalizeLabel(label.content) === "") return null
  const destinationStart = skipSpacesAndOneNewline(text, label.end + 1)
  const destination = parseLinkDestination(text, destinationStart)
  if (!destination) return null
  const afterDestination = destination.end
  const titleStart = skipSpacesAndOneNewline(text, afterDestination)
  if (titleStart > afterDestination) {
    const title = parseLinkTitle(text, titleStart)
    if (title) {
      let end = title.end
      while (isSpaceOrTab(text[end])) end += 1
      if (end >= text.length || text[end] === "\n") {
        return { label: label.content, end }
      }
    }
  }
  let end = afterDestination
  while (isSpaceOrTab(text[end])) end += 1
  if (end < text.length && text[end] !== "\n") return null
  return { label: label.content, end }
}

/** GFM's extended autolinks: `www.` and `http(s)://` with a valid domain. */
const BARE_AUTOLINK =
  /(?:https?:\/\/|www\.)([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)/iy
const AUTOLINK_PATH = /[^\s<]*/y
const TRAILING_ENTITY = /&[A-Za-z0-9]+;$/
const AUTOLINK_TRAILING_PUNCTUATION: ReadonlySet<string> = new Set("?!.,:*_~")

function countCharacter(text: string, character: string) {
  let count = 0
  for (const item of text) if (item === character) count += 1
  return count
}

function trimAutolink(candidate: string) {
  let text = candidate
  for (;;) {
    const last = text.charAt(text.length - 1)
    if (AUTOLINK_TRAILING_PUNCTUATION.has(last)) {
      text = text.slice(0, -1)
      continue
    }
    if (last === ")" && countCharacter(text, ")") > countCharacter(text, "(")) {
      text = text.slice(0, -1)
      continue
    }
    const entity = last === ";" ? TRAILING_ENTITY.exec(text) : null
    if (entity) {
      text = text.slice(0, -entity[0].length)
      continue
    }
    return text
  }
}

function isAutolinkBoundary(character: string) {
  return (
    character === "" ||
    isWhitespaceCharacter(character) ||
    character === "*" ||
    character === "_" ||
    character === "~" ||
    character === "("
  )
}

/** A bare autolink at `index` of `text`: its length and target. */
function matchBareAutolink(text: string, index: number) {
  if (!isAutolinkBoundary(getCharacterBefore(text, index))) return null
  BARE_AUTOLINK.lastIndex = index
  const match = BARE_AUTOLINK.exec(text)
  if (!match) return null
  const segments = match[1].split(".")
  if (segments.slice(-2).some((segment) => segment.includes("_"))) return null
  AUTOLINK_PATH.lastIndex = index + match[0].length
  const path = AUTOLINK_PATH.exec(text)
  const candidate = trimAutolink(match[0] + (path ? path[0] : ""))
  if (candidate.length < match[0].length) return null
  const isWww = /^www\./i.test(candidate)
  return {
    length: candidate.length,
    href: isWww ? `http://${candidate}` : candidate,
  }
}

function isDecodableEntity(text: string, index: number) {
  return matchEntity(text, index) !== null
}

/** The cells of a table row, `\|` kept escaped for the inline parser. */
function splitTableCells(line: string) {
  let text = line.replace(/^[ \t]+|[ \t]+$/g, "")
  if (text.startsWith("|")) text = text.slice(1)
  let backslashes = 0
  for (
    let index = text.length - 2;
    index >= 0 && text[index] === "\\";
    index -= 1
  ) {
    backslashes += 1
  }
  if (text.endsWith("|") && backslashes % 2 === 0) text = text.slice(0, -1)
  const cells: string[] = []
  let start = 0
  let index = 0
  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2
      continue
    }
    if (text[index] === "|") {
      cells.push(text.slice(start, index))
      start = index + 1
    }
    index += 1
  }
  cells.push(text.slice(start))
  return cells.map((cell) => cell.replace(/^[ \t]+|[ \t]+$/g, ""))
}

function isTableDelimiterRow(text: string) {
  return text.includes("|") && TABLE_DELIMITER_ROW.test(text)
}

// MARK: Block tree

type BlockKind =
  | "document"
  | "quote"
  | "list"
  | "item"
  | "footnote"
  | "paragraph"
  | "heading"
  | "code"
  | "html"
  | "divider"
  | "table"
  | "math"
  | "definition"
  | "extension"

type ListData = {
  isOrdered: boolean
  /** The bullet character, or an ordered list's delimiter. */
  marker: string
  number: number
  markerOffset: number
  padding: number
}

type BlockNode = {
  kind: BlockKind
  parent: BlockNode | null
  children: BlockNode[]
  isOpen: boolean
  startLine: number
  /** The last line this node holds itself; containers add their children's. */
  endLine: number
  /** Content lines, container prefixes removed. */
  lines: string[]
  level: number
  isSetext: boolean
  /** "`" or "~" for fenced code, "" for indented code. */
  fence: string
  fenceLength: number
  fenceOffset: number
  info: string
  htmlType: number
  list: ListData | null
  extension: EditorBlock | null
}

function createNode(kind: BlockKind, line: number): BlockNode {
  return {
    kind,
    parent: null,
    children: [],
    isOpen: true,
    startLine: line,
    endLine: line,
    lines: [],
    level: 0,
    isSetext: false,
    fence: "",
    fenceLength: 0,
    fenceOffset: 0,
    info: "",
    htmlType: 0,
    list: null,
    extension: null,
  }
}

const CONTAINER_KINDS: ReadonlySet<BlockKind> = new Set([
  "document",
  "quote",
  "item",
  "footnote",
])

const LINE_KINDS: ReadonlySet<BlockKind> = new Set([
  "paragraph",
  "code",
  "html",
  "table",
  "math",
])

function canContain(parent: BlockKind, child: BlockKind) {
  if (parent === "list") return child === "item"
  return CONTAINER_KINDS.has(parent) && child !== "item"
}

type BlockParser = {
  lines: readonly SourceLine[]
  syntax: readonly MarkdownSyntax[]
  definitions: Set<string>
  document: BlockNode
  tip: BlockNode
  oldTip: BlockNode
  lastMatchedContainer: BlockNode
  isAllClosed: boolean
  lineIndex: number
  line: string
  offset: number
  column: number
  nextNonspace: number
  nextNonspaceColumn: number
  indent: number
  isIndented: boolean
  isBlank: boolean
  isPartiallyConsumedTab: boolean
}

function findNextNonspace(parser: BlockParser) {
  const { line } = parser
  let index = parser.offset
  let column = parser.column
  while (index < line.length) {
    const character = line[index]
    if (character === " ") {
      index += 1
      column += 1
    } else if (character === "\t") {
      index += 1
      column += 4 - (column % 4)
    } else {
      break
    }
  }
  parser.isBlank = index >= line.length
  parser.nextNonspace = index
  parser.nextNonspaceColumn = column
  parser.indent = column - parser.column
  parser.isIndented = parser.indent >= 4
}

function advanceOffset(parser: BlockParser, count: number, isColumns: boolean) {
  let remaining = count
  while (remaining > 0 && parser.offset < parser.line.length) {
    if (parser.line[parser.offset] === "\t") {
      const charsToTab = 4 - (parser.column % 4)
      if (isColumns) {
        parser.isPartiallyConsumedTab = charsToTab > remaining
        const advance = Math.min(charsToTab, remaining)
        parser.column += advance
        parser.offset += parser.isPartiallyConsumedTab ? 0 : 1
        remaining -= advance
      } else {
        parser.isPartiallyConsumedTab = false
        parser.column += charsToTab
        parser.offset += 1
        remaining -= 1
      }
    } else {
      parser.isPartiallyConsumedTab = false
      parser.offset += 1
      parser.column += 1
      remaining -= 1
    }
  }
}

function advanceNextNonspace(parser: BlockParser) {
  parser.offset = parser.nextNonspace
  parser.column = parser.nextNonspaceColumn
  parser.isPartiallyConsumedTab = false
}

function advanceToEnd(parser: BlockParser) {
  advanceOffset(parser, parser.line.length - parser.offset, false)
}

function getRest(parser: BlockParser) {
  return parser.line.slice(parser.nextNonspace)
}

function addLine(parser: BlockParser) {
  let prefix = ""
  if (parser.isPartiallyConsumedTab) {
    parser.offset += 1
    prefix = " ".repeat(4 - (parser.column % 4))
  }
  parser.tip.lines.push(prefix + parser.line.slice(parser.offset))
  parser.tip.endLine = parser.lineIndex
}

function addChild(
  parser: BlockParser,
  kind: BlockKind,
  line = parser.lineIndex
) {
  while (!canContain(parser.tip.kind, kind)) finalize(parser, parser.tip)
  const node = createNode(kind, line)
  node.parent = parser.tip
  parser.tip.children.push(node)
  parser.tip = node
  return node
}

function insertBefore(node: BlockNode, sibling: BlockNode) {
  const parent = node.parent
  if (!parent) return
  sibling.parent = parent
  parent.children.splice(parent.children.indexOf(node), 0, sibling)
}

function removeNode(node: BlockNode) {
  const parent = node.parent
  if (!parent) return
  parent.children.splice(parent.children.indexOf(node), 1)
}

/** Moves link reference definitions at the start of a paragraph into nodes. */
function extractDefinitions(parser: BlockParser, paragraph: BlockNode) {
  let consumed = 0
  while (consumed < paragraph.lines.length) {
    const text = paragraph.lines.slice(consumed).join("\n")
    if (FOOTNOTE_START.test(text)) break
    const definition = scanReferenceDefinition(text)
    if (!definition) break
    const lineCount = countCharacter(text.slice(0, definition.end), "\n") + 1
    const node = createNode("definition", paragraph.startLine + consumed)
    node.isOpen = false
    node.endLine = node.startLine + lineCount - 1
    insertBefore(paragraph, node)
    parser.definitions.add(normalizeLabel(definition.label))
    consumed += lineCount
  }
  paragraph.lines = paragraph.lines.slice(consumed)
  paragraph.startLine += consumed
  if (paragraph.lines.length === 0) removeNode(paragraph)
}

function finalize(parser: BlockParser, node: BlockNode) {
  node.isOpen = false
  if (node.kind === "paragraph") extractDefinitions(parser, node)
  if (node.kind === "code" && node.fence === "") {
    while (
      node.lines.length > 1 &&
      node.lines[node.lines.length - 1].trim() === ""
    ) {
      node.lines.pop()
    }
    node.endLine = node.startLine + node.lines.length - 1
  }
  parser.tip = node.parent ?? parser.document
}

function closeUnmatchedBlocks(parser: BlockParser) {
  if (parser.isAllClosed) return
  while (parser.oldTip !== parser.lastMatchedContainer) {
    const parent = parser.oldTip.parent
    finalize(parser, parser.oldTip)
    if (!parent) break
    parser.oldTip = parent
  }
  parser.isAllClosed = true
}

/** 0: the line continues the node, 1: it doesn't, 2: it was consumed. */
function continueNode(parser: BlockParser, node: BlockNode): 0 | 1 | 2 {
  const { line } = parser
  switch (node.kind) {
    case "document":
    case "list":
      return 0
    case "quote":
      if (parser.isIndented || line[parser.nextNonspace] !== ">") return 1
      advanceNextNonspace(parser)
      advanceOffset(parser, 1, false)
      if (isSpaceOrTab(line[parser.offset])) advanceOffset(parser, 1, true)
      node.endLine = parser.lineIndex
      return 0
    case "item":
    case "footnote": {
      const width = node.list ? node.list.markerOffset + node.list.padding : 4
      if (parser.isBlank) {
        if (node.children.length === 0) return 1
        advanceNextNonspace(parser)
        return 0
      }
      if (parser.indent < width) return 1
      advanceOffset(parser, width, true)
      return 0
    }
    case "code": {
      if (node.fence !== "") {
        const rest = getRest(parser)
        const closing = /^(`{3,}|~{3,})[ \t]*$/.exec(rest)
        if (
          !parser.isIndented &&
          closing &&
          closing[1][0] === node.fence &&
          closing[1].length >= node.fenceLength
        ) {
          node.endLine = parser.lineIndex
          finalize(parser, node)
          return 2
        }
        let skip = node.fenceOffset
        while (skip > 0 && isSpaceOrTab(line[parser.offset])) {
          advanceOffset(parser, 1, true)
          skip -= 1
        }
        return 0
      }
      if (parser.indent >= 4) {
        advanceOffset(parser, 4, true)
        return 0
      }
      if (parser.isBlank) {
        advanceNextNonspace(parser)
        return 0
      }
      return 1
    }
    case "html":
      return parser.isBlank && node.htmlType >= 6 ? 1 : 0
    case "paragraph":
      return parser.isBlank ? 1 : 0
    case "table":
      return parser.isBlank || startsOtherBlock(parser) ? 1 : 0
    case "math":
      return 0
    default:
      return 1
  }
}

function startsOtherBlock(parser: BlockParser) {
  if (parser.isIndented) return false
  const rest = getRest(parser)
  return (
    rest.startsWith(">") ||
    ATX_HEADING.test(rest) ||
    CODE_FENCE.test(rest) ||
    THEMATIC_BREAK.test(rest) ||
    HTML_BLOCK_OPEN.some((pattern) => pattern.test(rest)) ||
    /^(?:[*+-]|\d{1,9}[.)])(?:[ \t]|$)/.test(rest)
  )
}

function parseListMarker(
  parser: BlockParser,
  container: BlockNode
): ListData | null {
  if (parser.indent >= 4) return null
  const rest = getRest(parser)
  const bullet = BULLET_MARKER.exec(rest)
  const ordered = bullet ? null : ORDERED_MARKER.exec(rest)
  const markerLength = bullet ? 1 : ordered ? ordered[0].length : 0
  if (markerLength === 0) return null
  const next = rest.charAt(markerLength)
  if (next !== "" && !isSpaceOrTab(next)) return null
  if (container.kind === "paragraph") {
    if (rest.slice(markerLength).trim() === "") return null
    if (ordered && Number(ordered[1]) !== 1) return null
  }
  const data: ListData = {
    isOrdered: !bullet,
    marker: bullet ? bullet[0] : ordered ? ordered[2] : "",
    number: ordered ? Number(ordered[1]) : 0,
    markerOffset: parser.indent,
    padding: 0,
  }
  advanceNextNonspace(parser)
  advanceOffset(parser, markerLength, true)
  const spacesStartColumn = parser.column
  const spacesStartOffset = parser.offset
  do {
    advanceOffset(parser, 1, true)
  } while (
    parser.column - spacesStartColumn < 5 &&
    isSpaceOrTab(parser.line[parser.offset])
  )
  const isBlankItem = parser.offset >= parser.line.length
  const spacesAfterMarker = parser.column - spacesStartColumn
  if (spacesAfterMarker >= 5 || spacesAfterMarker < 1 || isBlankItem) {
    data.padding = markerLength + 1
    parser.column = spacesStartColumn
    parser.offset = spacesStartOffset
    if (isSpaceOrTab(parser.line[parser.offset])) advanceOffset(parser, 1, true)
  } else {
    data.padding = markerLength + spacesAfterMarker
  }
  return data
}

function hasMathClosing(parser: BlockParser, rest: string) {
  if (
    rest.length >= 4 &&
    rest.trimEnd().endsWith("$$") &&
    rest.trim() !== "$$"
  ) {
    return true
  }
  return parser.lines
    .slice(parser.lineIndex + 1)
    .some(
      (line) =>
        /^[ \t]*\$\$[ \t]*$/.test(line.text) ||
        line.text.trimEnd().endsWith("$$")
    )
}

/** 0: no block starts here, 1: a container started, 2: a leaf started. */
function startBlock(parser: BlockParser, container: BlockNode): 0 | 1 | 2 {
  const rest = getRest(parser)
  const first = rest.charAt(0)
  if (!parser.isIndented) {
    if (first === ">") {
      advanceNextNonspace(parser)
      advanceOffset(parser, 1, false)
      if (isSpaceOrTab(parser.line[parser.offset]))
        advanceOffset(parser, 1, true)
      closeUnmatchedBlocks(parser)
      addChild(parser, "quote")
      return 1
    }
    const atx = ATX_HEADING.exec(rest)
    if (atx) {
      advanceNextNonspace(parser)
      advanceOffset(parser, atx[0].length, false)
      closeUnmatchedBlocks(parser)
      const heading = addChild(parser, "heading")
      heading.level = atx[0].length
      heading.lines = [
        parser.line
          .slice(parser.offset)
          .replace(/^[ \t]*#+[ \t]*$/, "")
          .replace(/[ \t]+#+[ \t]*$/, ""),
      ]
      advanceToEnd(parser)
      return 2
    }
    const fence = CODE_FENCE.exec(rest)
    if (fence) {
      closeUnmatchedBlocks(parser)
      const code = addChild(parser, "code")
      code.fence = fence[0][0]
      code.fenceLength = fence[0].length
      code.fenceOffset = parser.indent
      code.info = rest.slice(fence[0].length).replace(/^[ \t]+|[ \t]+$/g, "")
      advanceNextNonspace(parser)
      advanceToEnd(parser)
      return 2
    }
    if (first === "<") {
      const type = getHtmlBlockType(rest)
      const canInterrupt =
        type < 7 ||
        (container.kind !== "paragraph" &&
          !(
            !parser.isAllClosed &&
            !parser.isBlank &&
            parser.tip.kind === "paragraph"
          ))
      if (type > 0 && canInterrupt) {
        closeUnmatchedBlocks(parser)
        addChild(parser, "html").htmlType = type
        return 2
      }
    }
    if (
      first === "$" &&
      rest.startsWith("$$") &&
      container.kind !== "paragraph"
    ) {
      if (hasMathClosing(parser, rest)) {
        closeUnmatchedBlocks(parser)
        addChild(parser, "math")
        return 2
      }
    }
    if (first === "[" && container.kind !== "paragraph") {
      const footnote = FOOTNOTE_START.exec(rest)
      if (footnote) {
        advanceNextNonspace(parser)
        advanceOffset(parser, footnote[0].length, false)
        if (isSpaceOrTab(parser.line[parser.offset]))
          advanceOffset(parser, 1, true)
        closeUnmatchedBlocks(parser)
        addChild(parser, "footnote")
        return 1
      }
    }
    if (container.kind === "paragraph" && SETEXT_UNDERLINE.test(rest)) {
      closeUnmatchedBlocks(parser)
      extractDefinitions(parser, container)
      if (container.lines.length > 0) {
        container.kind = "heading"
        container.isSetext = true
        container.level = first === "=" ? 1 : 2
        container.endLine = parser.lineIndex
        advanceToEnd(parser)
        return 2
      }
      // Definitions took the whole paragraph: read the line afresh.
      container.isOpen = false
      parser.tip = container.parent ?? parser.document
      return 1
    }
    if (
      container.kind === "paragraph" &&
      container.lines.length > 0 &&
      isTableDelimiterRow(rest)
    ) {
      const header = container.lines[container.lines.length - 1]
      const headerCells = splitTableCells(header)
      if (headerCells.length === splitTableCells(rest).length) {
        closeUnmatchedBlocks(parser)
        container.lines.pop()
        container.endLine = parser.lineIndex - 2
        if (container.lines.length > 0) {
          finalize(parser, container)
        } else {
          removeNode(container)
          parser.tip = container.parent ?? parser.document
        }
        const table = addChild(parser, "table", parser.lineIndex - 1)
        table.lines = [header, rest]
        table.endLine = parser.lineIndex
        advanceToEnd(parser)
        return 2
      }
    }
    if (THEMATIC_BREAK.test(rest)) {
      closeUnmatchedBlocks(parser)
      const divider = addChild(parser, "divider")
      divider.lines = [parser.line]
      advanceToEnd(parser)
      return 2
    }
  }
  if (!parser.isIndented || container.kind === "list") {
    const data = parseListMarker(parser, container)
    if (data) {
      closeUnmatchedBlocks(parser)
      const previous = parser.tip.list
      const isSameList =
        parser.tip.kind === "list" &&
        previous !== null &&
        previous.isOrdered === data.isOrdered &&
        previous.marker === data.marker
      if (!isSameList) addChild(parser, "list").list = { ...data }
      addChild(parser, "item").list = data
      return 1
    }
  }
  if (parser.isIndented && parser.tip.kind !== "paragraph" && !parser.isBlank) {
    advanceOffset(parser, 4, true)
    closeUnmatchedBlocks(parser)
    addChild(parser, "code")
    return 2
  }
  return 0
}

function tryExtensions(parser: BlockParser) {
  if (parser.syntax.length === 0) return null
  const texts = parser.lines.map((line) => line.text)
  for (const syntax of parser.syntax) {
    if (!syntax.parseBlock) continue
    try {
      const result = syntax.parseBlock(texts, parser.lineIndex)
      if (
        result &&
        Number.isInteger(result.end) &&
        result.end > parser.lineIndex &&
        result.end <= parser.lines.length
      ) {
        return result
      }
    } catch {
      // A kit's parser that fails leaves the line to the built-in syntax.
    }
  }
  return null
}

/** Only the document and lists, which take no prefix, matched the line. */
function isTopLevel(container: BlockNode) {
  for (let node: BlockNode | null = container; node; node = node.parent) {
    if (node.kind !== "document" && node.kind !== "list") return false
  }
  return true
}

const MAYBE_SPECIAL = /^[#`~*+_=<>0-9|:$[-]/

/** Reads one line into the tree; returns the index of the next line. */
function incorporateLine(parser: BlockParser) {
  const index = parser.lineIndex
  parser.line = parser.lines[index].text
  parser.offset = 0
  parser.column = 0
  parser.isBlank = false
  parser.isPartiallyConsumedTab = false
  parser.oldTip = parser.tip

  let container = parser.document
  for (;;) {
    const last = container.children[container.children.length - 1]
    if (!last || !last.isOpen) break
    container = last
    findNextNonspace(parser)
    const result = continueNode(parser, container)
    if (result === 2) return index + 1
    if (result === 1) {
      container = container.parent ?? parser.document
      break
    }
  }
  parser.isAllClosed = container === parser.oldTip
  parser.lastMatchedContainer = container

  findNextNonspace(parser)
  if (
    isTopLevel(container) &&
    !parser.isBlank &&
    parser.tip.kind !== "paragraph"
  ) {
    const extension = tryExtensions(parser)
    if (extension) {
      parser.lastMatchedContainer = parser.document
      closeUnmatchedBlocks(parser)
      const node = createNode("extension", index)
      node.isOpen = false
      node.endLine = extension.end - 1
      node.extension = extension.block
      node.parent = parser.document
      parser.document.children.push(node)
      parser.tip = parser.document
      return extension.end
    }
  }

  let isMatchedLeaf =
    container.kind !== "paragraph" && LINE_KINDS.has(container.kind)
  while (!isMatchedLeaf) {
    findNextNonspace(parser)
    const rest = getRest(parser)
    if (!parser.isIndented && !MAYBE_SPECIAL.test(rest)) {
      advanceNextNonspace(parser)
      break
    }
    const result = startBlock(parser, container)
    if (result === 0) {
      advanceNextNonspace(parser)
      break
    }
    container = parser.tip
    if (result === 2) isMatchedLeaf = true
  }

  if (
    !parser.isAllClosed &&
    !parser.isBlank &&
    parser.tip.kind === "paragraph"
  ) {
    addLine(parser)
    return index + 1
  }

  closeUnmatchedBlocks(parser)
  const kind = container.kind
  if (LINE_KINDS.has(kind)) {
    const isOpeningLine =
      (kind === "code" &&
        container.fence !== "" &&
        container.startLine === index) ||
      (kind === "table" &&
        container.endLine === index &&
        container.lines.length === 2)
    if (!isOpeningLine) addLine(parser)
    if (kind === "html" && container.htmlType >= 1 && container.htmlType <= 5) {
      const closing = HTML_BLOCK_CLOSE[container.htmlType - 1]
      if (closing.test(parser.line.slice(parser.offset)))
        finalize(parser, container)
    }
    if (kind === "math" && isMathClosed(container)) finalize(parser, container)
  } else if (parser.offset < parser.line.length && !parser.isBlank) {
    addChild(parser, "paragraph")
    advanceNextNonspace(parser)
    addLine(parser)
  }
  return index + 1
}

function isMathClosed(node: BlockNode) {
  const lines = node.lines
  if (lines.length === 1) {
    const only = lines[0].trim()
    return only.length >= 4 && only.startsWith("$$") && only.endsWith("$$")
  }
  return lines.length > 1 && lines[lines.length - 1].trimEnd().endsWith("$$")
}

function getNodeEnd(node: BlockNode): number {
  return node.children.reduce(
    (end, child) => Math.max(end, getNodeEnd(child)),
    node.endLine
  )
}

function parseBlockTree(
  lines: readonly SourceLine[],
  start: number,
  syntax: readonly MarkdownSyntax[]
) {
  const document = createNode("document", start)
  const parser: BlockParser = {
    lines,
    syntax,
    definitions: new Set(),
    document,
    tip: document,
    oldTip: document,
    lastMatchedContainer: document,
    isAllClosed: true,
    lineIndex: start,
    line: "",
    offset: 0,
    column: 0,
    nextNonspace: 0,
    nextNonspaceColumn: 0,
    indent: 0,
    isIndented: false,
    isBlank: false,
    isPartiallyConsumedTab: false,
  }
  while (parser.lineIndex < lines.length) {
    parser.lineIndex = incorporateLine(parser)
  }
  while (parser.tip !== document) finalize(parser, parser.tip)
  collectFootnoteLabels(document, parser.definitions, lines)
  return { document, definitions: parser.definitions }
}

function collectFootnoteLabels(
  node: BlockNode,
  definitions: Set<string>,
  lines: readonly SourceLine[]
) {
  for (const child of node.children) {
    if (child.kind === "footnote") {
      const match = /\[\^([^\]\s]+)\]:/.exec(lines[child.startLine].text)
      if (match) definitions.add(normalizeLabel(`^${match[1]}`))
    }
    collectFootnoteLabels(child, definitions, lines)
  }
}

// MARK: Inline

type TextNode = { kind: "text"; text: string }
type DelimiterNode = { kind: "delimiter"; character: string; length: number }
type BracketNode = { kind: "bracket"; text: string }

type InlineNode =
  | TextNode
  | DelimiterNode
  | BracketNode
  | { kind: "raw"; text: string }
  | { kind: "code"; text: string }
  | { kind: "break" }
  | { kind: "mark"; mark: EditorMark; children: InlineNode[] }
  | {
      kind: "image"
      src: string
      alt: string
      title: string | null
      source: string
    }

type DelimiterEntry = {
  node: DelimiterNode
  character: string
  originalLength: number
  canOpen: boolean
  canClose: boolean
}

type BracketEntry = {
  node: BracketNode
  isImage: boolean
  isActive: boolean
  sourceStart: number
  labelStart: number
  delimiterCount: number
}

/** The source style a block's inline text used, kept in its attrs. */
type InlineStyle = {
  isUnderscoreEmphasis: boolean
  isUnderscoreStrong: boolean
  isBackslashBreak: boolean
}

type InlineState = {
  source: string
  position: number
  nodes: InlineNode[]
  delimiters: DelimiterEntry[]
  brackets: BracketEntry[]
  definitions: ReadonlySet<string>
  style: InlineStyle
}

const INLINE_SPECIAL: ReadonlySet<string> = new Set([
  "\n",
  "\\",
  "`",
  "*",
  "_",
  "~",
  "[",
  "]",
  "!",
  "<",
  "&",
])

const URI_AUTOLINK = /<([A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\u0000-\u0020]*)>/y
const EMAIL_AUTOLINK =
  /<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/y

function createInlineStyle(): InlineStyle {
  return {
    isUnderscoreEmphasis: false,
    isUnderscoreStrong: false,
    isBackslashBreak: false,
  }
}

function appendText(state: InlineState, text: string) {
  const last = state.nodes[state.nodes.length - 1]
  if (last && last.kind === "text") {
    last.text += text
    return
  }
  state.nodes.push({ kind: "text", text })
}

function createLinkNode(
  text: string,
  href: string,
  autolink: "angle" | "bare"
): InlineNode {
  return {
    kind: "mark",
    mark: { type: "link", attrs: { href, autolink } },
    children: [{ kind: "text", text }],
  }
}

function parseNewline(state: InlineState) {
  const { source } = state
  let spaces = 0
  while (source[state.position - 1 - spaces] === " ") spaces += 1
  const last = state.nodes[state.nodes.length - 1]
  if (last && last.kind === "text") {
    const trailing = /( *)$/.exec(last.text)
    const strip = Math.min(spaces, trailing ? trailing[1].length : 0)
    last.text = last.text.slice(0, last.text.length - strip)
    if (last.text === "") state.nodes.pop()
  }
  if (spaces >= 2) state.nodes.push({ kind: "break" })
  else appendText(state, " ")
  state.position += 1
  while (source[state.position] === " ") state.position += 1
}

function parseBackslash(state: InlineState) {
  const next = state.source.charAt(state.position + 1)
  if (next === "\n") {
    state.nodes.push({ kind: "break" })
    state.style.isBackslashBreak = true
    state.position += 2
    while (state.source[state.position] === " ") state.position += 1
    return
  }
  if (isAsciiPunctuation(next)) {
    appendText(state, next)
    state.position += 2
    return
  }
  appendText(state, "\\")
  state.position += 1
}

function countRun(text: string, index: number, character: string) {
  let end = index
  while (text[end] === character) end += 1
  return end - index
}

function parseBackticks(state: InlineState) {
  const { source } = state
  const start = state.position
  const length = countRun(source, start, "`")
  let search = start + length
  for (;;) {
    const found = source.indexOf("`", search)
    if (found < 0) break
    const runLength = countRun(source, found, "`")
    if (runLength === length) {
      let content = source.slice(start + length, found).replace(/\n/g, " ")
      if (
        content.length > 1 &&
        content.startsWith(" ") &&
        content.endsWith(" ") &&
        /[^ ]/.test(content)
      ) {
        content = content.slice(1, -1)
      }
      state.nodes.push({ kind: "code", text: content })
      state.position = found + length
      return
    }
    search = found + runLength
  }
  appendText(state, "`".repeat(length))
  state.position = start + length
}

function parseDelimiterRun(state: InlineState) {
  const { source } = state
  const start = state.position
  const character = source[start]
  const length = countRun(source, start, character)
  state.position = start + length
  const text = character.repeat(length)
  if (character === "~" && length !== 2) {
    appendText(state, text)
    return
  }
  const before = start === 0 ? "" : getCharacterBefore(source, start)
  const after = getCharacterAt(source, start + length)
  const ability = getDelimiterAbility(character, before, after)
  if (!ability.canOpen && !ability.canClose) {
    appendText(state, text)
    return
  }
  const node: DelimiterNode = { kind: "delimiter", character, length }
  state.nodes.push(node)
  state.delimiters.push({
    node,
    character,
    originalLength: length,
    canOpen: ability.canOpen,
    canClose: ability.canClose,
  })
}

function parseOpenBracket(state: InlineState, isImage: boolean) {
  const node: BracketNode = { kind: "bracket", text: isImage ? "![" : "[" }
  state.nodes.push(node)
  state.brackets.push({
    node,
    isImage,
    isActive: true,
    sourceStart: state.position,
    labelStart: state.position + node.text.length,
    delimiterCount: state.delimiters.length,
  })
  state.position += node.text.length
}

function parseInlineLinkTail(text: string, index: number) {
  if (text[index] !== "(") return null
  let position = skipWhitespace(text, index + 1)
  if (text[position] === ")")
    return { href: "", title: null, end: position + 1 }
  const destination = parseLinkDestination(text, position)
  if (!destination) return null
  position = destination.end
  let afterTitle = skipWhitespace(text, position)
  let title: string | null = null
  if (afterTitle > position) {
    const parsed = parseLinkTitle(text, afterTitle)
    if (parsed) {
      title = parsed.value
      afterTitle = skipWhitespace(text, parsed.end)
    }
  }
  if (text[afterTitle] !== ")") return null
  return { href: destination.value, title, end: afterTitle + 1 }
}

function getPlainText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
        case "raw":
        case "code":
        case "bracket":
          return node.text
        case "break":
          return "\n"
        case "delimiter":
          return node.character.repeat(node.length)
        case "mark":
          return getPlainText(node.children)
        case "image":
          return node.alt
      }
    })
    .join("")
}

/** Links may not hold links: an inner autolink goes back to plain text. */
function unwrapLinks(nodes: readonly InlineNode[]): InlineNode[] {
  return nodes.flatMap((node): InlineNode[] => {
    if (node.kind !== "mark") return [node]
    if (node.mark.type === "link") return unwrapLinks(node.children)
    return [{ ...node, children: unwrapLinks(node.children) }]
  })
}

function deactivateLinkOpeners(state: InlineState) {
  for (const bracket of state.brackets) {
    if (!bracket.isImage) bracket.isActive = false
  }
}

function replaceWithRaw(state: InlineState, opener: BracketEntry, end: number) {
  const index = state.nodes.indexOf(opener.node)
  state.nodes.splice(index)
  state.delimiters.length = opener.delimiterCount
  state.brackets.pop()
  state.nodes.push({
    kind: "raw",
    text: state.source.slice(opener.sourceStart, end),
  })
  state.position = end
  if (!opener.isImage) deactivateLinkOpeners(state)
}

function parseCloseBracket(state: InlineState) {
  const { source } = state
  const close = state.position
  const afterClose = close + 1
  const opener = state.brackets[state.brackets.length - 1]
  if (!opener) {
    appendText(state, "]")
    state.position = afterClose
    return
  }
  if (!opener.isActive) {
    state.brackets.pop()
    appendText(state, "]")
    state.position = afterClose
    return
  }
  const link = parseInlineLinkTail(source, afterClose)
  if (link) {
    const index = state.nodes.indexOf(opener.node)
    const inner = state.nodes.splice(index + 1)
    state.nodes.splice(index, 1)
    processEmphasis(inner, state.delimiters, opener.delimiterCount, state.style)
    state.delimiters.length = opener.delimiterCount
    state.brackets.pop()
    const text = source.slice(opener.sourceStart, link.end)
    if (opener.isImage) {
      state.nodes.push({
        kind: "image",
        src: link.href,
        alt: getPlainText(inner),
        title: link.title,
        source: text,
      })
    } else if (getPlainText(inner) === "") {
      state.nodes.push({ kind: "raw", text })
    } else {
      state.nodes.push({
        kind: "mark",
        mark: {
          type: "link",
          attrs: {
            href: link.href,
            ...(link.title === null ? {} : { title: link.title }),
          },
        },
        children: unwrapLinks(inner),
      })
    }
    state.position = link.end
    if (!opener.isImage) deactivateLinkOpeners(state)
    return
  }
  const ownLabel = source.slice(opener.labelStart, close)
  const reference = scanLinkLabel(source, afterClose)
  const isFull = reference !== null && reference.content.trim() !== ""
  const label = reference && isFull ? reference.content : ownLabel
  if (state.definitions.has(normalizeLabel(label))) {
    replaceWithRaw(state, opener, reference ? reference.end : afterClose)
    return
  }
  state.brackets.pop()
  appendText(state, "]")
  state.position = afterClose
}

function findTagEnd(source: string, index: number) {
  if (source.startsWith("<!--", index)) {
    if (source.startsWith("<!-->", index)) return index + 5
    if (source.startsWith("<!--->", index)) return index + 6
    const close = source.indexOf("-->", index + 4)
    return close < 0 ? -1 : close + 3
  }
  if (source.startsWith("<?", index)) {
    const close = source.indexOf("?>", index + 2)
    return close < 0 ? -1 : close + 2
  }
  if (source.startsWith("<![CDATA[", index)) {
    const close = source.indexOf("]]>", index + 9)
    return close < 0 ? -1 : close + 3
  }
  if (/^<![A-Za-z]/.test(source.slice(index, index + 3))) {
    const close = source.indexOf(">", index + 2)
    return close < 0 ? -1 : close + 1
  }
  const end = scanTag(source, index)
  return end === "open" ? -1 : end
}

function parseAngle(state: InlineState) {
  const { source, position } = state
  URI_AUTOLINK.lastIndex = position
  const uri = URI_AUTOLINK.exec(source)
  if (uri) {
    state.nodes.push(createLinkNode(uri[1], uri[1], "angle"))
    state.position = position + uri[0].length
    return
  }
  EMAIL_AUTOLINK.lastIndex = position
  const email = EMAIL_AUTOLINK.exec(source)
  if (email) {
    state.nodes.push(createLinkNode(email[1], `mailto:${email[1]}`, "angle"))
    state.position = position + email[0].length
    return
  }
  const end = findTagEnd(source, position)
  if (end > position) {
    state.nodes.push({ kind: "raw", text: source.slice(position, end) })
    state.position = end
    return
  }
  appendText(state, "<")
  state.position = position + 1
}

function parseEntity(state: InlineState) {
  const entity = matchEntity(state.source, state.position)
  if (entity) {
    appendText(state, entity.value)
    state.position += entity.length
    return
  }
  appendText(state, "&")
  state.position += 1
}

function isAutolinkStart(character: string) {
  return (
    character === "h" ||
    character === "H" ||
    character === "w" ||
    character === "W"
  )
}

function parsePlainText(state: InlineState) {
  const { source } = state
  const start = state.position
  let position = start
  while (position < source.length && !INLINE_SPECIAL.has(source[position])) {
    if (isAutolinkStart(source[position])) {
      const autolink = matchBareAutolink(source, position)
      if (autolink) {
        if (position > start) appendText(state, source.slice(start, position))
        const text = source.slice(position, position + autolink.length)
        state.nodes.push(createLinkNode(text, autolink.href, "bare"))
        state.position = position + autolink.length
        return
      }
    }
    position += 1
  }
  appendText(state, source.slice(start, position))
  state.position = position
}

function processEmphasis(
  nodes: InlineNode[],
  delimiters: DelimiterEntry[],
  bottom: number,
  style: InlineStyle
) {
  const openersBottom = new Map<string, DelimiterEntry | null>()
  let closerIndex = bottom
  while (closerIndex < delimiters.length) {
    const closer = delimiters[closerIndex]
    if (!closer.canClose) {
      closerIndex += 1
      continue
    }
    const key = `${closer.character}${closer.canOpen ? 1 : 0}${closer.originalLength % 3}`
    const stopAt = openersBottom.get(key)
    let openerIndex = -1
    for (let index = closerIndex - 1; index >= bottom; index -= 1) {
      const opener = delimiters[index]
      if (stopAt !== undefined && opener === stopAt) break
      if (opener.character !== closer.character || !opener.canOpen) continue
      if (closer.character === "~") {
        if (opener.node.length === closer.node.length) {
          openerIndex = index
          break
        }
        continue
      }
      const isOddMatch =
        (closer.canOpen || opener.canClose) &&
        closer.originalLength % 3 !== 0 &&
        (opener.originalLength + closer.originalLength) % 3 === 0
      if (!isOddMatch) {
        openerIndex = index
        break
      }
    }
    if (openerIndex < 0) {
      openersBottom.set(
        key,
        closerIndex > bottom ? delimiters[closerIndex - 1] : null
      )
      if (closer.canOpen) closerIndex += 1
      else delimiters.splice(closerIndex, 1)
      continue
    }
    const opener = delimiters[openerIndex]
    const isStrike = closer.character === "~"
    const used =
      isStrike || (closer.node.length >= 2 && opener.node.length >= 2) ? 2 : 1
    opener.node.length -= used
    closer.node.length -= used
    const type = isStrike ? "strike" : used === 2 ? "bold" : "italic"
    if (closer.character === "_" && used === 1)
      style.isUnderscoreEmphasis = true
    if (closer.character === "_" && used === 2) style.isUnderscoreStrong = true
    const openerPosition = nodes.indexOf(opener.node)
    const closerPosition = nodes.indexOf(closer.node)
    const inner = nodes.splice(
      openerPosition + 1,
      closerPosition - openerPosition - 1
    )
    nodes.splice(openerPosition + 1, 0, {
      kind: "mark",
      mark: { type },
      children: inner,
    })
    delimiters.splice(openerIndex + 1, closerIndex - openerIndex - 1)
    closerIndex = openerIndex + 1
    if (opener.node.length === 0) {
      nodes.splice(nodes.indexOf(opener.node), 1)
      delimiters.splice(openerIndex, 1)
      closerIndex -= 1
    }
    if (closer.node.length === 0) {
      nodes.splice(nodes.indexOf(closer.node), 1)
      delimiters.splice(closerIndex, 1)
    }
  }
  delimiters.length = bottom
}

function parseInlineNodes(
  source: string,
  definitions: ReadonlySet<string>,
  style: InlineStyle
): InlineNode[] {
  const state: InlineState = {
    source,
    position: 0,
    nodes: [],
    delimiters: [],
    brackets: [],
    definitions,
    style,
  }
  while (state.position < source.length) {
    const character = source[state.position]
    switch (character) {
      case "\n":
        parseNewline(state)
        break
      case "\\":
        parseBackslash(state)
        break
      case "`":
        parseBackticks(state)
        break
      case "*":
      case "_":
      case "~":
        parseDelimiterRun(state)
        break
      case "[":
        parseOpenBracket(state, false)
        break
      case "!":
        if (source[state.position + 1] === "[") parseOpenBracket(state, true)
        else {
          appendText(state, "!")
          state.position += 1
        }
        break
      case "]":
        parseCloseBracket(state)
        break
      case "<":
        parseAngle(state)
        break
      case "&":
        parseEntity(state)
        break
      default:
        parsePlainText(state)
    }
  }
  processEmphasis(state.nodes, state.delimiters, 0, style)
  return state.nodes
}

function hasMarkOfType(marks: readonly EditorMark[], type: string) {
  return marks.some((mark) => mark.type === type)
}

function collectRuns(
  nodes: readonly InlineNode[],
  marks: readonly EditorMark[],
  runs: EditorInline[]
) {
  const withMarks = marks.length ? { marks } : {}
  for (const node of nodes) {
    switch (node.kind) {
      case "text":
      case "bracket":
        runs.push({ text: node.text, ...withMarks })
        break
      case "delimiter":
        runs.push({ text: node.character.repeat(node.length), ...withMarks })
        break
      case "break":
        runs.push({ text: "\n", ...withMarks })
        break
      case "raw":
        runs.push({ text: node.text, ...withMarks, raw: true })
        break
      case "image":
        runs.push({ text: node.source, ...withMarks, raw: true })
        break
      case "code":
        runs.push({ text: node.text, marks: [...marks, { type: "code" }] })
        break
      case "mark":
        collectRuns(
          node.children,
          hasMarkOfType(marks, node.mark.type) ? marks : [...marks, node.mark],
          runs
        )
        break
    }
  }
}

function toRuns(nodes: readonly InlineNode[]) {
  const runs: EditorInline[] = []
  collectRuns(nodes, [], runs)
  return normalizeRuns(runs)
}

/** Paragraph content: lines joined, outer spaces and tabs removed. */
function getInlineSource(lines: readonly string[]) {
  return lines.join("\n").replace(/^[ \t]+|[ \t]+$/g, "")
}

function getStyleAttrs(style: InlineStyle): Record<string, EditorJson> {
  return {
    ...(style.isUnderscoreEmphasis ? { emphasis: "_" } : {}),
    ...(style.isUnderscoreStrong ? { strong: "__" } : {}),
    ...(style.isBackslashBreak ? { hardBreak: "backslash" } : {}),
  }
}

// MARK: Model

type BlockDraft = {
  block: Omit<EditorBlock, "id" | "source">
  startLine: number
  endLine: number
}

type DraftContext = {
  source: string
  lines: readonly SourceLine[]
  definitions: ReadonlySet<string>
}

function getSlice(context: DraftContext, startLine: number, endLine: number) {
  return context.source.slice(
    context.lines[startLine].start,
    context.lines[endLine].end
  )
}

function createRawDraft(
  context: DraftContext,
  startLine: number,
  endLine: number
): BlockDraft {
  return {
    block: {
      type: "raw",
      indent: 0,
      content: [{ text: getSlice(context, startLine, endLine), raw: true }],
      attrs: {},
    },
    startLine,
    endLine,
  }
}

function toJsonMark(mark: EditorMark): EditorJson {
  return mark.attrs
    ? { type: mark.type, attrs: { ...mark.attrs } }
    : { type: mark.type }
}

function toJsonRun(run: EditorInline): EditorJson {
  return {
    text: run.text,
    ...(run.marks ? { marks: run.marks.map(toJsonMark) } : {}),
    ...(run.raw ? { raw: true } : {}),
  }
}

function parseInlineBlock(context: DraftContext, source: string) {
  const style = createInlineStyle()
  const nodes = parseInlineNodes(source, context.definitions, style)
  return { nodes, style }
}

function getTableAlignment(cell: string): EditorJson {
  const isLeft = cell.startsWith(":")
  const isRight = cell.endsWith(":")
  if (isLeft && isRight) return "center"
  if (isLeft) return "left"
  if (isRight) return "right"
  return null
}

function draftTable(context: DraftContext, node: BlockNode): BlockDraft {
  const [header, delimiter, ...body] = node.lines
  const align = splitTableCells(delimiter).map(getTableAlignment)
  const style = createInlineStyle()
  const toCells = (line: string) => {
    const cells = splitTableCells(line)
    return align.map((_, index): EditorJson => {
      const cell = (cells[index] ?? "").replace(/\\\|/g, "|")
      const nodes = parseInlineNodes(cell, context.definitions, style)
      return toRuns(nodes).map(toJsonRun)
    })
  }
  const rows = [header, ...body].map(toCells)
  return {
    block: {
      type: "table",
      indent: 0,
      content: [],
      attrs: { align, rows, ...getStyleAttrs(style) },
    },
    startLine: node.startLine,
    endLine: getNodeEnd(node),
  }
}

function draftCode(node: BlockNode): Omit<EditorBlock, "id" | "source"> {
  if (node.fence === "") {
    return {
      type: "code",
      indent: 0,
      content: normalizeRuns([{ text: node.lines.join("\n") }]),
      attrs: { language: null, fence: "indent" },
    }
  }
  const info = unescapeString(node.info)
  const space = info.search(/[ \t]/)
  const language = space < 0 ? info : info.slice(0, space)
  const meta = space < 0 ? "" : info.slice(space).trim()
  return {
    type: "code",
    indent: 0,
    content: normalizeRuns([{ text: node.lines.join("\n") }]),
    attrs: {
      language: language === "" ? null : language,
      fence: node.fence === "~" ? "~~~" : "```",
      ...(node.fenceLength > 3 ? { fenceLength: node.fenceLength } : {}),
      ...(meta ? { meta } : {}),
    },
  }
}

function draftParagraph(context: DraftContext, node: BlockNode): BlockDraft {
  const { nodes, style } = parseInlineBlock(
    context,
    getInlineSource(node.lines)
  )
  const range = { startLine: node.startLine, endLine: node.endLine }
  const [only] = nodes
  if (nodes.length === 1 && only.kind === "image") {
    return {
      block: {
        type: "image",
        indent: 0,
        content: [],
        attrs: { src: only.src, alt: only.alt, title: only.title },
      },
      ...range,
    }
  }
  return {
    block: {
      type: "paragraph",
      indent: 0,
      content: toRuns(nodes),
      attrs: getStyleAttrs(style),
    },
    ...range,
  }
}

function draftHeading(context: DraftContext, node: BlockNode): BlockDraft {
  const { nodes, style } = parseInlineBlock(
    context,
    getInlineSource(node.lines)
  )
  return {
    block: {
      type: "heading",
      indent: 0,
      content: toRuns(nodes),
      attrs: {
        level: node.level,
        ...(node.isSetext ? { style: "setext" } : {}),
        ...getStyleAttrs(style),
      },
    },
    startLine: node.startLine,
    endLine: node.endLine,
  }
}

function draftQuote(context: DraftContext, node: BlockNode): BlockDraft {
  const endLine = getNodeEnd(node)
  const isPlain = node.children.every((child) => child.kind === "paragraph")
  const first = node.children[0]
  const isAlert = first !== undefined && ALERT_START.test(first.lines[0] ?? "")
  if (!isPlain || isAlert)
    return createRawDraft(context, node.startLine, endLine)
  const style = createInlineStyle()
  const runs = node.children.flatMap((child, index) => {
    const nodes = parseInlineNodes(
      getInlineSource(child.lines),
      context.definitions,
      style
    )
    const separator: EditorInline[] = index > 0 ? [{ text: "\n\n" }] : []
    return [...separator, ...toRuns(nodes)]
  })
  return {
    block: {
      type: "quote",
      indent: 0,
      content: normalizeRuns(runs),
      attrs: getStyleAttrs(style),
    },
    startLine: node.startLine,
    endLine,
  }
}

/**
 * A list's items as blocks, with the paragraphs continuing an item one level
 * deeper than it, or false when an item holds what the model can't.
 */
function draftListItems(
  context: DraftContext,
  list: BlockNode,
  indent: number,
  drafts: BlockDraft[]
): boolean {
  const data = list.list
  if (!data) return false
  for (const item of list.children) {
    const itemData = item.list
    if (!itemData) return false
    const [first, ...rest] = item.children
    const paragraph = first && first.kind === "paragraph" ? first : null
    const nested = paragraph ? rest : item.children
    if (
      nested.some(
        (child) => child.kind !== "list" && child.kind !== "paragraph"
      )
    ) {
      return false
    }
    const ownEnd = paragraph ? paragraph.endLine : item.startLine
    if (nested.some((child) => child.startLine <= ownEnd)) return false
    let source = paragraph ? getInlineSource(paragraph.lines) : ""
    let type = data.isOrdered ? "numbered" : "bulleted"
    let attrs: Record<string, EditorJson> = data.isOrdered
      ? { number: itemData.number, delimiter: itemData.marker }
      : { marker: itemData.marker }
    const task = TASK_PREFIX.exec(source)
    if (task) {
      if (data.isOrdered) return false
      type = "task"
      attrs = { checked: task[1] !== " ", marker: itemData.marker }
      source = source.slice(task[0].length)
    }
    const { nodes, style } = parseInlineBlock(context, source)
    drafts.push({
      block: {
        type,
        indent,
        content: toRuns(nodes),
        attrs: { ...attrs, ...getStyleAttrs(style) },
      },
      startLine: item.startLine,
      endLine: ownEnd,
    })
    for (const child of nested) {
      if (child.kind === "list") {
        if (!draftListItems(context, child, indent + 1, drafts)) return false
        continue
      }
      const continuation = draftParagraph(context, child)
      // An image alone would read back as an image block, which can't nest.
      if (continuation.block.type !== "paragraph") return false
      drafts.push({
        ...continuation,
        block: { ...continuation.block, indent: indent + 1 },
      })
    }
  }
  return true
}

function draftNode(context: DraftContext, node: BlockNode): BlockDraft[] {
  const endLine = getNodeEnd(node)
  switch (node.kind) {
    case "paragraph":
      return [draftParagraph(context, node)]
    case "heading":
      return [draftHeading(context, node)]
    case "code":
      return [{ block: draftCode(node), startLine: node.startLine, endLine }]
    case "divider":
      return [
        {
          block: {
            type: "divider",
            indent: 0,
            content: [],
            attrs: { marker: node.lines[0] ?? "---" },
          },
          startLine: node.startLine,
          endLine,
        },
      ]
    case "table":
      return [draftTable(context, node)]
    case "quote":
      return [draftQuote(context, node)]
    case "list": {
      const drafts: BlockDraft[] = []
      if (draftListItems(context, node, 0, drafts)) return drafts
      return [createRawDraft(context, node.startLine, endLine)]
    }
    case "extension": {
      const block = node.extension
      if (!block) return [createRawDraft(context, node.startLine, endLine)]
      return [
        {
          block: {
            type: block.type,
            indent: block.indent,
            content: block.content,
            attrs: block.attrs,
          },
          startLine: node.startLine,
          endLine,
        },
      ]
    }
    default:
      return [createRawDraft(context, node.startLine, endLine)]
  }
}

function createDocument(
  source: string,
  lines: readonly SourceLine[],
  syntax: readonly MarkdownSyntax[]
): EditorDocument {
  const frontmatterEnd = findFrontmatterEnd(lines)
  const hasFrontmatter = frontmatterEnd > 0
  const frontmatterSource = hasFrontmatter
    ? source.slice(0, lines[frontmatterEnd].next)
    : ""
  const { document, definitions } = parseBlockTree(
    lines,
    hasFrontmatter ? frontmatterEnd + 1 : 0,
    syntax
  )
  const context: DraftContext = { source, lines, definitions }
  const drafts = document.children.flatMap((node) => draftNode(context, node))
  const blocks: EditorBlock[] = []
  let previousEnd = frontmatterSource.length
  for (const draft of drafts) {
    const start = lines[draft.startLine].start
    if (start < previousEnd || draft.endLine < draft.startLine) {
      throw new Error("Overlapping Markdown blocks.")
    }
    const text = source.slice(start, lines[draft.endLine].end)
    const block: EditorBlock = { id: createBlockId(), ...draft.block }
    blocks.push({
      ...block,
      source: {
        text,
        before: source.slice(previousEnd, start),
        fingerprint: getBlockFingerprint(block),
      },
    })
    previousEnd = lines[draft.endLine].end
  }
  return {
    frontmatter: hasFrontmatter
      ? getFrontmatterText(source, lines, frontmatterEnd)
      : null,
    ...(hasFrontmatter ? { frontmatterSource } : {}),
    blocks,
    trailing: source.slice(previousEnd),
  }
}

/** The whole text as one raw block: what a parser fault falls back to. */
function createRawDocument(source: string): EditorDocument {
  const text = source.replace(/(?:\r\n|\n|\r)+$/, "")
  if (text === "") return { frontmatter: null, blocks: [], trailing: source }
  const block: EditorBlock = {
    id: createBlockId(),
    type: "raw",
    indent: 0,
    content: [{ text, raw: true }],
    attrs: {},
  }
  return {
    frontmatter: null,
    blocks: [
      {
        ...block,
        source: { text, before: "", fingerprint: getBlockFingerprint(block) },
      },
    ],
    trailing: source.slice(text.length),
  }
}

function parseMarkdown(
  source: string,
  options: MarkdownOptions = {}
): EditorDocument {
  try {
    return createDocument(source, splitLines(source), options.syntax ?? [])
  } catch {
    // Never lose a document to a parser fault: keep it whole and verbatim.
    return createRawDocument(source)
  }
}

export {
  getDelimiterAbility,
  isDecodableEntity,
  isTableDelimiterRow,
  isWhitespaceCharacter,
  isWordCharacter,
  matchBareAutolink,
  parseMarkdown,
  readFrontmatter,
  THEMATIC_BREAK,
}
export type { MarkdownOptions, MarkdownSyntax }
