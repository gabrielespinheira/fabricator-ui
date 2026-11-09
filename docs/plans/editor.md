# Editor: plan

Status: proposed 2026-11-08, second version. The first version ran TipTap, and on native ran it inside a WebView; this one replaces it. Nothing is built. §22 lists the decisions that need an answer before Phase 0.

Fabricator gets its own block editor: Notion's way of writing, Markdown as the file format, and one engine written here, with no editor library under it. It runs on web, mobile web, desktop (Electron, Tauri), iOS, iPadOS and Android, with the same components, the same API and the same behaviour on each. It's built from kits the way TipTap is, so a project adds a block, a menu button or an AI action without forking it.

---

## 1. Goals, scope and what "our own" means

### Goals

- **A Markdown editor that feels like Notion.** `/` for blocks, a formatting bar over selected text, blocks dragged by a handle, `# ` turns into a heading. The value is a Markdown string, and a file opened and saved without edits comes back byte for byte (§8).
- **The same everywhere.** One document model, one set of operations, one Markdown parser, one command list, one undo history: the same TypeScript on every platform. Only the text field and the views around it are written per platform, behind one contract (§7).
- **Composable.** Every block, mark, command, input rule and shortcut comes from a kit (§9). Toolbars, the slash menu, the selection bar, the block menu and the keyboard bar read one command list, so an added command appears everywhere.
- **Fabricator through and through.** Surfaces, density, motion roles, Fluid Hover, sounds, icons, colour roles, syntax colours, and the contract (superset, placeholders, base parity, platform parity).

### What "no packages" means

- **No editor, rich-text, contenteditable or Markdown package at runtime.** The model, input handling, selection, history, Markdown parser and serializer are ours.
- **Platform packages the library already ships stay**, because they aren't editors: React, React Native, `react-native-keyboard-controller` (keyboard height, sticky bar, keyboard-aware scrolling), Reanimated, gesture handler, `expo-clipboard`, `expo-haptics`, and `@dnd-kit` behind `lib/sortable.tsx` on web.
- **Our own packages are fine.** The native text view ships as `@fabricator-ui/editor-native` (§7.3), because native code can't install through a registry item.
- **Test-only oracles are allowed** if you approve them (§22 decision 5): a reference Markdown parser that checks ours in tests and never ships.

### English only: what it removes and what it doesn't

Scope is English and other Latin-script text, left to right.

**Removed:** Chinese, Japanese and Korean input methods and their candidate windows, right-to-left and bidirectional text, complex shaping (Arabic, Indic), vertical text, and the keyboard events those input methods produce.

**Not removed, and still needed for English.** These all change text outside a plain keystroke, so the input layer has to handle them:

| Input                               | What it does to the text                                                                      | Where                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| Android keyboards (Gboard, Samsung) | Compose every word: the underlined word is a composition, replaced as you type                | Android Chrome, Android app |
| Autocorrect                         | Replaces a word after a space or punctuation                                                  | iOS, macOS, Android         |
| Predictive text and suggestions     | Inserts a whole word, often with a space                                                      | iOS, Android                |
| Swipe typing                        | Inserts a whole word, then may replace it with an alternative                                 | iOS, Android                |
| Dictation                           | Inserts phrases, sometimes revises them                                                       | iOS, macOS, Android         |
| Press-and-hold accents              | `e` held becomes `é` through a composition (café, naïve, résumé)                              | macOS, iOS                  |
| Smart punctuation                   | `"` becomes `“`, `--` becomes an em dash                                                      | iOS, macOS                  |
| Emoji                               | Two or more UTF-16 units per character; joined sequences (👩‍💻) are one character to the person | Everywhere                  |

So the plan treats "a range of text was replaced" as the normal case and a single keystroke as a special case of it (§7.2). This holds on every platform and is what makes the native text field possible.

### Non-goals (first release)

- Real-time collaboration and comments. Operations are designed to allow them later (§5.4).
- Databases, synced blocks, columns and page trees.
- Dragging a text selection across blocks on phones and tablets. Native gets block selection for that in the first release; web gets Notion's text selection across blocks (§6). It's the one place the platforms differ, and §22 decision 1 asks whether to keep it.

---

## 2. The approach: one text field per block

### Why not one big editable area

ProseMirror, Lexical and Slate make the whole document one `contenteditable` element. That needs the DOM, and React Native has no DOM: its text editing is a field per input (`TextInput`, `UITextView`, `EditText`). A one-area design can't be the same on native, which is why every cross-platform editor today puts a WebView on native.

### Why one field per block works everywhere

Notion's editor is a list of blocks, and each text block edits on its own. That shape exists on both platforms:

| Piece                   | Web                                                                | Native                                                     |
| ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| A text block            | A `contenteditable` element for that block                         | Our own native text view (`UITextView`, `EditText`), §7.3  |
| Formatting in a block   | `<strong>`, `<em>`, `<code>`, `<a>`, `<s>` rendered from the model | Text attributes and spans set from the same marks          |
| A void block            | A component (divider, image, video)                                | A component                                                |
| The document            | A list of block components                                         | A list of block components in a keyboard-aware scroll view |
| Selection in a block    | The browser's selection, mapped to model offsets                   | The view's selection, mapped to model offsets              |
| Selection across blocks | A text range we paint, or block selection (§6)                     | Block selection; a text range later (§6)                   |

Notion's web editor has this shape: on a public page, each block's text is its own `contenteditable` leaf (`data-content-editable-leaf`), 9 leaves and 17 blocks on the page measured. Everything above the field (what Enter, Backspace, `# ` or Mod+B do, what a paste becomes, what undo restores) is shared code, so behaviour matches by construction rather than by testing two implementations against each other.

### What this costs

- Selection across blocks is ours to build: browsers clamp a drag to the field it started in (§3.1), so web paints its own range, as Notion must.
- Arrow keys between blocks are ours to implement (a field only moves within itself).
- Native code: a small text view in Swift and Kotlin, because React Native's `TextInput` can't do this job well (§3.1). It ships as our own package, `@fabricator-ui/editor-native`, and needs a development build, not Expo Go.
- Two text-field implementations to keep correct, web and native. They're the riskiest code in the plan and get their own phase each.
- Several times more work than wrapping TipTap. §20 has the phases; this is the largest item in the library.

---

## 3. What exists, and what we learn from

No library is used, but the problem is well studied. Read these before writing each layer, the way we read upstream before a component:

