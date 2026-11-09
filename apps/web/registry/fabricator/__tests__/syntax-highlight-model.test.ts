import elixir from "refractor/elixir"
import { describe, expect, it } from "vitest"

import {
  getCodeLanguage,
  getLanguageFromFilename,
  getLanguageLabel,
  getLineNumbers,
  highlightCode,
  registerLanguage,
  resolveLanguage,
  type SyntaxLine,
  type SyntaxTokenKind,
} from "@/registry/fabricator/shared/lib/syntax-highlight-model"

const toText = (lines: SyntaxLine[]) =>
  lines.map((line) => line.tokens.map((token) => token.content).join(""))

/** The kind of the first token whose text, trimmed, is `content`. */
function kindOf(lines: SyntaxLine[], content: string): SyntaxTokenKind {
  const token = lines
    .flatMap((line) => line.tokens)
    .find((candidate) => candidate.content.trim() === content)
  if (!token) throw new Error(`No token "${content}"`)
  return token.kind
}

describe("highlightCode", () => {
  const tsx = [
    'import * as React from "react"',
    "",
    "// A button.",
    "export function Button({ size = 2, ...props }: ButtonProps) {",
    '  return <button data-slot="button" className={cn("base")} {...props} />',
    "}",
  ].join("\n")

  it("keeps the code's text, one entry per line", () => {
    expect(toText(highlightCode(tsx, "tsx"))).toEqual(tsx.split("\n"))
  })

  it("drops one trailing newline and reads Windows line endings", () => {
    expect(toText(highlightCode("a\r\nb\n", "text"))).toEqual(["a", "b"])
    expect(toText(highlightCode("a\n\n", "text"))).toEqual(["a", ""])
    expect(toText(highlightCode("", "tsx"))).toEqual([""])
  })

  it("names each token by what it is", () => {
    const lines = highlightCode(tsx, "tsx")
    expect(kindOf(lines, "import")).toBe("keyword")
    expect(kindOf(lines, '"react"')).toBe("string")
    expect(kindOf(lines, "// A button.")).toBe("comment")
    expect(kindOf(lines, "Button")).toBe("function")
    expect(kindOf(lines, "2")).toBe("constant")
    expect(kindOf(lines, "button")).toBe("tag")
    expect(kindOf(lines, "data-slot")).toBe("attribute")
    expect(kindOf(lines, "} />")).toBe("punctuation")
  })

  it("gives code inside a JSX expression its own colours, not the tag's", () => {
    const lines = highlightCode(tsx, "tsx")
    expect(kindOf(lines, "cn")).toBe("function")
    expect(kindOf(lines, '"base"')).toBe("string")
    expect(kindOf(lines, "props")).toBe("plain")
  })

  it("colours a template string's interpolation as code", () => {
    const lines = highlightCode("const greeting = `Hi ${name}!`", "ts")
    expect(kindOf(lines, "name")).toBe("plain")
    expect(kindOf(lines, "!`")).toBe("string")
  })

  it("reads PascalCase names as types and SCREAMING_CASE as constants", () => {
    const lines = highlightCode(
      "const size: Size = MAX_SIZE\nfunction go(props: ButtonProps) {}",
      "ts"
    )
    expect(kindOf(lines, "Size")).toBe("type")
    expect(kindOf(lines, "MAX_SIZE")).toBe("constant")
    expect(kindOf(lines, "ButtonProps")).toBe("type")
  })

  it("leaves capitalised words alone in prose and shell", () => {
    expect(kindOf(highlightCode("Hello World", "md"), "Hello World")).toBe(
      "plain"
    )
    const shell = highlightCode("echo Hello", "bash")
    expect(
      shell[0].tokens.some(
        (token) => token.content.includes("Hello") && token.kind === "type"
      )
    ).toBe(false)
  })

  it("folds whitespace into the token before it", () => {
    const [line] = highlightCode("const a = 1", "ts")
    expect(line.tokens.map((token) => token.content)).toEqual([
      "const",
      " a ",
      "= ",
      "1",
    ])
  })

  it("merges neighbouring tokens of the same kind", () => {
    const [line] = highlightCode("plain words here", "text")
    expect(line.tokens).toEqual([
      {
        content: "plain words here",
        kind: "plain",
        isStrong: false,
        isEmphasis: false,
      },
    ])
  })

  it("renders an unknown language as plain text", () => {
    const lines = highlightCode("defmodule Hello do", "not-a-language")
    expect(lines).toHaveLength(1)
    expect(lines[0].tokens).toHaveLength(1)
    expect(lines[0].tokens[0].kind).toBe("plain")
  })

  it("marks a diff's added and removed lines", () => {
    const lines = highlightCode(" same\n-old\n+new", "diff")
    expect(lines.map((line) => line.diff)).toEqual([
      null,
      "deleted",
      "inserted",
    ])
    expect(lines[2].tokens.every((token) => token.kind === "inserted")).toBe(
      true
    )
  })

  it("colours a diff's lines in the file's own language", () => {
    const code = [
      "@@ -1,3 +1,3 @@",
      " {",
      '-  "version": "0.5.1",',
      '+  "version": "0.6.0",',
      " }",
    ].join("\n")
    const lines = highlightCode(code, "diff-json")
    expect(toText(lines)).toEqual(code.split("\n"))
    expect(lines.map((line) => line.diff)).toEqual([
      null,
      null,
      "deleted",
      "inserted",
      null,
    ])
    expect(kindOf(lines, "@@ -1,3 +1,3 @@")).toBe("keyword")
    expect(lines[3].tokens[0]).toMatchObject({ content: "+", kind: "inserted" })
    expect(kindOf(lines, '"version"')).toBe("property")
    expect(kindOf(lines, '"0.6.0"')).toBe("string")
  })

  it("reads a diff of an unknown language as a plain diff", () => {
    const lines = highlightCode("-a\n+b", "diff-klingon")
    expect(lines.map((line) => line.diff)).toEqual(["deleted", "inserted"])
  })

  it("covers the formats a project is made of", () => {
    expect(kindOf(highlightCode('{ "name": 1 }', "json"), '"name"')).toBe(
      "property"
    )
    expect(kindOf(highlightCode(".card { color: red; }", "css"), "color")).toBe(
      "property"
    )
    expect(kindOf(highlightCode(".card { color: red; }", "css"), ".card")).toBe(
      "tag"
    )
    expect(kindOf(highlightCode("name: fabricator", "yaml"), "name")).toBe(
      "property"
    )
    expect(kindOf(highlightCode("def go():\n  pass", "python"), "def")).toBe(
      "keyword"
    )
    expect(kindOf(highlightCode("echo $name", "sh"), "$name")).toBe("variable")
    expect(
      kindOf(highlightCode("const r = /a+[b-c]/g", "js"), "/a+[b-c]/g")
    ).toBe("regex")
    expect(kindOf(highlightCode('<p class="a">', "html"), "p")).toBe("tag")
    expect(kindOf(highlightCode("SELECT id FROM users", "sql"), "SELECT")).toBe(
      "keyword"
    )
  })

  it("reads markdown's headings, emphasis and links", () => {
    const lines = highlightCode(
      "# Title\n**bold** and [docs](https://fabricator.dev)",
      "md"
    )
    expect(kindOf(lines, "Title")).toBe("heading")
    const bold = lines[1].tokens.find((token) => token.content === "bold")
    expect(bold?.isStrong).toBe(true)
    expect(kindOf(lines, "[docs](https://fabricator.dev)")).toBe("link")
  })
})

