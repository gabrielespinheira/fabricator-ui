import { describe, expect, it } from "vitest"

import {
  createBlock,
  getBlockFingerprint,
  type EditorBlock,
  type EditorInline,
} from "./editor-model"
import { parseMarkdown, type MarkdownSyntax } from "./markdown-parse"

type BlockShape = Pick<EditorBlock, "type" | "indent" | "content" | "attrs">

function toShape(block: EditorBlock): BlockShape {
  return {
    type: block.type,
    indent: block.indent,
    content: block.content,
    attrs: block.attrs,
  }
}

function parseShapes(source: string) {
  return parseMarkdown(source).blocks.map(toShape)
}

function parseRuns(source: string): readonly EditorInline[] {
  const [block] = parseMarkdown(source).blocks
  return block ? block.content : []
}

function parseFirst(source: string): BlockShape | undefined {
  return parseShapes(source)[0]
}

const bold = { type: "bold" }
const italic = { type: "italic" }
const strike = { type: "strike" }
const code = { type: "code" }

function link(href: string, extra: Record<string, string> = {}) {
  return { type: "link", attrs: { href, ...extra } }
}

describe("paragraphs and breaks", () => {
  it("joins soft-wrapped lines with a space", () => {
    expect(parseFirst("one\ntwo\n   three")).toEqual({
      type: "paragraph",
      indent: 0,
      content: [{ text: "one two three" }],
      attrs: {},
    })
  })

  it("reads two-space hard breaks as line breaks", () => {
    expect(parseFirst("one  \ntwo")).toEqual({
      type: "paragraph",
      indent: 0,
      content: [{ text: "one\ntwo" }],
      attrs: {},
    })
  })

  it("records backslash hard breaks", () => {
    expect(parseFirst("one\\\ntwo")?.attrs).toEqual({ hardBreak: "backslash" })
    expect(parseRuns("one\\\ntwo")).toEqual([{ text: "one\ntwo" }])
  })

  it("strips one trailing space before a soft break", () => {
    expect(parseRuns("one \ntwo")).toEqual([{ text: "one two" }])
  })

  it("continues a paragraph with lazy lines", () => {
    expect(parseShapes("> quote\nlazy")).toEqual([
      {
        type: "quote",
        indent: 0,
        content: [{ text: "quote lazy" }],
        attrs: {},
      },
    ])
  })
})

describe("headings", () => {
  it("reads ATX headings and drops the closing sequence", () => {
    expect(parseFirst("### Title ##")).toEqual({
      type: "heading",
      indent: 0,
      content: [{ text: "Title" }],
      attrs: { level: 3 },
    })
    expect(parseFirst("#5 bolt")?.type).toBe("paragraph")
    expect(parseFirst("#")).toEqual({
      type: "heading",
      indent: 0,
      content: [],
      attrs: { level: 1 },
    })
  })

  it("records setext headings", () => {
    expect(parseFirst("Title\n===")?.attrs).toEqual({
      level: 1,
      style: "setext",
    })
    expect(parseFirst("Title\n---")?.attrs).toEqual({
      level: 2,
      style: "setext",
    })
  })
})

describe("emphasis", () => {
  it("reads stars and underscores", () => {
    expect(parseRuns("*a* **b** ***c***")).toEqual([
      { text: "a", marks: [italic] },
      { text: " " },
      { text: "b", marks: [bold] },
      { text: " " },
      { text: "c", marks: [bold, italic] },
    ])
  })

  it("records underscore delimiters per block", () => {
    expect(parseFirst("_a_ and __b__")?.attrs).toEqual({
      emphasis: "_",
      strong: "__",
    })
    expect(parseFirst("*a* and **b**")?.attrs).toEqual({})
  })

  it("keeps intraword underscores literal but not intraword stars", () => {
    expect(parseRuns("snake_case_name")).toEqual([{ text: "snake_case_name" }])
    expect(parseRuns("_foo_bar_baz_")).toEqual([
      { text: "foo_bar_baz", marks: [italic] },
    ])
    expect(parseRuns("a*b*c")).toEqual([
      { text: "a" },
      { text: "b", marks: [italic] },
      { text: "c" },
    ])
  })

  it("follows the flanking rules", () => {
    expect(parseRuns("a * b * c")).toEqual([{ text: "a * b * c" }])
    expect(parseRuns("**a*")).toEqual([
      { text: "*" },
      { text: "a", marks: [italic] },
    ])
    expect(parseRuns("*(*a*)*")).toEqual([{ text: "(a)", marks: [italic] }])
  })

  it("nests emphasis", () => {
    expect(parseRuns("*a **b** c*")).toEqual([
      { text: "a ", marks: [italic] },
      { text: "b", marks: [bold, italic] },
      { text: " c", marks: [italic] },
    ])
    expect(parseRuns("**a *b* c**")).toEqual([
      { text: "a ", marks: [bold] },
      { text: "b", marks: [bold, italic] },
      { text: " c", marks: [bold] },
    ])
  })

  it("reads double tildes as strikethrough only", () => {
    expect(parseRuns("~~a~~ ~b~ ~~~c~~~")).toEqual([
      { text: "a", marks: [strike] },
      { text: " ~b~ ~~~c~~~" },
    ])
  })
})