| Source                                                       | What to learn                                                                                | Licence and use         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------- |
| ProseMirror (`prosemirror-view`'s `domobserver` and `input`) | Reconciling the DOM after input it couldn't cancel; browser quirks per input type            | MIT; read only          |
| Lexical (`LexicalEvents`)                                    | A `beforeinput`-first design and its Android fallbacks                                       | MIT; read only          |
| CodeMirror 6 (`input.ts`, `domchange.ts`)                    | Reading a changed DOM range back into a model; the cleanest written account of the problem   | MIT; read only          |
| Notion (the product)                                         | Block selection, slash menu, handles, input rules, mobile keyboard bar: the behaviour target | Observed, not copied    |
| TenTap (`@10play/tentap-editor`)                             | How a React Native editor docks its toolbar to the keyboard on iOS and edge-to-edge Android  | MIT; read only          |
| `react-native-enriched-markdown` (Software Mansion)          | What a native Markdown input supports and how it maps styles                                 | MIT; read only          |
| CommonMark and GFM specs                                     | The parsing rules our parser follows for the subset it supports                              | Spec text; tests in §19 |

Facts from the first version still hold: none of the existing editors keeps a Markdown file byte for byte, TipTap's selection bar collides with the phone's own selection menu, and iOS 26 leaves `visualViewport.offsetTop` stale after the keyboard closes.

### 3.1 What the platforms do

Checked on 2026-11-08 in React Native's, Hermes' and Lexical's source, the RN, Expo, MDN and W3C docs, MDN's compatibility data, and small tests in Chrome 156 and Chromium 158. Safari, Firefox, Android and iOS devices weren't tested.

**React Native `TextInput` with nested `Text` (the obvious pure-JS native field):**

- It works for simple cases, and Expo's own guide recommends it only "when your requirements are minimal". `onChangeText` returns plain text, so which span got the characters has to be rebuilt from the selection.
- iOS (Fabric) puts the caret back at the same distance from the end whenever JS sets new text, so a change before the caret (an input rule, a mark) lands the caret in the wrong place. While marked text or dictation is active it compares only the plain string, so style changes are ignored.
- Android drops a JS update older than the native event count: a style applied while the person keeps typing is thrown away. It also rebuilds every span on each render (issue #50731).
- iOS Fabric drops the second keystroke typed into an empty field (issue #58904, open).
- No caret coordinates from JS. `onKeyPress` reports no arrows or modifiers from an iPad keyboard; core RN has no iOS key-command API (View `onKeyDown` exists for Android only, behind a flag). There's no prop to turn off iOS smart quotes and dashes.
- Backspace on an empty field: iOS reports it for single-line fields through a private UIKit hook, not confirmed for multiline; Android depends on the keyboard.

Each of those is a Notion-level requirement (caret stays put, formatting while typing, slash menu at the caret, iPad shortcuts, Backspace to join), so the native field is our own view instead (§7.3, §22 decision 2).

**Hermes:** no `Intl.Segmenter` on its main or V1 branch; character boundaries are ours.

**Web:**

- `beforeinput` is in Chrome 60, Safari 10.1 and Firefox 87. Outside a composition every input type is cancelable by the spec; in Chrome, `insertText`, `deleteContentBackward`, `insertParagraph`, `insertLineBreak` and `formatBold` cancelled cleanly, each with one target range.
- `contenteditable="plaintext-only"` (Firefox since 136) returns no target ranges in Chrome, so fields use `contenteditable="true"`.
- `historyUndo` fires only when the browser's own undo stack has entries, so once every input is cancelled it never fires (w3c/editing#509): the browser's Edit menu and iOS's shake can't reach our undo through it.
- Android: an English word on an English keyboard starts a composition (Chromium bug 446714223), and Chromium on Android ignores `preventDefault` on `deleteContentBackward` (Lexical's source). Both go through reconcile.
- Safari's desktop autocomplete sends `insertText`, not `insertReplacementText`; iOS sends `insertReplacementText` before the Enter's `insertParagraph`.
- A mouse drag from one `contenteditable` into another stops at the end of the first in Chrome; a script selection across them returns only the first's text.

**Notion:** its Help says a drag from inside a block selects text "across paragraphs, bullet lists, callouts", and a drag from the margin selects whole blocks; Escape selects the block. So Notion does select text across its per-block fields, by its own means.

---

## 4. Architecture

### 4.1 Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Views (per platform, same exports)                                       │
│  web:    registry/fabricator/shared/ui/editor*.tsx (bases via __base__)  │
│  native: registry/native/ui/editor*.tsx                                  │
│  Editor, EditorContent, block views, menus, toolbars, keyboard bar       │
├──────────────────────────────────────────────────────────────────────────┤
│ Text field (per platform, one contract: EditorTextFieldProps → input)    │
│  web: contenteditable + beforeinput + DOM reconcile                      │
│  native: our own UITextView / EditText module (@fabricator-ui/editor-native) │
├──────────────────────────────────────────────────────────────────────────┤
│ React bindings (shared, React only): store hooks, per-block subscription │
├──────────────────────────────────────────────────────────────────────────┤
│ Core (shared, pure TypeScript, no React, no DOM, no React Native)        │
│  model · operations · transactions · history · selection · commands     │
│  input rules · keymap · text-edit reconcile · markdown · clipboard       │
│  kits · slash filter · word diff (AI)                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Core** files live in `registry/fabricator/shared/lib/` and join `SHARED_LIB_FILES` in `scripts/native-registry.ts`, so native installs the same files, as it does `syntax-highlight-model` today. They're flat (`editor-model.ts`, `editor-markdown.ts`, …) because that list maps `lib/<name>.ts` one to one.
- **React bindings** (`editor-store.ts`) use only `react`, so they're shared the same way.
- **Text fields** are the only code that touches platform input. Each turns platform events into `EditorInput` values (§7.1) and renders the model's runs.
- **Views** are ordinary Fabricator components on each side.

Domain logic is pure and test-first, components wire it (your Engineering rules). Nearly all of the editor's behaviour is in the core and runs in Vitest under Node.

### 4.2 State and rendering

- One store per `Editor`: `{ doc, selection, storedMarks, composing, history }`, changed only by transactions.
- React reads it with `useSyncExternalStore` and selectors. **Each block subscribes to its own block object** (structural sharing keeps unchanged blocks identical), so a keystroke re-renders one block, not the document. That matters most on React Native, where a re-render of many native text views is expensive.
- Menus and toolbars subscribe to a small derived snapshot (active marks, block type, can undo) with equality checks.

---

## 5. Model, operations and history

### 5.1 Document

```ts
type EditorDocument = {
  frontmatter: string | null // YAML text, verbatim
  blocks: EditorBlock[] // flat, in reading order
}

type EditorBlock = {
  id: string // stable, generated (nanoid-style, our own 21-char helper)
  type: string // "paragraph", "heading", "bulleted", "numbered", "task", "quote",
  // "code", "divider", "image", "callout", "toggle", "table", "raw", kit types
  indent: number // nesting; a block's children are the blocks after it with a deeper indent
  content: EditorInline[] // text blocks; [] for void blocks
  attrs: Record<string, EditorJson> // level, checked, language, src, alt, alert kind, list start, …
  source?: EditorSource // the Markdown it came from (§8.3)
}

type EditorInline = { text: string; marks?: EditorMark[]; raw?: true }
type EditorMark = { type: string; attrs?: Record<string, string> } // bold, italic, strike, code, link{href,title}
```

- **Flat with `indent`** instead of a tree: a list renders as a list on both platforms (React Native has no list virtualisation over trees), moves and indentation are index changes, and Notion's outline model maps onto it. Children are derived. Kits declare which types may have children (lists, toggles, callouts).
- **Inline content is runs**, normalised: adjacent runs with equal marks merge, empty runs drop, marks sort in a fixed order. Offsets are UTF-16 code units, which is what the DOM, `NSString` on iOS and Java strings on Android all count in.
- **Tables** are one block whose `attrs.rows` holds cells of runs (GFM cells hold inline content only, so this is exact).
- **Raw** runs and blocks hold Markdown we keep but don't model (§8.2).
- Types are derived from kits (`EditorBlockOf<typeof kits>`), so a kit's `attrs` are typed where they're read.

### 5.2 Selection

```ts
type EditorSelection =
  | {
      kind: "text"
      blockId: string
      anchor: number
      focus: number
      cell?: [row: number, column: number]
    }
  | {
      kind: "range" // text from one block's offset to another's (§6)
      anchor: { blockId: string; offset: number }
      focus: { blockId: string; offset: number }
    }
  | { kind: "blocks"; anchorId: string; focusId: string } // whole blocks, a contiguous range
  | { kind: "node"; blockId: string } // a void block: image, divider, video
  | null
```

- Every command and operation works on all four kinds in the core, so deleting, formatting, copying or typing over a range behaves the same wherever a platform can produce one.
- Positions snap to character boundaries: never inside a surrogate pair, a joined emoji sequence, a skin tone, a variation selector, a regional-indicator flag or a combining accent. Hermes has no `Intl.Segmenter` (§3.1), so this is our own small helper covering Latin text and emoji.
- **Stored marks**: Mod+B with a collapsed caret sets marks for the next typed text. Otherwise typed text takes the marks of the character before it, except marks a kit declares non-inclusive (links and inline code end at their edge, as in Notion).

### 5.3 Operations and transactions

Every change is a list of operations. Each is pure, serialisable and invertible:

| Operation                                                           | Inverse                           |
| ------------------------------------------------------------------- | --------------------------------- |
| `insertText(blockId, offset, runs)`                                 | `removeText`                      |
| `removeText(blockId, from, to)` (keeps the removed runs)            | `insertText`                      |
| `setMark(blockId, from, to, mark, on)`                              | `setMark` with the previous marks |
| `splitBlock(blockId, offset, newBlock)`                             | `joinBlocks`                      |
| `joinBlocks(firstId, secondId)` (keeps the second's type and attrs) | `splitBlock`                      |
| `setBlock(blockId, { type?, attrs?, indent? })`                     | `setBlock` with the old values    |
| `insertBlocks(index, blocks)`                                       | `removeBlocks`                    |
| `removeBlocks(index, count)` (keeps them)                           | `insertBlocks`                    |
| `moveBlocks(from, count, to)`                                       | `moveBlocks` back                 |
| `setFrontmatter(text)`                                              | `setFrontmatter`                  |

A **transaction** is `{ ops, selectionBefore, selectionAfter, origin, groupKey? }`, where `origin` is `input`, `command`, `paste`, `drop`, `ai` or `remote`. `apply(state, transaction)` is a pure reducer; the store calls it and notifies subscribers of the blocks the operations touched.

### 5.4 History

- Undo applies the inverse operations and restores `selectionBefore`; redo reapplies.
- **Grouping:** consecutive typing in one block is one step until a pause of 500ms, a selection jump, a change of block or a non-typing operation. A word plus its trailing space is never split. Paste, a command, an AI acceptance and a drag are each one step.
- **Input rules are their own step** (§9.4), so Backspace or Mod+Z right after `# ` became a heading turns it back into `# `, as Notion does.
- Depth 200 by default (`historyDepth`).
- Invertible, serialisable operations with block ids are also what collaboration needs later. That's left for Phase 8 and isn't designed further here.

---

## 6. Selection across blocks

The core handles `text`, `range`, `blocks` and `node` selections the same everywhere (§5.2). What differs is only how a person makes one.

- **Within a block** the platform's own selection works: handles, double tap, the system's selection menu on phones.
- **Text across blocks (web, Notion's behaviour):** a drag that leaves the field it started in, or Shift+arrows past a field's edge, becomes a `range`. The browser clamps its own selection to one field (§3.1), so from that point the field hands over: the focus position comes from `caretPositionFromPoint`, the range is painted with the CSS Custom Highlight API (`::highlight(editor-range)`), and focus stays in the anchor field, whose `beforeinput` events apply to the model's range instead (typing replaces it, Backspace deletes it across blocks, Mod+B formats it).
- **Whole blocks:** a drag that starts in the margin, Escape in a block, or Mod+A twice. Native: a long press on a block's handle (or Select in its menu), then taps add blocks and dragging the selection's ends extends it.
- **Text across blocks on native** comes later (Phase 8): the native field reports caret rectangles (§7.3), so the editor can paint a range over several fields and draw its own two handles. Until then a native person selects text within a block or whole blocks.
- Selected blocks take `bg-active rounded-md`; a range takes the selection colour. Backspace deletes, Mod+C copies Markdown, typing replaces, the block menu acts on all selected blocks, Mod+Shift+↑ ↓ moves them, Tab and Shift+Tab indent them.

---

## 7. Text fields

### 7.1 The contract

Both platforms implement one component, `EditorTextField`, used by every text block and table cell:

```ts
type EditorTextFieldProps = {
  blockId: string
  runs: EditorInline[]
  selection: { anchor: number; focus: number } | null // set when this field holds the caret
  placeholder?: string
  variant:
    | "body"
    | "heading-1"
    | "heading-2"
    | "heading-3"
    | "code"
    | "cell"
    | (string & {})
  readOnly: boolean
  onInput: (input: EditorInput) => void
}

type EditorInput =
  | { kind: "replace"; from: number; to: number; text: string } // the general case (§1)
  | { kind: "split" } // Enter
  | { kind: "softBreak" } // Shift+Enter
  | { kind: "deleteBackward"; unit: "character" | "word" | "line" } // only at offset 0 or with a selection; otherwise a replace
  | { kind: "deleteForward"; unit: "character" | "word" | "line" }
  | { kind: "select"; anchor: number; focus: number }
  | { kind: "key"; key: string; modifiers: EditorModifiers } // keymap, arrows at edges
  | {
      kind: "paste"
      text: string
      markdown?: string
      html?: string
      files?: EditorFile[]
    }
  | { kind: "compositionStart" }
  | { kind: "compositionEnd" }
  | { kind: "focus" }
  | { kind: "blur" }
```

The core turns each `EditorInput` into a transaction (`handleInput(state, blockId, input)`): a pure function where every rule about Enter, Backspace, marks and input rules lives once.

**`getTextEdit(previousText, nextText, previousSelection, nextSelection)`** is the shared reconcile step: given the field's text before and after a change the platform made on its own, it returns the smallest `replace` that explains it, using the selection to place it correctly when the change is ambiguous (typing `l` in `hello` could be at offset 3 or 4). Native uses it for every change; web uses it whenever it can't cancel an input. Its tests cover typing, autocorrect, predictive words, swipe replacements, dictation revisions, accents, emoji, paste, and deletes of every size.

### 7.2 Web: contenteditable per block

- Each text block renders its semantic element (`p`, `h1` to `h3`, `li` content, `blockquote` content, `code` in `pre`) with `contenteditable="true"` (not `plaintext-only`, which gives no target ranges, §3.1). Runs render as `<strong>`, `<em>`, `<s>`, `<code>` and `<a>`; an empty block renders a `<br>` so it keeps its height and caret.
- **`beforeinput` first.** For each input type the field either cancels it and sends the matching `EditorInput` (the model changes, React renders, and the field restores the caret in `useLayoutEffect`), or lets the browser change the DOM and reconciles afterwards:

  | `inputType`                                                                                                    | Handling                                                                             |
  | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
  | `insertText`, `insertReplacementText` (Safari autocorrect), `deleteContent*`, `deleteWord*`, `deleteSoftLine*` | Cancel, send `replace` from `getTargetRanges()`                                      |
  | `insertParagraph`, `insertLineBreak`                                                                           | Cancel, send `split` or `softBreak`                                                  |
  | `formatBold`, `formatItalic`, … (Safari's menu, iOS's B I U)                                                   | Cancel, run the command                                                              |
  | `historyUndo`, `historyRedo`                                                                                   | Never fire once input is cancelled (§3.1); Mod+Z and Mod+Shift+Z come from `keydown` |
  | `insertFromPaste`, `insertFromDrop`                                                                            | Cancel, read `DataTransfer`, send `paste`                                            |
  | `insertCompositionText`, Android's `deleteContentBackward`, anything not cancelable                            | Let it happen, then reconcile                                                        |

- **Undo from menus:** desktop apps wire their Edit menu to `run("undo")` (the desktop example does). The browser's own Edit menu and iOS Safari's shake to undo don't reach the editor; Phase 2 tries keeping a one-entry native undo stack on a hidden element so `historyUndo` fires, and documents the gap if that fails.

- **Reconcile** (Android keyboards, accents, dictation, anything uncancelable): while composing, the block's React rendering is frozen so React doesn't fight the DOM; on `compositionend`, or on `input` for an uncancelable change, the field reads its text and selection from the DOM, `getTextEdit` turns the difference into a `replace`, and the field re-renders from the model, remounting its children only if the DOM no longer matches what React rendered.
- **Caret mapping** between DOM positions and model offsets walks the field's text nodes; one helper, tested against rendered markup.
- **Arrow keys between blocks:** ↑ on the first visual line and ↓ on the last (measured from the caret's rectangle against the field's first and last line rectangles) move to the neighbouring block, keeping the caret's horizontal position (found with `caretPositionFromPoint` or `caretRangeFromPoint`). ← at offset 0 and → at the end cross too.
- **Placeholders** through `data-placeholder` and a `::before` on the empty block holding the caret.
- **Spellcheck** stays on; the browser's own suggestions arrive as `insertReplacementText` and go through the model.

### 7.3 Native: our own text view

`TextInput` can't keep the caret in place when formatting changes, drops late style updates on Android, and reports no caret position, iPad keys or smart-quote control (§3.1). So the native field is a small view of our own, written with the Expo Modules API: `UITextView` on iOS, `AppCompatEditText` on Android. It's the only native code in the editor, around 600 to 900 lines per platform, and it does one job: show runs, report edits.

```tsx
<EditorNativeTextView
  runs={runs}                         // text and marks, as JSON
  styles={resolvedStyles}             // per mark and variant, from native-theme (fonts, sizes, colours)
  selection={selection}               // applied in the same update as the runs
  keyCommands={keyCommands}           // from the keymap: Mod+B, arrows at edges, Tab, Escape
  onReplace={…} onSelectionChange={…} onKeyCommand={…} onDeleteAtStart={…}
  onCaretRect={…} onContentHeight={…} onFocus={…} onBlur={…}
/>
```

What the view does that `TextInput` can't:

| Need                                         | iOS                                                                                                            | Android                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Exact edits, no guessing                     | `shouldChangeTextIn(range:replacementText:)` gives range and text                                              | A `TextWatcher`'s `onTextChanged(start, before, count)`                     |
| Formatting without touching the text         | Set attributes on the text storage's ranges                                                                    | `setSpan` on the existing `Editable`, leaving the composing span alone      |
| Model text changes keep the caret            | Text and selection set in one update from the model                                                            | Same                                                                        |
| Backspace at the start, empty or not         | Override `deleteBackward`                                                                                      | `InputConnection` wrapper: `deleteSurroundingText` and the delete key event |
| Caret position for menus and ranges          | `caretRect(for:)`, converted to the view                                                                       | `Layout.getPrimaryHorizontal` and the line's bounds                         |
| iPad and hardware-keyboard shortcuts         | `UIKeyCommand`s from the keymap, arrows at the first and last line                                             | `onKeyDown` with meta state                                                 |
| Smart quotes and dashes off in Markdown mode | `smartQuotesType` and `smartDashesType` `.no`                                                                  | Not applied by Android keyboards                                            |
| Our undo, not the field's                    | The view's `undoManager` disabled; shake and three-finger undo call our history through `onKeyCommand("undo")` | No field undo to clash with                                                 |
| Height                                       | Intrinsic content size reported through `onContentHeight`                                                      | Same                                                                        |
| Screen readers                               | Header and other traits from the block type                                                                    | `AccessibilityNodeInfo` heading and role description                        |

- **Edits arrive exact.** The platform says what range changed and to what, so autocorrect, predictive words, swipe, dictation and paste are `replace` inputs with no diffing. `getTextEdit` still runs as a check in development builds and as the fallback for any path that doesn't report a range.
- **Composition is left alone.** While Android composes a word or iOS has marked text, the view applies only the attributes for the run the caret is in and defers any text change from the model until the composition ends, so neither platform's keyboard is interrupted.
- **Enter** reaches the view as a `\n` replacement and becomes `split` (code blocks keep it).
- **Focus hopping:** after a split or join the next view takes first responder before the old one resigns, so the keyboard stays up.
- **Scrolling:** the document scrolls in `KeyboardAwareScrollView` from `react-native-keyboard-controller`, and the caret rectangle (not the whole field) is what it keeps above the keyboard bar, so long blocks behave.
- **Fonts and colours** come from `native-theme.ts` (`getNativeCssVariables`), the same values the rest of the native library draws with: Inter's cuts, `--font-mono` for code, the role colours, the syntax colours for code tokens.
- **Shipping:** an Expo module can't install through a registry item, so it's a package, `@fabricator-ui/editor-native`, built from `packages/editor-native/` and published with the icon packages in `bun run deploy`. The native `editor` item lists it in `dependencies`; everything else stays copy-in source. Projects need a development build (`expo run:ios`), as `apps/mobile` already uses.

§22 decision 2 keeps the `TextInput` route as Phase 0's baseline, so the choice rests on measurements, not only on the source reading above.

### 7.4 Read-only

`readOnly` renders the same block views with plain text elements instead of fields (React Native `Text` on native, so a feed of notes mounts no native text views; no `contenteditable` on web). This is the Markdown renderer for chat messages and note previews, with no second implementation (§13.6).

---

## 8. Markdown, our own

### 8.1 Pipeline

```
Markdown ──blocks──▶ block tree with source ranges ──inline──▶ runs ──▶ EditorDocument
EditorDocument ──per block──▶ unchanged? source slice : serialize(block, recorded style) ──▶ Markdown
```

Two passes as CommonMark describes: a line-based block parser (containers, leaves) and an inline parser (code spans, the delimiter-run algorithm for `*`, `_` and `~`, links and images, autolinks, escapes, entities, hard breaks). Kits register parse and serialize rules for their own syntax (§9).

### 8.2 What's supported

| Syntax                                                                                                                                                                            | Model                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ATX headings 1 to 6, setext headings                                                                                                                                              | `heading` with `level`; setext style recorded and written back                           |
| Paragraphs, hard breaks (two spaces or `\`)                                                                                                                                       | `paragraph`; the break style recorded                                                    |
| Thematic breaks (`---`, `***`, `___`)                                                                                                                                             | `divider`; the characters recorded                                                       |
| Bullet lists (`-`, `*`, `+`), ordered lists (`1.`, `1)`, start)                                                                                                                   | `bulleted`, `numbered` with `indent`, marker and start recorded; tight or loose recorded |
| GFM task items                                                                                                                                                                    | `task` with `checked`                                                                    |
| Block quotes with paragraphs                                                                                                                                                      | `quote`                                                                                  |
| Fenced (` ``` ` and `~~~`) and indented code                                                                                                                                      | `code` with `language`; fence recorded                                                   |
| GFM tables with alignment                                                                                                                                                         | `table`                                                                                  |
| GitHub alerts (`> [!NOTE]` … `> [!CAUTION]`)                                                                                                                                      | `callout` with `kind` (callout kit)                                                      |
| An image alone on a line                                                                                                                                                          | `image` with `src`, `alt`, `title` (media kit)                                           |
| `<details><summary>`                                                                                                                                                              | `toggle` (toggle kit)                                                                    |
| Frontmatter (`---` YAML `---` at the top)                                                                                                                                         | `frontmatter`, verbatim                                                                  |
| Emphasis, strong, GFM strikethrough, code spans, links, autolinks (`<…>` and GFM bare URLs)                                                                                       | marks; delimiter characters and link style recorded                                      |
| **Anything else**: HTML blocks and inline HTML, reference definitions and reference links, footnotes, math, quotes holding lists or code, nested containers deeper than the model | `raw` blocks and runs, kept verbatim                                                     |

Raw blocks show as muted monospace text you can edit as source; raw runs show inline the same way. Nothing in a file is dropped. Footnotes and math become real kits later (§20 Phase 8).

### 8.3 Byte for byte

- **Untouched files:** the parser stores each block's exact source slice and the blank lines before it, plus a fingerprint of the block's model when parsed. Serialising writes the slice for every block whose model still matches its fingerprint. A document with no edits is the input string exactly; a one-word edit rewrites one block.
- **Edited blocks** serialise with the style recorded from the source (bullet character, emphasis delimiter, fence, heading style, break style) or, for new blocks, the defaults: `-`, `*` for italic, `**` for bold, ATX headings, ` ``` `.
- **Escaping:** text that would read as syntax gets a backslash only where it would (a `#` at a line start, `*` next to a word, `[` before `](`, `|` in a table). Tests generate text with every ASCII punctuation character and check that `parse(serialize(doc))` equals `doc`.
- **`onValueChange`** fires only for real edits, on the next idle frame, with the serialised string.

### 8.4 Lossy features

A kit whose formatting has no Markdown (text colour, underline) declares it. In Markdown mode it's off unless the project turns on its HTML fallback (`<u>`, `<mark>`, `<span data-color>`), which is parsed back by the same kit. A file never gains HTML without the project choosing it.

---

## 9. Kits: how it composes

### 9.1 A kit

```ts
const calloutKit = defineEditorKit({
  name: "callout",
  blocks: [
    defineBlock({
      type: "callout",
      content: "inline", // "inline" | "code" | "none" | "table"
      children: true, // may hold indented blocks
      attrs: { kind: { default: "note" } }, // "note" | "tip" | "important" | "warning" | "caution"
      markdown: { parse: parseAlert, serialize: serializeAlert },
    }),
  ],
  inputRules: [
    blockPrefixRule(/^> \[!(\w+)\]\s$/, (match) => ({
      type: "callout",
      attrs: { kind: match[1].toLowerCase() },
    })),
  ],
  commands: [
    {
      id: "callout",
      label: "Callout",
      group: "advanced",
      keywords: ["note", "alert", "warning"],
      markdownShortcut: "> [!",
      surfaces: ["slash", "turn-into"],
      run: turnInto("callout"),
    },
  ],
})
```

The kit is pure and shared. Its views are per platform, in the kit's item file on each side:

```tsx
// web: components/ui/editor-callout.tsx      native: the same path in the native tree
export const callout = withEditorViews(calloutKit, {
  blocks: { callout: CalloutBlockView },
  icons: { callout: <IconPlaceholder lucide="MessageSquareWarningIcon" … /> }, // native: the React Native icon
})
```

So `import { callout } from "@/components/ui/editor-callout"` means the same thing in a web and a native project.

### 9.2 What a kit can add

| Piece       | What it is                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Blocks      | Type, content kind, children, attrs with defaults, Markdown rules                                                                    |
| Marks       | Type, inclusive or not, attrs, Markdown rules, order                                                                                 |
| Commands    | `{ id, label, keywords, group, shortcut, markdownShortcut, surfaces, isActive, canRun, run }`; `run` returns a transaction or `null` |
| Input rules | Block prefixes (`# `), inline wraps (`**x**`), replacements (`->` to `→`, off by default in Markdown mode)                           |
| Keymap      | `mod+alt+1` style keys, matched on `event.code` like the App Shell's registry                                                        |
| Paste rules | Turn pasted content into blocks (a lone video URL into a video block)                                                                |
| Normalisers | Keep invariants after every transaction (a table always has a header row; a document never ends in a void block)                     |
| Views       | Block and mark views per platform; icons per command                                                                                 |

### 9.3 Commands drive every surface

- `surfaces` places a command: `slash`, `bubble` (selection bar), `toolbar`, `turn-into`, `block-menu`, `keyboard-bar`, `palette` (App Shell's command palette through `useShortcuts`).
- `isActive` and `canRun` read the store's snapshot, so toggles show state the same way everywhere.
- A project adds a button to every surface with one command in a kit; `useEditorCommands(surface)` builds custom surfaces.

### 9.4 Input rules

They run after an `input` transaction on the text before the caret, and each conversion is its own history step, so Backspace right after it restores the typed text. Inline rules close on the second delimiter (`**bold**`), never inside code or raw runs.

---

## 10. API

### 10.1 Parts (the same exports on web and native)

| Part                                                         | `data-slot`           | What it is                                                                                               |
| ------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `Editor`                                                     | `editor`              | Root and store: `value`, `defaultValue`, `onValueChange`, `kits`, `readOnly`, `placeholder`, `autoFocus` |
| `EditorContent`                                              | `editor-content`      | The block list. `size`: `sm`, `default`, `lg` (§15.1)                                                    |
| `EditorTitle`                                                | `editor-title`        | Optional title: the first `# ` heading or frontmatter `title`                                            |
| `EditorProperties`                                           | `editor-properties`   | Frontmatter as fields                                                                                    |
| `EditorToolbar`, `EditorToolbarGroup`, `EditorToolbarButton` | `editor-toolbar`      | Fixed toolbar from `toolbar` commands                                                                    |
| `EditorBlockTypeSelect`                                      | `editor-block-type`   | Turn into, as a select                                                                                   |
| `EditorBubbleMenu`                                           | `editor-bubble-menu`  | Selection bar (fine pointers)                                                                            |
| `EditorSlashMenu`                                            | `editor-slash-menu`   | The `/` block picker                                                                                     |
| `EditorBlockHandle`, `EditorBlockMenu`                       | `editor-block-handle` | Gutter `+` and handle; the block's menu                                                                  |
| `EditorLinkPopover`                                          | `editor-link`         | Edit, open, remove a link                                                                                |
| `EditorKeyboardBar`                                          | `editor-keyboard-bar` | The bar above a virtual keyboard; nothing with a fine pointer                                            |
| `EditorFooter`, `EditorWordCount`                            | `editor-footer`       | Words, characters, save state                                                                            |
| `EditorOutline`                                              | `editor-outline`      | Headings as a table of contents                                                                          |
| `EditorAIPrompt`, `EditorAISuggestion`                       | `editor-ai`           | AI kit UI (§14)                                                                                          |

React Native takes the same props; web handlers named `onClick` don't appear on any part, so nothing maps.

### 10.2 Usage

```tsx
import {
  Editor,
  EditorBlockHandle,
  EditorBubbleMenu,
  EditorContent,
  EditorKeyboardBar,
  EditorSlashMenu,
  starter,
} from "@/components/ui/editor"
import { ai } from "@/components/ui/editor-ai"
import { table } from "@/components/ui/editor-table"

export function NotePage({ note }: { note: Note }) {
  const [markdown, setMarkdown] = React.useState(note.markdown)
  return (
    <Editor
      value={markdown}
      onValueChange={setMarkdown}
      kits={[starter, table, ai.configure({ generate })]}
      placeholder="Type / for commands"
    >
      <EditorContent />
      <EditorBlockHandle />
      <EditorBubbleMenu />
      <EditorSlashMenu />
      <EditorKeyboardBar />
    </Editor>
  )
}
```

The same file runs in an Expo project.

### 10.3 Imperative API

`useEditor()` in the tree or a `ref` on `Editor`: `focus(at?)`, `blur()`, `run(commandId, args?)`, `insertMarkdown(markdown, at?)`, `getMarkdown()`, `getDocument()`, `setSelection(selection)`, `scrollToBlock(id)`, `transact(ops)`.

---

## 11. Blocks and their views

| Block              | Kit     | Web view                                                       | Native view                                                          |
| ------------------ | ------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Paragraph          | starter | `p` field                                                      | Field                                                                |
| Heading 1 to 3     | starter | `h1` to `h3` fields (4 to 6 parse and display)                 | Field, heading variant, `accessibilityRole="header"` on its row      |
| Bulleted, numbered | starter | `li` fields grouped into `ul` and `ol` by indent               | Marker view (bullet or number, computed) beside a field              |
| Task               | starter | Checkbox and field                                             | Checkbox and field                                                   |
| Quote              | starter | `blockquote` field                                             | Bordered row with a field                                            |
| Divider            | starter | `hr`, selectable as a node                                     | Separator, selectable                                                |
| Code               | code    | `pre` field, Syntax Highlight tokens as spans, language picker | Field with token spans from the same `highlightCode`, language sheet |
| Callout            | callout | Alert look and field                                           | Alert look and field                                                 |
| Toggle             | toggle  | Collapsible with a field summary                               | Collapsible with a field summary                                     |
| Table              | table   | Grid of cell fields; Tab moves cells                           | Horizontally scrolling grid of cell fields                           |
| Image              | media   | `img` with caption field; upload through `onUpload`            | `Image` with caption field; picker through the project's adapter     |
| Video              | media   | Video Player                                                   | Video Player                                                         |
| Raw                | starter | Monospace field over the source                                | Monospace field over the source                                      |

Code blocks reuse `syntax-highlight-model`'s `highlightCode`, so a code block looks like Syntax Highlight on both platforms with no new tokenizer.

---

## 12. The Notion experience

### 12.1 Writing

- **Input rules:** `# `, `## `, `### `, `- `, `* `, `1. `, `[] `, `[x] `, `> `, ` ``` ` plus a language and Enter, `---`, `> [!note] `, `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[text](url)`; a URL pasted over selected text makes a link.
- **Enter** splits; Enter in an empty list item outdents, then turns it into a paragraph; Enter at the start of a block inserts an empty one above. **Backspace** at the start of a list item or heading turns it into a paragraph first, then joins. **Tab** and Shift+Tab indent where the type allows children.
- **Placeholder:** "Type / for commands" on the empty block holding the caret; heading placeholders name their level.
- **Paste:** Markdown and (on web) HTML become blocks through our parser and a small HTML-to-blocks converter; Mod+Shift+V pastes plain text. **Copy:** Markdown as `text/plain`, clean HTML as `text/html` on web.

### 12.2 Slash menu

- `/` at the start of a block or after a space opens it; the query filters commands by label and keywords with the `search` item's ranking; groups Basic, Lists, Media, Advanced, AI and kit groups.
- Focus stays in the field. On web it's a combobox with `aria-activedescendant`: ↑ ↓, Enter or Tab runs, Escape closes and keeps the text, Backspace past `/` closes. No match after one more character closes it, so `/` in prose isn't a trap.
- **Where it shows:** web anchors it to the caret rectangle. A phone docks it in the keyboard bar's place, as a list over the keyboard that filters as you type, where a thumb is and where it never covers the line being typed. iPad (native) anchors it to the caret rectangle the native view reports.
- Fluid Hover lights rows; the popup sound plays on open.

### 12.3 Selection bar

Fine pointers only: above a settled text selection, flipping below near the top edge, with turn into, bold, italic, strike, code, link, Ask AI and kit commands. Alt+F10 focuses it, Escape returns. Touch screens put the same commands in the keyboard bar, so nothing covers the system's selection menu.

### 12.4 Handle, block menu, moves

- With a fine pointer, hovering a block shows `+` and the handle on its first line. `+` adds a block below and opens the slash menu; the handle drags, and a click opens the block menu.
- **Block menu:** Turn into, Colour (when on), Duplicate, Move up, Move down, Copy link (with `getBlockUrl`), Delete. Right click on a handle opens it as a context menu.
- **Drag** goes through `lib/sortable.tsx` on both platforms: the blocks are our own React list now, so D15 holds with no exception. Keyboard (Mod+Shift+↑ ↓) and menu moves are the alternatives, announced in a live region on web and with `announceForAccessibility` on native. On touch, a long press on the handle starts the drag.

### 12.5 Keyboard map

| Action                      | Keys                      |
| --------------------------- | ------------------------- |
| Bold, italic                | Mod+B, Mod+I              |
| Strike, inline code         | Mod+Shift+S, Mod+E        |
| Link                        | Mod+K                     |
| Heading 1 to 3, text        | Mod+Alt+1 to 3, Mod+Alt+0 |
| Bullet, numbered, task list | Mod+Shift+8, 7, 9         |
| Code block, quote           | Mod+Alt+C, Mod+Shift+.    |
| Move block                  | Mod+Shift+↑ ↓             |
| Duplicate                   | Mod+D                     |
| Select block                | Escape                    |
| Ask AI                      | Mod+J                     |
| Undo, redo                  | Mod+Z, Mod+Shift+Z        |

Registered with the App Shell's shortcut registry under the `focus` scope, so the palette lists them and they never fire outside the editor.

---

## 13. Platforms

### 13.1 Desktop web

The reference: handles, selection bar, slash menu at the caret, tooltips with shortcuts, a centred column (`max-w-[72ch]` by default, a `full` option).

### 13.2 Mobile web

- **Keyboard bar** docked to the top of the virtual keyboard from `visualViewport` (its height and offset on `resize` and `scroll`), setting `--editor-keyboard-inset` so fields scroll above it. Its position is a pure, tested function of the viewport and focus, which hides it on blur whatever `offsetTop` says (the iOS 26 stale value). Android Chrome also gets `interactive-widget=resizes-content`, documented for projects.
- **Its content follows the selection:** with a caret, `+` (block picker), turn into, list, task, indent, outdent, undo, redo, hide keyboard; with a text selection, the marks, link and Ask AI; with blocks selected, move, duplicate, delete.
- **Block picker** from `+` is a `Drawer`. Block actions come from the keyboard bar or a long press on a block's left edge. Drag starts from a long press on the handle.
- **Text** is 16px or more so iOS doesn't zoom on focus.

### 13.3 iPadOS

- A hardware keyboard: every shortcut in Safari; in the native app through the view's `UIKeyCommand`s, arrows between blocks included. The keyboard bar hides when the software keyboard is only the shortcuts strip (keyboard height under 100pt).
- A trackpad or mouse: handles and the selection bar return (`(hover: hover) and (pointer: fine)` on web, the pointer state on native).
- Stage Manager and split view change width, not platform; the editor reads its container.
- Apple Pencil Scribble writes into web fields (WebKit supports it in editable elements) and `UITextView`; Phase 3 checks both.

### 13.4 Desktop apps (Electron, Tauri)

- The web editor, with spellcheck on (Electron's `spellcheck`, the system's in WKWebView and WebView2).
- The `/desktop` example gets a Markdown notes screen: File Tree, the editor, files opened and saved through the desktop runtime, unsaved state in the title bar. File access stays in the example.
- The system Edit menu's Undo, Redo and the format commands reach the fields as `beforeinput` and go through our history and commands.

### 13.5 iOS and Android (React Native)

- Block views in a `KeyboardAwareScrollView`; `EditorKeyboardBar` in a `KeyboardStickyView`, both from `react-native-keyboard-controller`.
- Fields per §7.3. Menus and sheets are the library's native overlays, with Fluid Hover, haptics and sounds through `useFeedback()`.
- **Many blocks:** each text block is a native view. Phase 0 measures mounting 500 of them. If it's too slow, the list virtualises with `FlatList`, keeping the focused block and its neighbours mounted; or blocks render as React Native `Text` until tapped, and the native view takes over at the tapped character (which the view can find from the tap point with `closestPosition(to:)` and `getOffsetForPosition`). Phase 0 picks one by the numbers.
- **Android:** the back button closes menus and sheets, then block selection, then blurs.

### 13.6 Read-only and the Markdown renderer

`readOnly` (§7.4) is a Markdown renderer with Fabricator typography on both platforms. Published as part of `editor`, with a light `markdown` item later that ships only the parser and the read-only views, for chat messages.

---

## 14. AI

`ai` is a kit; the core knows nothing about AI.

- **Adapter:** `ai.configure({ generate })`, where `generate({ action, prompt, context, signal }) => AsyncIterable<string>` streams Markdown. The AI SDK's `streamText(...).textStream` fits as is; a project wraps its provider in one file.
- **Entry points:** `/ai` and Ask AI in the slash menu (write below), Ask AI in the selection bar and keyboard bar (rewrite the selection), Mod+J, and an optional empty-line hint.
- **Prompt:** `EditorAIPrompt` is a `ChatInput` under the block (over the keyboard on phones) with preset actions (Improve writing, Fix spelling and grammar, Shorter, Longer, Change tone, Summarise, Continue writing) and project actions as commands in the `ai` group; `ModelPicker` when the project passes models.
- **Streaming:** chunks append to a buffer that our parser re-parses on each chunk into suggestion blocks, so headings and lists appear as blocks; `shimmer` while writing; Escape stops. History is untouched until accepted.
- **Review:** a rewrite shows a word diff (our LCS diff in the core) with removed words struck in `destructive` and added ones in `success`, then Accept (Mod+Enter), Discard (Escape), Try again, or a follow-up prompt. Accepting is one undo step.
- **Autocomplete** (opt-in, fine pointers): ghost text after a pause at a paragraph's end; Tab accepts.
- **Context:** the selection, neighbouring blocks and title as Markdown; `getContext` adds more.

---

## 15. Design-system fit

### 15.1 A Document typography role

DESIGN.md's roles are for interfaces (Body 13, Chat 14). The plan adds **Document**, fixed like Chat so documents don't shrink in a compact dashboard:

| `size`    | Body | H1  | H2  | H3  | Code | Line height | Use              |
| --------- | ---- | --- | --- | --- | ---- | ----------- | ---------------- |
| `sm`      | 14   | 20  | 17  | 15  | 13   | 1.6         | Comments, panels |
| `default` | 16   | 30  | 24  | 20  | 14   | 1.65        | Notes, docs      |
| `lg`      | 18   | 36  | 28  | 22  | 16   | 1.7         | Long-form        |

Headings `weight-semibold tracking-tight`; quotes and placeholders muted; links `text-primary-text`. Proposed values, set in Phase 2 against Notion, Linear and the docs site's prose side by side.

### 15.2 Looks

| Part                  | Look                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Content               | Transparent; caret and native selection colour `primary`                                                  |
| Selection bar         | The popover surface, `rounded-lg`, `p-1`, `motion-popup`; ghost toggles, on state `bg-active`             |
| Slash and block menus | Dropdown Menu's rows and group labels, Fluid Hover                                                        |
| Handle                | 24px ghost buttons, muted, fading in with `duration-feedback`                                             |
| Block selection       | `bg-active rounded-md`                                                                                    |
| Drop indicator        | 2px `bg-primary` line                                                                                     |
| Code block            | Syntax Highlight's surface and tokens                                                                     |
| Callout               | Alert variants: NOTE `info`, TIP `success`, IMPORTANT `primary`, WARNING `warning`, CAUTION `destructive` |
| Task                  | Checkbox; done text muted with a line through                                                             |
| Raw                   | `bg-muted rounded-md font-mono` t13 muted                                                                 |
| AI suggestion         | Primary-tinted frame; diff in `destructive` and `success`                                                 |
| Keyboard bar          | `bg-surface-3`, hairline top, 44pt targets                                                                |

Rules go in `registry/styles/fabricator/editor*.css` and `registry/styles/native/editor*.css` as placeholders with density tokens for chrome; the document sizes come from the Document role.

### 15.3 Motion, density, sound

Menus `motion-popup`, sheets `motion-sheet`, handles `duration-feedback`, block moves `duration-move ease-move`, all off with reduced motion. Chrome sizes from density. Sounds through the existing `data-slot` resolution on web and `useFeedback()` on native; no new sound files.

---

## 16. Accessibility

- **Web:** each field is a `contenteditable` inside its semantic element, so screen readers navigate headings, lists and quotes natively. The block list sits in a labelled region; each field gets `aria-label` only where the element doesn't name itself (a table cell names its row and column).
- **Toolbars** follow the WAI-ARIA toolbar pattern; **menus** the combobox pattern with `aria-activedescendant`; **handles** are buttons with `aria-haspopup="menu"`; every drag has keyboard and menu alternatives (WCAG 2.5.7), announced.
- **Block selection** is announced ("3 blocks selected").
- **Native:** each field's row has a role and a hint naming its block type ("Heading 1", "To-do, not done"); checkboxes and handles are pressables with roles and labels; VoiceOver's rotor moves between fields.
- Focus rings use the focus placeholders. A manual VoiceOver (iOS, macOS), TalkBack and NVDA pass happens in Phase 7.

---

## 17. Performance

| Budget                                            | Target                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| Keystroke to painted text, web, 2,000 blocks      | Under 8ms of our work on a 2022 laptop                           |
| Keystroke to painted text, native, 500 blocks     | Under 16ms of our work on an iPhone 13 and a Pixel 7             |
| Opening a 2,000-block file                        | Parse under 50ms on a laptop; first screen of blocks under 100ms |
| Serialising on change                             | Off the typing path (idle callback), only with `onValueChange`   |
| Core bundle (model, Markdown, starter kit, views) | Under 45 KB gzipped on web, measured in Phase 2                  |

Per-block subscriptions (§4.2) keep typing local; the Markdown serialiser reuses source slices so its cost is the edited blocks; code tokens are cached per block.

---

## 18. Registry items and files

| Item                       | Contents                                                                                              | Registry dependencies                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `editor`                   | Core, Markdown, store, text field, `Editor`, `EditorContent`, starter kit, toolbar, footer, read-only | `toggle`, `tooltip`, `kbd`, `separator`, `button`, `checkbox` |
| `editor-slash-menu`        | Slash menu                                                                                            | `editor`, `command`                                           |
| `editor-bubble-menu`       | Selection bar, link popover                                                                           | `editor`, `toggle-group`, `popover`, `input-group`            |
| `editor-block-handle`      | Handle, block menu, block selection, drag                                                             | `editor`, `dropdown-menu`, `sortable`                         |
| `editor-keyboard-bar`      | Keyboard bar, block picker sheet                                                                      | `editor`, `drawer`                                            |
| `editor-code`              | Code blocks                                                                                           | `editor`, `syntax-highlight`, `combobox`                      |
| `editor-table`             | Tables                                                                                                | `editor`, `dropdown-menu`                                     |
| `editor-media`             | Images, video, upload adapter                                                                         | `editor`, `file-upload`, `video-player`                       |
| `editor-callout`           | Callouts                                                                                              | `editor`, `alert`                                             |
| `editor-toggle`            | Toggles                                                                                               | `editor`, `collapsible`                                       |
| `editor-ai`                | AI                                                                                                    | `editor`, `chat-input`, `model-picker`, `spinner`             |
| `editor-01` to `editor-04` | Blocks (§21)                                                                                          | the above                                                     |

Files:

```
registry/fabricator/shared/lib/
  editor-model.ts          document, blocks, runs, normalise, ids, graphemes
  editor-transaction.ts    operations, apply, invert, history
  editor-selection.ts      selection, stored marks, block ranges
  editor-input.ts          handleInput, getTextEdit, input rules, keymap matching
  editor-commands.ts       command type, starter commands, snapshot selectors
  editor-markdown.ts       block and inline parsers, serialiser, escaping, source slices
  editor-kit.ts            defineEditorKit, defineBlock, defineMark, rule helpers
  editor-clipboard.ts      Markdown and HTML out, HTML to blocks in
  editor-store.ts          store, useSyncExternalStore hooks (React only)
  editor-diff.ts           word diff for AI review
registry/fabricator/shared/ui/editor*.tsx      web views and text field (one source, three bases)
registry/native/ui/editor*.tsx                 native views; the text field wraps the module
packages/editor-native/                        @fabricator-ui/editor-native: the Expo module (ios/*.swift, android/*.kt, src/index.ts)
registry/styles/{fabricator,native}/editor*.css
```

Each core file gets a colocated `*.test.ts` (the repo keeps shared-model tests in `registry/fabricator/__tests__/` too; follow whichever the shared lib folder uses when Phase 1 starts) and an entry in `SHARED_LIB_FILES`.

---

## 19. Testing

TDD for everything in the core, written before the code:

| Layer                          | Tests                                                                                                                                            | Runner                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Model, operations, history     | Every operation and its inverse; grouping; selection restore; normalisation                                                                      | Vitest, Node                   |
| `handleInput`                  | Enter, Backspace, Tab, marks, stored marks, input rules and their undo, per block type                                                           | Vitest, Node                   |
| `getTextEdit`                  | Typing, autocorrect, predictive, swipe, dictation, accents, emoji, paste, deletes, ambiguous repeats                                             | Vitest, Node                   |
| Markdown                       | The supported subset's CommonMark and GFM examples; byte-for-byte on a corpus of real files; escaping property tests; never throws               | Vitest, Node                   |
| Commands, slash filter, keymap | Active state, availability, ranking, key matching                                                                                                | Vitest, Node                   |
| Web text field                 | `beforeinput` handling, reconcile after composition, caret mapping, arrows between blocks, paste                                                 | Real browsers (§22 decision 6) |
| Rendered parts                 | Slots, roles, placeholders with `renderToStaticMarkup`, as `syntax-highlight.test.tsx` does                                                      | Vitest, Node                   |
| Native                         | Demo on iOS Simulator, iPad and Android Emulator with the software keyboard, Gboard and Samsung Keyboard; light and dark; VoiceOver and TalkBack | Simulators                     |

**Corpus:** this repo's `content/docs/**` MDX prose and frontmatter, READMEs, an Obsidian note, GitHub alerts, aligned tables, nested tasks, footnotes and HTML (as raw). Every file parses and serialises back to the same string.

**Manual input matrix, each release:** iOS Safari and the iOS app with QuickType, autocorrect, swipe, dictation and press-and-hold accents; Android Chrome and the Android app with Gboard (typing, swipe, voice) and Samsung Keyboard; macOS Safari and Chrome with press-and-hold accents and the Edit menu; Windows Chrome with the touch keyboard.

---

## 20. Phases

Focused time for one person with an agent. Web ships before native, and each phase ships on its own.

### Phase 0: spike, go or no-go (1 to 1.5 weeks)

In scratch projects, nothing in the registry:

1. **Native field:** a first cut of the Expo module on iOS and Android, against a `TextInput` with nested `Text` as the baseline: typing with Gboard and Samsung Keyboard, autocorrect, swipe, dictation, applying bold mid-word while typing, Enter to split, Backspace to join (empty field included), focus hopping without the keyboard dropping, the caret after a model change, the caret rectangle, iPad key commands, the field's own undo.
2. **Native scale:** 500 block fields mounted, typing latency, memory; `FlatList` against Text-until-tapped.
3. **Web field:** `contenteditable` per block with `beforeinput` on Chrome, Safari, Firefox, iOS Safari and Android Chrome with Gboard; reconcile after composition; arrows between blocks; drag across blocks switching to block selection.
4. **Markdown:** the block parser, inline parser and source slices on the corpus: byte for byte, and the escaping round trip.
5. **Mobile web keyboard bar** on iOS 26 Safari and Android Chrome.

**Go** when 1, 3 and 4 work. If the `TextInput` baseline passes everything the module does (unlikely from §3.1), the editor drops the module and ships pure TypeScript; the rest of the plan is unchanged either way, because only the field's implementation differs.

### Phase 1: core (2 to 3 weeks)

Model, operations, transactions, history, selection, `handleInput`, `getTextEdit`, input rules, keymap, commands, the Markdown parser and serialiser with the corpus, kits. All test-first, no UI. Exit: every core test green, corpus byte for byte.

### Phase 2: web editor (2 to 3 weeks)

Web text field, starter blocks and views, `Editor`, `EditorContent`, toolbar, read-only, clipboard, the Document role, the style map, docs page draft. Exit: the §12.1 behaviours on desktop Chrome, Safari and Firefox, keyboard only, axe clean.

### Phase 3: native editor (3 to 4 weeks)

The Expo module finished on both platforms with its own tests (XCTest and JUnit for edits, spans and composition), the native text field, the same starter blocks and views, keyboard-aware scrolling, read-only, native parity entries. Exit: the same behaviours on iOS, iPad and Android with the input matrix, and `add editor` in a fresh Expo project.

### Phase 4: Notion chrome on both (2 to 3 weeks)

Slash menu, selection bar, keyboard bar, block picker, handle, block menu, block selection, drag, link popover, mobile web keyboard bar. Exit: §12 on every platform.

### Phase 5: rich blocks (2 to 3 weeks)

Code, callout, toggle, table, media, frontmatter properties, outline, each with its Markdown in the corpus and an example on both platforms.

### Phase 6: AI (1 to 2 weeks)

The AI kit on both platforms with streaming, diff review, autocomplete and an adapter example.

### Phase 7: blocks, docs, release (2 weeks)

Four blocks, the desktop notes screen, the homepage card, the screen reader pass, performance budgets, docs, changelog.

### Phase 8: later

Footnotes and math kits, mentions and page links, find and replace, a source view, comments and collaboration on the operation log, export to HTML and PDF, languages beyond Latin script (which reopens §1's input-method list).

Total: about 15 to 21 weeks to Phase 7.

---

## 21. Docs, examples and blocks

- **Docs page** per base and native, with the usual sections plus **Kits** (writing one, adding a command everywhere) and **Markdown** (what round-trips, raw content, lossy kits).
- **Examples:** `editor-demo`, `editor-minimal`, `editor-toolbar`, `editor-read-only`, `editor-markdown` (value side by side), `editor-ai`, `editor-custom-kit`, `editor-comment`, `editor-sizes`, `editor-controlled`; `examples/native/editor-example.tsx`.
- **Blocks:** `editor-01` Notion page (title, properties, outline, slash, handles, AI); `editor-02` comment box; `editor-03` Markdown notes in the App Shell with File Tree; `editor-04` docs editor with a fixed toolbar and word count.
- **Homepage** card and a group in `lib/component-groups.ts`; changelog entry.

---

## 22. Decisions

1. **Text selection across blocks.** Pick: the core supports ranges on every platform, web lets you drag text across blocks as Notion does, native selects whole blocks until Phase 8 adds drawn handles. Desktop users expect Notion's drag, and it costs nothing in the core. Alternative: block selection only, on web too, so the platforms behave identically from day one and web loses Notion's text drag.
2. **Native field.** Pick: our own Expo module (`UITextView`, `AppCompatEditText`) as `@fabricator-ui/editor-native`. It reports exact edits, formats without touching the text, keeps the caret, gives caret rectangles and iPad key commands (§3.1, §7.3). Alternative: React Native's `TextInput` with nested `Text`: pure TypeScript through the registry, no development build, but each of those needs is broken or missing; kept as Phase 0's baseline.
3. **Native list of many blocks.** Pick in Phase 0 from measurements: all fields in a `FlatList`, or `Text` until tapped.
4. **Markdown.** Pick: our own parser and serialiser for the subset in §8.2, with everything else kept raw. It's the only way to get byte-for-byte saving, and it's shared code on both platforms.
5. **Markdown test oracle.** Pick: `mdast-util-from-markdown` and `mdast-util-gfm` as `devDependencies` of `apps/web`, used only in tests to check our parser's structure on the corpus. They're already in `node_modules` through Fumadocs, but tests shouldn't lean on a transitive install, so this needs your approval. Alternative: only the CommonMark and GFM spec examples, checked against their expected HTML.
6. **Browser tests.** Pick: Vitest browser mode with Playwright for the web field (new dev dependency, needs approval). Alternative: a harness on `puppeteer-core`, already in `apps/web`.
7. **Lossy formatting.** Pick: off in Markdown mode unless a kit's HTML fallback is on.
8. **Item split.** Pick: core `editor` plus an item per kit, so a comment box stays small. Alternative: one large item.

---

## 23. Risks

| Risk                                                                                                            | Mitigation                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The native module adds Swift and Kotlin to a TypeScript library, and React Native or Expo upgrades can break it | Small surface (show runs, report edits), its own XCTest and JUnit tests, the e2e install test on each Expo SDK bump |
| Android keyboards behave differently inside our `EditText`                                                      | Composition is left to the platform; the input matrix covers Gboard and Samsung Keyboard each release               |
| Android keyboards on the web (Gboard composition) break the `beforeinput` path                                  | Reconcile from the DOM for anything uncancelable, the same `getTextEdit` native uses                                |
| Our Markdown parser disagrees with other tools on edge cases                                                    | The subset is small; edge cases become raw; the oracle runs on the corpus                                           |
| Per-block fields feel wrong to people used to Google Docs selection                                             | It's Notion's behaviour and documented; block selection is fast to reach                                            |
| Native performance with hundreds of fields                                                                      | Measured in Phase 0 with a fallback in decision 3                                                                   |
| Scope                                                                                                           | Phases ship alone; the core is tested without UI; web before native                                                 |
| Screen readers with many `contenteditable` hosts                                                                | Semantic elements per block; manual pass each release                                                               |

---

## 24. Not verified

Phase 0 answers these; nothing in this plan was run.

- Every §3.1 finding outside desktop Chrome: Safari, Firefox, iOS Safari, Android Chrome, and the React Native behaviour on devices (it was read from source).
- Whether a hidden one-entry undo stack makes `historyUndo` fire for the browser's Edit menu and iOS shake.
- The CSS Custom Highlight API for painting ranges in each target browser.
- How Notion selects text across fields; we only know that it does.
- Mount cost of 500 native text views, and focus hopping between them without the keyboard dropping.
- That `react-native-keyboard-controller`'s scroll view follows a caret rectangle we pass, rather than the focused view's frame.
- Whether the library already needs a development build (it uses `react-native-keyboard-controller`); if not, the module adds that requirement.
- Apple Pencil Scribble into `UITextView` inside React Native.

---

## 25. Proposed edits to settled documents

- **AGENTS.md:** the editor's core files in `SHARED_LIB_FILES`; the editor and `packages/editor-native/` in the repository map, and the module's publish step beside `release:icons`; and a home for decisions, since `AGENTS.md` still points to `PLAN.md`, which commit `46b7e0e3` removed.
- **DESIGN.md (both):** the Document typography role, the editor's looks, the editor in "Choosing a component" (Textarea for plain text, Chat Input for messages, Editor for documents), and a "Write and edit documents" pattern.
- **`registry/native/README.md`:** writing a text field component, and how a kit's views pair across trees.
- **`registry/native/differences.ts`:** `editor` at tier `same`, with notes on the slash menu docked over the keyboard on phones and on native selecting whole blocks across blocks until Phase 8.
