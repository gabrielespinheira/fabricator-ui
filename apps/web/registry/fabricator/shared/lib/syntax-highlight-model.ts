// Syntax Highlight's tokenizer: code in, lines of named tokens out. No DOM and
// no React, so the website and React Native draw the same tokens.
//
// Prism's grammars (through refractor) do the reading. Prism names tokens in
// many ways (`class-name`, `attr-name`, `atrule`, …); each becomes one of the
// kinds below, and each kind is one colour in the style map. A project adds a
// language with `registerLanguage(grammar)`, from any of refractor's ~300.

import bash from "refractor/bash"
import c from "refractor/c"
import { refractor, type Syntax } from "refractor/core"
import cpp from "refractor/cpp"
import csharp from "refractor/csharp"
import css from "refractor/css"
import diff from "refractor/diff"
import docker from "refractor/docker"
import go from "refractor/go"
import graphql from "refractor/graphql"
import ignore from "refractor/ignore"
import ini from "refractor/ini"
import java from "refractor/java"
import json from "refractor/json"
import kotlin from "refractor/kotlin"
import lua from "refractor/lua"
import makefile from "refractor/makefile"
import markdown from "refractor/markdown"
import php from "refractor/php"
import python from "refractor/python"
import regex from "refractor/regex"
import ruby from "refractor/ruby"
import rust from "refractor/rust"
import scss from "refractor/scss"
import sql from "refractor/sql"
import swift from "refractor/swift"
import toml from "refractor/toml"
import tsx from "refractor/tsx"
import yaml from "refractor/yaml"

// The languages every install reads. tsx brings JavaScript, TypeScript, JSX
// and HTML; regex colours the inside of JavaScript's regular expressions.
const BUNDLED_LANGUAGES: Syntax[] = [
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  docker,
  go,
  graphql,
  ignore,
  ini,
  java,
  json,
  kotlin,
  lua,
  makefile,
  markdown,
  php,
  python,
  regex,
  ruby,
  rust,
  scss,
  sql,
  swift,
  toml,
  tsx,
  yaml,
]

for (const language of BUNDLED_LANGUAGES) refractor.register(language)

// Names people write in code fences that Prism doesn't know.
refractor.alias({
  bash: ["zsh", "console", "terminal", "shellscript", "env", "dotenv"],
  javascript: ["mjs", "cjs"],
  typescript: ["mts", "cts"],
  json: ["jsonc", "json5"],
  markdown: ["mdx"],
  rust: ["rs"],
  python: ["python3"],
  docker: ["containerfile"],
})

// --- Tokens ------------------------------------------------------------------

export const SYNTAX_TOKEN_KINDS = [
  "plain",
  "comment",
  "keyword",
  "string",
  "constant",
  "function",
  "type",
  "tag",
  "attribute",
  "property",
  "variable",
  "regex",
  "operator",
  "punctuation",
  "inserted",
  "deleted",
  "heading",
  "link",
] as const

export type SyntaxTokenKind = (typeof SYNTAX_TOKEN_KINDS)[number]

export type SyntaxToken = {
  content: string
  kind: SyntaxTokenKind
  /** Markdown's **bold**. */
  isStrong: boolean
  /** Markdown's _italic_. */
  isEmphasis: boolean
}

export type SyntaxLineDiff = "inserted" | "deleted"

export type SyntaxLine = {
  tokens: SyntaxToken[]
  /** Set on a diff's added and removed lines. */
  diff: SyntaxLineDiff | null
}

