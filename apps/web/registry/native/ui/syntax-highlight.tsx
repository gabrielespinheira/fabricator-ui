import * as React from "react"
import {
  CheckIcon,
  CopyIcon,
  FileCodeIcon,
  SquareTerminalIcon,
} from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import * as Clipboard from "expo-clipboard"
import { AccessibilityInfo, Platform, ScrollView, View } from "react-native"

import {
  getCodeLanguage,
  getLanguageLabel,
  getLineNumbers,
  highlightCode,
  resolveLanguage,
  type SyntaxLine,
  type SyntaxLineRange,
  type SyntaxToken,
  type SyntaxTokenKind,
} from "@/registry/fabricator/shared/lib/syntax-highlight-model"
import { Button } from "@/registry/native/ui/button"
import { Text, TextStyle } from "@/registry/native/ui/text"

// The website's Syntax Highlight on React Native, from the same tokenizer, so
// a block reads the same on both. Lines scroll sideways in their own
// ScrollView unless they wrap; React Native has no `in-data-*`, so each line's
// number takes its line's marks as props.

type SyntaxHighlightContextValue = {
  code: string
  language: string | null
  filename?: string
  lines: SyntaxLine[]
}

const SyntaxHighlightContext =
  React.createContext<SyntaxHighlightContextValue | null>(null)

function useSyntaxHighlight() {
  const context = React.use(SyntaxHighlightContext)
  if (!context) {
    throw new Error(
      "SyntaxHighlight parts must be used within <SyntaxHighlight>."
    )
  }
  return context
}

type SyntaxHighlightProps = React.ComponentProps<typeof View> & {
  /** The source to show. */
  code: string
  /** A language name or alias (`tsx`, `sh`, `yml`). Read from `filename` when left out. */
  language?: string
  /** The file the code is from, shown by SyntaxHighlightTitle. */
  filename?: string
}

function SyntaxHighlight({
  code,
  language,
  filename,
  className,
  children,
  ...props
}: SyntaxHighlightProps) {
  const requested = getCodeLanguage(language, filename)
  const lines = React.useMemo(
    () => highlightCode(code, requested),
    [code, requested]
  )
  const value = React.useMemo(
    () => ({ code, language: requested, filename, lines }),
    [code, requested, filename, lines]
  )

  return (
    <SyntaxHighlightContext value={value}>
      <View
        data-slot="syntax-highlight"
        data-language={resolveLanguage(requested) ?? "text"}
        // self-stretch: a block on the website fills its parent's width.
        className={cn(
          "cn-syntax-highlight min-w-0 flex-col self-stretch overflow-hidden",
          className
        )}
        {...props}
      >
        {children ?? <SyntaxHighlightContent />}
      </View>
    </SyntaxHighlightContext>
  )
}

function SyntaxHighlightHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-syntax-highlight-header-text">
      <View
        data-slot="syntax-highlight-header"
        className={cn(
          "cn-syntax-highlight-header shrink-0 flex-row items-center",
          className
        )}
        {...props}
      >
        {children}
      </View>
    </TextStyle>
  )
}

const SHELL_LANGUAGES = new Set(["bash", "docker", "makefile"])

/** A terminal for shell code, a file for everything else. */
function SyntaxHighlightIcon({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const { language } = useSyntaxHighlight()
  const isShell = SHELL_LANGUAGES.has(resolveLanguage(language) ?? "")

  return (
    <View
      data-slot="syntax-highlight-icon"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        "cn-syntax-highlight-icon shrink-0 flex-row items-center",
        className
      )}
      {...props}
    >
      {isShell ? <SquareTerminalIcon /> : <FileCodeIcon />}
    </View>
  )
}

/** The file name, else the language's name. */
function SyntaxHighlightTitle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { filename, language } = useSyntaxHighlight()

  return (
    <Text
      data-slot="syntax-highlight-title"
      numberOfLines={1}
      className={cn("cn-syntax-highlight-title min-w-0", className)}
      {...props}
    >
      {children ?? filename ?? getLanguageLabel(language)}
    </Text>
  )
}

