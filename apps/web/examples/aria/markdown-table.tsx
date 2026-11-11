import { Markdown } from "@/styles/aria-fabricator/ui/markdown"

const table = `| Component | Web | Native |
| :-------- | :-: | -----: |
| Markdown  | Yes | Yes    |
| Editor    | Yes | Soon   |
| Tables    | Yes | Yes    |`

export function MarkdownTable() {
  return <Markdown className="w-full max-w-xl">{table}</Markdown>
}
