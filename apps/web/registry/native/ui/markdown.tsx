import * as React from "react"
import { CheckIcon } from "@fabricator-ui/icons-react-native"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Image, Linking, Platform, ScrollView, View } from "react-native"

import {
  getRunsText,
  type EditorBlock,
  type EditorInline,
  type EditorMark,
} from "@/registry/fabricator/shared/lib/editor-model"
import {
  parseMarkdown,
  type MarkdownSyntax,
} from "@/registry/fabricator/shared/lib/markdown-parse"
import {
  getHeadingLevel,
  getMarkdownTree,
  getStringAttribute,
  getTableAlign,
  getTableRows,
  isTaskChecked,
  type MarkdownTableAlign,
  type MarkdownTreeNode,
} from "@/registry/fabricator/shared/lib/markdown-tree"
import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/registry/native/ui/syntax-highlight"
import { Text, TextStyle } from "@/registry/native/ui/text"

// Markdown drawn with the Document typography the Editor uses, from the
// Editor's own parser, as the website's. React Native has no em and no
// inheritance, so each text part takes the size as `data-size` (and a
// heading its level) and the style map sizes it in points.

type MarkdownComponents = {
  /** Links, for example through the app's router. Renders inside a Text. */
  a?: React.ComponentType<{
    href: string
    title?: string
    children?: React.ReactNode
  }>
  /** Images, for example through `expo-image`. */
  img?: React.ComponentType<{ src: string; alt: string; title?: string }>
}