describe("code spans", () => {
  it("matches backtick runs of the same length", () => {
    expect(parseRuns("``a ` b`` and ` `` `")).toEqual([
      { text: "a ` b", marks: [code] },
      { text: " and " },
      { text: "``", marks: [code] },
    ])
  })

  it("leaves unmatched backticks literal and skips escapes inside", () => {
    expect(parseRuns("```a`` b")).toEqual([{ text: "```a`` b" }])
    expect(parseRuns("`a\\*b`")).toEqual([{ text: "a\\*b", marks: [code] }])
  })
})

describe("links", () => {
  it("reads destinations and titles", () => {
    expect(parseRuns("[a](/u \"t\") [b](<c d> 'e') [f]()")).toEqual([
      { text: "a", marks: [link("/u", { title: "t" })] },
      { text: " " },
      { text: "b", marks: [link("c d", { title: "e" })] },
      { text: " " },
      { text: "f", marks: [link("")] },
    ])
  })

  it("allows balanced brackets and parentheses", () => {
    expect(parseRuns("[a [b] c](/x_(y))")).toEqual([
      { text: "a [b] c", marks: [link("/x_(y)")] },
    ])
  })

  it("lets an inner link win over an outer one", () => {
    expect(parseRuns("[[a](b)](c)")).toEqual([
      { text: "[" },
      { text: "a", marks: [link("b")] },
      { text: "](c)" },
    ])
  })

  it("marks text inside a link", () => {
    expect(parseRuns("[**a** `b`](/u)")).toEqual([
      { text: "a", marks: [link("/u"), bold] },
      { text: " ", marks: [link("/u")] },
      { text: "b", marks: [link("/u"), code] },
    ])
  })

  it("reads angle and bare autolinks", () => {
    expect(parseRuns("<https://a.b/c> <me@a.co>")).toEqual([
      {
        text: "https://a.b/c",
        marks: [link("https://a.b/c", { autolink: "angle" })],
      },
      { text: " " },
      {
        text: "me@a.co",
        marks: [link("mailto:me@a.co", { autolink: "angle" })],
      },
    ])
    expect(parseRuns("see www.a.com/x. or (https://b.org)!")).toEqual([
      { text: "see " },
      {
        text: "www.a.com/x",
        marks: [link("http://www.a.com/x", { autolink: "bare" })],
      },
      { text: ". or (" },
      {
        text: "https://b.org",
        marks: [link("https://b.org", { autolink: "bare" })],
      },
      { text: ")!" },
    ])
  })

  it("keeps reference links, footnote references and inline images raw", () => {
    const source =
      "[a][r] [r] [r][] [^1] ![i](s.png) [x][missing]\n\n[r]: /u\n\n[^1]: Note."
    expect(parseRuns(source)).toEqual([
      { text: "[a][r]", raw: true },
      { text: " " },
      { text: "[r]", raw: true },
      { text: " " },
      { text: "[r][]", raw: true },
      { text: " " },
      { text: "[^1]", raw: true },
      { text: " " },
      { text: "![i](s.png)", raw: true },
      { text: " [x][missing]" },
    ])
  })
})

