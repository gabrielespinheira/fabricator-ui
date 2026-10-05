/**
 * Rebrand upstream demo content.
 *
 * Upstream examples, blocks and demo apps use shadcn's own identity as sample
 * data (avatar, handle, email, repo URLs, links to ui.shadcn.com). These rules
 * replace it with Fabricator's. Technical identifiers stay untouched: npm
 * packages (`shadcn`, `@shadcn/react`, `shadcn/tailwind.css`, `shadcn/schema`)
 * and the shadcn CLI.
 *
 * The same rules are applied to upstream content by `test:parity`, so parity
 * still proves that everything else matches ui.shadcn.com.
 *
 * Usage:
 *   bun run rebrand           # rewrite source files, then prettier-format them
 *   bun run rebrand --check   # list files that still need rebranding (exit 1)
 *
 * Run it after every `sync:upstream` merge.
 */
import fs from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const WEB = path.join(ROOT, "apps/web")

type Rule = [RegExp, string]

// Sample identity used in demos. Safe in any file, including docs.
export const DEMO_RULES: Rule[] = [
  [/https:\/\/github\.com\/shadcn\.png/g, "https://github.com/gabrielespinheira.png"],
  [/\/avatars\/shadcn\.jpg/g, "https://github.com/gabrielespinheira.png"],
  [/https:\/\/avatar\.vercel\.sh\/shadcn/g, "https://avatar.vercel.sh/fabricator"],
  [/shadcn@(?:vercel|example)\.com/g, "gabriel@example.com"],
  [/https:\/\/x\.com\/shadcn\b/g, "https://github.com/gabrielespinheira"],
  [/@shadcn(?![\w/-])/g, "@gabrielespinheira"],
  [/alt="[Ss]hadcn"/g, 'alt="@gabrielespinheira"'],
  [/Morning, shadcn!/g, "Morning, Gabriel!"],
  [/\b(name|title): "shadcn"/g, '$1: "Gabriel"'],
  [/\busername: "shadcn"/g, 'username: "gabrielespinheira"'],
  [/\b(defaultValue|placeholder)="shadcn"/g, '$1="gabrielespinheira"'],
  [/>shadcn</g, ">Gabriel<"],
  [/^(\s*)"shadcn",$/gm, '$1"gabrielespinheira",'],
  [/^(\s*)shadcn$/gm, "$1Gabriel"],
]

// Links and product names in demo code. Not applied to docs content, which
// links to upstream docs on purpose (e.g. the @shadcn/react package docs).
export const CODE_RULES: Rule[] = [
  [/git@github\.com:shadcn-ui\/ui\.git/g, "git@github.com:gabrielespinheira/fabricator-ui.git"],
  [/https:\/\/github\.com\/shadcn-ui\/ui\.git/g, "https://github.com/gabrielespinheira/fabricator-ui.git"],
  [/gh repo clone shadcn-ui\/ui\b/g, "gh repo clone gabrielespinheira/fabricator-ui"],
  [/https:\/\/ui\.shadcn\.com\/code\/apps\/v4\//g, "https://fabricator-ui.com/code/apps/web/"],
  [/https:\/\/ui\.shadcn\.com(?!\/schema)/g, "https://fabricator-ui.com"],
  [/\bui\.shadcn\.com\/docs\b/g, "fabricator-ui.com/docs"],
  [/(title|name): "shadcn\/ui"/g, '$1: "Fabricator UI"'],
  [/>shadcn\/ui</g, ">Fabricator UI<"],
  [/^(\s*)shadcn\/ui$/gm, "$1Fabricator UI"],
  [/aria-label="Open shadcn\/ui"/g, 'aria-label="Open Fabricator UI"'],
]

export function rebrandCode(source: string) {
  return [...DEMO_RULES, ...CODE_RULES].reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    source
  )
}

export function rebrandDocs(source: string) {
  return DEMO_RULES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    source
  )
}

const TARGETS = [
  { dir: "registry/bases", rebrand: rebrandCode },
  { dir: "registry/new-york-v4", rebrand: rebrandCode },
  { dir: "examples", rebrand: rebrandCode },
  { dir: "app/(app)/examples", rebrand: rebrandCode },
  { dir: "content/docs", rebrand: rebrandDocs },
]
const EXTENSIONS = new Set([".ts", ".tsx", ".mdx"])
const SKIPPED = /(^|\/)(__index__|__components__)/

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return listFiles(fullPath)
      return EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : []
    })
  )
  return files.flat()
}

async function main() {
  const check = process.argv.includes("--check")
  const changed: string[] = []

  for (const target of TARGETS) {
    for (const file of await listFiles(path.join(WEB, target.dir))) {
      if (SKIPPED.test(path.relative(WEB, file))) continue
      const source = await fs.readFile(file, "utf8")
      const rebranded = target.rebrand(source)
      if (rebranded === source) continue
      changed.push(file)
      if (!check) await fs.writeFile(file, rebranded)
    }
  }

  if (check) {
    if (changed.length) {
      console.error(
        `✖ ${changed.length} files need rebranding (run \`bun run rebrand\`):\n  ${changed.map((file) => path.relative(ROOT, file)).join("\n  ")}`
      )
      process.exit(1)
    }
    console.log("✅ Demo content is rebranded.")
    return
  }

  if (changed.length) {
    // Longer strings can change line wrapping; keep files prettier-clean.
    const prettier = await import("prettier")
    for (const file of changed) {
      const options = await prettier.resolveConfig(file)
      const source = await fs.readFile(file, "utf8")
      await fs.writeFile(
        file,
        await prettier.format(source, { ...options, filepath: file })
      )
    }
  }
  console.log(`✅ Rebranded ${changed.length} files.`)
}

if (import.meta.main) {
  await main()
}