// Prism's token names, and the kind each one is. `plain` resets: code inside
// a JSX expression or a template string's `${}` takes its own colours, not the
// tag's or the string's. A name missing here takes its parent's kind.
const PRISM_KINDS: Record<string, SyntaxTokenKind> = {
  comment: "comment",
  prolog: "comment",
  doctype: "comment",
  cdata: "comment",
  shebang: "comment",
  keyword: "keyword",
  atrule: "keyword",
  rule: "keyword",
  important: "keyword",
  directive: "keyword",
  list: "keyword",
  coord: "keyword",
  string: "string",
  char: "string",
  "attr-value": "string",
  "template-string": "string",
  "string-property": "property",
  "code-snippet": "string",
  code: "string",
  number: "constant",
  boolean: "constant",
  constant: "constant",
  symbol: "constant",
  hexcode: "constant",
  unit: "constant",
  entity: "constant",
  color: "constant",
  null: "constant",
  nil: "constant",
  function: "function",
  "function-variable": "function",
  method: "function",
  "class-name": "type",
  builtin: "type",
  namespace: "type",
  "maybe-class-name": "type",
  table: "type",
  tag: "tag",
  selector: "tag",
  "attr-name": "attribute",
  attribute: "attribute",
  property: "property",
  key: "property",
  variable: "variable",
  parameter: "variable",
  regex: "regex",
  "regex-source": "regex",
  operator: "operator",
  punctuation: "punctuation",
  "attr-equals": "punctuation",
  "interpolation-punctuation": "punctuation",
  "script-punctuation": "punctuation",
  inserted: "inserted",
  "inserted-sign": "inserted",
  deleted: "deleted",
  "deleted-sign": "deleted",
  title: "heading",
  url: "link",
  interpolation: "plain",
  script: "plain",
  spread: "plain",
  unchanged: "plain",
}

const STRONG = new Set(["bold", "strong"])
const EMPHASIS = new Set(["italic", "em"])

// Languages where a bare PascalCase name is a type and a SCREAMING_CASE one
// a constant. Prism only spots types after keywords like `class` or `new`.
const TYPED_LANGUAGES = new Set([
  "javascript",
  "jsx",
  "typescript",
  "tsx",
  "java",
  "kotlin",
  "swift",
  "csharp",
  "go",
  "rust",
  "c",
  "cpp",
  "python",
  "php",
  "ruby",
])

const NAME = /\b[A-Z][A-Za-z0-9_]*\b/g
const SCREAMING_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$|^[A-Z][A-Z0-9]{2,}$/

type Style = Omit<SyntaxToken, "content">

type Root = ReturnType<typeof refractor.highlight>
type Node = Root["children"][number]

function getStyle(node: Node, parent: Style): Style {
  // A regular expression stays one colour: Prism's regex grammar names every
  // quantifier and class inside it, which reads as noise.
  if (node.type !== "element" || parent.kind === "regex") return parent
  const names = (node.properties.className ?? []) as string[]
  const kind = names.map((name) => PRISM_KINDS[name]).find(Boolean)
  return {
    kind: kind ?? parent.kind,
    isStrong: parent.isStrong || names.some((name) => STRONG.has(name)),
    isEmphasis: parent.isEmphasis || names.some((name) => EMPHASIS.has(name)),
  }
}

function collectTokens(nodes: Node[], parent: Style, tokens: SyntaxToken[]) {
  for (const node of nodes) {
    if (node.type === "text") {
      tokens.push({ content: node.value, ...parent })
    } else if (node.type === "element") {
      collectTokens(node.children, getStyle(node, parent), tokens)
    }
  }
  return tokens
}

/** Splits plain text into types and constants by their casing. */
function splitNames(token: SyntaxToken): SyntaxToken[] {
  const tokens: SyntaxToken[] = []
  let index = 0
  for (const match of token.content.matchAll(NAME)) {
    const name = match[0]
    if (match.index > index) {
      tokens.push({
        ...token,
        content: token.content.slice(index, match.index),
      })
    }
    const kind = SCREAMING_CASE.test(name) ? "constant" : "type"
    tokens.push({ ...token, content: name, kind })
    index = match.index + name.length
  }
  if (index < token.content.length) {
    tokens.push({ ...token, content: token.content.slice(index) })
  }
  return tokens
}

const sameStyle = (a: SyntaxToken, b: SyntaxToken) =>
  a.kind === b.kind &&
  a.isStrong === b.isStrong &&
  a.isEmphasis === b.isEmphasis

function toLines(tokens: SyntaxToken[]): SyntaxLine[] {
  const lines: SyntaxLine[] = [{ tokens: [], diff: null }]
  for (const token of tokens) {
    token.content.split("\n").forEach((content, index) => {
      if (index > 0) lines.push({ tokens: [], diff: null })
      if (!content) return
      const line = lines[lines.length - 1]
      const previous = line.tokens[line.tokens.length - 1]
      // Whitespace looks the same in any colour: it joins the token before
      // it, so a line renders fewer elements.
      const isBlank = !content.trim()
      if (previous && (isBlank || sameStyle(previous, token))) {
        previous.content += content
      } else {
        line.tokens.push({ ...token, content })
      }
    })
  }
  for (const line of lines) {
    const kind = line.tokens[0]?.kind
    if (kind === "inserted" || kind === "deleted") line.diff = kind
  }
  return lines
}

