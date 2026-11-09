import { describe, expect, it } from "vitest"

import {
  createBlock,
  getBlockFingerprint,
  getIndentLimit,
  normalizeRuns,
  type EditorBlock,
  type EditorDocument,
  type EditorInline,
  type EditorJson,
  type EditorMark,
} from "./editor-model"
import { parseMarkdown, type MarkdownSyntax } from "./markdown-parse"
import { serializeMarkdown, serializeRuns } from "./markdown-serialize"

function createDocument(
  blocks: EditorBlock[],
  frontmatter: string | null = null
): EditorDocument {
  return { frontmatter, blocks }
}

function block(
  type: string,
  content: EditorInline[] = [],
  attrs: Record<string, EditorJson> = {},
  indent = 0
): EditorBlock {
  return { ...createBlock({ type, attrs, indent }), content }
}

function text(value: string, ...marks: EditorMark[]): EditorInline {
  return marks.length ? { text: value, marks } : { text: value }
}

function serializeBlocks(...blocks: EditorBlock[]) {
  return serializeMarkdown(createDocument(blocks))
}

function getFingerprints(document: EditorDocument) {
  return document.blocks.map(getBlockFingerprint)
}

/** Replaces one block's content, as an edit would. */
function editBlock(
  document: EditorDocument,
  index: number,
  content: EditorInline[]
): EditorDocument {
  return {
    ...document,
    blocks: document.blocks.map((item, position) =>
      position === index ? { ...item, content } : item
    ),
  }
}

const bold = { type: "bold" }
const italic = { type: "italic" }
const strike = { type: "strike" }
const code = { type: "code" }

describe("unchanged blocks", () => {
  it("write their source verbatim", () => {
    const source = "*   a\n*   b\n\n__strong__   text\n"
    expect(serializeMarkdown(parseMarkdown(source))).toBe(source)
  })

  it("keep their neighbours when one block is edited", () => {
    const document = parseMarkdown("# One\n\n* a\n* b\n\n~~~js\nx\n~~~\n")
    const edited = editBlock(document, 2, [{ text: "c" }])
    expect(serializeMarkdown(edited)).toBe(
      "# One\n\n* a\n* c\n\n~~~js\nx\n~~~\n"
    )
  })
})

describe("edited blocks keep the recorded style", () => {
  it("bullets, emphasis delimiters and breaks", () => {
    const document = parseMarkdown("+ _a_ __b__\\\nc\n")
    const edited = editBlock(document, 0, [
      text("x", italic),
      text(" "),
      text("y", bold),
      text("\nz"),
    ])
    expect(serializeMarkdown(edited)).toBe("+ _x_ __y__\\\n  z\n")
  })

  it("fences, setext headings and numbers", () => {
    const document = parseMarkdown(
      "Title\n-----\n\n~~~~py\na\n~~~~\n\n7) seven\n"
    )
    const edited = {
      ...document,
      blocks: document.blocks.map((item) => ({
        ...item,
        content: item.content.map((run) => ({ ...run, text: `${run.text}!` })),
      })),
    }
    expect(serializeMarkdown(edited)).toBe(
      "Title!\n---\n\n~~~~py\na!\n~~~~\n\n7) seven!\n"
    )
  })
})

