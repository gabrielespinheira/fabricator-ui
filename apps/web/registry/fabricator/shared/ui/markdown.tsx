import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import {
  getRunsText,
  type EditorBlock,
  type EditorInline,
  type EditorMark,
} from "@/registry/bases/__base__/lib/editor-model"
import {
  parseMarkdown,
  type MarkdownSyntax,
} from "@/registry/bases/__base__/lib/markdown-parse"
import {
  getHeadingLevel,
  getMarkdownTree,
  getStringAttribute,
  getTableAlign,
  getTableRows,
  isTaskChecked,
  type MarkdownTreeNode,
} from "@/registry/bases/__base__/lib/markdown-tree"
import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/registry/bases/__base__/ui/syntax-highlight"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Markdown drawn with the Document typography the Editor uses, so a preview
// looks like what was written. It parses with the Editor's own parser and
// renders plain semantic HTML, with no hooks, so it works in Server
// Components as well as on the client.

type MarkdownComponents = {
  /** Links, for example through the app's router. */
  a?: React.ComponentType<React.ComponentProps<"a">>
  /** Images, for example through `next/image`. */
  img?: React.ComponentType<React.ComponentProps<"img">>
}

const markdownVariants = cva("cn-markdown", {
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

function getLinkAttributes(mark: EditorMark) {
  return {
    href: mark.attrs?.href ?? "",
    title: mark.attrs?.title,
  }
}

function renderLineBreaks(text: string) {
  const lines = text.split("\n")
  return lines.flatMap((line, index) =>
    index === 0 ? [line] : [<br key={index} />, line]
  )
}

function wrapInMark(
  content: React.ReactNode,
  mark: EditorMark,
  components: MarkdownComponents | undefined
) {
  switch (mark.type) {
    case "bold":
      return (
        <strong data-slot="markdown-strong" className="cn-markdown-strong">
          {content}
        </strong>
      )
    case "italic":
      return <em data-slot="markdown-emphasis">{content}</em>
    case "strike":
      return (
        <s data-slot="markdown-strike" className="cn-markdown-strike">
          {content}
        </s>
      )
    case "code":
      return (
        <code data-slot="markdown-code" className="cn-markdown-code">
          {content}
        </code>
      )
    case "link": {
      const Link = components?.a ?? "a"
      return (
        <Link
          data-slot="markdown-link"
          className="cn-markdown-link"
          {...getLinkAttributes(mark)}
        >
          {content}
        </Link>
      )
    }
    default:
      return (
        <span data-slot="markdown-mark" data-mark={mark.type}>
          {content}
        </span>
      )
  }
}

/** Runs of marked text: each run wrapped in its marks, link outermost. */
function MarkdownInline({
  runs,
  components,
}: {
  runs: readonly EditorInline[]
  components?: MarkdownComponents
}) {
  return runs.map((run, index) => {
    if (run.raw) {
      return (
        <span key={index} data-slot="markdown-raw" className="cn-markdown-raw">
          {run.text}
        </span>
      )
    }
    const marks = run.marks ?? []
    const content = marks.reduceRight<React.ReactNode>(
      (inner, mark) => wrapInMark(inner, mark, components),
      renderLineBreaks(run.text)
    )
    return <React.Fragment key={index}>{content}</React.Fragment>
  })
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const

/** The file name a fence names in its info string: ```ts title="app.ts". */
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

function MarkdownTable({
  block,
  components,
}: {
  block: EditorBlock
  components?: MarkdownComponents
}) {
  const [header = [], ...body] = getTableRows(block)
  const align = getTableAlign(block)
  return (
    <div data-slot="markdown-table" className="cn-markdown-table">
      <table>
        <thead>
          <tr>
            {header.map((cell, column) => (
              <th
                key={column}
                data-align={align[column] ?? undefined}
                className="cn-markdown-table-head"
              >
                <MarkdownInline runs={cell} components={components} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="cn-markdown-table-row">
              {row.map((cell, column) => (
                <td
                  key={column}
                  data-align={align[column] ?? undefined}
                  className="cn-markdown-table-cell"
                >
                  <MarkdownInline runs={cell} components={components} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarkdownBlock({
  block,
  components,
}: {
  block: EditorBlock
  components?: MarkdownComponents
}) {
  const inline = <MarkdownInline runs={block.content} components={components} />
  switch (block.type) {
    case "heading": {
      const level = getHeadingLevel(block)
      const Heading = HEADINGS[level - 1]
      return (
        <Heading
          data-slot="markdown-heading"
          data-level={level}
          className="cn-markdown-heading"
        >
          {inline}
        </Heading>
      )
    }
    case "quote":
      return (
        <blockquote data-slot="markdown-quote" className="cn-markdown-quote">
          <p>{inline}</p>
        </blockquote>
      )
    case "code":
      return <MarkdownCodeBlock block={block} />
    case "divider":
      return <hr data-slot="markdown-divider" className="cn-markdown-divider" />
    case "image": {
      const Image = components?.img ?? "img"
      return (
        <Image
          data-slot="markdown-image"
          className="cn-markdown-image"
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
        <pre data-slot="markdown-raw" className="cn-markdown-raw-block">
          {getRunsText(block.content)}
        </pre>
      )
    default:
      return (
        <p data-slot="markdown-paragraph" className="cn-markdown-paragraph">
          {inline}
        </p>
      )
  }
}

/** The check inside a task's box: hidden until the box is checked. */
function MarkdownTaskCheck() {
  return (
    <IconPlaceholder
      lucide="CheckIcon"
      tabler="IconCheck"
      hugeicons="Tick02Icon"
      phosphor="CheckIcon"
      remixicon="RiCheckLine"
      aria-hidden="true"
      className="cn-markdown-task-check"
    />
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
    return <MarkdownInline runs={block.content} components={components} />
  }
  const isChecked = isTaskChecked(block)
  return (
    <>
      <span
        role="checkbox"
        aria-checked={isChecked}
        aria-readonly="true"
        aria-label={isChecked ? "Done" : "Not done"}
        data-slot="markdown-task-checkbox"
        data-checked={isChecked || undefined}
        className="cn-markdown-task-checkbox group/task-check"
      >
        <MarkdownTaskCheck />
      </span>
      <span
        data-slot="markdown-task-text"
        data-checked={isChecked || undefined}
        className="cn-markdown-task-text"
      >
        <MarkdownInline runs={block.content} components={components} />
      </span>
    </>
  )
}

function MarkdownNodes({
  nodes,
  components,
}: {
  nodes: readonly MarkdownTreeNode[]
  components?: MarkdownComponents
}) {
  return nodes.map((node) => {
    if (node.kind === "block") {
      return (
        <MarkdownBlock
          key={node.block.id}
          block={node.block}
          components={components}
        />
      )
    }
    const List = node.ordered ? "ol" : "ul"
    return (
      <List
        key={node.items[0]?.block.id}
        data-slot="markdown-list"
        data-ordered={node.ordered}
        start={node.ordered && node.start !== 1 ? node.start : undefined}
        className="cn-markdown-list"
      >
        {node.items.map(({ block, children }) => (
          <li
            key={block.id}
            data-slot="markdown-list-item"
            data-task={block.type === "task" || undefined}
            data-checked={isTaskChecked(block) || undefined}
            className="cn-markdown-list-item"
          >
            <MarkdownListItemContent block={block} components={components} />
            <MarkdownNodes nodes={children} components={components} />
          </li>
        ))}
      </List>
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
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** The Markdown to show. */
  children: string
  size?: MarkdownSize
  /** Replace how links or images render. */
  components?: MarkdownComponents
  /** Extra block syntax, the same kits the Editor takes. */
  syntax?: readonly MarkdownSyntax[]
}) {
  const document = parseMarkdown(children, { syntax })
  return (
    <div
      data-slot="markdown"
      data-size={size}
      className={cn(markdownVariants({ size }), className)}
      {...props}
    >
      <MarkdownNodes
        nodes={getMarkdownTree(document.blocks)}
        components={components}
      />
    </div>
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
