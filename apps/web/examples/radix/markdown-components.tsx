import { Markdown } from "@/styles/radix-fabricator/ui/markdown"

const text = `Links can go through your router: open [Settings](/settings) or the [docs](https://fabricator-ui.vercel.app).`

function AppLink({ href = "", ...props }: React.ComponentProps<"a">) {
  const isExternal = href.startsWith("http")
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      {...props}
    />
  )
}

export function MarkdownComponents() {
  return (
    <Markdown className="w-full max-w-xl" components={{ a: AppLink }}>
      {text}
    </Markdown>
  )
}
