// Kits extend the editor: marks, block types, Markdown shortcuts (input
// rules), keyboard shortcuts and commands. Kits are plain data; resolveKits
// merges a list of them into the runtime handleInput and the store read.

import {
  starterCommands,
  type EditorCommand,
  type EditorCommandSurface,
  type EditorPlatform,
} from "./editor-commands"
import type { EditorBlockType, EditorJson } from "./editor-model"

type EditorRuleAttrs = Readonly<Record<string, EditorJson>>

type EditorMarkSpec = {
  type: string
  /** Whether text typed at the mark's end edge takes it. Links and code don't. */
  inclusive: boolean
  markdown?: { delimiter: string }
}

type EditorBlockSpec = { type: EditorBlockType }

type EditorBlockPrefixRule = {
  kind: "blockPrefix"
  /** Matches the whole text before the caret, anchored at the block's start. */
  pattern: RegExp
  /** "text" fires on typing; "enter" fires on Enter at the block's end. */
  trigger: "text" | "enter"
  type: EditorBlockType
  /** Block types the rule turns; paragraphs by default. */
  from: readonly EditorBlockType[]
  getAttrs: (match: RegExpExecArray) => EditorRuleAttrs
}

type EditorInlineWrapRule = {
  kind: "inlineWrap"
  delimiter: string
  mark: string
}

type EditorInputRule = EditorBlockPrefixRule | EditorInlineWrapRule

type EditorShortcutBinding = {
  shortcut: string
  command: string
  /** Only on this platform, for bindings like Mod+Y. */
  platform?: EditorPlatform
}

type EditorKit = {
  name: string
  marks: readonly EditorMarkSpec[]
  blocks: readonly EditorBlockSpec[]
  commands: readonly EditorCommand[]
  inputRules: readonly EditorInputRule[]
  shortcuts: readonly EditorShortcutBinding[]
}

type EditorKitDefinition = { name: string } & Partial<Omit<EditorKit, "name">>

type EditorKitRuntime = {
  kits: readonly EditorKit[]
  marks: ReadonlyMap<string, EditorMarkSpec>
  blocks: ReadonlyMap<string, EditorBlockSpec>
  commands: readonly EditorCommand[]
  inputRules: readonly EditorInputRule[]
  /** Explicit bindings first, then each command's own shortcut. */
  shortcuts: readonly EditorShortcutBinding[]
  getCommand: (id: string) => EditorCommand | undefined
  getCommandsFor: (surface: EditorCommandSurface) => readonly EditorCommand[]
}

function defineEditorKit(definition: EditorKitDefinition): EditorKit {
  return {
    name: definition.name,
    marks: definition.marks ?? [],
    blocks: definition.blocks ?? [],
    commands: definition.commands ?? [],
    inputRules: definition.inputRules ?? [],
    shortcuts: definition.shortcuts ?? [],
  }
}

