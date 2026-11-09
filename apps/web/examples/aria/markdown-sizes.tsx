import { Markdown } from "@/styles/aria-fabricator/ui/markdown"

const text = `### Weekly sync

Ship the **editor** preview, then review *native* input on Friday.`

export function MarkdownSizes() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <Markdown size="sm">{text}</Markdown>
      <Markdown>{text}</Markdown>
      <Markdown size="lg">{text}</Markdown>
    </div>
  )
}