const markdownVariants = cva("cn-markdown min-w-0 flex-col", {
  variants: {
    size: {
      sm: "cn-markdown-size-sm",
      default: "cn-markdown-size-default",
      lg: "cn-markdown-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

type MarkdownSize = NonNullable<VariantProps<typeof markdownVariants>["size"]>

// The body text, sized by the document's size.
const markdownTextVariants = cva("cn-markdown-text", {
  variants: {
    size: {
      sm: "cn-markdown-text-size-sm",
      default: "cn-markdown-text-size-default",
      lg: "cn-markdown-text-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

// Code and raw Markdown: the website's 0.875em of the body.
const markdownSmallTextVariants = cva("", {
  variants: {
    size: {
      sm: "cn-markdown-small-text-size-sm",
      default: "cn-markdown-small-text-size-default",
      lg: "cn-markdown-small-text-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

// A heading's size depends on the document's size and its level: one rule
// per size, each stepping its levels with data-[level=N].
const markdownHeadingVariants = cva("cn-markdown-heading", {
  variants: {
    size: {
      sm: "cn-markdown-heading-size-sm",
      default: "cn-markdown-heading-size-default",
      lg: "cn-markdown-heading-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

type MarkdownTextData = {
  size: MarkdownSize
  level?: number
  checked?: boolean
}

const MarkdownTextContext = React.createContext<MarkdownTextData>({
  size: "default",
})

/** A Text that carries its block's level and state, which its rules read. */
function MarkdownText(props: React.ComponentProps<typeof Text>) {
  const { level, checked } = React.use(MarkdownTextContext)
  // Data variants compare strings, so the level goes as one.
  return (
    <Text
      data-level={level === undefined ? undefined : String(level)}
      data-checked={checked}
      {...props}
    />
  )
}

/** What a block's runs inherit: its level and state, on top of the size. */
function MarkdownTextScope({
  level,
  checked,
  children,
}: {
  level?: number
  checked?: boolean
  children?: React.ReactNode
}) {
  const { size } = React.use(MarkdownTextContext)
  const value = React.useMemo(
    () => ({ size, level, checked }),
    [size, level, checked]
  )
  return <MarkdownTextContext value={value}>{children}</MarkdownTextContext>
}

// Uniwind's font-mono is Menlo, which Android doesn't have.
const ANDROID_MONO =
  Platform.OS === "android" ? { fontFamily: "monospace" } : undefined

function openLink(href: string) {
  if (href === "") return
  Linking.openURL(href).catch(() => undefined)
}

function MarkdownLink({
  href,
  title,
  children,
}: {
  href: string
  title?: string
  children?: React.ReactNode
}) {
  return (
    <TextStyle className="cn-markdown-link">
      <MarkdownText
        data-slot="markdown-link"
        accessibilityRole="link"
        accessibilityHint={title}
        onPress={() => openLink(href)}
      >
        {children}
      </MarkdownText>
    </TextStyle>
  )
}

// Every Text sets its own colour and size, so a mark passes its look down
// through TextStyle: bold inside a link stays the link's colour.
function wrapInMark(
  content: React.ReactNode,
  mark: EditorMark,
  components: MarkdownComponents | undefined,
  size: MarkdownSize
) {
  switch (mark.type) {
    case "bold":
      return (
        <TextStyle className="cn-markdown-strong">
          <MarkdownText data-slot="markdown-strong">{content}</MarkdownText>
        </TextStyle>
      )
    case "italic":
      return (
        <TextStyle className="cn-markdown-emphasis">
          <MarkdownText data-slot="markdown-emphasis">{content}</MarkdownText>
        </TextStyle>
      )
    case "strike":
      return (
        <TextStyle className="cn-markdown-strike">
          <MarkdownText data-slot="markdown-strike">{content}</MarkdownText>
        </TextStyle>
      )
    case "code":
      return (
        <TextStyle
          className={cn(
            markdownSmallTextVariants({ size }),
            "cn-markdown-code"
          )}
        >
          <MarkdownText data-slot="markdown-code" style={ANDROID_MONO}>
            {content}
          </MarkdownText>
        </TextStyle>
      )
    case "link": {
      const Link = components?.a ?? MarkdownLink
      return (
        <Link href={mark.attrs?.href ?? ""} title={mark.attrs?.title}>
          {content}
        </Link>
      )
    }
    default:
      return (
        <MarkdownText data-slot="markdown-mark" data-mark={mark.type}>
          {content}
        </MarkdownText>
      )
  }
}

/** Runs of marked text: each run wrapped in its marks, link outermost. Renders inside a Text. */
function MarkdownInline({
  runs,
  components,
}: {
  runs: readonly EditorInline[]
  components?: MarkdownComponents
}) {
  const { size } = React.use(MarkdownTextContext)
  return runs.map((run, index) => {
    if (run.raw) {
      return (
        <TextStyle
          key={index}
          className={cn(markdownSmallTextVariants({ size }), "cn-markdown-raw")}
        >
          <MarkdownText data-slot="markdown-raw" style={ANDROID_MONO}>
            {run.text}
          </MarkdownText>
        </TextStyle>
      )
    }
    const marks = run.marks ?? []
    // Text keeps "\n" as a line break, which is what a hard break is.
    const content = marks.reduceRight<React.ReactNode>(
      (inner, mark) => wrapInMark(inner, mark, components, size),
      run.text
    )
    return <React.Fragment key={index}>{content}</React.Fragment>
  })
}

// Table text: the website's 0.875em of the body, on its own line height.
const markdownTableTextVariants = cva("cn-markdown-table-text", {
  variants: {
    size: {
      sm: "cn-markdown-table-text-size-sm",
      default: "cn-markdown-table-text-size-default",
      lg: "cn-markdown-table-text-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

function MarkdownTable({
  block,
  components,
}: {
  block: EditorBlock
  components?: MarkdownComponents
}) {
  const rows = getTableRows(block)
  const align = getTableAlign(block)
  const columnCount = Math.max(0, ...rows.map((row) => row.length))
  const columns = Array.from({ length: columnCount }, (_, column) => column)
  const { size } = React.use(MarkdownTextContext)
  const lastRow = rows.length - 1
  // Column by column, so a column takes its widest cell's width and grows to
  // fill the box. Cells stay on one line at one fixed height, so the rows of
  // every column line up.
  return (
    <TextStyle className={markdownTableTextVariants({ size })}>
      <View data-slot="markdown-table" className="cn-markdown-table">
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="grow"
        >
          <View className="grow flex-row">
            {columns.map((column) => {
              const cellAlign: MarkdownTableAlign = align[column] ?? null
              return (
                <View
                  key={column}
                  data-last={column === columnCount - 1}
                  className="cn-markdown-table-column grow flex-col"
                >
                  {rows.map((row, rowIndex) => {
                    const cell = row[column] ?? []
                    return rowIndex === 0 ? (
                      <View
                        key={rowIndex}
                        role="columnheader"
                        data-size={size}
                        data-align={cellAlign ?? undefined}
                        className="cn-markdown-table-head"
                      >
                        <MarkdownText
                          numberOfLines={1}
                          className="cn-markdown-table-head-text"
                        >
                          <MarkdownInline runs={cell} components={components} />
                        </MarkdownText>
                      </View>
                    ) : (
                      <View
                        key={rowIndex}
                        role="cell"
                        data-align={cellAlign ?? undefined}
                        data-size={size}
                        data-last={rowIndex === lastRow}
                        className="cn-markdown-table-row cn-markdown-table-cell"
                      >
                        <MarkdownText
                          numberOfLines={1}
                          className="cn-markdown-table-cell-text"
                        >
                          <MarkdownInline runs={cell} components={components} />
                        </MarkdownText>
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>
    </TextStyle>
  )
}

function MarkdownImage({
  src,
  alt,
  title,
}: {
  src: string
  alt: string
  title?: string
}) {
  const [ratio, setRatio] = React.useState(16 / 9)
  return (
    <Image
      data-slot="markdown-image"
      source={{ uri: src }}
      accessibilityLabel={alt}
      accessibilityHint={title}
      resizeMode="contain"
      className="cn-markdown-image w-full"
      style={{ aspectRatio: ratio }}
      onLoad={(event) => {
        const { width, height } = event.nativeEvent.source
        if (width > 0 && height > 0) setRatio(width / height)
      }}
    />
  )
}

/** A filename from the fence's meta (```ts title="app.ts"), for the title bar. */
function getCodeFilename(meta: string | null) {
  return meta?.match(/title=["']([^"']+)["']/)?.[1]
}

/** Code through Syntax Highlight: its panel, title bar, Copy and colours. */
function MarkdownCodeBlock({ block }: { block: EditorBlock }) {
  return (
    <SyntaxHighlight
      code={getRunsText(block.content)}
      language={getStringAttribute(block, "language") ?? undefined}
      filename={getCodeFilename(getStringAttribute(block, "meta"))}
      data-slot="markdown-code-block"
      className="cn-markdown-code-block"
    >
      <SyntaxHighlightHeader>
        <SyntaxHighlightIcon />
        <SyntaxHighlightTitle />
        <SyntaxHighlightCopy />
      </SyntaxHighlightHeader>
      <SyntaxHighlightContent />
    </SyntaxHighlight>
  )
}

function MarkdownBlock({
  block,
  components,
  isFirst = false,
}: {
  block: EditorBlock
  components?: MarkdownComponents
  /** Whether the block opens the document, which takes no space above a heading. */
  isFirst?: boolean
}) {
  const { size } = React.use(MarkdownTextContext)
  const inline = <MarkdownInline runs={block.content} components={components} />
  switch (block.type) {
    case "heading": {
      const level = getHeadingLevel(block)
      return (
        <MarkdownTextScope level={level}>
          <TextStyle className={markdownHeadingVariants({ size })}>
            <MarkdownText
              data-slot="markdown-heading"
              data-first={isFirst}
              accessibilityRole="header"
            >
              {inline}
            </MarkdownText>
          </TextStyle>
        </MarkdownTextScope>
      )
    }
    case "quote":
      return (
        <View
          data-slot="markdown-quote"
          data-size={size}
          className="cn-markdown-quote"
        >
          <TextStyle className="cn-markdown-quote-text">
            <MarkdownText>{inline}</MarkdownText>
          </TextStyle>
        </View>
      )
    case "code":
      return <MarkdownCodeBlock block={block} />
    case "divider":
      return (
        <View
          data-slot="markdown-divider"
          data-size={size}
          accessibilityRole="none"
          className="cn-markdown-divider"
        />
      )
    case "image": {
      const ImagePart = components?.img ?? MarkdownImage
      return (
        <ImagePart
          src={getStringAttribute(block, "src") ?? ""}
          alt={getStringAttribute(block, "alt") ?? ""}
          title={getStringAttribute(block, "title") ?? undefined}
        />
      )
    }
    case "table":
      return <MarkdownTable block={block} components={components} />
    case "raw":
      return (
        <View
          data-slot="markdown-raw"
          data-size={size}
          className="cn-markdown-raw-block"
        >
          <TextStyle
            className={cn(
              markdownSmallTextVariants({ size }),
              "cn-markdown-raw-block-text"
            )}
          >
            <MarkdownText selectable style={ANDROID_MONO}>
              {getRunsText(block.content)}
            </MarkdownText>
          </TextStyle>
        </View>
      )
    default:
      return (
        <MarkdownText
          data-slot="markdown-paragraph"
          className="cn-markdown-paragraph"
        >
          {inline}
        </MarkdownText>
      )
  }
}

// A disc at every depth, as the website's lists.
const BULLET = "•"

// The bullet's room before the text, which a number doesn't take.
const markdownBulletVariants = cva("", {
  variants: {
    size: {
      sm: "cn-markdown-bullet-size-sm",
      default: "cn-markdown-bullet-size-default",
      lg: "cn-markdown-bullet-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

/** The check: 0.75em of the body. */
const CHECK_SIZES: Record<MarkdownSize, number> = {
  sm: 10.5,
  default: 12,
  lg: 13.5,
}

/** The check inside a done task's box, for a checkbox of your own. */
function MarkdownTaskCheck() {
  const { size } = React.use(MarkdownTextContext)
  return (
    <TextStyle className="cn-markdown-task-check">
      <CheckIcon size={CHECK_SIZES[size]} strokeWidth={3} aria-hidden />
    </TextStyle>
  )
}

function MarkdownTaskCheckbox({ isChecked }: { isChecked: boolean }) {
  const { size } = React.use(MarkdownTextContext)
  return (
    <View
      data-slot="markdown-task-checkbox"
      data-size={size}
      data-checked={isChecked}
      role="checkbox"
      aria-checked={isChecked}
      aria-disabled
      accessibilityLabel={isChecked ? "Done" : "Not done"}
      className="cn-markdown-task-checkbox items-center justify-center self-start"
    >
      {isChecked ? <MarkdownTaskCheck /> : null}
    </View>
  )
}

function MarkdownListItemContent({
  block,
  components,
}: {
  block: EditorBlock
  components?: MarkdownComponents
}) {
  if (block.type !== "task") {
    return (
      <MarkdownText>
        <MarkdownInline runs={block.content} components={components} />
      </MarkdownText>
    )
  }
  const isChecked = isTaskChecked(block)
  return (
    <MarkdownTextScope checked={isChecked}>
      <TextStyle className="cn-markdown-task-text">
        <MarkdownText data-slot="markdown-task-text">
          <MarkdownInline runs={block.content} components={components} />
        </MarkdownText>
      </TextStyle>
    </MarkdownTextScope>
  )
}

function MarkdownNodes({
  nodes,
  components,
  depth = 0,
}: {
  nodes: readonly MarkdownTreeNode[]
  components?: MarkdownComponents
  depth?: number
}) {
  const { size } = React.use(MarkdownTextContext)
  return nodes.map((node, nodeIndex) => {
    if (node.kind === "block") {
      const block = (
        <MarkdownBlock
          key={node.block.id}
          block={node.block}
          components={components}
          isFirst={depth === 0 && nodeIndex === 0}
        />
      )
      if (depth === 0) return block
      // A paragraph (or any block) that belongs to the list item above it:
      // under the item's text, after it, as a nested list sits.
      return (
        <View
          key={node.block.id}
          data-slot="markdown-list-item-block"
          data-size={size}
          className="cn-markdown-list-item-block"
        >
          {block}
        </View>
      )
    }
    return (
      <View
        key={node.items[0]?.block.id}
        data-slot="markdown-list"
        data-ordered={node.ordered}
        data-size={size}
        data-nested={depth > 0}
        className="cn-markdown-list"
      >
        {node.items.map(({ block, children }, index) => {
          const isTask = block.type === "task"
          return (
            <View
              key={block.id}
              data-slot="markdown-list-item"
              data-task={isTask}
              data-checked={isTaskChecked(block)}
              className="cn-markdown-list-item flex-row items-start"
            >
              <View data-size={size} className="cn-markdown-list-marker">
                {isTask ? (
                  <MarkdownTaskCheckbox isChecked={isTaskChecked(block)} />
                ) : (
                  <MarkdownText
                    aria-hidden
                    importantForAccessibility="no"
                    className={cn(
                      "cn-markdown-list-marker-text",
                      node.ordered
                        ? undefined
                        : markdownBulletVariants({ size })
                    )}
                  >
                    {node.ordered ? `${node.start + index}.` : BULLET}
                  </MarkdownText>
                )}
              </View>
              <View className="min-w-0 flex-1 flex-col">
                <MarkdownListItemContent
                  block={block}
                  components={components}
                />
                <MarkdownNodes
                  nodes={children}
                  components={components}
                  depth={depth + 1}
                />
              </View>
            </View>
          )
        })}
      </View>
    )
  })
}

function Markdown({
  children,
  size = "default",
  components,
  syntax,
  className,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  /** The Markdown to show. */
  children: string
  size?: MarkdownSize
  /** Replace how links or images render. */
  components?: MarkdownComponents
  /** Extra block syntax, the same kits the Editor takes. */
  syntax?: readonly MarkdownSyntax[]
}) {
  const nodes = React.useMemo(
    () => getMarkdownTree(parseMarkdown(children, { syntax }).blocks),
    [children, syntax]
  )
  const text = React.useMemo(() => ({ size }), [size])
  return (
    <MarkdownTextContext value={text}>
      <TextStyle className={markdownTextVariants({ size })}>
        <View
          data-slot="markdown"
          data-size={size}
          className={cn(markdownVariants({ size }), className)}
          {...props}
        >
          <MarkdownNodes nodes={nodes} components={components} />
        </View>
      </TextStyle>
    </MarkdownTextContext>
  )
}

export {
  Markdown,
  MarkdownBlock,
  MarkdownInline,
  MarkdownTaskCheck,
  markdownVariants,
}
export type { MarkdownComponents, MarkdownSize }
