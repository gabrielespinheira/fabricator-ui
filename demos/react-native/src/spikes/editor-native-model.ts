// A naive document updater for the editor-native spike: just enough to show
// the round trip. The real model is the editor core (docs/plans/editor.md §5).
import type {
  EditorNativeContent,
  EditorNativeParagraph,
  EditorNativeParagraphKind,
  EditorNativeSpan,
} from "@fabricator-ui/editor-native"

const LINE_BREAK = " "
const OBJECT = "￼"

type SpikeMark = Omit<EditorNativeSpan, "start" | "end"> & {
  /** Offsets inside the block's text. */
  start: number
  end: number
}

type SpikeBlock = Omit<EditorNativeParagraph, "start" | "end"> & {
  text: string
  marks?: SpikeMark[]
}

const SAMPLE: SpikeBlock[] = [
  { kind: "heading", level: 1, text: "Release notes" },
  {
    kind: "paragraph",
    text: "Fabricator writes Markdown with bold, italic, struck, code and a link in one paragraph.",
    marks: [
      { start: 32, end: 36, bold: true },
      { start: 38, end: 44, italic: true },
      { start: 46, end: 52, strike: true },
      { start: 54, end: 58, code: true },
      { start: 65, end: 69, link: "https://fabricator-ui.vercel.app" },
    ],
  },
  { kind: "heading", level: 2, text: "What changed" },
  {
    kind: "bulleted",
    indent: 0,
    marker: "•",
    text: "One text view per document",
  },
  {
    kind: "bulleted",
    indent: 1,
    marker: "◦",
    text: "Selection runs across paragraphs",
  },
  {
    kind: "numbered",
    indent: 0,
    marker: "1.",
    text: "Type into any paragraph",
  },
  {
    kind: "numbered",
    indent: 0,
    marker: "2.",
    text: "Press Return to split it",
  },
  { kind: "task", indent: 0, checked: false, text: "Toggle this task" },
  { kind: "task", indent: 0, checked: true, text: "Ship the spike" },
  {
    kind: "quote",
    text: `A quote, on two lines:${LINE_BREAK}the second after a soft break.`,
  },
  {
    kind: "code",
    text: `const editor = createEditor()${LINE_BREAK}editor.focus()`,
  },
  { kind: "divider", text: OBJECT },
  { kind: "image", text: OBJECT },
  { kind: "table", text: OBJECT },
  {
    kind: "raw",
    text: "<details>raw HTML</details>",
  },
  {
    kind: "paragraph",
    text: "Raw source inline: <kbd>K</kbd> stays muted.",
    marks: [{ start: 19, end: 31, raw: true }],
  },
  { kind: "heading", level: 3, text: "Heading three" },
  { kind: "paragraph", text: "The end." },
]

function buildContent(blocks: SpikeBlock[], version: number) {
  const paragraphs: EditorNativeParagraph[] = []
  const spans: EditorNativeSpan[] = []
  let offset = 0
  for (const { text, marks, ...paragraph } of blocks) {
    paragraphs.push({ ...paragraph, start: offset, end: offset + text.length })
    for (const mark of marks ?? []) {
      spans.push({
        ...mark,
        start: offset + mark.start,
        end: offset + mark.end,
      })
    }
    offset += text.length + 1
  }
  const text = blocks.map((block) => block.text).join("\n")
  return { version, text, spans, paragraphs }
}

function getSampleContent(): EditorNativeContent {
  return buildContent(SAMPLE, 1)
}

/** Shifts an offset past a replaced range; text typed at a boundary joins what ends there. */
function shiftStart(offset: number, from: number, to: number, delta: number) {
  if (offset <= from) return offset
  return offset >= to ? offset + delta : from
}

function shiftEnd(
  offset: number,
  from: number,
  to: number,
  length: number
): number {
  if (offset < from) return offset
  return offset >= to ? offset + length - (to - from) : from + length
}

/** The paragraphs of `text`, keeping each one's kind where its start survived. */
function reparagraph(
  text: string,
  shifted: EditorNativeParagraph[]
): EditorNativeParagraph[] {
  const byStart = new Map(
    shifted.map((paragraph) => [paragraph.start, paragraph])
  )
  const result: EditorNativeParagraph[] = []
  let start = 0
  for (const line of text.split("\n")) {
    const kept = byStart.get(start)
    result.push(
      kept
        ? { ...kept, start, end: start + line.length }
        : { kind: "paragraph", start, end: start + line.length }
    )
    start += line.length + 1
  }
  return renumber(result)
}

