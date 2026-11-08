import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/styles/aria-fabricator/ui/syntax-highlight"

const code = `import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SaveButton({ isSaving }: { isSaving: boolean }) {
  return (
    <Button disabled={isSaving}>
      {isSaving ? <Spinner data-icon="inline-start" /> : null}
      Save changes
    </Button>
  )
}`

export function SyntaxHighlightHighlightLines() {
  return (
    <SyntaxHighlight
      code={code}
      filename="save-button.tsx"
      className="w-full max-w-2xl"
    >
      <SyntaxHighlightHeader>
        <SyntaxHighlightIcon />
        <SyntaxHighlightTitle />
        <SyntaxHighlightCopy />
      </SyntaxHighlightHeader>
      <SyntaxHighlightContent showLineNumbers highlightLines={[2, [6, 7]]} />
    </SyntaxHighlight>
  )
}