const PLAIN: Style = { kind: "plain", isStrong: false, isEmphasis: false }

/**
 * Code as lines of tokens. One trailing newline is dropped, as a code fence
 * ends with one. An unknown language comes back as plain text. `diff-<name>`
 * marks a diff's lines and colours them in that language.
 */
export function highlightCode(code: string, language?: string | null) {
  const source = code.replace(/\r\n?/g, "\n").replace(/\n$/, "")
  const resolved = resolveLanguage(language)
  if (resolved?.startsWith(DIFF_PREFIX)) {
    return highlightDiff(source, resolved.slice(DIFF_PREFIX.length))
  }
  return tokenize(source, resolved)
}

function tokenize(source: string, resolved: string | null): SyntaxLine[] {
  if (!resolved) return toLines([{ content: source, ...PLAIN }])
  const tokens = collectTokens(
    refractor.highlight(source, resolved).children,
    PLAIN,
    []
  )
  if (!TYPED_LANGUAGES.has(resolved)) return toLines(tokens)
  return toLines(
    tokens.flatMap((token) =>
      token.kind === "plain" ? splitNames(token) : [token]
    )
  )
}

// --- Diffs -------------------------------------------------------------------

const DIFF_PREFIX = "diff-"

// A hunk's header and a file's: `@@ -1,3 +1,3 @@`, `--- a/x`, `+++ b/x`.
const DIFF_HEADER =
  /^(?:@@ .* @@.*|diff --git .*|index \S+|--- \S.*|\+\+\+ \S.*)$/

const DIFF_MARKS: Record<string, SyntaxLineDiff> = {
  "+": "inserted",
  "-": "deleted",
}

const token = (content: string, kind: SyntaxTokenKind): SyntaxToken => ({
  content,
  kind,
  isStrong: false,
  isEmphasis: false,
})

/**
 * A unified diff whose lines keep their own language's colours: the +, - or
 * space in front marks the line, and the rest is read as one piece of code,
 * so a string or a comment that spans lines still reads right.
 */
function highlightDiff(source: string, language: string): SyntaxLine[] {
  const rows = source.split("\n").map((text) => {
    if (DIFF_HEADER.test(text)) return { text, isHeader: true }
    if (text.startsWith("\\")) return { text, isHeader: true }
    const mark = text.charAt(0)
    const hasMark = mark === "+" || mark === "-" || mark === " "
    return {
      text,
      isHeader: false,
      mark: hasMark ? mark : "",
      body: hasMark ? text.slice(1) : text,
    }
  })
  const bodies = rows.flatMap((row) => (row.isHeader ? [] : [row.body ?? ""]))
  const highlighted = tokenize(bodies.join("\n"), language)
  let index = 0
  return rows.map((row) => {
    if (row.isHeader) {
      const kind = row.text.startsWith("\\") ? "comment" : "keyword"
      return { tokens: [token(row.text, kind)], diff: null }
    }
    const line = highlighted[index]
    index += 1
    const diff = DIFF_MARKS[row.mark ?? ""] ?? null
    const prefix = row.mark ? [token(row.mark, diff ?? "plain")] : []
    return { tokens: [...prefix, ...line.tokens], diff }
  })
}

// --- Languages ---------------------------------------------------------------

/** Adds a language from refractor, e.g. `registerLanguage(elixir)`. */
export function registerLanguage(syntax: Syntax) {
  refractor.register(syntax)
}

// Prism's own names for no highlighting.
const PLAIN_TEXT = new Set(["plain", "plaintext", "text", "txt"])

/** The registered language a name or alias stands for, or null. */
export function resolveLanguage(language?: string | null): string | null {
  if (!language) return null
  const name = language.trim().toLowerCase()
  if (name.startsWith(DIFF_PREFIX)) {
    const inner = resolveLanguage(name.slice(DIFF_PREFIX.length))
    return inner ? `${DIFF_PREFIX}${inner}` : "diff"
  }
  if (PLAIN_TEXT.has(name) || !refractor.registered(name)) return null
  // An alias resolves to the grammar it points at; Prism keeps both names.
  const grammar = refractor.languages[name]
  const canonical = Object.keys(refractor.languages).find(
    (key) => refractor.languages[key] === grammar
  )
  return canonical ?? name
}