describe("resolveLanguage", () => {
  it("resolves names and aliases to a bundled language", () => {
    expect(resolveLanguage("ts")).toBe("typescript")
    expect(resolveLanguage("TSX")).toBe("tsx")
    expect(resolveLanguage("sh")).toBe("bash")
    expect(resolveLanguage("zsh")).toBe("bash")
    expect(resolveLanguage("html")).toBe("markup")
    expect(resolveLanguage("yml")).toBe("yaml")
    expect(resolveLanguage("mdx")).toBe("markdown")
    expect(resolveLanguage("jsonc")).toBe("json")
    expect(resolveLanguage("mjs")).toBe("javascript")
    expect(resolveLanguage("diff-ts")).toBe("diff-typescript")
    expect(resolveLanguage("diff-klingon")).toBe("diff")
  })

  it("returns null for plain text and unknown languages", () => {
    expect(resolveLanguage("text")).toBeNull()
    expect(resolveLanguage("klingon")).toBeNull()
    expect(resolveLanguage(undefined)).toBeNull()
  })

  it("picks up a language registered later", () => {
    expect(resolveLanguage("elixir")).toBeNull()
    registerLanguage(elixir)
    expect(resolveLanguage("elixir")).toBe("elixir")
    expect(
      kindOf(highlightCode("defmodule Hello do", "elixir"), "defmodule")
    ).toBe("keyword")
  })
})

