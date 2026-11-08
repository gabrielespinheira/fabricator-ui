import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightTitle,
} from "@/styles/base-fabricator/ui/syntax-highlight"

const patch = `@@ -1,5 +1,5 @@
 {
   "name": "acme-dashboard",
-  "version": "0.5.1",
+  "version": "0.6.0",
   "private": true
 }`

// A change shown in the file's own language: mark its lines.
const code = `export function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}</p>
  return <p className="text-muted-foreground">Welcome back, {name}</p>
}`

export function SyntaxHighlightDiff() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <SyntaxHighlight code={patch} language="diff" filename="package.json">
        <SyntaxHighlightHeader>
          <SyntaxHighlightIcon />
          <SyntaxHighlightTitle />
          <SyntaxHighlightCopy />
        </SyntaxHighlightHeader>
        <SyntaxHighlightContent />
      </SyntaxHighlight>
      <SyntaxHighlight code={code} filename="greeting.tsx">
        <SyntaxHighlightHeader>
          <SyntaxHighlightIcon />
          <SyntaxHighlightTitle />
        </SyntaxHighlightHeader>
        <SyntaxHighlightContent
          showLineNumbers
          deletedLines={[2]}
          insertedLines={[3]}
        />
      </SyntaxHighlight>
    </div>
  )
}
