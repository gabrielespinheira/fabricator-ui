// The editor document to Markdown, our own. A block that hasn't changed since
// it was parsed writes its source verbatim; an edited or new block is written
// in the style recorded from its source (bullet, emphasis delimiter, fence,
// heading style), or the defaults: `-`, `*`, `**`, ATX headings and ```.
//
// Text gets a backslash only where it would otherwise read as syntax, and
// whitespace Markdown would strip is written as a character reference, so
// parsing the output gives back the same document.

import {
  getBlockFingerprint,
  getRunsText,
  hasMark,
  isSameMark,
  normalizeRuns,
  sliceRuns,
  type EditorBlock,
  type EditorDocument,
  type EditorInline,
  type EditorJson,
  type EditorMark,
} from "./editor-model"
import {
  getDelimiterAbility,
  isDecodableEntity,
  isTableDelimiterRow,
  isWhitespaceCharacter,
  isWordCharacter,
  matchBareAutolink,
  readFrontmatter,
  THEMATIC_BREAK,
  type MarkdownOptions,
  type MarkdownSyntax,
} from "./markdown-parse"

/** How inline text is written: the delimiters a block recorded. */
type InlineStyle = {
  emphasis?: "*" | "_"
  strong?: "**" | "__"
  hardBreak?: "spaces" | "backslash"
}

/**
 * Where inline text sits, which decides what needs escaping: a paragraph-like
 * block, an ATX heading, a table cell or an image's alt text.
 */
type InlineContext = "block" | "heading" | "cell" | "alt"

type Segment = { kind: "text" | "syntax" | "break"; text: string }

type OpenMark = { mark: EditorMark; delimiter: string }

const WRAPPING_MARKS: ReadonlySet<string> = new Set([
  "link",
  "bold",
  "italic",
  "strike",
])

const URI_AUTOLINK_TEXT = /^[A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\u0000-\u0020]*$/
const EMAIL_AUTOLINK_TEXT =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// MARK: Inline structure

function isOpaqueRun(run: EditorInline) {
  return Boolean(run.raw) || hasMark(run, "code")
}

function removeMark(runs: readonly EditorInline[], type: string) {
  return runs.map((run) => {
    const marks = run.marks?.filter((mark) => mark.type !== type)
    return { ...run, marks: marks && marks.length ? marks : undefined }
  })
}

/**
 * Emphasis can't start or end with whitespace in Markdown, so whitespace at
 * the edges of a bold, italic or struck span moves outside it.
 */
function trimMarkEdges(runs: readonly EditorInline[], type: string) {
  const result: EditorInline[] = []
  let index = 0
  while (index < runs.length) {
    if (!hasMark(runs[index], type)) {
      result.push(runs[index])
      index += 1
      continue
    }
    let end = index
    while (end < runs.length && hasMark(runs[end], type)) end += 1
    const span = runs.slice(index, end)
    const visible = span
      .map((run) => (isOpaqueRun(run) ? "x".repeat(run.text.length) : run.text))
      .join("")
    const leading = /^\s*/.exec(visible)?.[0].length ?? 0
    if (leading === visible.length) {
      result.push(...removeMark(span, type))
    } else {
      const trailing = /\s*$/.exec(visible)?.[0].length ?? 0
      const contentEnd = visible.length - trailing
      result.push(
        ...removeMark(sliceRuns(span, 0, leading), type),
        ...sliceRuns(span, leading, contentEnd),
        ...removeMark(sliceRuns(span, contentEnd, visible.length), type)
      )
    }
    index = end
  }
  return normalizeRuns(result)
}

function prepareRuns(runs: readonly EditorInline[]) {
  return ["bold", "italic", "strike"].reduce(
    (current, type) => trimMarkEdges(current, type),
    normalizeRuns(runs)
  )
}

function getLinkMark(run: EditorInline) {
  return run.marks?.find((mark) => mark.type === "link")
}

function hasSameMark(run: EditorInline | undefined, target: EditorMark) {
  return run?.marks?.some((mark) => isSameMark(mark, target)) ?? false
}

