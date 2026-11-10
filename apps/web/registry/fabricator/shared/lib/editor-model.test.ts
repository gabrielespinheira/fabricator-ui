import { describe, expect, it } from "vitest"

import {
  createBlock,
  fromFlatOffset,
  getBlockFingerprint,
  getBlockIndex,
  getBlockStarts,
  getBlockText,
  getFlatText,
  getIndentLimit,
  getNextCharacterOffset,
  getPreviousCharacterOffset,
  isNestableBlock,
  normalizeIndents,
  normalizeRuns,
  sliceRuns,
  snapToCharacter,
  toFlatOffset,
  type EditorBlock,
  type EditorDocument,
} from "./editor-model"

const doc: EditorDocument = {
  frontmatter: null,
  blocks: [
    createBlock({ id: "a", type: "heading", attrs: { level: 1 } }, "Title"),
    createBlock({ id: "b", type: "paragraph" }, "One\nTwo"),
    createBlock({ id: "c", type: "divider" }),
    createBlock({ id: "d", type: "paragraph" }, ""),
  ],
}

describe("runs", () => {
  it("merges neighbours with the same marks and drops empty runs", () => {
    expect(
      normalizeRuns([
        { text: "a", marks: [{ type: "bold" }] },
        { text: "" },
        { text: "b", marks: [{ type: "bold" }] },
        { text: "c" },
        { text: "d", marks: [] },
      ])
    ).toEqual([{ text: "ab", marks: [{ type: "bold" }] }, { text: "cd" }])
  })

  it("sorts marks so equal sets compare equal", () => {
    expect(
      normalizeRuns([
        { text: "a", marks: [{ type: "italic" }, { type: "bold" }] },
        { text: "b", marks: [{ type: "bold" }, { type: "italic" }] },
      ])
    ).toEqual([{ text: "ab", marks: [{ type: "bold" }, { type: "italic" }] }])
  })

  it("keeps links with different targets apart", () => {
    const runs = normalizeRuns([
      { text: "a", marks: [{ type: "link", attrs: { href: "/a" } }] },
      { text: "b", marks: [{ type: "link", attrs: { href: "/b" } }] },
    ])
    expect(runs).toHaveLength(2)
  })

  it("never merges raw runs with plain text", () => {
    expect(
      normalizeRuns([{ text: "<b>", raw: true }, { text: "x" }])
    ).toHaveLength(2)
  })

  it("slices runs by offset", () => {
    const runs = [{ text: "ab", marks: [{ type: "bold" }] }, { text: "cd" }]
    expect(sliceRuns(runs, 1, 3)).toEqual([
      { text: "b", marks: [{ type: "bold" }] },
      { text: "c" },
    ])
  })
})

describe("flat text", () => {
  it("indexes a document once when every block subscribes to it", () => {
    let reads = 0
    const blocks = Array.from({ length: 1000 }, (_, index) => ({
      ...createBlock({ type: "paragraph" }, "Text"),
      get id() {
        reads += 1
        return String(index)
      },
    }))
    for (let index = 0; index < blocks.length; index += 1) {
      expect(getBlockIndex({ blocks }, String(index))).toBe(index)
    }
    expect(getBlockIndex({ blocks }, "missing")).toBe(-1)
    expect(reads).toBeLessThanOrEqual(blocks.length * 2)
  })

  it("reuses flat text measurements while the document is unchanged", () => {
    let reads = 0
    const blocks = Array.from({ length: 100 }, (_, index) => ({
      ...createBlock({ id: String(index), type: "paragraph" }),
      get content() {
        reads += 1
        return [{ text: "Text" }]
      },
    }))
    for (let index = 0; index < blocks.length; index += 1) {
      const position = { blockId: String(index), offset: 2 }
      expect(toFlatOffset({ blocks }, position)).toBe(index * 5 + 2)
      expect(fromFlatOffset({ blocks }, index * 5 + 2)).toEqual(position)
    }
    expect(reads).toBeLessThanOrEqual(blocks.length * 2)
  })

  it("reads replaced and reordered blocks without stale offsets or indexes", () => {
    expect(getBlockIndex(doc, "b")).toBe(1)
    expect(getBlockStarts(doc)).toEqual([0, 6, 14, 16])
    const changed = {
      blocks: [
        createBlock({ id: "b", type: "paragraph" }, "Hi"),
        doc.blocks[0],
      ],
    }
    expect(getBlockIndex(changed, "b")).toBe(0)
    expect(getBlockIndex(changed, "missing")).toBe(-1)
    expect(getBlockStarts(changed)).toEqual([0, 3])
    expect(toFlatOffset(changed, { blockId: "a", offset: 20 })).toBe(8)
    expect(fromFlatOffset(changed, 3)).toEqual({ blockId: "a", offset: 0 })
    const starts = getBlockStarts(changed)
    starts[0] = 42
    expect(getBlockStarts(changed)).toEqual([0, 3])
  })

  it("joins blocks with newlines, line breaks as U+2028 and void blocks as U+FFFC", () => {
    expect(getFlatText(doc)).toBe("Title\nOne\u2028Two\n\uFFFC\n")
  })

  it("maps positions to flat offsets and back", () => {
    expect(toFlatOffset(doc, { blockId: "a", offset: 0 })).toBe(0)
    expect(toFlatOffset(doc, { blockId: "b", offset: 4 })).toBe(10)
    expect(toFlatOffset(doc, { blockId: "c", offset: 0 })).toBe(14)
    expect(toFlatOffset(doc, { blockId: "d", offset: 0 })).toBe(16)
    for (const offset of [0, 5, 6, 10, 13, 14, 16]) {
      expect(toFlatOffset(doc, fromFlatOffset(doc, offset))).toBe(offset)
    }
  })

  it("clamps offsets outside the document", () => {
    expect(fromFlatOffset(doc, -3)).toEqual({ blockId: "a", offset: 0 })
    expect(fromFlatOffset(doc, 999)).toEqual({ blockId: "d", offset: 0 })
  })

  it("reads a block's text", () => {
    expect(getBlockText(doc.blocks[1])).toBe("One\nTwo")
  })
})

