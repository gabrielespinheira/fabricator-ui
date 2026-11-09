import { Example, ExampleWrapper } from "@/examples/native/example"

import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightLanguage,
  SyntaxHighlightTitle,
} from "@/registry/native/ui/syntax-highlight"

const badge = `import { cn } from "@/lib/utils"

// Every look lives in the style map.
export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn("cn-badge inline-flex", className)}
      {...props}
    />
  )
}`

const manifest = `{
  "name": "acme-dashboard",
  "private": true,
  "dependencies": { "fabricator-ui": "^0.6.0" }
}`

const workflow = `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: bun install && bun run test`

const seed = `@dataclass
class Member:
    email: str
    is_admin: bool = False

def seed() -> list[Member]:
    return [Member("gabs@fabricator.dev", True)]`

const patch = `@@ -1,4 +1,4 @@
 {
-  "version": "0.5.1",
+  "version": "0.6.0",
 }`

const message = `const message = "Long lines wrap at the panel's edge instead of scrolling sideways."`

function SyntaxHighlightExample() {
  return (
    <ExampleWrapper>
      <Example title="File">
        <SyntaxHighlight code={badge} filename="components/ui/badge.tsx">
          <SyntaxHighlightHeader>
            <SyntaxHighlightIcon />
            <SyntaxHighlightTitle />
            <SyntaxHighlightCopy />
          </SyntaxHighlightHeader>
          <SyntaxHighlightContent showLineNumbers highlightLines={[[6, 7]]} />
        </SyntaxHighlight>
      </Example>
      <Example title="Languages">
        {[
          { filename: "package.json", code: manifest },
          { filename: ".github/workflows/ci.yml", code: workflow },
          { filename: "seed.py", code: seed },
        ].map((file) => (
          <SyntaxHighlight
            key={file.filename}
            code={file.code}
            filename={file.filename}
          >
            <SyntaxHighlightHeader>
              <SyntaxHighlightIcon />
              <SyntaxHighlightTitle />
              <SyntaxHighlightLanguage />
              <SyntaxHighlightCopy />
            </SyntaxHighlightHeader>
            <SyntaxHighlightContent />
          </SyntaxHighlight>
        ))}
      </Example>
      <Example title="Diff">
        <SyntaxHighlight code={patch} language="diff" filename="package.json">
          <SyntaxHighlightHeader>
            <SyntaxHighlightIcon />
            <SyntaxHighlightTitle />
          </SyntaxHighlightHeader>
          <SyntaxHighlightContent />
        </SyntaxHighlight>
      </Example>
      <Example title="Wrapping">
        <SyntaxHighlight code={message} language="js">
          <SyntaxHighlightContent showLineNumbers wrap />
        </SyntaxHighlight>
      </Example>
      <Example title="Command">
        <SyntaxHighlight
          code="npx fabricator-ui@latest add syntax-highlight"
          language="bash"
          className="flex-row items-center pe-1"
        >
          <SyntaxHighlightContent className="flex-1" />
          <SyntaxHighlightCopy />
        </SyntaxHighlight>
      </Example>
    </ExampleWrapper>
  )
}

export { SyntaxHighlightExample }
