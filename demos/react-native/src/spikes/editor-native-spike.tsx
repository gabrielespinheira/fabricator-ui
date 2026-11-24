// A hidden screen for the editor-native spike: the native view with a naive
// JS updater and a log of the last events, to watch the round trip.
// Open it with fabricator-ui://editor-native-spike.
import * as React from "react"
import {
  EditorNativeTextView,
  type EditorNativeContent,
  type EditorNativeKeyCommand,
  type EditorNativeSelection,
  type EditorNativeTextViewRef,
  type EditorNativeTheme,
} from "@fabricator-ui/editor-native"
import { ChevronLeftIcon } from "@fabricator-ui/icons-react-native"
import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

import { FONT, useTheme, type Theme } from "../theme"
import {
  deleteBackward,
  getSampleContent,
  replaceText,
  splitParagraph,
  toggleBold,
  toggleTask,
  toHexColor,
} from "./editor-native-model"

const EDITOR_NATIVE_SPIKE_PATH = "/editor-native-spike"
const SPIKE_LINK = /^fabricator-ui:\/\/editor-native-spike\/?$/

/** The spike's path for its link, or null for any other URL. */
function getSpikePathFromUrl(url: string | null | undefined) {
  return url && SPIKE_LINK.test(url) ? EDITOR_NATIVE_SPIKE_PATH : null
}

const KEY_COMMANDS: EditorNativeKeyCommand[] = [
  { id: "bold", input: "b", modifiers: ["command"] },
  { id: "indent", input: "tab", modifiers: [] },
  { id: "outdent", input: "tab", modifiers: ["shift"] },
]

const LOG_SIZE = 8

function getEditorTheme(theme: Theme): EditorNativeTheme {
  const { colors } = theme
  return {
    fontFamily: FONT.regular,
    fontFamilyMedium: FONT.medium,
    fontFamilySemibold: FONT.semibold,
    fontFamilyMono: "Menlo-Regular",
    fontSize: 16,
    lineHeight: 1.65,
    headingSizes: [30, 24, 20, 18, 16, 16],
    paragraphSpacing: 12,
    indentWidth: 24,
    colors: {
      foreground: toHexColor(colors.foreground),
      muted: toHexColor(colors.muted),
      link: toHexColor(colors.primary),
      codeBackground: toHexColor(colors.tabTrack),
      quoteBar: toHexColor(colors.border),
      border: toHexColor(colors.border),
      caret: toHexColor(colors.primary),
      selection: `${toHexColor(colors.primary).slice(0, 7)}33`,
      placeholder: toHexColor(colors.placeholder),
      checkbox: toHexColor(colors.primary),
    },
  }
}

function EditorNativeSpike({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const editorTheme = React.useMemo(() => getEditorTheme(theme), [theme])
  const editorRef = React.useRef<EditorNativeTextViewRef>(null)
  const [content, setContent] =
    React.useState<EditorNativeContent>(getSampleContent)
  const [selection, setSelection] = React.useState<EditorNativeSelection>()
  const [log, setLog] = React.useState<string[]>([])
  const [isAutoHeight, setIsAutoHeight] = React.useState(false)
  const [contentHeight, setContentHeight] = React.useState(0)
  const caret = React.useRef({ start: 0, end: 0 })
  const selectionVersion = React.useRef(0)

  const addLog = (line: string) =>
    setLog((lines) => [line, ...lines].slice(0, LOG_SIZE))
  const moveCaret = (start: number, end = start) => {
    selectionVersion.current += 1
    caret.current = { start, end }
    setSelection({ start, end, version: selectionVersion.current })
  }
  const boldSelection = () => {
    const { start, end } = caret.current
    addLog(`bold ${start}-${end}`)
    setContent((current) => toggleBold(current, start, end))
  }

  const editor = (
    <EditorNativeTextView
      ref={editorRef}
      content={content}
      theme={editorTheme}
      selection={selection}
      placeholder="Write something"
      scrollEnabled={!isAutoHeight}
      smartPunctuation={false}
      keyCommands={KEY_COMMANDS}
      style={
        isAutoHeight ? { height: Math.max(contentHeight, 40) } : { flex: 1 }
      }
      onTextReplace={({ nativeEvent }) => {
        const { from, to, text, selectionStart, selectionEnd, isComposing } =
          nativeEvent
        caret.current = { start: selectionStart, end: selectionEnd }
        addLog(
          `replace ${from}-${to} ${JSON.stringify(text)} caret ${selectionStart}${isComposing ? " composing" : ""}`
        )
        setContent((current) => replaceText(current, from, to, text))
      }}
      onEditorInput={({ nativeEvent }) => {
        const { kind, from, to } = nativeEvent
        addLog(`input ${kind} ${from}-${to}`)
        if (kind === "split") {
          setContent((current) => splitParagraph(current, from, to))
          moveCaret(from + 1)
        } else if (kind === "softBreak") {
          setContent((current) => replaceText(current, from, to, " "))
          moveCaret(from + 1)
        } else if (kind === "deleteBackward") {
          const result = deleteBackward(content, from, to)
          setContent(result.content)
          moveCaret(result.caret)
        } else {
          setContent((current) => replaceText(current, from, to, ""))
          moveCaret(from)
        }
      }}
      onSelectionChange={({ nativeEvent }) => {
        caret.current = nativeEvent
        addLog(`select ${nativeEvent.start}-${nativeEvent.end}`)
      }}
      onKeyCommand={({ nativeEvent }) => {
        addLog(`key ${nativeEvent.id}`)
        if (nativeEvent.id === "bold") boldSelection()
      }}
      onTaskToggle={({ nativeEvent }) => {
        addLog(`task ${nativeEvent.paragraphStart}`)
        setContent((current) => toggleTask(current, nativeEvent.paragraphStart))
      }}
      onContentHeight={({ nativeEvent }) => {
        addLog(`height ${Math.round(nativeEvent.height)}`)
        setContentHeight(nativeEvent.height)
      }}
      onEditorFocus={() => addLog("focus")}
      onEditorBlur={() => addLog("blur")}
    />
  )

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row flex-wrap items-center gap-2 px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          accessibilityLabel="Back"
          onPress={onBack}
        >
          <ChevronLeftIcon />
          Back
        </Button>
        <Button variant="outline" size="sm" onPress={boldSelection}>
          Bold
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => setIsAutoHeight((value) => !value)}
        >
          {isAutoHeight ? "Scrolling" : "Auto height"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => void editorRef.current?.blur()}
        >
          Blur
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            setContent(getSampleContent)
            moveCaret(0)
          }}
        >
          Reset
        </Button>
      </View>
      <View className="h-36 border-y border-border bg-muted/40 px-4 py-1">
        {log.map((line, index) => (
          <Text
            key={`${index}-${line}`}
            numberOfLines={1}
            className="font-mono text-xs text-muted-foreground"
          >
            {line}
          </Text>
        ))}
      </View>
      {isAutoHeight ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-3"
          keyboardDismissMode="interactive"
        >
          {editor}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4 py-3">{editor}</View>
      )}
    </View>
  )
}

export { EDITOR_NATIVE_SPIKE_PATH, EditorNativeSpike, getSpikePathFromUrl }
