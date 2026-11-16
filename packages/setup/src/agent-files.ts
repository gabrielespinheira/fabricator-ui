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
