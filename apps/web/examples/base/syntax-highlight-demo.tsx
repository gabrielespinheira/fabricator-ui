import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/styles/base-fabricator/ui/syntax-highlight"

const code = `import { cn } from "@/lib/utils"

// Every look lives in the style map; the source only names it.
export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: "default" | "outline" }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn("cn-badge inline-flex items-center", className)}
      {...props}
    />
  )
}`

export function SyntaxHighlightDemo() {
  return (
    <SyntaxHighlight
      code={code}
      filename="components/ui/badge.tsx"
      className="w-full max-w-2xl"
    >
      <SyntaxHighlightHeader>
        <SyntaxHighlightIcon />
        <SyntaxHighlightTitle />
        <SyntaxHighlightCopy />
      </SyntaxHighlightHeader>
      <SyntaxHighlightContent showLineNumbers highlightLines={[[10, 13]]} />
    </SyntaxHighlight>
  )
}
