import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/styles/radix-fabricator/ui/syntax-highlight"

const code = Array.from(
  { length: 40 },
  (_, index) =>
    `  { id: ${index + 1}, email: "member${index + 1}@fabricator.dev", role: "${index % 4 === 0 ? "admin" : "member"}" },`
)
  .join("\n")
  .replace(/^/, "export const members = [\n")
  .concat("\n]")

export function SyntaxHighlightScroll() {
  return (
    <SyntaxHighlight
      code={code}
      filename="members.ts"
      className="w-full max-w-2xl"
    >
      <SyntaxHighlightHeader>
        <SyntaxHighlightIcon />
        <SyntaxHighlightTitle />
        <SyntaxHighlightCopy />
      </SyntaxHighlightHeader>
      <SyntaxHighlightContent showLineNumbers className="max-h-72" />
    </SyntaxHighlight>
  )
}
