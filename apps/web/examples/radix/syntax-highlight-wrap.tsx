import {
  SyntaxHighlight,
  SyntaxHighlightContent,
} from "@/styles/radix-fabricator/ui/syntax-highlight"

const code = `const url = "https://fabricator-ui.vercel.app/r/fabricator/base-nova/syntax-highlight.json?icons=fabricator"
const message = "Long lines wrap at the panel's edge instead of scrolling sideways, and a hanging line keeps its number."`

export function SyntaxHighlightWrap() {
  return (
    <SyntaxHighlight code={code} language="js" className="w-full max-w-md">
      <SyntaxHighlightContent showLineNumbers wrap />
    </SyntaxHighlight>
  )
}