describe("escapes, entities and HTML", () => {
  it("decodes entities and backslash escapes", () => {
    expect(
      parseRuns(
        "&amp; &lt; &gt; &quot; &#39; &#35; &#x41; &copy; &bogus; \\* \\a"
      )
    ).toEqual([{ text: "& < > \" ' # A © &bogus; * \\a" }])
  })

  it("keeps inline HTML raw", () => {
    expect(parseRuns("a <kbd>b</kbd> <!-- c --> d")).toEqual([
      { text: "a " },
      { text: "<kbd>", raw: true },
      { text: "b" },
      { text: "</kbd>", raw: true },
      { text: " " },
      { text: "<!-- c -->", raw: true },
      { text: " d" },
    ])
  })
})

describe("lists", () => {
  it("flattens nesting into indent", () => {
    expect(parseShapes("- a\n  - b\n    - c\n- d")).toEqual([
      {
        type: "bulleted",
        indent: 0,
        content: [{ text: "a" }],
        attrs: { marker: "-" },
      },
      {
        type: "bulleted",
        indent: 1,
        content: [{ text: "b" }],
        attrs: { marker: "-" },
      },
      {
        type: "bulleted",
        indent: 2,
        content: [{ text: "c" }],
        attrs: { marker: "-" },
      },
      {
        type: "bulleted",
        indent: 0,
        content: [{ text: "d" }],
        attrs: { marker: "-" },
      },
    ])
  })

  it("records each item's number and delimiter", () => {
    expect(
      parseShapes("3) a\n4) b\n   1. c").map((block) => block.attrs)
    ).toEqual([
      { number: 3, delimiter: ")" },
      { number: 4, delimiter: ")" },
      { number: 1, delimiter: "." },
    ])
  })

  it("reads task items", () => {
    expect(parseShapes("* [ ] a\n* [x] b\n- [ ]")).toEqual([
      {
        type: "task",
        indent: 0,
        content: [{ text: "a" }],
        attrs: { checked: false, marker: "*" },
      },
      {
        type: "task",
        indent: 0,
        content: [{ text: "b" }],
        attrs: { checked: true, marker: "*" },
      },
      {
        type: "task",
        indent: 0,
        content: [],
        attrs: { checked: false, marker: "-" },
      },
    ])
  })

  it("keeps tight and loose spacing in the source", () => {
    const tight = parseMarkdown("- a\n- b").blocks
    const loose = parseMarkdown("- a\n\n- b").blocks
    expect(tight[1].source?.before).toBe("\n")
    expect(loose[1].source?.before).toBe("\n\n")
  })

  it("gives each item its own lines", () => {
    const blocks = parseMarkdown("- a\n  wrapped\n  - b\nlazy").blocks
    expect(blocks.map((block) => block.source?.text)).toEqual([
      "- a\n  wrapped",
      "  - b\nlazy",
    ])
    expect(blocks.map((block) => block.content)).toEqual([
      [{ text: "a wrapped" }],
      [{ text: "b lazy" }],
    ])
  })

  it("nests by the content column, not a fixed width", () => {
    expect(
      parseShapes("10. a\n    - b\n   - c").map((block) => block.indent)
    ).toEqual([0, 1, 0])
    expect(parseShapes("1. a\n   - b").map((block) => block.indent)).toEqual([
      0, 1,
    ])
    expect(parseShapes("1. a\n  - b").map((block) => block.indent)).toEqual([
      0, 0,
    ])
  })

  it("reads an item's continuation paragraphs as indented paragraphs", () => {
    const blocks = parseMarkdown("- a\n\n  second paragraph\n- b").blocks
    expect(blocks.map(toShape)).toEqual([
      {
        type: "bulleted",
        indent: 0,
        content: [{ text: "a" }],
        attrs: { marker: "-" },
      },
      {
        type: "paragraph",
        indent: 1,
        content: [{ text: "second paragraph" }],
        attrs: {},
      },
      {
        type: "bulleted",
        indent: 0,
        content: [{ text: "b" }],
        attrs: { marker: "-" },
      },
    ])
    expect(blocks.map((block) => block.source?.text)).toEqual([
      "- a",
      "  second paragraph",
      "- b",
    ])
    expect(blocks.map((block) => block.source?.before)).toEqual([
      "",
      "\n\n",
      "\n",
    ])
  })

  it("reads continuation paragraphs at every depth, around nested lists", () => {
    const source = [
      "1. a",
      "",
      "   one",
      "",
      "   - b",
      "",
      "     two",
      "     wrapped",
      "lazy",
      "",
      "   three",
      "10. c",
      "",
      "    four",
    ].join("\n")
    expect(
      parseShapes(source).map(
        (block) =>
          `${block.type}>${block.indent}:${block.content
            .map((run) => run.text)
            .join("")}`
      )
    ).toEqual([
      "numbered>0:a",
      "paragraph>1:one",
      "bulleted>1:b",
      "paragraph>2:two wrapped lazy",
      "paragraph>1:three",
      "numbered>0:c",
      "paragraph>1:four",
    ])
  })

  it("makes the whole list raw when an item holds what the model can't", () => {
    for (const source of [
      "- a\n\n  > quote",
      "- a\n\n  ```\n  x\n  ```",
      "- a\n\n      indented code",
      "- a\n\n  ## heading",
      "- a\n\n  <div>x</div>",
      "- a\n\n  ![image](s.png)",
      "- a\n\n  [ref]: /url",
      "- a\n\n  | a |\n  | - |",
    ]) {
      expect(parseShapes(source), source).toEqual([
        {
          type: "raw",
          indent: 0,
          content: [{ text: source, raw: true }],
          attrs: {},
        },
      ])
    }
    expect(parseFirst("- # heading")?.type).toBe("raw")
    expect(parseFirst("1. [ ] ordered task")?.type).toBe("raw")
  })

  it("ends a list at a less indented paragraph after a blank line", () => {
    expect(parseShapes("- a\n\nb").map((block) => block.type)).toEqual([
      "bulleted",
      "paragraph",
    ])
  })
})