describe("new blocks", () => {
  it("use the default style", () => {
    expect(
      serializeBlocks(
        block("heading", [text("Title")], { level: 2 }),
        block("paragraph", [text("a", bold), text(" "), text("b", italic)]),
        block("bulleted", [text("one")]),
        block("bulleted", [text("two")], {}, 1),
        block("code", [text("x")], { language: "ts" }),
        block("divider"),
        block("quote", [text("q\n\nr")])
      )
    ).toBe(
      "## Title\n\n**a** *b*\n\n- one\n  - two\n\n```ts\nx\n```\n\n---\n\n> q\n>\n> r\n"
    )
  })

  it("indent numbered children by the marker width", () => {
    expect(
      serializeBlocks(
        block("numbered", [text("a")], { number: 9, delimiter: "." }),
        block("numbered", [text("b")], { delimiter: "." }),
        block("bulleted", [text("c")], {}, 1),
        block("task", [text("d")], { checked: true, marker: "*" }, 2)
      )
    ).toBe("9. a\n10. b\n    - c\n      * [x] d\n")
  })

  it("separate an ordered child that can't interrupt a paragraph", () => {
    const output = serializeBlocks(
      block("bulleted", [text("a")]),
      block("numbered", [text("b")], { number: 2, delimiter: "." }, 1)
    )
    expect(output).toBe("- a\n\n  2. b\n")
    expect(parseMarkdown(output).blocks.map((item) => item.indent)).toEqual([
      0, 1,
    ])
  })

  it("indent a paragraph to its item's content column, between blank lines", () => {
    const document = createDocument([
      block("bulleted", [text("a")], { marker: "-" }),
      block("paragraph", [text("more")], {}, 1),
      block("numbered", [text("b")], { number: 10, delimiter: "." }, 1),
      block("paragraph", [text("deep\nline")], {}, 2),
      block("paragraph", [text("back")], {}, 1),
      block("bulleted", [text("c")], { marker: "-" }),
      block("paragraph", [text("after")]),
    ])
    const output = serializeMarkdown(document)
    expect(output).toBe(
      "- a\n\n  more\n\n  10. b\n\n      deep  \n      line\n\n  back\n\n- c\n\nafter\n"
    )
    expect(getFingerprints(parseMarkdown(output))).toEqual(
      getFingerprints(document)
    )
  })

  it("keep a list loose and edited paragraphs in their item", () => {
    const document = parseMarkdown("1. a\n\n   one\n2. b\n\n   two\n")
    const edited = editBlock(editBlock(document, 1, [text("one!")]), 2, [
      text("b!"),
    ])
    const output = serializeMarkdown(edited)
    expect(output).toBe("1. a\n\n   one!\n2. b!\n\n   two\n")
    expect(getFingerprints(parseMarkdown(output))).toEqual(
      getFingerprints(edited)
    )
  })

  it("write images and tables", () => {
    expect(
      serializeBlocks(
        block("image", [], {
          src: "/a b.png",
          alt: "A [b]",
          title: 'say "hi"',
        }),
        block("table", [], {
          align: ["left", null, "right"],
          rows: [
            [[{ text: "a" }], [{ text: "b|c" }], []],
            [
              [{ text: "x", marks: [{ type: "code" }] }],
              [{ text: "y" }],
              [{ text: " z" }],
            ],
          ],
        })
      )
    ).toBe(
      '![A \\[b\\]](</a b.png> "say \\"hi\\"")\n\n| a | b\\|c |  |\n| :-- | --- | --: |\n| `x` | y | &#32;z |\n'
    )
  })

  it("fall back to a fence for indented code after a list", () => {
    expect(
      serializeBlocks(
        block("bulleted", [text("a")]),
        block("code", [text("x")], { language: null, fence: "indent" })
      )
    ).toBe("- a\n\n```\nx\n```\n")
  })
})

describe("escaping", () => {
  it("leaves text that can't be syntax alone", () => {
    expect(
      serializeRuns([text("a * b, snake_case, 2 > 1, #tag, a # b, [x, ~a~")])
    ).toBe("a * b, snake_case, 2 > 1, #tag, a # b, [x, ~a~")
  })

  it("escapes delimiters that could open or close", () => {
    expect(
      serializeRuns([text("*a* _b_ **c** `d` ~~e~~ [f](g) <h> &amp; \\*")])
    ).toBe(
      "\\*a\\* \\_b\\_ \\*\\*c\\*\\* \\`d\\` \\~\\~e\\~\\~ \\[f\\](g) \\<h> \\&amp; \\\\\\*"
    )
  })

  it("escapes block syntax at the start of a line", () => {
    expect(serializeRuns([text("# a\n> b\n- c\n1. d\n    e\n---\n```")])).toBe(
      "\\# a  \n\\> b  \n\\- c  \n1\\. d  \n&#32;   e  \n\\---  \n\\```"
    )
  })

  it("keeps edge whitespace and breaks with entities", () => {
    expect(serializeRuns([text(" a \n\nb\n")])).toBe(
      "&#32;a&#32;  \n&#10;b&#10;"
    )
  })

  it("writes code spans around backticks", () => {
    expect(serializeRuns([text("a`b", code), text(" "), text("`", code)])).toBe(
      "``a`b`` `` ` ``"
    )
  })

  it("moves edge spaces out of emphasis", () => {
    expect(serializeRuns([text("a "), text(" b ", bold), text("c")])).toBe(
      "a  **b** c"
    )
  })

  it("writes autolinks in their recorded form", () => {
    const angle = {
      type: "link",
      attrs: { href: "https://a.b", autolink: "angle" },
    }
    const bare = {
      type: "link",
      attrs: { href: "http://www.a.b", autolink: "bare" },
    }
    expect(
      serializeRuns([
        text("https://a.b", angle),
        text(" "),
        text("www.a.b", bare),
      ])
    ).toBe("<https://a.b> www.a.b")
    expect(serializeRuns([text("see www.a.b")])).toBe("see www\\.a.b")
  })

  it("never escapes raw runs", () => {
    expect(serializeRuns([{ text: "<b>*</b>", raw: true }])).toBe("<b>*</b>")
  })
})

