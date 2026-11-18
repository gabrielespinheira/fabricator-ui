// Component pages laid out at app width: the docs shell gives them its large
// column, the prose stays at the usual width, and previews marked `wide`
// take the rest (app/fabricator-site.css).
const WIDE_COMPONENTS: ReadonlySet<string> = new Set(["event-calendar"])

const COMPONENT_PAGE = /^\/docs\/components\/[a-z]+\/([a-z0-9-]+)$/

export function isWideDocsPage(url: string) {
  const name = COMPONENT_PAGE.exec(url)?.[1]
  return name !== undefined && WIDE_COMPONENTS.has(name)
}