/** `(` and `)` that pair up, which a bare destination may hold. */
function hasBalancedParentheses(text: string) {
  let depth = 0
  for (const character of text) {
    if (character === "(") depth += 1
    if (character === ")") depth -= 1
    if (depth < 0) return false
  }
  return depth === 0
}

function escapeEntities(text: string) {
  let result = ""
  for (let index = 0; index < text.length; index += 1) {
    const isEntity = text[index] === "&" && isDecodableEntity(text, index)
    result += isEntity ? "\\&" : text[index]
  }
  return result
}

function formatDestination(href: string) {
  if (href === "") return "<>"
  const needsBrackets =
    /[\s<>\u0000-\u001f\u007f]/.test(href) || !hasBalancedParentheses(href)
  if (needsBrackets) {
    return `<${escapeEntities(href.replace(/[\\<>]/g, "\\$&")).replace(/\n/g, " ")}>`
  }
  return escapeEntities(href.replace(/\\/g, "\\\\"))
}

function formatTitle(title: string | undefined | null) {
  if (title === undefined || title === null) return ""
  return ` "${escapeEntities(title.replace(/[\\"]/g, "\\$&"))}"`
}

function formatLinkEnd(mark: EditorMark) {
  return `](${formatDestination(mark.attrs?.href ?? "")}${formatTitle(mark.attrs?.title)})`
}