describe("document parts", () => {
  it("keeps unchanged frontmatter and rewrites edited frontmatter", () => {
    const document = parseMarkdown("---\ntitle: A   \n---\n\nText\n")
    expect(serializeMarkdown(document)).toBe("---\ntitle: A   \n---\n\nText\n")
    expect(serializeMarkdown({ ...document, frontmatter: "title: B" })).toBe(
      "---\ntitle: B\n---\n\nText\n"
    )
    expect(serializeMarkdown({ ...document, frontmatter: null })).toBe(
      "\nText\n"
    )
  })

  it("adds a final newline when there is no recorded trailing text", () => {
    expect(serializeBlocks(block("paragraph", [text("a")]))).toBe("a\n")
    expect(serializeMarkdown(createDocument([]))).toBe("")
  })

  it("uses the document's line endings for new text", () => {
    const document = parseMarkdown("a\r\n\r\nb\r\n")
    const edited = editBlock(document, 1, [text("c\nd")])
    expect(serializeMarkdown(edited)).toBe("a\r\n\r\nc  \r\nd\r\n")
  })

  it("lets a syntax write the blocks it owns", () => {
    const note: MarkdownSyntax = {
      serializeBlock: (item) =>
        item.type === "note"
          ? `:::note\n${item.content[0]?.text ?? ""}\n:::`
          : null,
    }
    expect(
      serializeMarkdown(createDocument([block("note", [text("hi")])]), {
        syntax: [note],
      })
    ).toBe(":::note\nhi\n:::\n")
  })
})

// MARK: Round trip of generated documents

/** mulberry32: small, fast and deterministic. */
function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

type Random = () => number

function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

const ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
const WORDS = ["alpha", "Beta", "gamma7", "x", "42", "café", "日本"]
const PLAIN_TOKENS = [
  ...ASCII_PUNCTUATION,
  ...WORDS,
  " ",
  "  ",
  "\t",
  "# ",
  "## x",
  "1. ",
  "2) ",
  "> ",
  "- ",
  "+ ",
  "* ",
  "***",
  "---",
  "===",
  "```",
  "~~~",
  "~~",
  "$$",
  "<div>",
  "</a>",
  "<!--",
  "&amp;",
  "&#35;",
  "&copy;",
  "\\",
  "\\*",
  "[a](b)",
  "[x]",
  "[ ] ",
  "![i](s)",
  "<http://a.b>",
  "https://ex.com/p",
  "www.ex.com",
  "| --- |",
  "|",
  "    ",
  "a_b_c",
  "snake_case",
  "2*3*4",
]
const MARKED_WORDS = [
  "a",
  "word",
  "a*b",
  "x_y",
  "p.q",
  "q[1]",
  "m`n",
  "c&d",
  "e<f",
  "hello world",
]
const HREFS = [
  "https://example.com",
  "/path",
  "/a b",
  "",
  "x_(y)",
  "a)b",
  "q?a=1&b=2",
  "\\x",
]
const TITLES = [null, "Title", 'a "quoted" title', "x\\y"]
const RAW_INLINE = ["<kbd>", "</kbd>", '<span class="x">', "<!-- c -->"]
const MARK_TYPES = ["bold", "italic", "strike", "code", "link"]

function createPlainText(random: Random, isCodeSafe = false) {
  const count = 1 + Math.floor(random() * 6)
  let value = ""
  for (let index = 0; index < count; index += 1)
    value += pick(random, PLAIN_TOKENS)
  return isCodeSafe ? value.replace(/\\/g, "/") : value
}