// File names, then extensions, and the language each one is.
const FILE_NAMES: Record<string, string> = {
  dockerfile: "docker",
  containerfile: "docker",
  makefile: "makefile",
  gnumakefile: "makefile",
  ".gitignore": "ignore",
  ".npmignore": "ignore",
  ".dockerignore": "ignore",
  ".prettierignore": "ignore",
  ".eslintignore": "ignore",
  ".env": "bash",
  ".bashrc": "bash",
  ".zshrc": "bash",
  ".editorconfig": "ini",
  ".npmrc": "ini",
}

const EXTENSIONS: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  json: "json",
  jsonc: "json",
  json5: "json",
  webmanifest: "json",
  css: "css",
  scss: "scss",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  plist: "markup",
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  lua: "lua",
  diff: "diff",
  patch: "diff",
  dockerfile: "docker",
}

/** The language a file is written in, from its name, or null. */
export function getLanguageFromFilename(filename: string) {
  const name = filename.split(/[\\/]/).pop()?.toLowerCase() ?? ""
  if (name in FILE_NAMES) return FILE_NAMES[name]
  if (name.startsWith(".env")) return "bash"
  const extension = name.includes(".") ? name.split(".").pop() : undefined
  return (extension && EXTENSIONS[extension]) || null
}

/**
 * The language to read code in: the one given, else the file's. A diff of a
 * file is read in that file's language, so its lines keep their colours.
 */
export function getCodeLanguage(language?: string, filename?: string) {
  const fileLanguage = filename ? getLanguageFromFilename(filename) : null
  if (language === "diff" && fileLanguage && fileLanguage !== "diff") {
    return `${DIFF_PREFIX}${fileLanguage}`
  }
  return language ?? fileLanguage
}

const LABELS: Record<string, string> = {
  ts: "TypeScript",
  typescript: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  javascript: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JSX",
  json: "JSON",
  jsonc: "JSON",
  json5: "JSON5",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  markup: "HTML",
  xml: "XML",
  svg: "SVG",
  md: "Markdown",
  markdown: "Markdown",
  mdx: "MDX",
  sh: "Shell",
  shell: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  console: "Terminal",
  terminal: "Terminal",
  env: "Env",
  dotenv: "Env",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  ini: "INI",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  go: "Go",
  rs: "Rust",
  rust: "Rust",
  java: "Java",
  kt: "Kotlin",
  kotlin: "Kotlin",
  swift: "Swift",
  c: "C",
  cpp: "C++",
  cs: "C#",
  csharp: "C#",
  php: "PHP",
  sql: "SQL",
  graphql: "GraphQL",
  lua: "Lua",
  diff: "Diff",
  docker: "Dockerfile",
  dockerfile: "Dockerfile",
  makefile: "Makefile",
  ignore: "Ignore",
  gitignore: "Ignore",
}

/** A language's name as people write it: "TypeScript", "C#", "Plain text". */
export function getLanguageLabel(language?: string | null) {
  if (!language) return "Plain text"
  const name = language.trim().toLowerCase()
  if (name.startsWith(DIFF_PREFIX)) return LABELS.diff
  if (name in LABELS) return LABELS[name]
  if (PLAIN_TEXT.has(name)) return "Plain text"
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// --- Lines -------------------------------------------------------------------

/** One line, or an inclusive range: `[3, 5]` is lines 3, 4 and 5. */
export type SyntaxLineRange = number | readonly [number, number]

/** Line numbers from lines and ranges, in order. */
export function getLineNumbers(ranges?: readonly SyntaxLineRange[]) {
  const numbers = new Set<number>()
  for (const range of ranges ?? []) {
    if (typeof range === "number") {
      numbers.add(range)
      continue
    }
    const [from, to] = [Math.min(...range), Math.max(...range)]
    for (let line = from; line <= to; line += 1) numbers.add(line)
  }
  return new Set([...numbers].sort((a, b) => a - b))
}
