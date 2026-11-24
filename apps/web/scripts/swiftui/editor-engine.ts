import { z } from "zod"

import { getEditorSnapshot } from "../../registry/fabricator/shared/lib/editor-commands"
import {
  getTextEdit,
  handleInput,
} from "../../registry/fabricator/shared/lib/editor-input"
import {
  resolveKits,
  starterKit,
} from "../../registry/fabricator/shared/lib/editor-kit"
import {
  getFlatText,
  toFlatOffset,
  type EditorJson,
} from "../../registry/fabricator/shared/lib/editor-model"
import { getNativeEditorContent } from "../../registry/fabricator/shared/lib/editor-native-content"
import {
  getTableDraft,
  updateTableBlock,
} from "../../registry/fabricator/shared/lib/editor-table"
import {
  applyTransaction,
  createEditorState,
  replaceRange,
  setBlock,
  type EditorState,
} from "../../registry/fabricator/shared/lib/editor-transaction"
import { parseMarkdown } from "../../registry/fabricator/shared/lib/markdown-parse"
import { serializeMarkdown } from "../../registry/fabricator/shared/lib/markdown-serialize"

const jsonSchema: z.ZodType<EditorJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ])
)
const markSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.string()).optional(),
})
const inlineSchema = z.object({
  text: z.string(),
  marks: z.array(markSchema).optional(),
  raw: z.literal(true).optional(),
})
const blockSchema = z.object({
  id: z.string(),
  type: z.string(),
  indent: z.number().int(),
  content: z.array(inlineSchema),
  attrs: z.record(z.string(), jsonSchema),
  source: z
    .object({ text: z.string(), before: z.string(), fingerprint: z.string() })
    .optional(),
})
const documentSchema = z.object({
  frontmatter: z.string().nullable(),
  frontmatterSource: z.string().optional(),
  blocks: z.array(blockSchema),
  trailing: z.string().optional(),
})
const requestSchema = z.object({
  action: z.enum([
    "create",
    "replace",
    "replaceText",
    "select",
    "command",
    "paste",
    "split",
    "softBreak",
    "deleteBackward",
    "deleteForward",
    "serialize",
    "snapshot",
    "dispose",
    "tableDraft",
    "updateTable",
    "setBlock",
    "updateCode",
  ]),
  id: z.string(),
  markdown: z.string().optional(),
  document: documentSchema.optional(),
  text: z.string().optional(),
  from: z.number().int().optional(),
  to: z.number().int().optional(),
  command: z.string().optional(),
  args: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
  blockID: z.string().optional(),
  blockType: z.string().optional(),
  attrs: z.record(z.string(), jsonSchema).optional(),
  draft: z
    .object({
      cells: z.array(z.array(z.string())),
      align: z.array(z.enum(["left", "center", "right"]).nullable()),
    })
    .optional(),
})
const kit = resolveKits([starterKit])
type Session = {
  state: EditorState
  version: number
  content: ReturnType<typeof getNativeEditorContent>
}
const sessions = new Map<string, Session>()

function snapshot(
  session: Session,
  extra: {
    markdown?: string
    tableDraft?: ReturnType<typeof getTableDraft>
  } = {}
) {
  const state = session.state
  const summary = getEditorSnapshot(state, kit)
  const anchor = state.selection
    ? toFlatOffset(state.document, state.selection.anchor)
    : null
  const focus = state.selection
    ? toFlatOffset(state.document, state.selection.focus)
    : null
  return {
    ...summary,
    document: state.document,
    flatText: getFlatText(state.document),
    selection:
      anchor === null || focus === null
        ? null
        : { start: Math.min(anchor, focus), end: Math.max(anchor, focus) },
    nativeContent: {
      ...session.content,
      spans: session.content.spans.map((span) => ({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        raw: false,
        ...span,
      })),
      paragraphs: session.content.paragraphs.map((paragraph) => ({
        level: 1,
        indent: 0,
        checked: false,
        ...paragraph,
      })),
    },
    commands: kit.commands.map((command) => ({
      id: command.id,
      label: command.label,
      group: command.group,
      shortcut: command.shortcut,
      isActive: command.isActive?.(summary) ?? false,
      canRun: command.canRun?.(summary) ?? true,
    })),
    ...extra,
  }
}

