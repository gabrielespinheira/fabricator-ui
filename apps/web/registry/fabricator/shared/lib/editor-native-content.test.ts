import { describe, expect, it } from "vitest"

import { createBlock, getFlatText, type EditorDocument } from "./editor-model"
import { getNativeEditorContent } from "./editor-native-content"

function document(blocks: EditorDocument["blocks"]): EditorDocument {
  return { frontmatter: null, blocks }
}

describe("native editor content", () => {
  it("uses the document's flat text", () => {
    const doc = document([
      createBlock({ type: "paragraph" }, "One\nTwo"),
      createBlock({ type: "divider" }),
    ])
    expect(getNativeEditorContent(doc, 3).text).toBe(getFlatText(doc))
    expect(getNativeEditorContent(doc, 3).version).toBe(3)
  })

  it("turns marked runs into spans at flat offsets", () => {
    const doc = document([
      createBlock({ type: "paragraph" }, "Hi"),
      {
        ...createBlock({ type: "paragraph" }),
        content: [
          { text: "a" },
          { text: "b", marks: [{ type: "bold" }, { type: "italic" }] },
          { text: "c", marks: [{ type: "link", attrs: { href: "/x" } }] },
          { text: "<d>", raw: true },
        ],
      },
    ])
    expect(getNativeEditorContent(doc, 1).spans).toEqual([
      { start: 4, end: 5, bold: true, italic: true },
      { start: 5, end: 6, link: "/x" },
      { start: 6, end: 9, raw: true },
    ])
  })

  it("describes each paragraph with its kind and range", () => {
    const doc = document([
      createBlock({ type: "heading", attrs: { level: 2 } }, "Title"),
      createBlock({ type: "code", attrs: { language: "ts" } }, "a\nb"),
      createBlock({ type: "task", attrs: { checked: true } }, "Done"),
    ])
    expect(getNativeEditorContent(doc, 1).paragraphs).toEqual([
      { start: 0, end: 5, kind: "heading", level: 2 },
      { start: 6, end: 9, kind: "code", label: "TypeScript" },
      { start: 10, end: 14, kind: "task", indent: 0, checked: true },
    ])
  })

  it("numbers ordered lists from their start and marks bullets by depth", () => {
    const doc = document([
      createBlock({ type: "numbered", attrs: { number: 3 } }, "c"),
      createBlock({ type: "bulleted", indent: 1 }, "nested"),
      createBlock({ type: "bulleted", indent: 2 }, "deeper"),
      createBlock({ type: "numbered", attrs: { number: 9 } }, "d"),
      createBlock({ type: "paragraph" }, "break"),
      createBlock({ type: "numbered", attrs: { number: 1 } }, "a"),
    ])
    expect(
      getNativeEditorContent(doc, 1).paragraphs.map(({ marker, indent }) => [
        marker,
        indent,
      ])
    ).toEqual([
      ["3.", 0],
      ["•", 1],
      ["•", 2],
      ["4.", 0],
      [undefined, undefined],
      ["1.", 0],
    ])
  })
  it("gives a table its cells as plain text and its alignment", () => {
    const doc = document([
      createBlock({
        type: "table",
        attrs: {
          align: ["left", null, "right"],
          rows: [
            [[{ text: "Name" }], [{ text: "Owner" }], [{ text: "Total" }]],
            [
              [{ text: "Bold", marks: [{ type: "bold" }] }, { text: " cell" }],
              [
                {
                  text: "Gabs",
                  marks: [{ type: "link", attrs: { href: "/g" } }],
                },
              ],
            ],
          ],
        },
      }),
    ])
    const [table] = getNativeEditorContent(doc, 1).paragraphs
    expect(table?.kind).toBe("table")
    expect(table?.table).toEqual({
      rows: [
        ["Name", "Owner", "Total"],
        ["Bold cell", "Gabs", ""],
      ],
      align: ["left", null, "right"],
    })
    expect(getNativeEditorContent(doc, 1).spans).toEqual([])
  })
  it("gives a paragraph nested under a list item its indent", () => {
    const doc = document([
      createBlock({ type: "bulleted", indent: 1 }, "item"),
      createBlock({ type: "paragraph", indent: 2 }, "more"),
      createBlock({ type: "paragraph" }, "after"),
    ])
    expect(
      getNativeEditorContent(doc, 1).paragraphs.map(
        ({ kind, indent, marker }) => [kind, indent, marker]
      )
    ).toEqual([
      ["bulleted", 1, "•"],
      ["paragraph", 2, undefined],
      ["paragraph", undefined, undefined],
    ])
  })

  it("colours a code block's tokens at their flat offsets", () => {
    const doc = document([
      createBlock({ type: "paragraph" }, "Intro"),
      createBlock(
        { type: "code", attrs: { language: "ts" } },
        "const a = 1\n// done"
      ),
    ])
    const content = getNativeEditorContent(doc, 1)
    const text = (span: { start: number; end: number }) =>
      content.text.slice(span.start, span.end)
    const tokens = content.spans.filter((span) => span.token)
    expect(tokens.map((span) => [span.token, text(span)])).toEqual(
      expect.arrayContaining([
        ["keyword", "const"],
        ["constant", "1"],
        ["comment", "// done"],
      ])
    )
    expect(content.paragraphs[1]?.label).toBe("TypeScript")
  })

  it("keeps code tokens on their lines after a CRLF", () => {
    const doc = document([
      createBlock({ type: "code", attrs: { language: "js" } }, "a\r\nreturn"),
    ])
    const content = getNativeEditorContent(doc, 1)
    const keyword = content.spans.find((span) => span.token === "keyword")
    expect(keyword && content.text.slice(keyword.start, keyword.end)).toBe(
      "return"
    )
  })

  it("labels a code block without a language as plain text", () => {
    const doc = document([createBlock({ type: "code" }, "x")])
    const content = getNativeEditorContent(doc, 1)
    expect(content.paragraphs[0]?.label).toBe("Plain text")
    expect(content.spans).toEqual([])
  })
})