type PieceOptions = { hasBreaks: boolean; isCell: boolean }

/**
 * Inline content that Markdown can hold: marked words start and end with a
 * letter or digit and sit between spaces, so delimiters always flank.
 */
function createRuns(random: Random, options: PieceOptions) {
  const runs: EditorInline[] = []
  const count = 1 + Math.floor(random() * 6)
  let isLineStart = true
  // A bare autolink ends at whitespace, so it can't sit before a line break.
  let isAfterBareLink = false
  for (let index = 0; index < count; index += 1) {
    const kind = random()
    if (!isLineStart) runs.push({ text: " " })
    if (kind < 0.35) {
      runs.push({ text: createPlainText(random, options.isCell) })
    } else if (kind < 0.75) {
      const marks: EditorMark[] = MARK_TYPES.filter(() => random() < 0.4).map(
        (type): EditorMark => {
          if (type !== "link") return { type }
          const title = pick(random, TITLES)
          return {
            type,
            attrs: {
              href: pick(random, HREFS),
              ...(title === null ? {} : { title }),
            },
          }
        }
      )
      if (marks.length === 0) marks.push({ type: "bold" })
      const isCode = marks.some((mark) => mark.type === "code")
      const value =
        isCode && random() < 0.5
          ? createPlainText(random, true)
          : pick(random, MARKED_WORDS)
      runs.push({
        text: options.isCell && isCode ? value.replace(/\\/g, "/") : value,
        marks,
      })
    } else if (kind < 0.82 && !isLineStart) {
      runs.push({ text: pick(random, RAW_INLINE), raw: true })
    } else if (kind < 0.9) {
      const isBare = random() < 0.5
      const value = isBare
        ? pick(random, ["https://ex.com/a", "www.ex.org"])
        : "https://ex.com/b"
      const href = value.startsWith("www.") ? `http://${value}` : value
      runs.push({
        text: value,
        marks: [
          {
            type: "link",
            attrs: { href, autolink: isBare ? "bare" : "angle" },
          },
        ],
      })
      isLineStart = false
      isAfterBareLink = isBare
      continue
    } else if (
      options.hasBreaks &&
      !isLineStart &&
      !isAfterBareLink &&
      index < count - 1
    ) {
      runs.push({ text: "\n" })
      isLineStart = true
      continue
    } else {
      runs.push({ text: pick(random, WORDS) })
    }
    isLineStart = false
    isAfterBareLink = false
  }
  return normalizeRuns(runs).map((run, index, all) => {
    const link = run.marks?.[0]
    if (link?.attrs?.autolink !== "bare") return run
    // Only text after a space on the same line keeps a bare autolink apart.
    const after = all
      .slice(index + 1)
      .map((item) => item.text)
      .join("")
    if (after === "" || /^[ \t]+\S/.test(after)) return run
    return {
      ...run,
      marks: [{ type: "link", attrs: { href: link.attrs.href } }],
    }
  })
}

function getInlineStyle(random: Random, runs: readonly EditorInline[]) {
  const hasItalic = runs.some((run) =>
    run.marks?.some((mark) => mark.type === "italic")
  )
  const hasBold = runs.some((run) =>
    run.marks?.some((mark) => mark.type === "bold")
  )
  // A quote's blank line separates paragraphs; it isn't a hard break.
  const hasBreak = runs.some(
    (run) => !run.raw && run.text.replace(/\n\n/g, "").includes("\n")
  )
  return {
    ...(hasItalic && random() < 0.5 ? { emphasis: "_" } : {}),
    ...(hasBold && random() < 0.5 ? { strong: "__" } : {}),
    ...(hasBreak && random() < 0.5 ? { hardBreak: "backslash" } : {}),
  }
}

function toJsonMark(mark: EditorMark): EditorJson {
  return mark.attrs
    ? { type: mark.type, attrs: { ...mark.attrs } }
    : { type: mark.type }
}

function toJsonRuns(runs: readonly EditorInline[]): EditorJson {
  return runs.map((run) => {
    const json: { [key: string]: EditorJson } = { text: run.text }
    if (run.marks) json.marks = run.marks.map(toJsonMark)
    if (run.raw) json.raw = true
    return json
  })
}

