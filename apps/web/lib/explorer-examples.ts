export type ExplorerExample = { name: string; title: string }

/** Read the examples explicitly showcased by a component's documentation. */
export function getExplorerExamples(raw: string): ExplorerExample[] {
  const content = raw.replace(/^```[^\n]*\n[\s\S]*?^```/gm, "")
  const entries: ExplorerExample[] = []
  let title = "Overview"
  for (const match of content.matchAll(
    /^#{2,3} (.+)$|<ComponentPreview\b[^>]*\bname="([^"]+)"[^>]*\/?\s*>/gm
  )) {
    if (match[1]) {
      title = match[1]
      continue
    }
    const name = match[2]
    if (name && !entries.some((entry) => entry.name === name))
      entries.push({ name, title })
  }
  return entries
}