function defineMark(mark: {
  type: string
  inclusive?: boolean
  markdown?: { delimiter: string }
}): EditorMarkSpec {
  return {
    type: mark.type,
    inclusive: mark.inclusive ?? true,
    ...(mark.markdown ? { markdown: mark.markdown } : {}),
  }
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function blockPrefixRule(
  prefix: string | RegExp,
  type: EditorBlockType,
  options: {
    attrs?: EditorRuleAttrs | ((match: RegExpExecArray) => EditorRuleAttrs)
    trigger?: "text" | "enter"
    from?: readonly EditorBlockType[]
  } = {}
): EditorBlockPrefixRule {
  const source =
    typeof prefix === "string" ? escapeRegExp(prefix) : prefix.source
  const flags =
    typeof prefix === "string" ? "" : prefix.flags.replace(/[gy]/g, "")
  const { attrs } = options
  return {
    kind: "blockPrefix",
    pattern: new RegExp(`^(?:${source})$`, flags),
    trigger: options.trigger ?? "text",
    type,
    from: options.from ?? ["paragraph"],
    getAttrs: typeof attrs === "function" ? attrs : () => attrs ?? {},
  }
}

function inlineWrapRule(delimiter: string, mark: string): EditorInlineWrapRule {
  return { kind: "inlineWrap", delimiter, mark }
}

function getNumberAttrs(match: RegExpExecArray): EditorRuleAttrs {
  return { number: Number(match[1]) }
}

function getCodeAttrs(match: RegExpExecArray): EditorRuleAttrs {
  const language = match.at(1) ?? ""
  return language ? { language } : {}
}

const TASK_SOURCES = ["paragraph", "bulleted"]

const starterKit = defineEditorKit({
  name: "starter",
  marks: [
    defineMark({ type: "bold" }),
    defineMark({ type: "italic" }),
    defineMark({ type: "strike" }),
    defineMark({ type: "code", inclusive: false }),
    defineMark({ type: "link", inclusive: false }),
  ],
  blocks: [
    "paragraph",
    "heading",
    "bulleted",
    "numbered",
    "task",
    "quote",
    "code",
    "divider",
  ].map((type) => ({ type })),
  commands: starterCommands,
  inputRules: [
    blockPrefixRule("# ", "heading", { attrs: { level: 1 } }),
    blockPrefixRule("## ", "heading", { attrs: { level: 2 } }),
    blockPrefixRule("### ", "heading", { attrs: { level: 3 } }),
    blockPrefixRule("#### ", "heading", { attrs: { level: 4 } }),
    blockPrefixRule("##### ", "heading", { attrs: { level: 5 } }),
    blockPrefixRule("###### ", "heading", { attrs: { level: 6 } }),
    blockPrefixRule(/[-*+] /, "bulleted"),
    blockPrefixRule(/(\d{1,9})\. /, "numbered", { attrs: getNumberAttrs }),
    blockPrefixRule(/\[ ?\] /, "task", {
      attrs: { checked: false },
      from: TASK_SOURCES,
    }),
    blockPrefixRule(/\[[xX]\] /, "task", {
      attrs: { checked: true },
      from: TASK_SOURCES,
    }),
    blockPrefixRule("> ", "quote"),
    blockPrefixRule(/```([^`\s]*)/, "code", {
      attrs: getCodeAttrs,
      trigger: "enter",
    }),
    blockPrefixRule("---", "divider", { trigger: "enter" }),
    // Longer delimiters first, so `**` wins over `*`.
    inlineWrapRule("**", "bold"),
    inlineWrapRule("__", "bold"),
    inlineWrapRule("~~", "strike"),
    inlineWrapRule("*", "italic"),
    inlineWrapRule("_", "italic"),
    inlineWrapRule("`", "code"),
  ],
  shortcuts: [{ shortcut: "mod+y", command: "redo", platform: "other" }],
})

function resolveKits(kits: readonly EditorKit[]): EditorKitRuntime {
  const commands = new Map<string, EditorCommand>()
  const marks = new Map<string, EditorMarkSpec>()
  const blocks = new Map<string, EditorBlockSpec>()
  for (const kit of kits) {
    for (const command of kit.commands) commands.set(command.id, command)
    for (const mark of kit.marks) marks.set(mark.type, mark)
    for (const block of kit.blocks) blocks.set(block.type, block)
  }
  const commandList = [...commands.values()]
  const shortcuts: EditorShortcutBinding[] = [
    ...kits.flatMap((kit) => kit.shortcuts),
    ...commandList.flatMap((command) =>
      command.shortcut
        ? [{ shortcut: command.shortcut, command: command.id }]
        : []
    ),
  ]
  const surfaces = new Map<EditorCommandSurface, readonly EditorCommand[]>()
  return {
    kits,
    marks,
    blocks,
    commands: commandList,
    inputRules: kits.flatMap((kit) => kit.inputRules),
    shortcuts,
    getCommand: (id) => commands.get(id),
    getCommandsFor(surface) {
      const cached = surfaces.get(surface)
      if (cached) return cached
      const list = commandList.filter((command) =>
        command.surfaces?.includes(surface)
      )
      surfaces.set(surface, list)
      return list
    },
  }
}

export {
  blockPrefixRule,
  defineEditorKit,
  defineMark,
  inlineWrapRule,
  resolveKits,
  starterKit,
}
export type {
  EditorBlockPrefixRule,
  EditorBlockSpec,
  EditorInlineWrapRule,
  EditorInputRule,
  EditorKit,
  EditorKitDefinition,
  EditorKitRuntime,
  EditorMarkSpec,
  EditorRuleAttrs,
  EditorShortcutBinding,
}