function createCodeText(random: Random) {
  const lines = Array.from({ length: 1 + Math.floor(random() * 3) }, () =>
    createPlainText(random)
      .replace(/^[ \t]*(?:`{3,}|~{3,})/, "x")
      .replace(/\n/g, "")
  )
  return lines.join("\n")
}

const LIST_TYPES = new Set(["bulleted", "numbered", "task"])

/** The deepest a generated list item or paragraph goes: seven levels. */
const MAXIMUM_INDENT = 6
const NESTED_KINDS = ["paragraph", "paragraph", "bulleted", "numbered", "task"]

function createBlocks(random: Random) {
  const blocks: EditorBlock[] = []
  const count = 1 + Math.floor(random() * 20)
  for (let index = 0; index < count; index += 1) {
    const previous = blocks[blocks.length - 1]
    const isAfterList = previous !== undefined && LIST_TYPES.has(previous.type)
    const isInList = isAfterList || (previous?.indent ?? 0) > 0
    // Inside a list, mostly more items and paragraphs, so nesting goes deep.
    const kind = pick(
      random,
      isInList && random() < 0.8
        ? NESTED_KINDS
        : [
            "paragraph",
            "heading",
            "setext",
            "bulleted",
            "numbered",
            "task",
            "quote",
            "code",
            "indented",
            "divider",
            "image",
            "table",
            "raw",
          ]
    )
    // Mostly as deep as the block before allows, so lists and their
    // paragraphs reach every level.
    const limit = Math.min(getIndentLimit(previous), MAXIMUM_INDENT)
    const indent =
      limit === 0 || random() < 0.1
        ? 0
        : random() < 0.75
          ? limit
          : Math.floor(random() * (limit + 1))
    const inline = (hasBreaks: boolean) =>
      createRuns(random, { hasBreaks, isCell: false })
    switch (kind) {
      case "paragraph": {
        const runs = inline(true)
        blocks.push(
          block("paragraph", runs, getInlineStyle(random, runs), indent)
        )
        break
      }
      case "heading": {
        const runs = inline(false)
        blocks.push(
          block("heading", runs, {
            level: 1 + Math.floor(random() * 6),
            ...getInlineStyle(random, runs),
          })
        )
        break
      }
      case "setext": {
        const runs = inline(false)
        blocks.push(
          block("heading", runs, {
            level: random() < 0.5 ? 1 : 2,
            style: "setext",
            ...getInlineStyle(random, runs),
          })
        )
        break
      }
      case "bulleted": {
        const runs = inline(true)
        blocks.push(
          block(
            "bulleted",
            runs,
            {
              marker: pick(random, ["-", "*", "+"]),
              ...getInlineStyle(random, runs),
            },
            indent
          )
        )
        break
      }
      case "numbered": {
        const runs = inline(true)
        blocks.push(
          block(
            "numbered",
            runs,
            {
              number: Math.floor(random() * 12),
              delimiter: pick(random, [".", ")"]),
              ...getInlineStyle(random, runs),
            },
            indent
          )
        )
        break
      }
      case "task": {
        const runs = random() < 0.1 ? [] : inline(true)
        blocks.push(
          block(
            "task",
            runs,
            {
              checked: random() < 0.5,
              marker: pick(random, ["-", "*", "+"]),
              ...getInlineStyle(random, runs),
            },
            indent
          )
        )
        break
      }
      case "quote": {
        const runs = normalizeRuns([
          ...inline(true),
          ...(random() < 0.5 ? [{ text: "\n\n" }, ...inline(false)] : []),
        ])
        blocks.push(block("quote", runs, getInlineStyle(random, runs)))
        break
      }
      case "code": {
        const fence = pick(random, ["```", "~~~"])
        const language = pick(random, [null, "ts", "c++", "shell"])
        const fenceLength = pick(random, [3, 3, 4, 5])
        const meta = random() < 0.3 ? 'title="a b.ts"' : null
        blocks.push(
          block("code", normalizeRuns([{ text: createCodeText(random) }]), {
            language: meta && language === null ? "ts" : language,
            fence,
            ...(fenceLength > 3 ? { fenceLength } : {}),
            ...(meta ? { meta } : {}),
          })
        )
        break
      }
      case "indented": {
        const isAfterIndented =
          previous?.type === "code" && previous.attrs.fence === "indent"
        if (isInList || isAfterIndented) break
        const value = createCodeText(random)
          .split("\n")
          .map((line) => (line.trim() === "" ? "x" : line))
          .join("\n")
        blocks.push(
          block("code", [{ text: value }], { language: null, fence: "indent" })
        )
        break
      }
      case "divider":
        blocks.push(
          block("divider", [], {
            marker: pick(random, ["---", "***", "___", "* * *", "- - -"]),
          })
        )
        break
      case "image":
        blocks.push(
          block("image", [], {
            src: pick(random, HREFS),
            alt: pick(random, ["", "alt", "a [b] *c*", "x\\y", "100%"]),
            title: pick(random, TITLES),
          })
        )
        break
      case "table": {
        const columns = 1 + Math.floor(random() * 3)
        const align = Array.from({ length: columns }, () =>
          pick(random, ["left", "center", "right", null])
        )
        const rows = Array.from({ length: 1 + Math.floor(random() * 3) }, () =>
          Array.from({ length: columns }, () =>
            random() < 0.15
              ? []
              : toJsonRuns(
                  createRuns(random, { hasBreaks: false, isCell: true })
                )
          )
        )
        blocks.push(block("table", [], { align, rows }))
        break
      }
      case "raw":
        blocks.push(
          block("raw", [
            {
              text: pick(random, [
                "<div>\n<p>hi</p>\n</div>",
                "<!-- comment -->",
                "[ref]: https://example.com",
                '<Preview\n  name="x"\n/>',
              ]),
              raw: true,
            },
          ])
        )
        break
    }
  }
  return blocks
}