/** The language's name, for a header that already shows the file. */
function SyntaxHighlightLanguage({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { language } = useSyntaxHighlight()

  return (
    <Text
      data-slot="syntax-highlight-language"
      numberOfLines={1}
      className={cn("cn-syntax-highlight-language shrink-0", className)}
      {...props}
    >
      {children ?? getLanguageLabel(language)}
    </Text>
  )
}

const COPIED_MS = 2000

const copyIconClassName = cva("cn-syntax-highlight-copy-icon")
const copiedIconClassName = cva(
  "cn-syntax-highlight-copy-icon cn-syntax-highlight-copy-icon-copied"
)

type SyntaxHighlightCopyProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "variant" | "size"
> & {
  /** What to copy. The code, by default. */
  value?: string
  /** Called once the text is on the clipboard. */
  onCopied?: (value: string) => void
}

function SyntaxHighlightCopy({
  value,
  onCopied,
  className,
  onPress,
  ...props
}: SyntaxHighlightCopyProps) {
  const { code } = useSyntaxHighlight()
  const [isCopied, setIsCopied] = React.useState(false)

  React.useEffect(() => {
    if (!isCopied) return
    const timeout = setTimeout(() => setIsCopied(false), COPIED_MS)
    return () => clearTimeout(timeout)
  }, [isCopied])

  async function copy() {
    const text = value ?? code
    await Clipboard.setStringAsync(text)
    setIsCopied(true)
    AccessibilityInfo.announceForAccessibility("Copied to clipboard")
    onCopied?.(text)
  }

  return (
    <Button
      data-slot="syntax-highlight-copy"
      data-copied={isCopied}
      variant="ghost"
      size="icon-sm"
      accessibilityLabel={isCopied ? "Copied" : "Copy code"}
      className={cn("cn-syntax-highlight-copy", className)}
      onPress={(event) => {
        onPress?.(event)
        void copy()
      }}
      {...props}
    >
      <TextStyle
        className={isCopied ? copiedIconClassName() : copyIconClassName()}
        eases
      >
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </TextStyle>
    </Button>
  )
}

// One class per kind. Each is a cva() of its own, where the build reaches
// the placeholder; a token is not a variant anyone picks.
const TOKEN_CLASS_NAMES: Record<SyntaxTokenKind, () => string> = {
  plain: cva(""),
  comment: cva("cn-syntax-highlight-token-comment"),
  keyword: cva("cn-syntax-highlight-token-keyword"),
  string: cva("cn-syntax-highlight-token-string"),
  constant: cva("cn-syntax-highlight-token-constant"),
  function: cva("cn-syntax-highlight-token-function"),
  type: cva("cn-syntax-highlight-token-type"),
  tag: cva("cn-syntax-highlight-token-tag"),
  attribute: cva("cn-syntax-highlight-token-attribute"),
  property: cva("cn-syntax-highlight-token-property"),
  variable: cva("cn-syntax-highlight-token-variable"),
  regex: cva("cn-syntax-highlight-token-regex"),
  operator: cva("cn-syntax-highlight-token-operator"),
  punctuation: cva("cn-syntax-highlight-token-punctuation"),
  inserted: cva("cn-syntax-highlight-token-inserted"),
  deleted: cva("cn-syntax-highlight-token-deleted"),
  heading: cva("cn-syntax-highlight-token-heading"),
  link: cva("cn-syntax-highlight-token-link"),
}
const strongClassName = cva("cn-syntax-highlight-token-strong")
const emphasisClassName = cva("cn-syntax-highlight-token-emphasis")

function renderToken(token: SyntaxToken, index: number) {
  if (token.kind === "plain" && !token.isStrong && !token.isEmphasis) {
    return token.content
  }
  return (
    <Text
      key={index}
      data-token={token.kind}
      // A plain join: token classes never clash, and a long file has
      // thousands of tokens to skip class merging for.
      className={[
        TOKEN_CLASS_NAMES[token.kind](),
        token.isStrong ? strongClassName() : "",
        token.isEmphasis ? emphasisClassName() : "",
      ].join(" ")}
    >
      {token.content}
    </Text>
  )
}

// Uniwind's font-mono is Menlo, which Android doesn't have.
const ANDROID_MONO =
  Platform.OS === "android" ? { fontFamily: "monospace" } : undefined

type SyntaxHighlightContentProps = React.ComponentProps<typeof ScrollView> & {
  /** Numbers each line. */
  showLineNumbers?: boolean
  /** The first line's number. */
  startLine?: number
  /** Lines to mark: numbers and inclusive ranges, `[2, [5, 7]]`. */
  highlightLines?: readonly SyntaxLineRange[]
  /** Lines to mark as added, for a change shown in its own language. */
  insertedLines?: readonly SyntaxLineRange[]
  /** Lines to mark as removed. */
  deletedLines?: readonly SyntaxLineRange[]
  /** Wraps long lines instead of scrolling sideways. */
  wrap?: boolean
}

function SyntaxHighlightContent({
  showLineNumbers = false,
  startLine = 1,
  highlightLines,
  insertedLines,
  deletedLines,
  wrap = false,
  className,
  ...props
}: SyntaxHighlightContentProps) {
  const { lines } = useSyntaxHighlight()
  const highlighted = getLineNumbers(highlightLines)
  const inserted = getLineNumbers(insertedLines)
  const deleted = getLineNumbers(deletedLines)
  const digits = String(startLine + lines.length - 1).length

  const rows = (
    <View
      data-slot="syntax-highlight-code"
      className="cn-syntax-highlight-code grow"
    >
      {lines.map((line, index) => {
        const number = startLine + index
        const isHighlighted = highlighted.has(number)
        const diff =
          line.diff ??
          (inserted.has(number)
            ? "inserted"
            : deleted.has(number)
              ? "deleted"
              : undefined)
        return (
          <View
            key={index}
            data-slot="syntax-highlight-line"
            data-highlighted={isHighlighted}
            data-diff={diff}
            className="cn-syntax-highlight-line flex-row"
          >
            {showLineNumbers ? (
              <Text
                data-slot="syntax-highlight-line-number"
                data-highlighted={isHighlighted}
                data-diff={diff}
                aria-hidden
                importantForAccessibility="no"
                selectable={false}
                style={ANDROID_MONO}
                className="cn-syntax-highlight-line-number shrink-0"
              >
                {/* Padded to the last number's width: every digit and space
                    is as wide as the next in a mono font. */}
                {String(number).padStart(digits, " ")}
              </Text>
            ) : null}
            <Text
              data-slot="syntax-highlight-line-content"
              selectable
              numberOfLines={wrap ? undefined : 1}
              style={ANDROID_MONO}
              className={cn(
                "cn-syntax-highlight-line-content",
                wrap ? "min-w-0 flex-1" : "shrink-0"
              )}
            >
              {line.tokens.length > 0 ? line.tokens.map(renderToken) : " "}
            </Text>
          </View>
        )
      })}
    </View>
  )

  return (
    <TextStyle className="cn-syntax-highlight-content-text">
      <ScrollView
        data-slot="syntax-highlight-content"
        data-wrap={wrap}
        nestedScrollEnabled
        className={cn("cn-syntax-highlight-content min-h-0 grow-0", className)}
        {...props}
      >
        {wrap ? (
          rows
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled
            // At least as wide as the panel, so a marked line's fill reaches
            // its edge when the code is narrower.
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {rows}
          </ScrollView>
        )}
      </ScrollView>
    </TextStyle>
  )
}

export {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightLanguage,
  SyntaxHighlightTitle,
  useSyntaxHighlight,
}
