import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  getBlockFingerprint,
  type EditorBlock,
  type EditorDocument,
} from "./editor-model"
import { parseMarkdown } from "./markdown-parse"
import { serializeMarkdown } from "./markdown-serialize"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(HERE, "__fixtures__", "markdown")
const REPOSITORY = path.resolve(HERE, "../../../../../..")
const SKIPPED_FOLDERS = new Set(["node_modules", ".git"])

type CorpusFile = { name: string; source: string }

function listFiles(
  folder: string,
  isWanted: (name: string) => boolean
): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      return SKIPPED_FOLDERS.has(entry.name) ? [] : listFiles(file, isWanted)
    }
    return isWanted(entry.name) ? [file] : []
  })
}

function readCorpus(files: readonly string[]): CorpusFile[] {
  return files.map((file) => ({
    name: path.relative(REPOSITORY, file),
    source: readFileSync(file, "utf8"),
  }))
}

const docs = readCorpus(
  listFiles(path.join(REPOSITORY, "apps/web/content/docs"), (name) =>
    name.endsWith(".mdx")
  )
)
const readmes = readCorpus(
  listFiles(REPOSITORY, (name) => name === "README.md")
)
const plans = readCorpus(
  listFiles(path.join(REPOSITORY, "docs/plans"), (name) =>
    name.endsWith(".md")
  ).filter((file) => path.dirname(file) === path.join(REPOSITORY, "docs/plans"))
)
const fixtures = readCorpus(listFiles(FIXTURES, (name) => name.endsWith(".md")))
const crlfFixtures = fixtures.map((file) => ({
  name: `${file.name} (CRLF)`,
  source: file.source.replace(/\r?\n/g, "\r\n"),
}))
const corpus = [...docs, ...readmes, ...plans, ...fixtures, ...crlfFixtures]

function getMismatches(files: readonly CorpusFile[]) {
  return files
    .filter(
      (file) => serializeMarkdown(parseMarkdown(file.source)) !== file.source
    )
    .map((file) => file.name)
}

describe("byte for byte", () => {
  it("covers a real corpus", () => {
    expect(docs.length).toBeGreaterThan(300)
    expect(readmes.length).toBeGreaterThan(10)
    expect(plans.length).toBeGreaterThan(5)
    expect(fixtures.length).toBeGreaterThanOrEqual(12)
    expect(fixtures.some((file) => file.source.includes("\r\n"))).toBe(true)
    expect(fixtures.some((file) => !file.source.endsWith("\n"))).toBe(true)
  })

  it.each([
    ["docs", docs],
    ["READMEs", readmes],
    ["plans", plans],
    ["fixtures", fixtures],
    ["CRLF fixtures", crlfFixtures],
  ])("returns every %s file unchanged", (_, files) => {
    expect(getMismatches(files)).toEqual([])
  })

  it("keeps only HTML, JSX and what the model can't hold raw", () => {
    const blocks = corpus.flatMap((file) => parseMarkdown(file.source).blocks)
    const raw = blocks.filter(
      (block) =>
        block.type === "raw" && !/^\s*</.test(block.content[0]?.text ?? "")
    )
    expect(raw.length / blocks.length).toBeLessThan(0.01)
  })
})

/** Where each block's text starts and ends in the serialised document. */
function getBlockRanges(document: EditorDocument) {
  let offset = document.frontmatterSource?.length ?? 0
  return document.blocks.map((block) => {
    const before = block.source?.before.length ?? 0
    const length = block.source?.text.length ?? 0
    const start = offset + before
    offset = start + length
    return { start, end: offset }
  })
}

const EDITABLE_TYPES = new Set([
  "paragraph",
  "heading",
  "bulleted",
  "numbered",
  "task",
  "quote",
])

function editBlock(block: EditorBlock): EditorBlock {
  return { ...block, content: [...block.content, { text: " edited" }] }
}

describe("local edits", () => {
  it("rewrite only the edited block's lines and parse back to the edit", () => {
    const failures: string[] = []
    let edits = 0
    for (const file of corpus) {
      const document = parseMarkdown(file.source)
      const ranges = getBlockRanges(document)
      document.blocks.forEach((block, index) => {
        if (!EDITABLE_TYPES.has(block.type) || index % 3 !== 0) return
        const edited = editBlock(block)
        const output = serializeMarkdown({
          ...document,
          blocks: document.blocks.map((item, position) =>
            position === index ? edited : item
          ),
        })
        edits += 1
        const prefix = file.source.slice(0, ranges[index].start)
        const suffix = file.source.slice(ranges[index].end)
        const isConfined =
          output.startsWith(prefix) &&
          output.endsWith(suffix) &&
          output.length >= prefix.length + suffix.length
        const reparsed = parseMarkdown(output).blocks.map(getBlockFingerprint)
        const expected = document.blocks.map((item, position) =>
          getBlockFingerprint(position === index ? edited : item)
        )
        const isFaithful =
          reparsed.length === expected.length &&
          reparsed.every(
            (fingerprint, position) => fingerprint === expected[position]
          )
        if (!isConfined || !isFaithful) {
          failures.push(
            `${file.name} block ${index}: ${JSON.stringify(block.source?.text)}`
          )
        }
      })
    }
    expect(edits).toBeGreaterThan(1000)
    expect(failures).toEqual([])
  }, 120_000)
})

