import { FABRICATOR_STYLES } from "@/registry/fabricator"

// The style the website renders. Docs pages name upstream's default styles
// (`base-nova`, and `base-rhea` for chat demos); the site shows the
// Fabricator style for the same base instead, so previews and code match
// what `fabricator-ui add` installs. Other style ids (e.g. `new-york-v4`
// blocks and charts) render as written.
export const SITE_STYLE = FABRICATOR_STYLES[0].name

const MAPPED_STYLE = /^(base|radix|aria)-(nova|rhea)$/

export function toSiteStyle(styleName: string) {
  const match = MAPPED_STYLE.exec(styleName)
  return match ? `${match[1]}-${SITE_STYLE}` : styleName
}

// Style used by the blocks gallery and block screenshots.
export const SITE_BLOCK_STYLE = `base-${SITE_STYLE}` as const

// Styles rendered from raw base sources (placeholders resolved by the
// `.style-<name>` rules in app/style-registry.css) instead of compiled output.
export function getRawStyleClass(styleName: string) {
  const match = /^(base|radix|aria)-(.+)$/.exec(styleName)
  return match && match[2] === SITE_STYLE ? `style-${match[2]}` : null
}
