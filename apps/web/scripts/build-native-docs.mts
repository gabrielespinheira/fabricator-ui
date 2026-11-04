import { existsSync, promises as fs } from "fs"
import path from "path"

import { nativeItems } from "@/registry/native/_registry"
import {
  NATIVE_DIFFERENCES,
  NATIVE_TIER_LABELS,
} from "@/registry/native/differences"

import {
  getPartsList,
  getPropsList,
  getRoles,
  getUsageImports,
  getUsageSnippet,
  getVariantsTable,
  toReaderSource,
  toTitleCase,
} from "./native-docs"
import { readComponentShape } from "./native-parity"

/*
 * Writes content/docs/components/native/*.mdx and the compatibility table from
 * the native source, demos and registry/native/differences.ts, so a page can't
 * describe props the component doesn't have. Rerun after changing a native item:
 * `bun run native:docs`.
 */

const ROOT = process.cwd()
const PAGES_DIR = path.join(ROOT, "content/docs/components/native")
const PREVIEW_DIR = path.join(ROOT, "public/images/native")

const FROM_WEB_DESCRIPTION = /^description:\s*(.+)$/m

async function getDescription(name: string, fallback?: string) {
  const webPage = path.join(ROOT, `content/docs/components/base/${name}.mdx`)
  if (existsSync(webPage)) {
    const match = FROM_WEB_DESCRIPTION.exec(await fs.readFile(webPage, "utf8"))
    if (match) return match[1]
  }
  return JSON.stringify(fallback ?? `${toTitleCase(name)} for React Native.`)
}

async function buildPage(item: (typeof nativeItems)[number]) {
  const { name } = item
  const source = await fs.readFile(
    path.join(ROOT, `registry/native/ui/${name}.tsx`),
    "utf8"
  )
  const demoPath = path.join(ROOT, `examples/native/${name}-example.tsx`)
  const demo = existsSync(demoPath) ? await fs.readFile(demoPath, "utf8") : null
  const shape = readComponentShape(source)
  const difference = NATIVE_DIFFERENCES[name]
  const parts = getPartsList(shape)
  const variants = getVariantsTable(shape)
  const props = getPropsList(shape)
  const roles = getRoles(source)
  const snippet = demo ? getUsageSnippet(demo) : null
  const imports = demo ? getUsageImports(demo) : ""
  const hasPreview = existsSync(path.join(PREVIEW_DIR, `${name}.jpg`))

  const sections = [
    `---
title: ${item.title ?? toTitleCase(name)}
description: ${await getDescription(name, item.description)}
base: native
component: true
---`,
    hasPreview
      ? `<NativePreview src="/images/native/${name}.jpg" alt="${item.title ?? name} on iOS" />`
      : null,
    `## Installation

\`\`\`bash
npx fabricator-ui@latest add ${name}
\`\`\``,
    snippet
      ? `## Usage

\`\`\`tsx
${imports}
\`\`\`

\`\`\`tsx
${snippet}
\`\`\``
      : null,
    parts.length > 1
      ? `## Composition

${parts.map((part) => `- \`${part}\``).join("\n")}`
      : null,
    demo
      ? `## Examples

\`\`\`tsx showLineNumbers title="${name}-example.tsx"
${toReaderSource(demo).trimEnd()}
\`\`\``
      : null,
    variants || props.length > 0
      ? `## API reference

${variants ?? ""}

${props.length > 0 ? `Props it adds to what it wraps: ${props.map((prop) => `\`${prop}\``).join(", ")}.` : ""}`.trimEnd()
      : null,
    difference
      ? `## Differences from web

**${NATIVE_TIER_LABELS[difference.tier]}.** ${difference.note ?? "It works as it does on the web, with `onPress` for `onClick`."}`
      : null,
    `## Accessibility

${roles.length > 0 ? `Parts set ${roles.map((role) => `\`role="${role}"\``).join(", ")}, read by VoiceOver and TalkBack.` : "Text is read as it appears."} Give a control with no text an \`accessibilityLabel\`.`,
  ]
  await fs.writeFile(
    path.join(PAGES_DIR, `${name}.mdx`),
    `${sections.filter(Boolean).join("\n\n")}\n`
  )
}

async function buildCompatibilityPage(names: string[]) {
  const rows = names
    .filter((name) => NATIVE_DIFFERENCES[name])
    .map((name) => {
      const { tier, note } = NATIVE_DIFFERENCES[name]
      return `| [${toTitleCase(name)}](/docs/components/native/${name}) | ${NATIVE_TIER_LABELS[tier]} | ${note ?? ""} |`
    })
  await fs.writeFile(
    path.join(ROOT, "content/docs/installation/react-native-differences.mdx"),
    `---
title: React Native differences
description: What each React Native component does differently from its web version, and why.
---

Every component has a React Native version with the same name, exports, variants, sizes and tokens. A check in the repo compares them, so this table is the complete list of differences.

Across all of them: \`onPress\` replaces \`onClick\`, \`hover:\` styles become \`active:\`, and text goes through \`Text\`, since React Native has no cascade. A screen written for the web won't run on native unchanged, because \`<div>\` and \`<span>\` don't exist there.

- **Same**: the same use.
- **Touch input**: the same API, with a touch gesture in place of a web input.
- **New engine**: the same API, with a DOM-only library replaced underneath.
- **Kept for imports**: exists so code compiles, and does nothing.

Interface sounds are haptic on React Native, under the same \`<SoundEffects />\`.

| Component | Kind | What's different |
| --- | --- | --- |
${rows.join("\n")}
`
  )
}

async function main() {
  await fs.mkdir(PAGES_DIR, { recursive: true })
  const items = nativeItems.filter((item) =>
    existsSync(path.join(ROOT, `registry/native/ui/${item.name}.tsx`))
  )
  await Promise.all(items.map(buildPage))
  const names = items.map((item) => item.name).sort()
  await fs.writeFile(
    path.join(PAGES_DIR, "meta.json"),
    `${JSON.stringify({ title: "React Native", pages: names }, null, 2)}\n`
  )
  await buildCompatibilityPage(names)
  console.log(`✅ Native docs: ${items.length} pages`)
}

await main()
