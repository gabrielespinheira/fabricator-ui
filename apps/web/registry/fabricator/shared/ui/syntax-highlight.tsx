"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"

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
} from "@/registry/bases/__base__/lib/syntax-highlight-model"
import { buttonVariants } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Code with its syntax coloured by the foundations' --syntax-* tokens. The
// tokenizer (lib/syntax-highlight-model) is plain data, shared with React
// Native, so both draw the same tokens. Each token kind is one placeholder;
// the style map gives it its colour.

type SyntaxHighlightContextValue = {
  code: string
  language: string | null
  filename?: string
  lines: SyntaxLine[]
}

const SyntaxHighlightContext =
  React.createContext<SyntaxHighlightContextValue | null>(null)

function useSyntaxHighlight() {
  const context = React.useContext(SyntaxHighlightContext)
  if (!context) {
    throw new Error(
      "SyntaxHighlight parts must be used within <SyntaxHighlight>."
    )
  }
  return context
}

type SyntaxHighlightProps = React.ComponentProps<"div"> & {
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
    <SyntaxHighlightContext.Provider value={value}>
      <div
        data-slot="syntax-highlight"
        data-language={resolveLanguage(requested) ?? "text"}
        className={cn(
          "cn-syntax-highlight flex min-w-0 flex-col overflow-hidden",
          className
        )}
        {...props}
      >
        {children ?? <SyntaxHighlightContent />}
      </div>
    </SyntaxHighlightContext.Provider>
  )
}

function SyntaxHighlightHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="syntax-highlight-header"
      className={cn(
        "cn-syntax-highlight-header flex shrink-0 items-center",
        className
      )}
      {...props}
    />
  )
}

const SHELL_LANGUAGES = new Set(["bash", "docker", "makefile"])

/** A terminal for shell code, a file for everything else. */
function SyntaxHighlightIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { language } = useSyntaxHighlight()
  const isShell = SHELL_LANGUAGES.has(resolveLanguage(language) ?? "")

  return (
    <span
      data-slot="syntax-highlight-icon"
      aria-hidden="true"
      className={cn(
        "cn-syntax-highlight-icon flex shrink-0 items-center",
        className
      )}
      {...props}
    >
      {isShell ? (
        <IconPlaceholder
          lucide="SquareTerminalIcon"
          tabler="IconTerminal2"
          hugeicons="CommandLineIcon"
          phosphor="TerminalWindowIcon"
          remixicon="RiTerminalBoxLine"
        />
      ) : (
        <IconPlaceholder
          lucide="FileCodeIcon"
          tabler="IconFileCode"
          hugeicons="FileCodeIcon"
          phosphor="FileCodeIcon"
          remixicon="RiFileCodeLine"
        />
      )}
    </span>
  )
}

/** The file name, else the language's name. */
function SyntaxHighlightTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  const { filename, language } = useSyntaxHighlight()

  return (
    <span
      data-slot="syntax-highlight-title"
      className={cn("cn-syntax-highlight-title min-w-0 truncate", className)}
      {...props}
    >
      {children ?? filename ?? getLanguageLabel(language)}
    </span>
  )
}

/** The language's name, for a header that already shows the file. */
function SyntaxHighlightLanguage({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  const { language } = useSyntaxHighlight()

  return (
    <span
      data-slot="syntax-highlight-language"
      className={cn("cn-syntax-highlight-language shrink-0", className)}
      {...props}
    >
      {children ?? getLanguageLabel(language)}
    </span>
  )
}

const COPIED_MS = 2000

type SyntaxHighlightCopyProps = Omit<
  React.ComponentProps<"button">,
  "children"
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
  onClick,
  ...props
}: SyntaxHighlightCopyProps) {
  const { code } = useSyntaxHighlight()
  const [isCopied, setIsCopied] = React.useState(false)

  React.useEffect(() => {
    if (!isCopied) return
    const timeout = window.setTimeout(() => setIsCopied(false), COPIED_MS)
    return () => window.clearTimeout(timeout)
  }, [isCopied])

  async function copy() {
    const text = value ?? code
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // No clipboard (an insecure page, a denied permission): leave the
      // button as it was rather than claim a copy that didn't happen.
      return
    }
    setIsCopied(true)
    onCopied?.(text)
  }

  return (
    <button
      type="button"
      data-slot="syntax-highlight-copy"
      data-copied={isCopied ? "" : undefined}
      aria-label={isCopied ? "Copied" : "Copy code"}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "cn-syntax-highlight-copy",
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) void copy()
      }}
      {...props}
    >
      {isCopied ? (
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
          className="cn-syntax-highlight-copy-icon"
        />
      ) : (
        <IconPlaceholder
          lucide="CopyIcon"
          tabler="IconCopy"
          hugeicons="Copy01Icon"
          phosphor="CopyIcon"
          remixicon="RiFileCopyLine"
          className="cn-syntax-highlight-copy-icon"
        />
      )}
      <span className="sr-only" aria-live="polite">
        {isCopied ? "Copied to clipboard" : ""}
      </span>
    </button>
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
    <span
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
    </span>
  )
}

type SyntaxHighlightContentProps = React.ComponentProps<"pre"> & {
  /** Numbers each line, out of the way of selection and copy. */
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
  style,
  ...props
}: SyntaxHighlightContentProps) {
  const { lines } = useSyntaxHighlight()
  const highlighted = getLineNumbers(highlightLines)
  const inserted = getLineNumbers(insertedLines)
  const deleted = getLineNumbers(deletedLines)
  const lastLine = startLine + lines.length - 1

  return (
    <pre
      data-slot="syntax-highlight-content"
      data-wrap={wrap ? "" : undefined}
      // A scrolling region must take focus, so keyboard users can scroll it.
      tabIndex={0}
      className={cn(
        "cn-syntax-highlight-content min-h-0 overflow-auto outline-none",
        className
      )}
      style={
        {
          "--syntax-highlight-gutter": `${String(lastLine).length}ch`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <code
        data-slot="syntax-highlight-code"
        className="cn-syntax-highlight-code grid"
      >
        {lines.map((line, index) => {
          const number = startLine + index
          const diff =
            line.diff ??
            (inserted.has(number)
              ? "inserted"
              : deleted.has(number)
                ? "deleted"
                : undefined)
          return (
            <span
              key={index}
              data-slot="syntax-highlight-line"
              data-highlighted={highlighted.has(number) ? "" : undefined}
              data-diff={diff}
              className="cn-syntax-highlight-line flex"
            >
              {showLineNumbers ? (
                <span
                  data-slot="syntax-highlight-line-number"
                  aria-hidden="true"
                  className="cn-syntax-highlight-line-number shrink-0 text-end select-none"
                >
                  {number}
                </span>
              ) : null}
              <span
                data-slot="syntax-highlight-line-content"
                className="cn-syntax-highlight-line-content min-w-0 flex-1"
              >
                {line.tokens.length > 0 ? line.tokens.map(renderToken) : "\n"}
              </span>
            </span>
          )
        })}
      </code>
    </pre>
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
