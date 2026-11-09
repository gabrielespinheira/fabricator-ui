# @fabricator-ui/editor-native

The native text view behind Fabricator UI's Markdown editor, as an Expo module. One `UITextView` (TextKit 2) holds the whole document, like Apple Notes: selection runs across paragraphs, and typing, autocorrect, predictive text, dictation and marked text are the system's own. JS owns the model; the view shows it, reports edits as ranges of the document's flat text, and reports the caret. The design is in `docs/plans/editor.md` (§2, §7.3).

Private for now: it isn't published, and its API can still change.

## Platforms

- **iOS:** built (iOS 16.4 and later).
- **Android:** not built yet. There is no `android/` folder, so on Android the view doesn't exist and rendering it throws. It will wrap an `AppCompatEditText` (plan §7.3).
- **Web:** not part of this package; the web editor is a `contenteditable` root.

It needs a development build (`npx expo run:ios`); Expo Go doesn't include it.

## Usage

```tsx
import { EditorNativeTextView } from "@fabricator-ui/editor-native"

const editor = (
  <EditorNativeTextView
    content={content} // { version, text, spans, paragraphs }
    theme={theme} // fonts, sizes, colours
    selection={selection} // applied when its version changes
    onTextReplace={({ nativeEvent }) => {
      // Typing, autocorrect, dictation, paste: replace from..to with text.
    }}
    onEditorInput={({ nativeEvent }) => {
      // Enter, Shift+Enter and deletes across paragraphs: the view didn't apply them.
    }}
  />
)
```

`src/index.ts` documents every prop and event. The flat text joins paragraphs with `\n`, writes a line break inside a paragraph as U+2028 and each divider, image or table as U+FFFC. Offsets are UTF-16. A table paragraph carries its cells as plain text in `table` (`{ rows, align }`, row 0 the header).

## How it behaves

- **Content from JS:** when its text equals the view's, only attributes are rewritten, so the caret and marked text stay. When it differs, the text is replaced in one edit (deferred while marked text is active) and the caret keeps its offset unless `selection` has a new version. Content whose text is one the view already reported and moved past (JS is a few keystrokes behind) is skipped: the content for the newer edits follows.
- **Edits:** text the system applies is reported with `onTextReplace`. Enter (`split`, or `softBreak` in a code paragraph), Shift+Return (`softBreak`) and deletes that cross a paragraph boundary are cancelled and reported with `onEditorInput`; Backspace at the very start of the document reports `deleteBackward` with an empty range. `onSelectionChange` also fires when the view takes focus, with the caret where it is.
- **Undo:** the text view records nothing. Shake, Cmd+Z and the iPad shortcuts bar fire `onKeyCommand` with `undo` or `redo`. The system can't know whether JS has history, so the shake alert always offers Undo.
- **Drawing:** list markers, checkboxes, the quote bar, code backgrounds, dividers, tables and the image placeholder are drawn by a custom `NSTextLayoutFragment`, not attachments.
- **Tables:** drawn as the Markdown preview's grid: a rounded frame, a tinted semibold header row (`colors.tableHeader`), hairlines between rows and columns, and each cell on one line at 0.875 of the body size, aligned per column and truncated with an ellipsis when it doesn't fit. Columns share the width by their widest text, each keeping a minimum. The paragraph is one line as tall as its rows. Cells aren't editable in the view: a tap reports `onBlockPress`, and the app edits the table elsewhere (the Fabricator editor opens a sheet).
- **Code:** a code block is drawn as Syntax Highlight's panel: a strip at its top with the language's name (the paragraph's `label`) and a chevron at the start and a Copy icon at the end, then the code, padded in the body's em. Spans with a `token` take that kind's colour from `theme.syntax` (Syntax Highlight's `--syntax-*` colours, resolved by the app); a kind with no colour draws in the foreground. Lines wrap: a text view can't scroll one paragraph sideways. Inline code is drawn as a rounded chip (`colors.inlineCode`), with kerning for its padding.
- **Tasks:** the box is the Checkbox's look at 1.125em, at the start of its list level and centred on the first line: a 1.5pt outline in `colors.checkboxBorder` (the foreground at 25% when left out), or filled with `colors.checkbox` and a check in `colors.checkboxForeground`.
- **Taps on blocks:** a tap on a checkbox fires `onTaskToggle`; a tap on a divider, an image or a table fires `onBlockPress` with the paragraph's start and kind, and a tap on a code block's language or Copy fires it with the kind `code-language` or `code-copy`. None of them moves the caret or focuses the view.
- **Accessibility:** VoiceOver reads the text view as one text area, as `UITextView` does. Headings aren't exposed with the header trait yet.
