import {
  SyntaxHighlight,
  SyntaxHighlightContent,
} from "@/styles/radix-fabricator/ui/syntax-highlight"

// An excerpt numbered from where it sits in the file.
const code = `export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}`

export function SyntaxHighlightLineNumbers() {
  return (
    <SyntaxHighlight code={code} language="ts" className="w-full max-w-xl">
      <SyntaxHighlightContent showLineNumbers startLine={42} />
    </SyntaxHighlight>
  )
}
