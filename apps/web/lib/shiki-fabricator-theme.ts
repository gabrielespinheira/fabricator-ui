import type { ThemeRegistration } from "shiki"

// The docs' code blocks in Syntax Highlight's colours: TextMate scopes mapped
// to the foundations' --syntax-* tokens, the same kinds the registry's
// tokenizer names (registry/fabricator/shared/lib/syntax-highlight-model.ts).
// The colours are CSS variables, so one theme serves light and dark and
// follows the site's colour roles and surface tint.

const color = (name: string) => `var(--syntax-${name})`

const rules: Array<{
  scope: string[]
  color?: string
  fontStyle?: string
}> = [
  {
    scope: ["comment", "punctuation.definition.comment", "string.comment"],
    color: color("comment"),
    fontStyle: "italic",
  },
  {
    scope: ["punctuation", "keyword.operator", "meta.brace", "meta.delimiter"],
    color: color("punctuation"),
  },
  {
    scope: [
      "keyword",
      "storage",
      "storage.type",
      "storage.modifier",
      "keyword.operator.new",
      "keyword.operator.expression",
      "keyword.operator.ternary",
      "variable.language",
      "meta.diff.range",
      "meta.diff.header",
    ],
    color: color("keyword"),
  },
  {
    scope: [
      "string",
      "punctuation.definition.string",
      "markup.inline.raw",
      "string.template",
    ],
    color: color("string"),
  },
  {
    scope: [
      "constant",
      "constant.numeric",
      "constant.language",
      "constant.character",
      "support.constant",
      "keyword.other.unit",
      "entity.other.attribute-name",
    ],
    color: color("constant"),
  },
  {
    scope: [
      "entity.name.function",
      "support.function",
      "variable.function",
      "meta.decorator",
      "support.type.property-name",
      "meta.object-literal.key",
      "entity.name.tag.yaml",
      "variable.other.property.toml",
      "support.type.property-name.toml",
      "keyword.other.definition.ini",
    ],
    color: color("function"),
  },
  {
    scope: [
      "entity.name.type",
      "entity.name.class",
      "entity.name.namespace",
      "entity.other.inherited-class",
      "support.type",
      "support.class",
      "support.variable",
      "string.regexp",
    ],
    color: color("type"),
  },
  {
    scope: [
      "entity.name.tag",
      "meta.selector",
      "entity.other.attribute-name.class.css",
      "entity.other.attribute-name.id.css",
      "entity.other.attribute-name.pseudo-class.css",
      "variable.other.normal.shell",
      "variable.other.bracket.shell",
      "punctuation.definition.variable.shell",
      "variable.other.php",
    ],
    color: color("tag"),
  },
  // Keys come after tags: YAML names its keys entity.name.tag.yaml.
  {
    scope: ["entity.name.tag.yaml", "support.type.property-name.json"],
    color: color("function"),
  },
  {
    scope: ["markup.heading", "entity.name.section"],
    color: color("keyword"),
    fontStyle: "bold",
  },
  { scope: ["markup.bold"], fontStyle: "bold" },
  { scope: ["markup.italic"], fontStyle: "italic" },
  {
    scope: ["markup.underline.link", "string.other.link"],
    color: color("function"),
    fontStyle: "underline",
  },
  {
    scope: ["markup.inserted", "punctuation.definition.inserted"],
    color: "var(--success-text)",
  },
  {
    scope: ["markup.deleted", "punctuation.definition.deleted"],
    color: "var(--destructive-text)",
  },
]

export const fabricatorShikiTheme: ThemeRegistration = {
  name: "fabricator",
  type: "light",
  colors: {
    "editor.foreground": "var(--foreground)",
    "editor.background": "transparent",
  },
  fg: "var(--foreground)",
  bg: "transparent",
  tokenColors: rules.map(({ scope, color: foreground, fontStyle }) => ({
    scope,
    settings: {
      ...(foreground ? { foreground } : {}),
      ...(fontStyle ? { fontStyle } : {}),
    },
  })),
}
