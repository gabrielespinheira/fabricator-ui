# Editor and Markdown preview: plan

Status: built on `release/v0.6.0` (2026-11-09) through Phase 3 on web and iOS, with parts of Phases 4 and 6; §22 lists what was built, what the build found and what's left. Android, tables, images, code colours and AI are not built.

Fabricator gets two components that share one Markdown engine, written here with no editor or Markdown library under it:

- **Markdown** (the preview): renders Markdown with Fabricator typography. Read-only, light, and usable on its own for docs, notes and chat messages.
- **Editor**: a rich text editor whose value is Markdown. You see formatted text, not syntax; a toolbar, keyboard shortcuts and Markdown shortcuts (`# `, `- `, `**bold**`) format it; saving writes Markdown back, byte for byte where nothing changed.

Both run on web, mobile web, desktop (Electron, Tauri), iOS, iPadOS and Android, with the same exports, props and behaviour, and both look the same, so what you edit is what the preview shows.

---

## 1. Scope

### In

- Rich text editing of Markdown: paragraphs, headings 1 to 3, bold, italic, strikethrough, inline code, links, bulleted, numbered and task lists with nesting, quotes, code blocks, dividers, images and tables (§9).
- A fixed toolbar, a selection bar on desktop, a keyboard bar on phones, keyboard shortcuts and Markdown shortcuts.
- Normal text selection across paragraphs, on every platform.
- Copy and paste as Markdown; paste from web pages and documents (web).
- The preview, sharing the parser and the typography.
- Extensibility: kits add formatting, block types, commands and toolbar buttons (an AI button is one command, §11).
- English and other Latin-script text, left to right.

### Later (the architecture leaves room, nothing is built)

- Notion-style blocks: the `/` menu, handles, drag to reorder, block selection, block menu. Every block already has an id (§5), which is what those need.
- A Markdown source mode, footnotes, math, mentions, comments, collaboration.
- Non-Latin input methods (Chinese, Japanese, Korean) and right-to-left text.

### What "our own" means

- **No editor, rich-text or Markdown package at runtime.** Model, input handling, selection, history, parser, serializer and renderer are ours.
- **Our own packages are fine.** The native text view ships as `@fabricator-ui/editor-native` (§7.3), because native code can't install through a registry item.
- **Platform packages the library already ships stay:** React, React Native, `react-native-keyboard-controller`, Reanimated, `expo-clipboard`, `expo-haptics`.
- **Test-only oracles** if you approve them (§17 decision 5).

### English only: what's still needed

Removed: CJK input methods and their candidate windows, right-to-left text, complex shaping. Not removed, because they change text outside a single keystroke in English too:

| Input                                 | What it does                                                    |
| ------------------------------------- | --------------------------------------------------------------- |
| Android keyboards (Gboard, Samsung)   | Compose every word: the underlined word is replaced as you type |
| Autocorrect, predictive text, swipe   | Replace or insert whole words                                   |
| Dictation                             | Inserts phrases and revises them                                |
| Press-and-hold accents (café, résumé) | A short composition                                             |
| Smart punctuation                     | Straight quotes and double hyphens become typographic ones      |
| Emoji                                 | Several UTF-16 units per character                              |

So the input layer treats "this range was replaced with this text" as the normal case (§7).

---

## 2. The approach: one document surface

The editor is one editable surface per document on every platform, like Apple Notes or Bear, not a field per block:

| Piece                                | Web                                                              | Native                                                                  |
| ------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| The surface                          | One `contenteditable` root                                       | One text view of our own: `UITextView` (TextKit 2), `AppCompatEditText` |
| A paragraph                          | An element under the root (`p`, `h2`, `li`, `blockquote`, `pre`) | A paragraph of the text view's string, with paragraph attributes        |
| Formatting                           | `strong`, `em`, `s`, `code`, `a`                                 | Text attributes (iOS) and spans (Android)                               |
| Images, dividers, tables, checkboxes | `contenteditable="false"` elements                               | Attachments (`NSTextAttachment`, `ReplacementSpan`)                     |
| Selection                            | The browser's, across paragraphs                                 | The text view's, across paragraphs                                      |

**Why one surface:** without Notion's block features, people expect to drag a selection across paragraphs, and both a `contenteditable` root and a native text view do that themselves. A field per block would mean painting our own cross-block selection on web and giving it up on native. The second version of this plan needed fields only for the block UI that's now deferred.

**The key idea:** the document flattens to one string, blocks joined by `\n`, with one placeholder character (U+FFFC) per image, divider or table. Web and native both report edits as "range of that string replaced with text", and one shared function maps that to the model. Line breaks inside a paragraph or a code block are U+2028 in the flattened string, so `\n` always means a block boundary.

**What it costs:**

- The native view draws more itself: heading sizes, list markers and indents, the quote bar, the code block's background, attachments. That's real Swift and Kotlin (§7.3).
- Web's `contenteditable` root lets the browser change structure on input we can't cancel (Android), which the reconcile step must read back (§7.2).
- Tables can't be edited cell by cell inside a single text surface on native. They show as a rendered grid and edit in a sheet or popover on every platform (§9).

---

## 3. What the platforms do

Checked 2026-11-08 in React Native's, Hermes' and Lexical's source, the RN, Expo, MDN and W3C docs, MDN's compatibility data, and small tests in Chrome 156 and Chromium 158. Safari, Firefox, Android and iOS devices weren't tested.