function renumber(paragraphs: EditorNativeParagraph[]) {
  let count = 0
  return paragraphs.map((paragraph) => {
    if (paragraph.kind !== "numbered") {
      count = 0
      return paragraph
    }
    count += 1
    return { ...paragraph, marker: `${count}.` }
  })
}

/** Replaces `from..to` with `inserted`, shifting spans and paragraphs. */
function replaceText(
  content: EditorNativeContent,
  from: number,
  to: number,
  inserted: string
): EditorNativeContent {
  const delta = inserted.length - (to - from)
  const text = content.text.slice(0, from) + inserted + content.text.slice(to)
  const spans = content.spans
    .map((span) => ({
      ...span,
      start: shiftStart(span.start, from, to, delta),
      end: shiftEnd(span.end, from, to, inserted.length),
    }))
    .filter((span) => span.end > span.start)
  const shifted = content.paragraphs.map((paragraph) => ({
    ...paragraph,
    start: shiftStart(paragraph.start, from, to, delta),
  }))
  return {
    version: content.version + 1,
    text,
    spans,
    paragraphs: reparagraph(text, shifted),
  }
}

function plainParagraph({
  start,
  end,
}: EditorNativeParagraph): EditorNativeParagraph {
  return { kind: "paragraph", start, end }
}

const CONTINUING: EditorNativeParagraphKind[] = ["bulleted", "numbered", "task"]

/** Return: splits the paragraph; list items continue as list items. */
function splitParagraph(
  content: EditorNativeContent,
  from: number,
  to: number
): EditorNativeContent {
  const next = replaceText(content, from, to, "\n")
  const index = next.paragraphs.findIndex(
    (paragraph) => paragraph.start === from + 1
  )
  const before = next.paragraphs[index - 1]
  if (index < 1 || !before) return next
  const continues = CONTINUING.includes(before.kind)
  const paragraphs = next.paragraphs.map((paragraph, position) => {
    if (position !== index) return paragraph
    return continues
      ? {
          ...before,
          start: paragraph.start,
          end: paragraph.end,
          checked: false,
        }
      : plainParagraph(paragraph)
  })
  return { ...next, paragraphs: renumber(paragraphs) }
}

/** Backspace over a paragraph boundary: a styled paragraph turns plain first. */
function deleteBackward(
  content: EditorNativeContent,
  from: number,
  to: number
) {
  const atStart = content.paragraphs.find((paragraph) => paragraph.start === to)
  const isBoundary =
    from === to || (to - from === 1 && content.text[from] === "\n")
  if (atStart && isBoundary && atStart.kind !== "paragraph") {
    const paragraphs = content.paragraphs.map((paragraph) =>
      paragraph === atStart ? plainParagraph(paragraph) : paragraph
    )
    return {
      content: {
        ...content,
        version: content.version + 1,
        paragraphs: renumber(paragraphs),
      },
      caret: to,
    }
  }
  if (from === to) return { content, caret: from }
  return { content: replaceText(content, from, to, ""), caret: from }
}

function toggleTask(content: EditorNativeContent, paragraphStart: number) {
  return {
    ...content,
    version: content.version + 1,
    paragraphs: content.paragraphs.map((paragraph) =>
      paragraph.start === paragraphStart && paragraph.kind === "task"
        ? { ...paragraph, checked: !paragraph.checked }
        : paragraph
    ),
  }
}

/** Bold on `from..to`, or off where it's all bold already. */
function toggleBold(content: EditorNativeContent, from: number, to: number) {
  if (to <= from) return content
  const isBold = content.spans.some(
    (span) => span.bold && span.start <= from && span.end >= to
  )
  const spans = isBold
    ? content.spans.flatMap((span) => {
        if (!span.bold || span.end <= from || span.start >= to) return [span]
        return [
          { ...span, end: from },
          { ...span, start: to },
        ].filter((part) => part.end > part.start)
      })
    : [...content.spans, { start: from, end: to, bold: true }]
  return { ...content, version: content.version + 1, spans }
}

/** "#RRGGBB", "#RRGGBBAA" or "rgba(r, g, b, a)" as "#RRGGBBAA". */
function toHexColor(color: string) {
  if (color.startsWith("#")) return color
  const channels = /rgba?\(([^)]+)\)/.exec(color)?.[1]?.split(",") ?? []
  const [red = 0, green = 0, blue = 0, alpha = 1] = channels.map(Number)
  const hex = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0").toUpperCase()
  return `#${hex(red)}${hex(green)}${hex(blue)}${hex(alpha * 255)}`
}

export {
  deleteBackward,
  getSampleContent,
  replaceText,
  splitParagraph,
  toggleBold,
  toggleTask,
  toHexColor,
}
