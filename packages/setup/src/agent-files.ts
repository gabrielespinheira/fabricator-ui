// Where an assistant's skill and MCP server go, from the project root. The CLI
// writes them there and the page's tree shows them.

import { forPackageManager } from "./cli-args"
import type { Assistant, PackageManager } from "./setup"

/** The project config each assistant reads its MCP servers from. */
export const MCP_CONFIG_PATHS: Record<Assistant, string> = {
  claude: ".mcp.json",
  cursor: ".cursor/mcp.json",
  vscode: ".vscode/mcp.json",
  codex: ".codex/config.toml",
  opencode: "opencode.json",
}

const CLAUDE_SKILL_DIR = ".claude/skills/fabricator"
const SHARED_SKILL_DIR = ".agents/skills/fabricator"

/** Claude Code reads its own folder; the others share `.agents/skills`. */
export function getSkillDirectories(assistants: readonly Assistant[]) {
  return [
    ...(assistants.includes("claude") ? [CLAUDE_SKILL_DIR] : []),
    ...(assistants.some((assistant) => assistant !== "claude")
      ? [SHARED_SKILL_DIR]
      : []),
  ]
}

const BEGIN = "<!-- BEGIN:fabricator-ui -->"
const END = "<!-- END:fabricator-ui -->"

/**
 * Fabricator's block in AGENTS.md. Agents load that file into every session,
 * so it stays short and sends them to DESIGN.md and the skill for the rest.
 */
function getAgentInstructions(packageManager: PackageManager) {
  const cli = (args: string) =>
    forPackageManager(`npx fabricator-ui@latest ${args}`, packageManager)
  return [
    BEGIN,
    "## Fabricator UI",
    "",
    "This project's interface is built with Fabricator UI.",
    "",
    "- Before you design or change a screen, read `DESIGN.md` in full: the look, the grid, cards, dashboards, forms and settings, SaaS features, and which component or control each part of a screen calls for. Its review checklist decides when a screen is done.",
    "- Before you write UI code, load the `fabricator` skill. For a dashboard or any page of cards, start from its `rules/dashboards.md` recipes.",
    `- Reuse the installed components. Add others with \`${cli("add <name>")}\`, and read \`${cli("docs <name>")}\` before using one.`,
    "- Components own their colour, type, size, corners and states: write the layout around them, and never add borders or shadows to surfaces or restyle a component by hand.",
    "- Check every changed screen in the running app: light and dark, phone and desktop widths, keyboard only.",
    END,
  ].join("\n")
}

/**
 * Adds Fabricator's block to a project's AGENTS.md, or refreshes it in place,
 * and leaves everything else (such as the block Next.js writes) as it was.
 */
export function mergeAgentInstructions(
  existing: string | undefined,
  packageManager: PackageManager
) {
  const block = getAgentInstructions(packageManager)
  if (existing === undefined) return `# AGENTS.md\n\n${block}\n`
  const start = existing.indexOf(BEGIN)
  const end = existing.indexOf(END)
  if (start !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + END.length)
  }
  return `${existing.trimEnd()}\n\n${block}\n`
}

const CLAUDE_IMPORT = "@AGENTS.md"

/** Claude Code reads CLAUDE.md, so it imports AGENTS.md to share one set of instructions. */
export function mergeClaudeImport(existing: string | undefined) {
  if (existing === undefined) return `${CLAUDE_IMPORT}\n`
  if (existing.split("\n").some((line) => line.trim() === CLAUDE_IMPORT)) {
    return existing
  }
  return `${existing.trimEnd()}\n\n${CLAUDE_IMPORT}\n`
}