function execute(requestJSON: string): string {
  try {
    const request = requestSchema.parse(JSON.parse(requestJSON))
    if (request.action === "dispose") {
      sessions.delete(request.id)
      return JSON.stringify({ ok: true })
    }
    if (request.action === "create") {
      const state = createEditorState(
        request.document ?? parseMarkdown(request.markdown ?? "")
      )
      const session: Session = {
        state,
        version: 1,
        content: getNativeEditorContent(state.document, 1),
      }
      sessions.set(request.id, session)
      return JSON.stringify({ ok: true, value: snapshot(session) })
    }
    const session = sessions.get(request.id)
    if (!session) throw new Error("Editor session is missing")
    let state = session.state
    const options = { kit, now: Date.now() }
    if (request.action === "select")
      state = handleInput(
        state,
        { kind: "select", anchor: request.from ?? 0, focus: request.to ?? 0 },
        options
      )
    if (request.action === "replace")
      state = handleInput(
        state,
        {
          kind: "replace",
          from: request.from ?? 0,
          to: request.to ?? 0,
          text: request.text ?? "",
        },
        options
      )
    if (request.action === "replaceText") {
      const before = getFlatText(state.document)
      const edit = getTextEdit(
        before,
        request.text ?? "",
        state.selection
          ? {
              from: toFlatOffset(state.document, state.selection.anchor),
              to: toFlatOffset(state.document, state.selection.focus),
            }
          : null,
        { from: request.from ?? 0, to: request.to ?? 0 }
      )
      if (edit)
        state = handleInput(state, { kind: "replace", ...edit }, options)
    }
    if (request.action === "command") {
      const command = kit.getCommand(request.command ?? "")
      if (!command)
        throw new Error(`Unknown editor command: ${request.command}`)
      state =
        command.run(state, { kit, args: request.args, now: options.now }) ??
        state
    }
    if (request.action === "paste") {
      const text = request.text ?? ""
      state = handleInput(
        state,
        { kind: "paste", text, blocks: parseMarkdown(text).blocks },
        options
      )
    }
    if (request.action === "split" || request.action === "softBreak")
      state = handleInput(state, { kind: request.action }, options)
    if (
      request.action === "deleteBackward" ||
      request.action === "deleteForward"
    )
      state = handleInput(
        state,
        { kind: request.action, unit: "character" },
        options
      )
    if (request.action === "setBlock" && request.blockID)
      state = applyTransaction(state, {
        operations: [
          setBlock(request.blockID, {
            ...(request.blockType ? { type: request.blockType } : {}),
            ...(request.attrs ? { attrs: request.attrs } : {}),
          }),
        ],
        selectionBefore: state.selection,
        selectionAfter: state.selection,
        origin: "command",
        time: options.now,
      })
    if (request.action === "updateCode" && request.blockID) {
      const block = state.document.blocks.find(
        (item) => item.id === request.blockID
      )
      if (block)
        state = applyTransaction(state, {
          operations: [
            setBlock(block.id, {
              attrs: {
                ...block.attrs,
                language: request.args?.language ?? null,
              },
            }),
            replaceRange(
              { blockId: block.id, offset: 0 },
              {
                blockId: block.id,
                offset: block.content.map((run) => run.text).join("").length,
              },
              [{ text: request.text ?? "" }]
            ),
          ],
          selectionBefore: state.selection,
          selectionAfter: state.selection,
          origin: "command",
          time: options.now,
        })
    }
    if (request.action === "updateTable" && request.blockID && request.draft)
      state =
        updateTableBlock(state, request.blockID, request.draft, options.now) ??
        state
    if (state.document !== session.state.document) {
      session.version += 1
      session.content = getNativeEditorContent(state.document, session.version)
    }
    session.state = state
    const tableBlock = request.blockID
      ? state.document.blocks.find((block) => block.id === request.blockID)
      : undefined
    return JSON.stringify({
      ok: true,
      value: snapshot(session, {
        ...(request.action === "serialize"
          ? { markdown: serializeMarkdown(state.document) }
          : {}),
        ...(request.action === "tableDraft" && tableBlock
          ? { tableDraft: getTableDraft(tableBlock) }
          : {}),
      }),
    })
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "EditorError",
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

declare global {
  var FabricatorEditorBridge: (request: string) => string
}
globalThis.FabricatorEditorBridge = execute
