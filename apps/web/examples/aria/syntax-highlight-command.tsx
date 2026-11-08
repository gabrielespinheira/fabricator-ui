import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
} from "@/styles/aria-fabricator/ui/syntax-highlight"

const command = "npx fabricator-ui@latest add syntax-highlight"

export function SyntaxHighlightCommand() {
  return (
    <SyntaxHighlight
      code={command}
      language="bash"
      className="w-full max-w-md flex-row items-center pe-1"
    >
      <SyntaxHighlightContent className="flex-1" />
      <SyntaxHighlightCopy />
    </SyntaxHighlight>
  )
}