**React Native `TextInput` with nested `Text`** (the pure-TypeScript route) is unfit for a rich editor:

- Expo's guide recommends it only "when your requirements are minimal"; `onChangeText` returns plain text.
- iOS (Fabric) puts the caret back at the same distance from the end whenever new text is set, so formatting before the caret moves it. During marked text or dictation, style changes are ignored.
- Android drops a JS update older than the native event count, so a style applied while someone keeps typing is lost, and it rebuilds every span on each render (issue #50731).
- iOS Fabric drops the second keystroke typed into an empty field (issue #58904, open).
- No paragraph styles (indents, quote bars, code backgrounds), no attachments, no caret coordinates, no iPad key commands, no prop to turn off smart quotes.

**Hermes** has no `Intl.Segmenter`, so character boundaries are our own helper.

**Web:**

- `beforeinput` is in Chrome 60, Safari 10.1 and Firefox 87. Outside a composition every input type is cancelable; in Chrome, `insertText`, `deleteContentBackward`, `insertParagraph`, `insertLineBreak` and `formatBold` cancelled cleanly with target ranges.
- `contenteditable="plaintext-only"` gives no target ranges in Chrome, so the root is `contenteditable="true"`.
- `historyUndo` only fires while the browser's own undo stack has entries, so once input is cancelled the browser's Edit menu and iOS's shake don't reach our undo (w3c/editing#509).
- Android: English words are compositions (Chromium bug 446714223), and Chromium on Android ignores `preventDefault` on `deleteContentBackward` (Lexical's source).
- Safari's desktop autocomplete sends `insertText`; iOS sends `insertReplacementText` before an Enter's `insertParagraph`.

What we read, and never copy: ProseMirror's DOM observer, Lexical's events, CodeMirror 6's DOM change handling (all MIT) for reconciling the DOM; TenTap for docking a toolbar to the keyboard; Software Mansion's `react-native-enriched-markdown` for how a native Markdown view maps styles.

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Views (per platform, same exports)                                       │
│  Editor, EditorContent, EditorToolbar, EditorBubbleMenu,                 │
│  EditorKeyboardBar, EditorLinkPopover, Markdown                          │
├──────────────────────────────────────────────────────────────────────────┤
│ Surface (per platform, one contract)                                     │
│  web: contenteditable root + beforeinput + DOM reconcile                 │
│  native: @fabricator-ui/editor-native (UITextView / EditText)            │
├──────────────────────────────────────────────────────────────────────────┤
│ React bindings (shared, React only): store, hooks                        │
├──────────────────────────────────────────────────────────────────────────┤
│ Core (shared, pure TypeScript)                                           │
│  model · flatten · operations · history · selection · input · commands   │
│  input rules · keymap · markdown parse/serialize · clipboard · kits      │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Core** files live in `registry/fabricator/shared/lib/` as flat files (`editor-model.ts`, `editor-markdown.ts`, …) and join `SHARED_LIB_FILES` in `scripts/native-registry.ts`, so native installs the same files, as it does `syntax-highlight-model`.
- The **preview** uses only the Markdown parser and the views, never the editing core, so it stays small.
- Domain logic is pure and test-first; components wire it. Almost all behaviour runs in Vitest under Node.
- One store per editor, read through `useSyncExternalStore` with selectors; toolbars subscribe to a small snapshot (active marks, block type, can undo).

---

## 5. Model

```ts
type EditorDocument = {
  frontmatter: string | null // YAML, verbatim
  blocks: EditorBlock[] // flat, in reading order
}

type EditorBlock = {
  id: string // stable; what later block features need
  type:
    | "paragraph"
    | "heading"
    | "bulleted"
    | "numbered"
    | "task"
    | "quote"
    | "code"
    | "divider"
    | "image"
    | "table"
    | "raw"
    | (string & {})
  indent: number // list nesting; a paragraph's continues the item above
  content: EditorInline[] // [] for void blocks
  attrs: Record<string, EditorJson> // level, checked, language, src, alt, rows, start…
  source?: EditorSource // the Markdown it came from (§8.3)
}

type EditorInline = { text: string; marks?: EditorMark[]; raw?: true }
type EditorMark = { type: string; attrs?: Record<string, string> } // bold, italic, strike, code, link

type EditorSelection = { anchor: EditorPosition; focus: EditorPosition } | null
type EditorPosition = { blockId: string; offset: number }
```

- **Flat with `indent`**: lists are blocks with an indent, so the flattened string, the model and the native paragraphs line up one to one.
- **Paragraphs nest too**: a paragraph at indent k > 0 continues the nearest list item above it at indent k - 1 (a CommonMark continuation paragraph), and renders inside its `<li>`. A block goes at most one level deeper than a list item before it, as deep as a paragraph before it, and nowhere after anything else (`getIndentLimit`); `normalizeIndents` clamps what an edit leaves invalid, moving the blocks nested under it along.
- **Runs** are normalised (adjacent equal marks merge). Offsets are UTF-16 units, which the DOM, iOS and Android all count in.
- **`toFlatOffset` and `fromFlatOffset`** convert between positions and offsets in the flattened string. They're the bridge between the model and both surfaces.
- **Positions snap** to character boundaries: never inside a surrogate pair, joined emoji, skin tone, flag or combining accent.
- **Stored marks:** Mod+B with no selection formats the next typed text. Typed text otherwise takes the previous character's marks, except links and inline code, which end at their edge.

### Operations and history

- `replaceRange(from, to, content)` across blocks, `setMarks(from, to, mark, on)`, `splitBlock`, `joinBlocks`, `setBlock(type, attrs, indent)`, `insertBlocks`, `removeBlocks`, `setFrontmatter`. Each is pure and invertible.
- A transaction holds operations, the selection before and after, and its origin (`input`, `command`, `paste`, `ai`).
- **Undo** groups typing until a 500ms pause, a selection jump or a non-typing change; a word and its space stay together. Markdown shortcuts are their own step, so Mod+Z or Backspace right after `# ` became a heading gives back `# `. Depth 200.

---

## 6. Rendering: one typography for editor and preview

The editor and the preview draw the same blocks with the same rules, so a document looks identical in both. Per platform, one set of block renderers:

| Block       | Web element                            | Native                                                                            |
| ----------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Paragraph   | `p`                                    | Paragraph style                                                                   |
| Heading 1–3 | `h1`–`h3` (4–6 parse and render as 3)  | Font size and weight, spacing before and after                                    |
| Lists       | `ul`, `ol`, `li` from the flat indents | Head indent per level, marker drawn in the margin, numbers computed               |
| Task        | `li` with a checkbox                   | Checkbox attachment in the margin, done text muted and struck                     |
| Quote       | `blockquote`                           | Indent and a drawn bar                                                            |
| Code        | `pre code` with syntax tokens          | Monospace, a drawn rounded background, token colours                              |
| Divider     | `hr`                                   | Attachment                                                                        |
| Image       | `img` with alt                         | Attachment with the image                                                         |
| Table       | `table`                                | Attachment drawing the grid (editor); a horizontal scroll view of cells (preview) |
| Raw         | Muted monospace                        | Muted monospace                                                                   |

The preview on native is ordinary React Native `Text` and `View`s, no native module: read-only text doesn't hit any of §3's problems.

---

## 7. Surfaces

### 7.1 The contract

Both surfaces report edits in the flattened string, so the core needs one input handler:

```ts
type EditorInput =
  | { kind: "replace"; from: number; to: number; text: string } // flat offsets
  | { kind: "split" } // Enter
  | { kind: "softBreak" } // Shift+Enter
  | {
      kind: "deleteBackward" | "deleteForward"
      unit: "character" | "word" | "line"
    }
  | { kind: "select"; anchor: number; focus: number }
  | { kind: "key"; key: string; modifiers: EditorModifiers }
  | { kind: "paste"; text: string; html?: string; files?: EditorFile[] }
  | { kind: "compositionStart" | "compositionEnd" | "focus" | "blur" }
```

`handleInput(state, input)` turns each into a transaction: every rule about Enter in a list, Backspace at a heading's start, Markdown shortcuts and marks lives there once. `getTextEdit(before, after, selectionBefore, selectionAfter)` finds the smallest `replace` between two versions of the flattened text, for surfaces that changed it on their own.

### 7.2 Web: a contenteditable root

- One root `contenteditable="true"` with `role="textbox" aria-multiline="true"`. Blocks render as keyed elements with `data-block-id`; void blocks are `contenteditable="false"`.
- **`beforeinput` first:** text input, autocorrect (`insertReplacementText`), deletes, Enter, Shift+Enter, Safari's format commands and paste are cancelled and sent as `EditorInput` from `getTargetRanges()`; React renders the model, and the root restores the selection in `useLayoutEffect`.
- **Reconcile** for what can't be cancelled (compositions, Android's Backspace): rendering pauses while the browser changes the DOM; afterwards the root reads the text of the blocks whose elements changed (a `MutationObserver` lists them, including blocks the browser merged or removed), flattens it, and `getTextEdit` against the model's flattened text gives a `replace`. React then re-renders from the model, remounting a block only if its DOM no longer matches.
- **Selection** maps DOM positions to flat offsets by walking `data-block-id` elements and their text nodes; one tested helper.
- **Undo:** Mod+Z and Mod+Shift+Z from `keydown`. Desktop apps wire their Edit menu to the editor's undo. The browser's own Edit menu and iOS shake can't reach it through `historyUndo` (§3); Phase 2 tries a one-entry native undo stack to catch them and documents the gap if that fails.
- **Spellcheck** stays on.

### 7.3 Native: `@fabricator-ui/editor-native`

Our own Expo module: one text view holding the whole document. It does three jobs: show the model as styled text, report edits, report the caret.

```tsx
<EditorNativeTextView
  document={flattenedRuns} // text, marks and paragraph types, as JSON
  theme={resolvedTheme} // fonts, sizes, colours, spacing from native-theme.ts
  selection={selection} // applied in the same update as the text
  keyCommands={keyCommands} // from the keymap
  onReplace={…}
  onSelectionChange={…}
  onKeyCommand={…}
  onCaretRect={…}
  onAttachmentPress={…} // checkbox, image, table
  onContentHeight={…}
/>
```

| Need                                 | iOS (UIKit, TextKit 2)                                    | Android                                                       |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| Exact edits                          | `shouldChangeTextIn(range:replacementText:)`              | `TextWatcher.onTextChanged(start, before, count)`             |
| Formatting without touching the text | Attributes on the text storage                            | `setSpan` on the `Editable`, leaving the composing span alone |
| Headings, lists, quotes              | `NSParagraphStyle` (indents, spacing), fonts              | `AbsoluteSizeSpan`, `LeadingMarginSpan`                       |
| Quote bar, code background, markers  | A custom `NSTextLayoutFragment` draws them                | `LeadingMarginSpan.drawLeadingMargin`, `LineBackgroundSpan`   |
| Images, dividers, tables, checkboxes | `NSTextAttachment` with view providers                    | `ReplacementSpan`, with touch handling for checkboxes         |
| Caret stays put on model changes     | Text and selection set in one update                      | Same                                                          |
| Caret position for popovers          | `caretRect(for:)`                                         | `Layout.getPrimaryHorizontal` and line bounds                 |
| Hardware-keyboard shortcuts          | `UIKeyCommand`s                                           | `onKeyDown` with meta state                                   |
| Smart quotes off in Markdown mode    | `smartQuotesType`, `smartDashesType` `.no`                | Not applied by Android keyboards                              |
| Our undo                             | The view's `undoManager` off; shake calls our undo        | No field undo to clash with                                   |
| Screen readers                       | Headings as `.header` through the accessibility container | Heading role description per line                             |

- **Compositions are left alone:** while Android composes or iOS has marked text, the view applies only attribute changes for the current run and defers model text changes until the composition ends.
- **Height and scrolling:** the view sizes to its content inside `KeyboardAwareScrollView` (`react-native-keyboard-controller`), which keeps the caret rectangle above the keyboard bar; or it scrolls itself with `scrollEnabled`.
- **Theme:** `native-theme.ts` resolves fonts (Inter cuts, `--font-mono`), sizes from the Document role (§12.1) and colours, the same values the rest of the native library draws with.
- **Shipping:** built from `packages/editor-native/` (Swift, Kotlin, a small TypeScript entry), published with the icon packages in `bun run deploy`. The native `editor` item lists it in `dependencies`. Projects need a development build, not Expo Go.

---

## 8. Markdown, our own

### 8.1 Parser and serializer

A block parser (lines, containers, leaves) and an inline parser (code spans, the delimiter-run algorithm for `*`, `_` and `~`, links, images, autolinks, escapes, entities, hard breaks), following CommonMark and GFM for the subset below. The preview parses straight to its render tree; the editor parses to the model. Kits add syntax (§11).

### 8.2 Supported syntax

| Syntax                                                                               | Model                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| ATX and setext headings                                                              | `heading`, style recorded                      |
| Paragraphs, hard breaks                                                              | `paragraph`, break style recorded              |
| `-`, `*`, `+` and ordered lists, start, tight or loose                               | `bulleted`, `numbered` with `indent`, recorded |
| Paragraphs continuing a list item                                                    | `paragraph` one `indent` deeper than its item  |
| GFM task items                                                                       | `task`                                         |
| Block quotes with paragraphs                                                         | `quote`                                        |
| Fenced and indented code                                                             | `code` with `language`, fence recorded         |
| Thematic breaks                                                                      | `divider`                                      |
| GFM tables with alignment                                                            | `table` (table kit)                            |
| An image alone on a line                                                             | `image` (media kit)                            |
| Frontmatter                                                                          | `frontmatter`, verbatim                        |
| Emphasis, strong, strikethrough, code spans, links, autolinks                        | marks, delimiters recorded                     |
| HTML, reference links and definitions, footnotes, math, quotes holding lists or code | `raw`, verbatim                                |

Raw content shows as muted monospace you can edit as text. Nothing is dropped.

### 8.3 Byte for byte

- Each block keeps its exact source slice, the blank lines before it and a fingerprint of its model. Unchanged blocks serialise as their slice: an unedited document returns the input string exactly, and a one-word edit rewrites one block.
- Edited blocks serialise in the style recorded from the source (bullet character, emphasis delimiter, fence, heading style); new blocks use `-`, `*`, `**`, ATX headings and ` ``` `.
- Text that would read as syntax gets a backslash only where needed; property tests check `parse(serialize(doc))` equals `doc` for text with every ASCII punctuation character.
- `onValueChange` fires only for real edits, on the next idle frame.
- Formatting Markdown can't hold (underline, colour) is off in Markdown mode unless its kit's HTML fallback is turned on.

---

## 9. Editing behaviour

- **Markdown shortcuts:** `# `, `## `, `### `, `- `, `* `, `1. `, `[] `, `[x] `, `> `, ` ``` ` plus a language and Enter, `---`, `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[text](url)`. A URL pasted over selected text makes a link.
- **Enter** splits; in an empty list item it outdents, then ends the list. **Backspace** at the start of a heading, quote or list item turns it into a paragraph first. **Tab** and Shift+Tab indent list items and paragraphs (a paragraph under a list item continues it); Enter on an empty indented paragraph outdents it, and Backspace at its start outdents it before joining. In code blocks Enter adds a line, Tab adds two spaces, and Enter on two empty lines (or Mod+Enter) leaves the block.
- **Paste:** Markdown becomes formatted text through our parser; HTML (web) through a small HTML-to-model converter; Mod+Shift+V pastes plain text. **Copy** gives Markdown as `text/plain` and clean HTML on web.
- **Tables:** shown as a grid; a click or tap opens the table editor (a popover on desktop, a sheet on phones) with a grid of cell fields, add and remove rows and columns, alignment and a header row. The same on every platform.
- **Images:** inserted from the toolbar, by paste or drop, through an `onUpload(file) => Promise<{ src, alt }>` adapter; alt text in the image's popover.
- **Placeholder** on an empty document.

### Keyboard map

| Action                 | Keys                      |
| ---------------------- | ------------------------- |
| Bold, italic, strike   | Mod+B, Mod+I, Mod+Shift+S |
| Inline code, link      | Mod+E, Mod+K              |
| Heading 1–3, text      | Mod+Alt+1–3, Mod+Alt+0    |
| Bullet, numbered, task | Mod+Shift+8, 7, 9         |
| Quote, code block      | Mod+Shift+., Mod+Alt+C    |
| Undo, redo             | Mod+Z, Mod+Shift+Z        |

Registered with the App Shell's shortcut registry under the `focus` scope.

---

## 10. API

### 10.1 Markdown (preview)

```tsx
<Markdown size="default" components={{ a: AppLink }}>
  {markdown}
</Markdown>
```

| Prop         | What it does                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `children`   | The Markdown string                                                                                                                     |
| `size`       | `sm`, `default`, `lg`: the Document role (§12.1)                                                                                        |
| `components` | Replace a node's renderer (`a`, `img`, `code`, `table`, …): links through the app's router, images through `next/image` or `expo-image` |
| `kits`       | Extra syntax, the same kits the editor takes                                                                                            |
| `streaming`  | Tolerates unfinished Markdown (an open fence, a half link) while text streams in, for AI chat                                           |

`data-slot="markdown"`, with `markdown-*` slots per element.

### 10.2 Editor

```tsx
<Editor
  value={markdown}
  onValueChange={setMarkdown}
  kits={[table, media]}
  placeholder="Write something"
>
  <EditorToolbar />
  <EditorContent />
  <EditorBubbleMenu />
  <EditorKeyboardBar />
  <EditorFooter>
    <EditorWordCount />
  </EditorFooter>
</Editor>
```

| Part                                                                  | `data-slot`           | What it is                                                                                               |
| --------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `Editor`                                                              | `editor`              | Root and store: `value`, `defaultValue`, `onValueChange`, `kits`, `readOnly`, `placeholder`, `autoFocus` |
| `EditorContent`                                                       | `editor-content`      | The surface. `size` as Markdown's                                                                        |
| `EditorToolbar`                                                       | `editor-toolbar`      | The default toolbar from `toolbar` commands; or compose it:                                              |
| `EditorToolbarGroup`, `EditorToolbarButton`, `EditorToolbarSeparator` | `editor-toolbar-*`    | A command as a toggle: `<EditorToolbarButton command="bold" />`                                          |
| `EditorBlockTypeSelect`                                               | `editor-block-type`   | Text, Heading 1–3, lists, quote, code                                                                    |
| `EditorInsertMenu`                                                    | `editor-insert`       | Image, table, divider, code block                                                                        |
| `EditorBubbleMenu`                                                    | `editor-bubble-menu`  | Formatting over a selection, fine pointers only                                                          |
| `EditorLinkPopover`                                                   | `editor-link`         | Edit, open, remove a link                                                                                |
| `EditorKeyboardBar`                                                   | `editor-keyboard-bar` | The bar above a virtual keyboard; nothing with a fine pointer                                            |
| `EditorFooter`, `EditorWordCount`                                     | `editor-footer`       | Words, characters, save state                                                                            |

The same exports and props on React Native; nothing has `onClick`. `useEditor()` or a `ref` gives `focus`, `blur`, `run(commandId)`, `insertMarkdown`, `getMarkdown`, `setSelection`.

---

## 11. Kits and commands

```ts
const highlight = defineEditorKit({
  name: "highlight",
  marks: [defineMark({ type: "highlight", markdown: { delimiter: "==" } })],
  inputRules: [inlineWrapRule("==", "highlight")],
  commands: [
    {
      id: "highlight",
      label: "Highlight",
      shortcut: "mod+shift+h",
      surfaces: ["toolbar", "bubble", "keyboard-bar"],
      isActive: isMarkActive("highlight"),
      run: toggleMark("highlight"),
    },
  ],
})
```

- A kit adds marks, block types, Markdown rules, input rules, keyboard shortcuts, commands and per-platform views. Kits are pure; their views live in the kit's item file on each platform under the same export, so `import { table } from "@/components/ui/editor-table"` means the same in a web and a native project.
- **Commands drive every surface:** `surfaces` places a command in the toolbar, the selection bar, the keyboard bar or the insert menu. A project adds a button everywhere by adding one command; `useEditorCommands(surface)` builds custom bars.
- **AI is a kit** (`editor-ai`, Phase 6): a command that sends the selection and surrounding Markdown to the project's `generate({ action, prompt, context, signal }) => AsyncIterable<string>` adapter, streams the result into the document as a suggestion, and offers Accept, Discard and Try again, each one undo step. The AI SDK's `textStream` fits the adapter as is.

---

## 12. Design-system fit

### 12.1 A Document typography role

Shared by the editor and the preview, fixed like the Chat role so documents don't shrink in a compact dashboard:

| `size`    | Body | H1  | H2  | H3  | Code | Line height | Use                    |
| --------- | ---- | --- | --- | --- | ---- | ----------- | ---------------------- |
| `sm`      | 14   | 20  | 17  | 15  | 13   | 1.6         | Comments, chat, panels |
| `default` | 16   | 30  | 24  | 20  | 14   | 1.65        | Notes, docs            |
| `lg`      | 18   | 36  | 28  | 22  | 16   | 1.7         | Long-form              |

Headings `weight-semibold tracking-tight`, quotes muted with a `border` bar, links `text-primary-text`. Proposed values, set in Phase 2 side by side with the docs site's prose.

### 12.2 Looks

| Part          | Look                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| Content       | Transparent on its holder; caret and selection from `primary`                            |
| Toolbar       | Ghost toggles `size="sm"`, groups split by `Separator`, sticky with a `scroll-fade` edge |
| Selection bar | The popover surface, `rounded-lg`, `p-1`, `motion-popup`; on state `bg-active`           |
| Keyboard bar  | `bg-surface-3`, a hairline top, 44pt targets, scrolling with `scroll-fade`               |
| Code block    | Syntax Highlight's surface and tokens (with the code kit)                                |
| Table         | Table's cells and borders; the editor's grid shows an edit button on hover or focus      |
| Raw           | `bg-muted rounded-md font-mono` t13 muted                                                |

Rules in `registry/styles/fabricator/{editor,markdown}.css` and `registry/styles/native/{editor,markdown}.css`, chrome sized by density tokens, text by the Document role. Popovers `motion-popup`, sheets `motion-sheet`; sounds through the existing `data-slot` resolution and `useFeedback()`.

---

## 13. Platforms

- **Desktop web:** fixed toolbar, selection bar, shortcuts with tooltips, a centred column (`max-w-[72ch]`).
- **Mobile web:** no selection bar (it would sit on the system's selection menu). `EditorKeyboardBar` docks to the top of the virtual keyboard from `visualViewport`, through a tested pure function that hides it on blur (iOS 26 leaves `offsetTop` stale after the keyboard closes). Its content follows the selection: with a caret, block type, lists, indent, outdent, insert, undo, hide keyboard; with a selection, the marks and link. Text stays 16px or more so iOS doesn't zoom.
- **iPadOS:** a hardware keyboard gives every shortcut (Safari, and the native view's `UIKeyCommand`s); the keyboard bar hides when only the shortcuts strip shows; a trackpad brings the selection bar back. Width follows the container, so split view and Stage Manager need nothing special.
- **Desktop apps:** the web editor with spellcheck on. The `/desktop` example gets a Markdown notes screen: File Tree, editor and preview side by side, files saved through the desktop runtime.
- **iOS and Android:** the native view (§7.3) with the native toolbar and keyboard bar (`KeyboardStickyView`), popovers anchored to `onCaretRect`, sheets for tables and links, haptics and sounds. Android's back button closes popovers and sheets, then blurs.

---

## 14. Accessibility

- The surface is `role="textbox" aria-multiline="true"` with a label; headings, lists and quotes are real elements on web and heading traits on native.
- Toolbars follow the WAI-ARIA toolbar pattern (one tab stop, arrow keys, `aria-pressed` toggles).
- Checkboxes, images (alt text required, empty allowed as decorative) and tables are reachable and labelled; the table editor is a dialog with a grid.
- Focus rings from the focus placeholders; reduced motion respected.
- The preview is plain semantic HTML on web and `Text` with roles on native, so screen readers read it as a document.
- A manual VoiceOver (iOS, macOS), TalkBack and NVDA pass in Phase 6.

---

## 15. Registry items and files

| Item           | Contents                                                                                      | Registry dependencies                                                            |
| -------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `markdown`     | Parser, preview renderer, Document role                                                       | none beyond `text` on native                                                     |
| `editor`       | Core, store, surface, toolbar, selection bar, keyboard bar, link popover, footer, base syntax | `markdown`, `toggle`, `tooltip`, `separator`, `popover`, `input-group`, `select` |
| `editor-code`  | Syntax colours in code blocks (editor and preview), language picker                           | `editor`, `syntax-highlight`, `combobox`                                         |
| `editor-table` | Tables and the table editor                                                                   | `editor`, `dialog`, `drawer`                                                     |
| `editor-media` | Images and the upload adapter                                                                 | `editor`, `file-upload`                                                          |
| `editor-ai`    | AI actions and suggestions                                                                    | `editor`, `chat-input`, `spinner`                                                |

```
registry/fabricator/shared/lib/
  markdown-parse.ts        block and inline parsers, source slices
  markdown-serialize.ts    serializer, escaping
  editor-model.ts          document, runs, flatten, positions, graphemes
  editor-transaction.ts    operations, apply, invert, history
  editor-input.ts          handleInput, getTextEdit, input rules, keymap
  editor-commands.ts       commands, snapshot selectors
  editor-kit.ts            defineEditorKit, defineMark, defineBlock
  editor-clipboard.ts      Markdown and HTML out, HTML in
  editor-store.ts          store and hooks (React only)
registry/fabricator/shared/ui/{markdown,editor*}.tsx   web (one source, three bases)
registry/native/ui/{markdown,editor*}.tsx               native
packages/editor-native/                                 @fabricator-ui/editor-native: ios/*.swift, android/*.kt, src/index.ts
```

---

## 16. Testing

TDD for the core, written first:

| Layer                      | Tests                                                                                                                      | Runner                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Markdown                   | The subset's CommonMark and GFM examples; a corpus of real files back byte for byte; escaping property tests; never throws | Vitest, Node                   |
| Model, operations, history | Each operation and its inverse, flatten and offsets, grouping, selection restore                                           | Vitest, Node                   |
| `handleInput`              | Enter, Backspace, Tab, marks, stored marks, shortcuts and their undo, per block type                                       | Vitest, Node                   |
| `getTextEdit`              | Typing, autocorrect, predictive and swipe words, dictation, accents, emoji, paste, merged blocks                           | Vitest, Node                   |
| Preview and parts          | Slots, roles and placeholders with `renderToStaticMarkup`                                                                  | Vitest, Node                   |
| Web surface                | `beforeinput`, reconcile after compositions and Android Backspace, selection mapping, paste                                | Real browsers (§17 decision 6) |
| Native module              | Edits, spans, paragraph drawing, compositions                                                                              | XCTest, JUnit                  |
| Native editor              | iOS Simulator, iPad, Android Emulator with Gboard and Samsung Keyboard, light and dark, VoiceOver and TalkBack             | Simulators                     |

**Corpus:** this repo's `content/docs/**` prose and frontmatter, READMEs, GitHub alerts (raw for now), tables, nested tasks, HTML and footnotes (raw).

**Manual input matrix each release:** iOS with QuickType, autocorrect, swipe, dictation and accents; Android with Gboard and Samsung Keyboard; macOS Safari and Chrome; Windows Chrome.

---

## 17. Decisions

1. **One surface per document.** Pick: normal selection across paragraphs on every platform, which a non-Notion editor needs. Alternative: a field per block (the second version), only worth it with Notion's block UI.
2. **Native surface.** Pick: our own Expo module (`UITextView` with TextKit 2, `AppCompatEditText`) as `@fabricator-ui/editor-native`: exact edits, styles without moving the caret, paragraph drawing, attachments, caret rectangles, iPad shortcuts. Alternative: React Native `TextInput` with nested `Text`: pure TypeScript and no development build, but each of those is broken or missing (§3); kept as Phase 0's baseline.
3. **Tables.** Pick: a rendered grid edited in a popover or sheet, the same everywhere. Alternatives: inline cell editing (web only, so platforms differ); or tables as raw Markdown in the first release (simplest).
4. **What "preview" is.** Pick: the `markdown` item, a renderer with the editor's typography, used on its own and beside the editor. Alternative: GitHub-style Write and Preview tabs over a plain Markdown text area, a much smaller product without rich editing.
5. **Markdown test oracle.** Pick: `mdast-util-from-markdown` and `mdast-util-gfm` as `devDependencies` of `apps/web`, only to check our parser on the corpus (installed now only through Fumadocs; needs your approval). Alternative: the CommonMark and GFM spec examples alone.
6. **Browser tests.** Pick: Vitest browser mode with Playwright (new dev dependency, needs approval). Alternative: a harness on `puppeteer-core`, already in `apps/web`.
7. **Lossy formatting.** Pick: off in Markdown mode unless a kit's HTML fallback is on.

---

## 18. Phases

Focused time for one person with an agent. Each phase ships on its own.

### Phase 0: spike, go or no-go (1 week)

1. **Native view:** a first cut of the module on iOS and Android with a heading, a list, a quote, a code block and bold text: typing with Gboard and Samsung Keyboard, autocorrect, swipe, dictation, bold applied while typing, Enter and Backspace across paragraphs, selection across paragraphs, the caret after a model change, TextKit 2 drawing the quote bar and code background. The `TextInput` baseline next to it.
2. **Web root:** `beforeinput` and reconcile on Chrome, Safari, Firefox, iOS Safari and Android Chrome with Gboard, including Backspace merging two paragraphs on Android.
3. **Markdown:** both parsers and source slices on the corpus, byte for byte.

**Go** when all three work. If the native view's paragraph drawing fails on one platform, that block type falls back to a simpler look there (an indent without a bar) before anything else changes.

### Phase 1: Markdown and the preview (2 weeks)

Parser, serializer, corpus, the Document role, `Markdown` on web and native, its docs page. Exit: corpus green, the preview checked light and dark on every platform. This ships first, and is useful alone for docs and chat.

### Phase 2: core and web editor (3 weeks)

Model, operations, history, `handleInput`, `getTextEdit`, shortcuts, commands, kits, the web surface, toolbar, selection bar, link popover, mobile web keyboard bar, clipboard. Exit: §9 on desktop Chrome, Safari and Firefox, iOS Safari and Android Chrome, keyboard only, axe clean.

### Phase 3: native editor (3 to 4 weeks)

The module finished with XCTest and JUnit, the native surface, toolbar, keyboard bar, link sheet, parity entries, `add editor` in a fresh Expo project. Exit: §9 on iOS, iPad and Android with the input matrix.

### Phase 4: tables, images, code colours (2 weeks)

`editor-table`, `editor-media`, `editor-code` on both platforms, each with its Markdown in the corpus.

### Phase 5: AI kit (1 week)

`editor-ai` with streaming, Accept and Discard, an AI SDK adapter example.

### Phase 6: docs, blocks, release (1 to 2 weeks)

Docs pages per base and native, examples for every part and size, blocks (`editor-01` notes page with editor and preview, `editor-02` comment box, `editor-03` Markdown notes in the App Shell with File Tree), the desktop notes screen, the homepage card, the screen reader pass, changelog.

Total: about 13 to 15 weeks.

### Later

Notion-style blocks (`/` menu, handles, drag through `lib/sortable.tsx`, block selection, block menu), a Markdown source mode, footnotes, math, mentions, comments, collaboration, non-Latin input.

---

## 19. Risks

| Risk                                                                             | Mitigation                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| The native module is real Swift and Kotlin, and RN or Expo upgrades can break it | A small surface, its own tests, the e2e install test on each Expo SDK bump                 |
| TextKit 2 or Android spans can't draw a block's look                             | Phase 0 tries the hardest ones first; a simpler look on that platform before redesigning   |
| Android Chrome's uncancelable input breaks the web surface                       | Reconcile from the DOM with the same `getTextEdit`; Android Chrome in every test run       |
| Our parser disagrees with other tools on edge cases                              | A small subset, edge cases kept raw, the oracle on the corpus                              |
| Browser Edit menu and iOS shake can't undo                                       | Mod+Z and the toolbar's undo always work; the gap documented if Phase 2's workaround fails |

---

## 20. Not verified

- Every §3 finding outside desktop Chrome, and the React Native behaviour on devices (read from source).
- TextKit 2 custom fragment drawing inside a React Native view, and Android's span drawing, for quote bars and code backgrounds.
- U+2028 as an in-paragraph line break in `UITextView` and `EditText`.
- That `KeyboardAwareScrollView` follows a caret rectangle we pass rather than the focused view's frame.
- Whether the library already needs a development build; if not, the module adds that requirement.
- A one-entry native undo stack making `historyUndo` fire on the web.
- Apple Pencil Scribble in the native view.

---

## 21. Proposed edits to settled documents

- **AGENTS.md:** the editor's core files in `SHARED_LIB_FILES`; `markdown`, `editor` and `packages/editor-native/` in the repository map, and the module's publish step beside `release:icons`. AGENTS.md also still points to `PLAN.md`, which commit `46b7e0e3` removed.
- **DESIGN.md (both):** the Document typography role, the editor's and the preview's looks, and "Choosing a component": Textarea for plain text, Chat Input for messages, Editor for formatted documents, Markdown to show them.
- **`registry/native/README.md`:** how a native item depends on a Fabricator package with native code.
- **`registry/native/differences.ts`:** `markdown` and `editor` at tier `same`, noting tables edit in a sheet on phones.

---

## 22. What the build found (2026-11-09)

### Built

- **Shared engine** (`registry/fabricator/shared/lib/`): `editor-model`, `editor-transaction`, `editor-input`, `editor-commands`, `editor-kit`, `editor-store`, `markdown-parse`, `markdown-serialize`, `markdown-tree`, `editor-native-content`, plus web-only `editor-dom` and `editor-surface-model`. About 300 tests, all test-first.
- **Markdown byte for byte:** about 380 docs pages, the READMEs, the plans and 12 fixtures (each also with CRLF) parse and serialise back exactly; 1,000+ single-block edits change only that block; 5,000 generated documents round-trip; 3,000 random strings never throw. A 2,088-block document parses in about 10ms and serialises in about 3ms.
- **Web:** `Markdown` and `Editor` for every base (one shared source), style maps, examples, docs pages, changelog, DESIGN.md rows, homepage cards.
- **iOS:** `packages/editor-native` (UITextView with TextKit 2, its own layout fragment for markers, quote bars, code backgrounds, checkboxes and dividers) and the native `markdown` and `editor` items.

### Decisions taken without asking (from §17)

- Decision 3 (tables), 4 (preview) and 7 (lossy formatting) took their picks. Decisions 5 and 6 (test-only dependencies) were not taken: no dependency was added. Browser checks ran in headless Chrome through the existing `puppeteer-core` instead of Vitest browser mode.

### Found while building

- **Block ids and hydration.** Random ids made the server and the client render different `data-block-id`s. The first document now takes ids from block order (`block-0`, …); later blocks take random ids.
- **Whitespace.** The surface needs `white-space: pre-wrap`, or a typed trailing space collapses and the caret lands after nothing.
- **Selection timing.** `selectionchange` is asynchronous, so a key can arrive before the model hears where the caret went. Every key and input event now reads the DOM selection first.
- **Soft line breaks** in a wrapped paragraph become spaces in the model, so an edited wrapped paragraph is written back on one line. Unedited ones keep their wrapping.
- **GitHub alerts** stay raw quotes until a callout kit exists.
- **iOS undo:** the text view records nothing; shake, Cmd+Z and the shortcuts bar go to the editor's history.
- **iOS italic:** Inter ships no italic cut in the example app, so the native view slants the upright font. The native Markdown preview draws `*em*` upright.
- **Fast typing on iOS.** Content for an older keystroke could reach the view after it had moved on. The view skips content matching text it already passed. Content the engine changed itself (an input rule) still can't be told apart from old content, so typing very fast through `# ` can drop characters. The fix is an edit counter in the module's protocol: the view tags each edit, the engine echoes the last one it applied, and the engine rebases edits made against older content.
- **KeyboardProvider.** The native keyboard bar needs `KeyboardProvider` from react-native-keyboard-controller at the app's root. `apps/mobile` has it now; a fresh project needs it too, which belongs in `FabricatorRoot` or the install docs.

### Not built

Android's text view (the native editor shows the document read-only there), tables, images and code colours (Phase 4), the AI kit (Phase 5), the HTML paste converter, `[text](url)` as you type, the native selection bar on iPad, and native VoiceOver structure (the text view reads as one text area).

### Not verified

The keyboard bar over a real virtual keyboard (web and iOS), iOS Safari, Android Chrome with Gboard, Firefox and Safari on desktop, VoiceOver, TalkBack and NVDA, iPad, and `add editor` in a fresh Next.js or Expo project. The site's own dev server was unresponsive, so the web checks ran in a Vite page built from the same compiled components and the site's stylesheet.
