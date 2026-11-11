import { Markdown } from "@/styles/radix-fabricator/ui/markdown"

const notes = `## Release notes

Fabricator **0.6** brings a *Markdown* preview and an editor that writes it back. Read the [changelog](https://fabricator-ui.vercel.app/docs/changelog) for the rest.

- Headings, lists and \`inline code\`
- Tables and task lists
  - Nested items keep their place

> Unedited files save byte for byte.

\`\`\`ts
import { Markdown } from "@/components/ui/markdown"
\`\`\`

- [x] Parser
- [ ] Native editor
`

export function MarkdownDocument() {
  return <Markdown className="w-full max-w-xl">{notes}</Markdown>
}