describe("quotes", () => {
  it("joins paragraphs with a blank line", () => {
    expect(parseFirst("> a\n> b\n>\n> c")).toEqual({
      type: "quote",
      indent: 0,
      content: [{ text: "a b\n\nc" }],
      attrs: {},
    })
  })

  it("keeps alerts and quotes holding other blocks raw", () => {
    expect(parseFirst("> [!NOTE]\n> text")?.type).toBe("raw")
    expect(parseFirst("> - a")?.type).toBe("raw")
    expect(parseFirst("> > nested")?.type).toBe("raw")
  })
})

describe("code", () => {
  it("records the fence, language and meta", () => {
    expect(parseFirst('````tsx title="a.tsx"\n```\n````')).toEqual({
      type: "code",
      indent: 0,
      content: [{ text: "```" }],
      attrs: {
        language: "tsx",
        fence: "```",
        fenceLength: 4,
        meta: 'title="a.tsx"',
      },
    })
    expect(parseFirst("~~~\na\n\nb\n~~~")).toEqual({
      type: "code",
      indent: 0,
      content: [{ text: "a\n\nb" }],
      attrs: { language: null, fence: "~~~" },
    })
  })

  it("reads indented code without trailing blank lines", () => {
    const blocks = parseMarkdown("    a\n      b\n\n    c\n\n\nd").blocks
    expect(blocks.map(toShape)[0]).toEqual({
      type: "code",
      indent: 0,
      content: [{ text: "a\n  b\n\nc" }],
      attrs: { language: null, fence: "indent" },
    })
    expect(blocks[1].source?.before).toBe("\n\n\n")
  })

  it("does not let indented code interrupt a paragraph", () => {
    expect(parseShapes("a\n    b")).toHaveLength(1)
  })
})