// MARK: Never throws

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

const FUZZ_TOKENS = [
  ..."*_`~[]()<>!#-+=|\\&;:$^{}\"' \t\n\r\nabcXYZ019",
  "```",
  "~~~",
  "- ",
  "* ",
  "1. ",
  "2) ",
  "> ",
  "    ",
  "---\n",
  "===",
  "| --- |",
  "[ ] ",
  "<div>",
  "</div>",
  "<!--",
  "-->",
  "<Foo\n",
  "/>",
  "&amp;",
  "&#",
  "[a]: /u",
  "[^1]",
  "$$",
  "https://",
  "www.",
  "\r",
  " ",
  "😀",
]

function createFuzzText(random: () => number) {
  const count = Math.floor(random() * 120)
  let value = ""
  for (let index = 0; index < count; index += 1) {
    value += FUZZ_TOKENS[Math.floor(random() * FUZZ_TOKENS.length)]
  }
  return value
}

function stripSources(document: EditorDocument): EditorDocument {
  return {
    frontmatter: document.frontmatter,
    blocks: document.blocks.map(({ id, type, indent, content, attrs }) => ({
      id,
      type,
      indent,
      content,
      attrs,
    })),
  }
}

describe("never throws", () => {
  it("parses and serialises random Markdown-ish text back byte for byte", () => {
    const failures: string[] = []
    for (let seed = 1; seed <= 3000; seed += 1) {
      const source = createFuzzText(createRandom(seed))
      const document = parseMarkdown(source)
      if (serializeMarkdown(document) !== source)
        failures.push(JSON.stringify(source))
      expect(() => serializeMarkdown(stripSources(document))).not.toThrow()
    }
    expect(failures.slice(0, 5)).toEqual([])
  })

  it("handles empty and degenerate input", () => {
    for (const source of [
      "",
      "\n",
      "\r\n",
      "\r",
      " ",
      "---",
      "---\n",
      "```",
      "> ",
      "-",
      "|",
      "\u0000",
    ]) {
      expect(serializeMarkdown(parseMarkdown(source))).toBe(source)
    }
  })

  it("survives deep nesting and long delimiter runs", () => {
    const sources = [
      "> ".repeat(500) + "a",
      Array.from(
        { length: 200 },
        (_, index) => `${"  ".repeat(index)}- a`
      ).join("\n"),
      "*a ".repeat(3000),
      "[".repeat(3000) + "a" + "](b)".repeat(10),
      "`".repeat(5000),
    ]
    for (const source of sources) {
      expect(serializeMarkdown(parseMarkdown(source))).toBe(source)
    }
  })
})

// MARK: Performance

function createLargeDocument(blockCount: number) {
  const random = createRandom(7)
  const parts: string[] = []
  for (let index = 0; parts.length < blockCount; index += 1) {
    const kind = Math.floor(random() * 8)
    if (kind === 0) parts.push(`## Heading ${index} with *emphasis*`)
    if (kind === 1) {
      parts.push(
        `A paragraph ${index} with **bold**, _italic_, \`code\`, a [link](https://example.com/${index}) and ~~strike~~.\nIt wraps onto a second line.`
      )
    }
    if (kind === 2)
      parts.push(`- item ${index}\n- item with **bold**\n  - nested item`)
    if (kind === 3) parts.push(`1. first ${index}\n2. second`)
    if (kind === 4) parts.push(`> A quote ${index} with a <kbd>key</kbd>.`)
    if (kind === 5)
      parts.push(`\`\`\`ts\nconst value${index} = ${index}\n\`\`\``)
    if (kind === 6) parts.push(`| a | b |\n| :- | -: |\n| ${index} | **x** |`)
    if (kind === 7) parts.push("- [ ] a task\n- [x] done")
  }
  return `${parts.join("\n\n")}\n`
}

function measure(run: () => void) {
  let best = Number.POSITIVE_INFINITY
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const start = performance.now()
    run()
    best = Math.min(best, performance.now() - start)
  }
  return best
}

describe.skipIf(Boolean(process.env.CI))("performance", () => {
  it("parses and serialises a 2,000 block document in under 50ms each", () => {
    const source = createLargeDocument(1400)
    const document = parseMarkdown(source)
    expect(document.blocks.length).toBeGreaterThanOrEqual(2000)
    const rewritten = stripSources(document)
    const parse = measure(() => parseMarkdown(source))
    const serialize = measure(() => serializeMarkdown(document))
    const rewrite = measure(() => serializeMarkdown(rewritten))
    console.info(
      `${document.blocks.length} blocks: parse ${parse.toFixed(1)}ms, serialise ${serialize.toFixed(1)}ms, rewrite every block ${rewrite.toFixed(1)}ms`
    )
    expect(parse).toBeLessThan(50)
    expect(serialize).toBeLessThan(50)
    expect(rewrite).toBeLessThan(50)
  })
})