function formatCodeSpan(text: string, isCell: boolean) {
  const content = text.replace(/\n/g, " ")
  const runLengths = new Set(
    (content.match(/`+/g) ?? []).map((run) => run.length)
  )
  let length = 1
  while (runLengths.has(length)) length += 1
  const fence = "`".repeat(length)
  const needsPadding =
    content.startsWith("`") ||
    content.endsWith("`") ||
    (content.startsWith(" ") && content.endsWith(" ") && /[^ ]/.test(content))
  const inner = needsPadding ? ` ${content} ` : content
  return fence + (isCell ? inner.replace(/\|/g, "\\|") : inner) + fence
}

function getLastCharacter(segments: readonly Segment[]) {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const { text } = segments[index]
    if (text !== "") return text.charAt(text.length - 1)
  }
  return ""
}

/** The autolink form a run can keep, written out, or null. */
function getAutolinkSyntax(
  runs: readonly EditorInline[],
  index: number,
  before: string
) {
  const run = runs[index]
  const link = getLinkMark(run)
  const href = link?.attrs?.href
  const form = link?.attrs?.autolink
  if (!link || href === undefined || !form || run.raw) return null
  if (hasMark(run, "code")) return null
  if (
    hasSameMark(runs[index - 1], link) ||
    hasSameMark(runs[index + 1], link)
  ) {
    return null
  }
  const { text } = run
  const isAlone = run.marks?.length === 1
  if (form === "bare" && isAlone) {
    const match = matchBareAutolink(text, 0)
    // The space after it must stay a space: at a line's end it would be
    // written as an entity, which the autolink would swallow.
    const after = getRunsText(runs.slice(index + 1))
    const isBoundedBefore =
      isWhitespaceCharacter(before) || "*_~(".includes(before)
    const isBoundedAfter = after === "" || /^[ \t]+\S/.test(after)
    if (
      match &&
      match.length === text.length &&
      match.href === href &&
      isBoundedBefore &&
      isBoundedAfter
    ) {
      return text
    }
  }
  if (URI_AUTOLINK_TEXT.test(text) && href === text) return `<${text}>`
  if (EMAIL_AUTOLINK_TEXT.test(text) && href === `mailto:${text}`) {
    return `<${text}>`
  }
  return null
}

function getSpanAfter(
  runs: readonly EditorInline[],
  index: number,
  mark: EditorMark
) {
  let end = index
  while (end < runs.length && hasSameMark(runs[end], mark)) end += 1
  return runs[end]?.text.charAt(0) ?? ""
}

function chooseDelimiter(
  mark: EditorMark,
  style: InlineStyle,
  before: string,
  after: string
) {
  const isFlankedByWords = isWordCharacter(before) || isWordCharacter(after)
  if (mark.type === "bold") {
    return style.strong === "__" && !isFlankedByWords ? "__" : "**"
  }
  if (mark.type === "italic") {
    return style.emphasis === "_" && !isFlankedByWords ? "_" : "*"
  }
  if (mark.type === "strike") return "~~"
  return "["
}

function pushText(segments: Segment[], text: string, style: InlineStyle) {
  text.split("\n").forEach((line, index) => {
    if (index > 0) {
      segments.push({
        kind: "break",
        text: style.hardBreak === "backslash" ? "\\\n" : "  \n",
      })
    }
    line.split("\r").forEach((part, partIndex) => {
      if (partIndex > 0) segments.push({ kind: "syntax", text: "&#13;" })
      if (part) segments.push({ kind: "text", text: part })
    })
  })
}

function buildSegments(
  runs: readonly EditorInline[],
  style: InlineStyle,
  context: InlineContext
) {
  const prepared = prepareRuns(runs)
  const segments: Segment[] = []
  const open: OpenMark[] = []
  const closeTo = (depth: number) => {
    while (open.length > depth) {
      const entry = open.pop()
      if (!entry) break
      segments.push({
        kind: "syntax",
        text:
          entry.mark.type === "link"
            ? formatLinkEnd(entry.mark)
            : entry.delimiter,
      })
    }
  }
  prepared.forEach((run, index) => {
    const autolink = getAutolinkSyntax(
      prepared,
      index,
      getLastCharacter(segments)
    )
    const marks = (run.marks ?? []).filter(
      (mark) =>
        WRAPPING_MARKS.has(mark.type) &&
        !(autolink !== null && mark.type === "link")
    )
    let depth = 0
    while (
      depth < open.length &&
      marks.some((mark) => isSameMark(mark, open[depth].mark))
    ) {
      depth += 1
    }
    closeTo(depth)
    for (const mark of marks) {
      if (open.some((entry) => isSameMark(entry.mark, mark))) continue
      const delimiter = chooseDelimiter(
        mark,
        style,
        getLastCharacter(segments),
        getSpanAfter(prepared, index, mark)
      )
      open.push({ mark, delimiter })
      segments.push({ kind: "syntax", text: delimiter })
    }
    if (autolink !== null) {
      segments.push({ kind: "syntax", text: autolink })
    } else if (run.raw) {
      segments.push({ kind: "syntax", text: run.text })
    } else if (hasMark(run, "code")) {
      segments.push({
        kind: "syntax",
        text: formatCodeSpan(run.text, context === "cell"),
      })
    } else {
      pushText(segments, run.text, style)
    }
  })
  closeTo(0)
  return encodeForcedBreaks(segments, context)
}

/**
 * A line break Markdown can't write as one (at an edge of the block, on an
 * otherwise empty line, or where text is a single line) becomes `&#10;`.
 */
function encodeForcedBreaks(
  segments: readonly Segment[],
  context: InlineContext
) {
  return segments.map((segment, index): Segment => {
    if (segment.kind !== "break") return segment
    const isForced =
      context !== "block" ||
      index === 0 ||
      index === segments.length - 1 ||
      segments[index - 1].kind === "break"
    return isForced ? { kind: "syntax", text: "&#10;" } : segment
  })
}

// MARK: Escaping

const SPACE_ENTITIES: Readonly<Record<string, string>> = {
  " ": "&#32;",
  "\t": "&#9;",
}

/** Where a line would start a block, the offset of the character to escape. */
function getLineStartEscape(line: string) {
  if (
    /^#{1,6}(?:[ \t]|$)/.test(line) ||
    line.startsWith(">") ||
    /^[-+*](?:[ \t]|$)/.test(line) ||
    THEMATIC_BREAK.test(line) ||
    /^(?:=+|-+)[ \t]*$/.test(line) ||
    /^(?:`{3,}|~{3,})/.test(line) ||
    line.startsWith("$$") ||
    isTableDelimiterRow(line)
  ) {
    return 0
  }
  const ordered = /^(\d{1,9})[.)](?:[ \t]|$)/.exec(line)
  return ordered ? ordered[1].length : -1
}

function getPlainText(segment: Segment) {
  return segment.kind === "break" ? "\n" : segment.text
}

type EscapePlan = {
  plain: string
  isText: readonly boolean[]
  entities: Map<number, string>
  escapes: Set<number>
}

function planLineEscapes(plan: EscapePlan, context: InlineContext) {
  const { plain, isText, entities, escapes } = plan
  let start = 0
  while (start <= plain.length) {
    const newline = plain.indexOf("\n", start)
    const end = newline < 0 ? plain.length : newline
    const line = plain.slice(start, end)
    if (context !== "alt" && end > start) {
      if (isText[start] && SPACE_ENTITIES[plain[start]]) {
        entities.set(start, SPACE_ENTITIES[plain[start]])
      }
      if (isText[end - 1] && SPACE_ENTITIES[plain[end - 1]]) {
        entities.set(end - 1, SPACE_ENTITIES[plain[end - 1]])
      }
    }
    if (context === "block" && !entities.has(start)) {
      const offset = getLineStartEscape(line)
      if (offset >= 0 && isText[start + offset]) escapes.add(start + offset)
    }
    if (context === "heading") {
      const closing = /(?:^|[ \t])(#+)[ \t]*$/.exec(line)
      if (closing) {
        const position = start + closing.index + closing[0].indexOf("#")
        if (isText[position]) escapes.add(position)
      }
    }
    if (newline < 0) break
    start = newline + 1
  }
}

/** A neighbour as the parser will see it: an entity reads as punctuation. */
function getNeighbour(plan: EscapePlan, index: number, isBefore: boolean) {
  if (index < 0 || index >= plan.plain.length) return ""
  if (plan.entities.has(index)) return isBefore ? ";" : "&"
  return plan.plain[index]
}

function planDelimiterEscapes(plan: EscapePlan) {
  const { plain, isText, escapes } = plan
  let index = 0
  while (index < plain.length) {
    const character = plain[index]
    if (character !== "*" && character !== "_") {
      index += 1
      continue
    }
    let end = index
    while (plain[end] === character) end += 1
    let isAllText = true
    for (let position = index; position < end; position += 1) {
      if (!isText[position]) isAllText = false
    }
    const ability = getDelimiterAbility(
      character,
      getNeighbour(plan, index - 1, true),
      getNeighbour(plan, end, false)
    )
    if (!isAllText || ability.canOpen || ability.canClose) {
      for (let position = index; position < end; position += 1) {
        if (isText[position]) escapes.add(position)
      }
    }
    index = end
  }
}

function countBacktickRun(plain: string, index: number) {
  let start = index
  while (plain[start - 1] === "`") start -= 1
  let end = index
  while (plain[end] === "`") end += 1
  return end - start
}

function shouldEscape(
  plan: EscapePlan,
  index: number,
  context: InlineContext,
  bounds: { firstOpen: number; lastClose: number; backticks: number }
) {
  const { plain, isText } = plan
  const character = plain[index]
  const next = plain.charAt(index + 1)
  switch (character) {
    case "\\":
      return !isWordCharacter(next)
    case "`":
      return bounds.backticks > countBacktickRun(plain, index)
    case "~":
      return plain[index - 1] === "~" || next === "~"
    case "[":
      return index < bounds.lastClose
    case "]":
      return bounds.firstOpen >= 0 && index > bounds.firstOpen
    case "!":
      return next === "[" && !isText[index + 1]
    case "<":
      return /[A-Za-z/!?]/.test(next)
    case "&":
      return isDecodableEntity(plain, index)
    case "|":
      return context === "cell"
    case ":":
      return (
        /https?$/i.test(plain.slice(Math.max(0, index - 5), index)) &&
        plain.startsWith("//", index + 1)
      )
    case ".":
      return /www$/i.test(plain.slice(Math.max(0, index - 3), index))
    default:
      return false
  }
}

function escapeSegments(segments: readonly Segment[], context: InlineContext) {
  const plain = segments.map(getPlainText).join("")
  const isText: boolean[] = []
  for (const segment of segments) {
    const length = getPlainText(segment).length
    for (let index = 0; index < length; index += 1) {
      isText.push(segment.kind === "text")
    }
  }
  const plan: EscapePlan = {
    plain,
    isText,
    entities: new Map(),
    escapes: new Set(),
  }
  planLineEscapes(plan, context)
  planDelimiterEscapes(plan)
  const bounds = {
    firstOpen: plain.indexOf("["),
    lastClose: plain.lastIndexOf("]"),
    backticks: plain.split("`").length - 1,
  }
  let output = ""
  let offset = 0
  for (const segment of segments) {
    if (segment.kind !== "text") {
      output += segment.text
      offset += getPlainText(segment).length
      continue
    }
    for (let index = 0; index < segment.text.length; index += 1) {
      const position = offset + index
      const character = segment.text[index]
      const entity = plan.entities.get(position)
      if (entity) output += entity
      else if (
        plan.escapes.has(position) ||
        shouldEscape(plan, position, context, bounds)
      ) {
        output += `\\${character}`
      } else output += character
    }
    offset += segment.text.length
  }
  return output
}

function serializeInline(
  runs: readonly EditorInline[],
  style: InlineStyle,
  context: InlineContext
) {
  return escapeSegments(buildSegments(runs, style, context), context)
}

/** Inline runs as Markdown, the way a paragraph writes them. */
function serializeRuns(runs: readonly EditorInline[], style: InlineStyle = {}) {
  return serializeInline(runs, style, "block")
}

// MARK: Blocks

type ListLevel = {
  column: number
  type: string
  number: number
  delimiter: string
}

type WriteContext = {
  previous: EditorBlock | null
  lists: ListLevel[]
  lineEnding: string
}

const LIST_TYPES: ReadonlySet<string> = new Set([
  "bulleted",
  "numbered",
  "task",
])

function isListBlock(block: EditorBlock | null) {
  return block !== null && LIST_TYPES.has(block.type)
}

function getString(block: EditorBlock, name: string) {
  const value = block.attrs[name]
  return typeof value === "string" ? value : null
}

function getInlineStyle(block: EditorBlock): InlineStyle {
  return {
    emphasis: block.attrs.emphasis === "_" ? "_" : "*",
    strong: block.attrs.strong === "__" ? "__" : "**",
    hardBreak: block.attrs.hardBreak === "backslash" ? "backslash" : "spaces",
  }
}

function getBulletMarker(block: EditorBlock) {
  const marker = getString(block, "marker")
  return marker === "*" || marker === "+" ? marker : "-"
}

function getDelimiter(block: EditorBlock) {
  return block.attrs.delimiter === ")" ? ")" : "."
}

function getListDepth(block: EditorBlock, lists: readonly ListLevel[]) {
  return Math.max(0, Math.min(block.indent, lists.length))
}

function getItemNumber(block: EditorBlock, lists: readonly ListLevel[]) {
  const value = block.attrs.number
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 999_999_999
  ) {
    return value
  }
  const sibling = lists[getListDepth(block, lists)]
  if (
    sibling &&
    sibling.type === "numbered" &&
    sibling.delimiter === getDelimiter(block)
  ) {
    return sibling.number + 1
  }
  return 1
}

function getListFamily(block: EditorBlock) {
  return block.type === "numbered" ? "ordered" : "bullet"
}

function getDefaultBefore(
  block: EditorBlock,
  context: WriteContext,
  number: number
) {
  const { previous, lineEnding } = context
  if (!previous) return ""
  const blankLine = lineEnding + lineEnding
  if (!isListBlock(previous) || !isListBlock(block)) return blankLine
  if (block.indent > previous.indent) {
    const isEmptyItem = block.content.length === 0 && block.type !== "task"
    const cannotInterrupt =
      isEmptyItem || (block.type === "numbered" && number !== 1)
    // A task's `[ ]` is a paragraph even when the item has no text.
    const hasParagraph = previous.content.length > 0 || previous.type === "task"
    return hasParagraph && cannotInterrupt ? blankLine : lineEnding
  }
  if (block.indent < previous.indent) return lineEnding
  return getListFamily(block) === getListFamily(previous)
    ? lineEnding
    : blankLine
}

/** Records a list item written from its source, for the items after it. */
function recordSourceItem(
  block: EditorBlock,
  text: string,
  lists: ListLevel[]
) {
  const match = /^( *)([-+*]|(\d{1,9})([.)]))( *)/.exec(text)
  const depth = getListDepth(block, lists)
  lists.length = depth
  if (!match) return
  const spaces = match[5].length
  const isEnd = match[0].length >= text.split(/\r\n|\n|\r/)[0].length
  const padding = spaces === 0 || spaces >= 5 || isEnd ? 1 : spaces
  lists[depth] = {
    column: match[1].length + match[2].length + padding,
    type: block.type,
    number: match[3] ? Number(match[3]) : 0,
    delimiter: match[4] ?? "",
  }
}

function writeListItem(
  block: EditorBlock,
  number: number,
  context: WriteContext
) {
  const { lists, lineEnding } = context
  const depth = getListDepth(block, lists)
  const parentColumn = depth === 0 ? 0 : lists[depth - 1].column
  const marker =
    block.type === "numbered"
      ? `${number}${getDelimiter(block)}`
      : getBulletMarker(block)
  const head =
    block.type === "task"
      ? `${marker} [${block.attrs.checked === true ? "x" : " "}]`
      : marker
  const column = parentColumn + marker.length + 1
  const [first = "", ...rest] = serializeInline(
    block.content,
    getInlineStyle(block),
    "block"
  ).split("\n")
  const prefix = " ".repeat(parentColumn)
  lists.length = depth
  lists[depth] = {
    column,
    type: block.type,
    number,
    delimiter: getDelimiter(block),
  }
  return [
    first === "" ? prefix + head : `${prefix}${head} ${first}`,
    ...rest.map((line) => " ".repeat(column) + line),
  ].join(lineEnding)
}

/**
 * A paragraph continuing a list item, written at the item's content column
 * (the blank line before it comes from getDefaultBefore). The lists of the
 * levels above it stay open for the items after it.
 */
function writeParagraph(block: EditorBlock, context: WriteContext) {
  const { lists, lineEnding } = context
  const depth = Math.max(0, Math.min(block.indent, lists.length))
  const column = depth === 0 ? 0 : lists[depth - 1].column
  lists.length = depth
  return serializeInline(block.content, getInlineStyle(block), "block")
    .split("\n")
    .map((line) => " ".repeat(column) + line)
    .join(lineEnding)
}

function writeHeading(block: EditorBlock, lineEnding: string) {
  const level = Math.min(
    Math.max(Math.round(Number(block.attrs.level) || 1), 1),
    6
  )
  const style = getInlineStyle(block)
  if (
    block.attrs.style === "setext" &&
    level <= 2 &&
    block.content.length > 0
  ) {
    const text = serializeInline(block.content, style, "block")
    return [...text.split("\n"), level === 1 ? "===" : "---"].join(lineEnding)
  }
  const text = serializeInline(block.content, style, "heading")
  const marker = "#".repeat(level)
  return text === "" ? marker : `${marker} ${text}`
}

/** Splits a quote's runs at its blank lines, one list of runs per paragraph. */
function splitParagraphs(runs: readonly EditorInline[]) {
  const text = getRunsText(runs)
  const paragraphs: EditorInline[][] = []
  let start = 0
  let index = text.indexOf("\n\n")
  while (index >= 0) {
    paragraphs.push(sliceRuns(runs, start, index))
    start = index + 2
    index = text.indexOf("\n\n", start)
  }
  paragraphs.push(sliceRuns(runs, start, text.length))
  return paragraphs
}

function writeQuote(block: EditorBlock, lineEnding: string) {
  const style = getInlineStyle(block)
  const lines = splitParagraphs(block.content).flatMap((runs, index) => [
    ...(index > 0 ? [""] : []),
    ...serializeInline(runs, style, "block").split("\n"),
  ])
  return lines.map((line) => (line === "" ? ">" : `> ${line}`)).join(lineEnding)
}

function getLongestFenceRun(text: string, character: string) {
  let longest = 0
  for (const line of text.split("\n")) {
    const match = /^ {0,3}(`+|~+)/.exec(line)
    if (match && match[1][0] === character) {
      longest = Math.max(longest, match[1].length)
    }
  }
  return longest
}

function writeCode(block: EditorBlock, context: WriteContext) {
  const text = getRunsText(block.content)
  const lines = text === "" ? [] : text.split("\n")
  const isIndentable =
    block.attrs.fence === "indent" &&
    !isListBlock(context.previous) &&
    // Four spaces after a paragraph in a list item would continue the item.
    (context.previous?.indent ?? 0) === 0 &&
    !(
      context.previous?.type === "code" &&
      context.previous.attrs.fence === "indent"
    ) &&
    lines.length > 0 &&
    lines[0].trim() !== "" &&
    lines[lines.length - 1].trim() !== ""
  if (isIndentable) {
    return lines
      .map((line) => (line === "" ? "" : `    ${line}`))
      .join(context.lineEnding)
  }
  const language = getString(block, "language") ?? ""
  const meta = getString(block, "meta") ?? ""
  const info = escapeEntities(
    [language, meta].filter(Boolean).join(" ").replace(/\\/g, "\\\\")
  )
  const character =
    block.attrs.fence === "~~~" || info.includes("`") ? "~" : "`"
  const recorded =
    typeof block.attrs.fenceLength === "number" ? block.attrs.fenceLength : 3
  const length = Math.max(3, recorded, getLongestFenceRun(text, character) + 1)
  const fence = character.repeat(length)
  return [fence + info, ...lines, fence].join(context.lineEnding)
}

function writeDivider(block: EditorBlock) {
  const marker = getString(block, "marker")
  return marker && !/[\r\n]/.test(marker) && THEMATIC_BREAK.test(marker.trim())
    ? marker
    : "---"
}

function writeImage(block: EditorBlock) {
  const alt = getString(block, "alt") ?? ""
  const segments: Segment[] = [{ kind: "syntax", text: "![" }]
  alt.split("\n").forEach((line, index) => {
    if (index > 0) segments.push({ kind: "syntax", text: "&#10;" })
    if (line) segments.push({ kind: "text", text: line })
  })
  const href = getString(block, "src") ?? ""
  segments.push({
    kind: "syntax",
    text: `](${formatDestination(href)}${formatTitle(getString(block, "title"))})`,
  })
  return escapeSegments(segments, "alt")
}

function isJsonObject(
  value: EditorJson | undefined
): value is { readonly [key: string]: EditorJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readMark(value: EditorJson): EditorMark[] {
  if (!isJsonObject(value) || typeof value.type !== "string") return []
  const attrs = value.attrs
  if (!isJsonObject(attrs)) return [{ type: value.type }]
  const entries = Object.entries(attrs).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  )
  return [{ type: value.type, attrs: Object.fromEntries(entries) }]
}

function readRuns(value: EditorJson): EditorInline[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((run: EditorJson): EditorInline[] => {
    if (!isJsonObject(run) || typeof run.text !== "string") return []
    const marks = Array.isArray(run.marks) ? run.marks.flatMap(readMark) : []
    return [
      {
        text: run.text,
        ...(marks.length ? { marks } : {}),
        ...(run.raw === true ? { raw: true as const } : {}),
      },
    ]
  })
}

function readRows(value: EditorJson | undefined): EditorInline[][][] {
  if (!Array.isArray(value)) return []
  return value.map((row: EditorJson) =>
    Array.isArray(row) ? row.map(readRuns) : []
  )
}

const ALIGN_MARKERS: Readonly<Record<string, string>> = {
  left: ":--",
  center: ":-:",
  right: "--:",
}

function writeTable(block: EditorBlock, lineEnding: string) {
  const rows = readRows(block.attrs.rows)
  const align = Array.isArray(block.attrs.align) ? block.attrs.align : []
  const columns = Math.max(
    1,
    align.length || Math.max(0, ...rows.map((row) => row.length))
  )
  const style = getInlineStyle(block)
  const writeRow = (cells: readonly EditorInline[][]) =>
    `| ${Array.from({ length: columns }, (_, index) =>
      serializeInline(cells[index] ?? [], style, "cell")
    ).join(" | ")} |`
  const delimiter = `| ${Array.from({ length: columns }, (_, index) => {
    const value = align[index]
    return typeof value === "string" ? (ALIGN_MARKERS[value] ?? "---") : "---"
  }).join(" | ")} |`
  const [header = [], ...body] = rows
  return [writeRow(header), delimiter, ...body.map(writeRow)].join(lineEnding)
}

function writeWithSyntax(
  block: EditorBlock,
  syntax: readonly MarkdownSyntax[]
) {
  for (const item of syntax) {
    if (!item.serializeBlock) continue
    try {
      const text = item.serializeBlock(block)
      if (typeof text === "string") return text
    } catch {
      // A kit's writer that fails leaves the block to the built-in writers.
    }
  }
  return null
}

function writeBlock(block: EditorBlock, number: number, context: WriteContext) {
  const { lineEnding } = context
  if (isListBlock(block)) return writeListItem(block, number, context)
  if (block.type === "paragraph") return writeParagraph(block, context)
  context.lists.length = 0
  switch (block.type) {
    case "heading":
      return writeHeading(block, lineEnding)
    case "quote":
      return writeQuote(block, lineEnding)
    case "code":
      return writeCode(block, context)
    case "divider":
      return writeDivider(block)
    case "image":
      return writeImage(block)
    case "table":
      return writeTable(block, lineEnding)
    case "raw":
      return getRunsText(block.content)
    default:
      return writeParagraph({ ...block, indent: 0 }, context)
  }
}

function findLineEnding(document: EditorDocument) {
  const texts = [
    document.frontmatterSource ?? "",
    ...document.blocks.flatMap((block) =>
      block.source ? [block.source.before, block.source.text] : []
    ),
    document.trailing ?? "",
  ]
  for (const text of texts) {
    const match = /\r\n|\n|\r/.exec(text)
    if (match) return match[0]
  }
  return "\n"
}

function writeFrontmatter(document: EditorDocument, lineEnding: string) {
  const { frontmatter, frontmatterSource } = document
  if (frontmatter === null) return ""
  if (
    frontmatterSource !== undefined &&
    readFrontmatter(frontmatterSource) === frontmatter
  ) {
    return frontmatterSource
  }
  return `---${lineEnding}${frontmatter}${lineEnding}---${lineEnding}`
}

function serializeMarkdown(
  document: EditorDocument,
  options: MarkdownOptions = {}
) {
  const lineEnding = findLineEnding(document)
  const context: WriteContext = { previous: null, lists: [], lineEnding }
  let output = writeFrontmatter(document, lineEnding)
  for (const block of document.blocks) {
    const { source } = block
    if (source && getBlockFingerprint(block) === source.fingerprint) {
      output += source.before + source.text
      if (isListBlock(block)) {
        recordSourceItem(block, source.text, context.lists)
      } else {
        // An indented paragraph keeps the lists it sits in open.
        const depth = block.type === "paragraph" ? block.indent : 0
        context.lists.length = Math.max(
          0,
          Math.min(context.lists.length, depth)
        )
      }
    } else {
      const number = getItemNumber(block, context.lists)
      const before = source
        ? source.before
        : getDefaultBefore(block, context, number)
      const custom = writeWithSyntax(block, options.syntax ?? [])
      if (custom !== null) context.lists.length = 0
      output += before + (custom ?? writeBlock(block, number, context))
    }
    context.previous = block
  }
  return (
    output + (document.trailing ?? (document.blocks.length ? lineEnding : ""))
  )
}

export { serializeMarkdown, serializeRuns }
export type { InlineStyle as MarkdownInlineStyle }
