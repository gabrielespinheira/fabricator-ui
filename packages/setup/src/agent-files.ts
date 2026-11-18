// Where an assistant's skill and MCP server go, from the project root. The CLI
// writes them there and the page's tree shows them.

import type { Assistant } from "./setup"

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
 * Adds Fabricator's block to a project's AGENTS.md, or refreshes it in place,
 * and leaves everything else (such as the block Next.js writes) as it was.
 */
export function mergeAgentInstructions(
  existing: string | undefined,
  instructions: string
) {
  const block = `${BEGIN}\n${instructions}\n${END}`
  if (!existing?.trim()) return `# AGENTS.md\n\n${block}\n`
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