describe("character boundaries", () => {
  const text = "a👩‍💻b🇵🇹c👍🏽é"

  it("steps over joined emoji, flags, skin tones and combining accents", () => {
    const stops = [0]
    let offset = 0
    while (offset < text.length) {
      offset = getNextCharacterOffset(text, offset)
      stops.push(offset)
    }
    expect(stops.map((stop) => text.slice(0, stop))).toEqual([
      "",
      "a",
      "a👩‍💻",
      "a👩‍💻b",
      "a👩‍💻b🇵🇹",
      "a👩‍💻b🇵🇹c",
      "a👩‍💻b🇵🇹c👍🏽",
      text,
    ])
  })

  it("steps back the same way", () => {
    expect(getPreviousCharacterOffset(text, text.length)).toBe(text.length - 2)
    expect(getPreviousCharacterOffset(text, 6)).toBe(1)
  })

  it("snaps an offset inside a character to its start", () => {
    expect(snapToCharacter(text, 3)).toBe(1)
    expect(snapToCharacter(text, 1)).toBe(1)
  })
})

describe("fingerprints", () => {
  it("change when the content changes and ignore ids and sources", () => {
    const block = createBlock({ id: "x", type: "paragraph" }, "Hi")
    const same = { ...createBlock({ id: "y", type: "paragraph" }, "Hi") }
    const other = createBlock({ id: "x", type: "paragraph" }, "Ho")
    expect(getBlockFingerprint(block)).toBe(getBlockFingerprint(same))
    expect(getBlockFingerprint(block)).not.toBe(getBlockFingerprint(other))
  })
})

describe("nesting", () => {
  function nested(id: string, type: string, indent: number): EditorBlock {
    return createBlock({ id, type, indent }, id)
  }

  function getIndents(blocks: readonly EditorBlock[]) {
    return blocks.map((block) => `${block.id}${block.indent}`)
  }

  it("lets list items and paragraphs take an indent", () => {
    expect(isNestableBlock({ type: "bulleted" })).toBe(true)
    expect(isNestableBlock({ type: "task" })).toBe(true)
    expect(isNestableBlock({ type: "paragraph" })).toBe(true)
    expect(isNestableBlock({ type: "heading" })).toBe(false)
    expect(isNestableBlock({ type: "image" })).toBe(false)
  })

  it("allows one level under a list item, a paragraph's own level and none after anything else", () => {
    expect(getIndentLimit(undefined)).toBe(0)
    expect(getIndentLimit({ type: "numbered", indent: 2 })).toBe(3)
    expect(getIndentLimit({ type: "paragraph", indent: 2 })).toBe(2)
    expect(getIndentLimit({ type: "quote", indent: 0 })).toBe(0)
  })

  it("keeps a valid document as it is", () => {
    const blocks = [
      nested("a", "bulleted", 0),
      nested("p", "paragraph", 1),
      nested("b", "bulleted", 1),
      nested("q", "paragraph", 2),
      nested("r", "paragraph", 2),
      nested("c", "task", 2),
      nested("s", "paragraph", 1),
      nested("t", "paragraph", 0),
    ]
    expect(normalizeIndents(blocks)).toBe(blocks)
  })

  it("clamps a paragraph whose list item became a paragraph, with what it holds", () => {
    const blocks = [
      nested("a", "paragraph", 0),
      nested("p", "paragraph", 1),
      nested("b", "bulleted", 2),
      nested("q", "paragraph", 3),
      nested("r", "paragraph", 1),
    ]
    const result = normalizeIndents(blocks)
    expect(getIndents(result)).toEqual(["a0", "p0", "b0", "q1", "r0"])
    expect(result[0]).toBe(blocks[0])
  })

  it("moves siblings of a clamped block as far as it moved", () => {
    expect(
      getIndents(
        normalizeIndents([
          nested("h", "heading", 0),
          nested("a", "bulleted", 1),
          nested("b", "bulleted", 2),
          nested("c", "bulleted", 1),
        ])
      )
    ).toEqual(["h0", "a0", "b1", "c0"])
  })

  it("keeps indents to paragraphs and list items", () => {
    expect(
      getIndents(
        normalizeIndents([
          nested("a", "bulleted", 0),
          nested("h", "heading", 1),
          nested("p", "paragraph", 2),
        ])
      )
    ).toEqual(["a0", "h0", "p0"])
  })
})