describe("getLanguageFromFilename", () => {
  it.each([
    ["app/page.tsx", "tsx"],
    ["lib/utils.ts", "typescript"],
    ["vite.config.mts", "typescript"],
    ["index.js", "javascript"],
    ["styles.module.css", "css"],
    ["theme.scss", "scss"],
    ["README.md", "markdown"],
    ["content/docs/index.mdx", "markdown"],
    ["package.json", "json"],
    ["tsconfig.jsonc", "json"],
    ["config.yml", "yaml"],
    ["Cargo.toml", "toml"],
    ["main.rs", "rust"],
    ["main.go", "go"],
    ["App.swift", "swift"],
    ["Main.kt", "kotlin"],
    ["script.py", "python"],
    ["schema.graphql", "graphql"],
    ["query.sql", "sql"],
    ["index.html", "markup"],
    ["icon.svg", "markup"],
    ["changes.patch", "diff"],
    ["install.sh", "bash"],
    [".env.local", "bash"],
    ["Dockerfile", "docker"],
    ["Makefile", "makefile"],
    [".gitignore", "ignore"],
  ])("%s is %s", (filename, language) => {
    expect(getLanguageFromFilename(filename)).toBe(language)
  })

  it("returns null for a file it can't read", () => {
    expect(getLanguageFromFilename("photo.png")).toBeNull()
    expect(getLanguageFromFilename("LICENSE")).toBeNull()
  })
})

describe("getCodeLanguage", () => {
  it("prefers the language it's given, then the file's", () => {
    expect(getCodeLanguage("ts", "notes.md")).toBe("ts")
    expect(getCodeLanguage(undefined, "notes.md")).toBe("markdown")
    expect(getCodeLanguage(undefined, undefined)).toBeNull()
  })

  it("colours a diff in the language of the file it changes", () => {
    expect(getCodeLanguage("diff", "package.json")).toBe("diff-json")
    expect(getCodeLanguage("diff", "fix.patch")).toBe("diff")
    expect(getCodeLanguage("diff", undefined)).toBe("diff")
  })
})

describe("getLanguageLabel", () => {
  it("names a language the way people write it", () => {
    expect(getLanguageLabel("tsx")).toBe("TSX")
    expect(getLanguageLabel("ts")).toBe("TypeScript")
    expect(getLanguageLabel("html")).toBe("HTML")
    expect(getLanguageLabel("sh")).toBe("Shell")
    expect(getLanguageLabel("csharp")).toBe("C#")
    expect(getLanguageLabel("diff-tsx")).toBe("Diff")
  })

  it("falls back to the name it was given, or plain text", () => {
    expect(getLanguageLabel("zig")).toBe("Zig")
    expect(getLanguageLabel(undefined)).toBe("Plain text")
  })
})

describe("getLineNumbers", () => {
  it("expands single lines and inclusive ranges", () => {
    expect([...getLineNumbers([1, [3, 5], 9])]).toEqual([1, 3, 4, 5, 9])
  })

  it("accepts reversed ranges and ignores nothing", () => {
    expect([...getLineNumbers([[4, 2]])]).toEqual([2, 3, 4])
    expect(getLineNumbers(undefined).size).toBe(0)
  })
})