describe("round trip of edits", () => {
  it("parses serialised documents back to the same blocks", () => {
    const failures: string[] = []
    const paragraphDepths = new Map<number, number>()
    for (let seed = 1; seed <= 5000; seed += 1) {
      const random = createRandom(seed)
      const frontmatter =
        random() < 0.2 ? "title: Generated\nlist:\n  - a" : null
      const document = createDocument(createBlocks(random), frontmatter)
      for (const item of document.blocks) {
        if (item.type !== "paragraph") continue
        paragraphDepths.set(
          item.indent,
          (paragraphDepths.get(item.indent) ?? 0) + 1
        )
      }
      const markdown = serializeMarkdown(document)
      const parsed = parseMarkdown(markdown)
      const expected = getFingerprints(document)
      const actual = getFingerprints(parsed)
      if (
        parsed.frontmatter !== document.frontmatter ||
        expected.length !== actual.length ||
        expected.some((fingerprint, index) => fingerprint !== actual[index])
      ) {
        const index = expected.findIndex(
          (fingerprint, position) => fingerprint !== actual[position]
        )
        failures.push(
          [
            `seed ${seed}, block ${index}`,
            markdown,
            `expected ${expected[index] ?? "(none)"}`,
            `actual   ${actual[index] ?? "(none)"}`,
          ].join("\n")
        )
      }
    }
    expect(failures.slice(0, 3)).toEqual([])
    // Paragraphs continue list items at every level the generator reaches.
    for (let depth = 1; depth <= MAXIMUM_INDENT; depth += 1) {
      expect(paragraphDepths.get(depth) ?? 0, `depth ${depth}`).toBeGreaterThan(
        5
      )
    }
  })

  it("holds every ASCII punctuation character at every position", () => {
    for (const character of ASCII_PUNCTUATION) {
      for (const value of [
        character,
        `${character}a`,
        `a${character}`,
        `a${character}b`,
        `${character}${character}`,
        `${character} a`,
        `a ${character}`,
        `${character}${character}${character}`,
        `x\n${character} y`,
      ]) {
        for (const type of ["paragraph", "heading", "bulleted", "quote"]) {
          const attrs: Record<string, EditorJson> =
            type === "heading"
              ? { level: 1 }
              : type === "bulleted"
                ? { marker: "-" }
                : {}
          const content = type === "heading" ? value.replace("\n", " ") : value
          const original = block(type, [{ text: content }], attrs)
          const parsed = parseMarkdown(serializeBlocks(original))
          expect(
            getFingerprints(parsed),
            JSON.stringify({ type, content })
          ).toEqual([getBlockFingerprint(original)])
        }
      }
    }
  })
})