describe("other blocks", () => {
  it("records the exact divider line", () => {
    expect(parseFirst(" * * *")).toEqual({
      type: "divider",
      indent: 0,
      content: [],
      attrs: { marker: " * * *" },
    })
  })

  it("reads an image alone in its paragraph", () => {
    expect(parseFirst('![A *b*](/i.png "T")')).toEqual({
      type: "image",
      indent: 0,
      content: [],
      attrs: { src: "/i.png", alt: "A b", title: "T" },
    })
    expect(parseFirst("![a](b) c")?.type).toBe("paragraph")
  })

  it("reads tables with alignment and escaped pipes", () => {
    expect(
      parseFirst("| a | b | c |\n| :- | :-: | -: |\n| `x \\| y` | **z** |")
    ).toEqual({
      type: "table",
      indent: 0,
      content: [],
      attrs: {
        align: ["left", "center", "right"],
        rows: [
          [[{ text: "a" }], [{ text: "b" }], [{ text: "c" }]],
          [
            [{ text: "x | y", marks: [{ type: "code" }] }],
            [{ text: "z", marks: [{ type: "bold" }] }],
            [],
          ],
        ],
      },
    })
  })

  it("needs a matching header for a table", () => {
    expect(parseFirst("| a | b |\n| - |")?.type).toBe("paragraph")
  })

  it("keeps HTML, definitions, footnotes and math raw", () => {
    const source = [
      '<div class="a">',
      "",
      "*not emphasis*",
      "</div>",
      "",
      "<Preview",
      '  name="x"',
      "/>",
      "",
      "[ref]: /url 'Title'",
      "",
      "[^1]: A note",
      "    continued.",
      "",
      "$$",
      "x",
      "$$",
    ].join("\n")
    const blocks = parseMarkdown(source).blocks
    expect(blocks.map((block) => block.type)).toEqual([
      "raw",
      "paragraph",
      "raw",
      "raw",
      "raw",
      "raw",
      "raw",
    ])
    expect(blocks[2].content).toEqual([{ text: "</div>", raw: true }])
    expect(blocks[3].content).toEqual([
      { text: '<Preview\n  name="x"\n/>', raw: true },
    ])
  })
})

describe("frontmatter and sources", () => {
  it("keeps the frontmatter and its source", () => {
    const document = parseMarkdown("---\ntitle: A\n---\n\n# B\n")
    expect(document.frontmatter).toBe("title: A")
    expect(document.frontmatterSource).toBe("---\ntitle: A\n---\n")
    expect(document.blocks[0].source?.before).toBe("\n")
    expect(document.trailing).toBe("\n")
  })

  it("records each block's exact text, the text before it and a fingerprint", () => {
    const document = parseMarkdown("\n\n# A  \n\npara\n  \n- b\n- c\n\n\n")
    expect(
      document.blocks.map((block) => [block.source?.before, block.source?.text])
    ).toEqual([
      ["\n\n", "# A  "],
      ["\n\n", "para"],
      ["\n  \n", "- b"],
      ["\n", "- c"],
    ])
    expect(document.trailing).toBe("\n\n\n")
    for (const block of document.blocks) {
      const { source, ...rest } = block
      expect(source?.fingerprint).toBe(getBlockFingerprint(rest))
    }
  })

  it("uses newlines in the model for CRLF sources", () => {
    const document = parseMarkdown("a  \r\nb\r\n\r\n```\r\nc\r\nd\r\n```\r\n")
    expect(document.blocks.map((block) => block.content)).toEqual([
      [{ text: "a\nb" }],
      [{ text: "c\nd" }],
    ])
    expect(document.blocks[1].source?.text).toBe("```\r\nc\r\nd\r\n```")
    expect(document.trailing).toBe("\r\n")
  })

  it("gives every block a fresh id", () => {
    const ids = parseMarkdown("a\n\nb\n\nc").blocks.map((block) => block.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe("syntax extensions", () => {
  const admonition: MarkdownSyntax = {
    parseBlock(lines, index) {
      if (lines[index] !== ":::note") return null
      const end = lines.indexOf(":::", index + 1)
      if (end === -1) return null
      return {
        block: createBlock(
          { type: "note" },
          lines.slice(index + 1, end).join("\n")
        ),
        end: end + 1,
      }
    },
  }

  it("tries block hooks before the built-in syntax", () => {
    const document = parseMarkdown("a\n\n:::note\n# inside\n:::\n\nb", {
      syntax: [admonition],
    })
    expect(document.blocks.map(toShape)).toEqual([
      { type: "paragraph", indent: 0, content: [{ text: "a" }], attrs: {} },
      { type: "note", indent: 0, content: [{ text: "# inside" }], attrs: {} },
      { type: "paragraph", indent: 0, content: [{ text: "b" }], attrs: {} },
    ])
    expect(document.blocks[1].source?.text).toBe(":::note\n# inside\n:::")
  })

  it("survives a hook that throws or returns a bad range", () => {
    const broken: MarkdownSyntax = {
      parseBlock(lines, index) {
        if (index === 0) throw new Error("broken")
        return { block: createBlock({ type: "x" }), end: index }
      },
    }
    expect(parseShapes("a").length).toBe(1)
    expect(
      parseMarkdown("a\n\nb", { syntax: [broken] }).blocks.map(
        (block) => block.type
      )
    ).toEqual(["paragraph", "paragraph"])
  })
})
