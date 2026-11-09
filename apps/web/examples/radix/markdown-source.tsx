import { Markdown } from "@/styles/radix-fabricator/ui/markdown"

const text = `Anything the parser doesn't model stays visible as its source:

<details>
<summary>Release checklist</summary>

Run the corpus.
</details>

A footnote reference[^1] and inline <kbd>HTML</kbd> too.

[^1]: Footnotes arrive in a later release.`

export function MarkdownSource() {
  return <Markdown className="w-full max-w-xl">{text}</Markdown>
}
