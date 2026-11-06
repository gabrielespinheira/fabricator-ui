// Each assistant's provider, from Fabricator Icons. Copilot has had no logo of its
// own since 2025 (https://github.com/logos), and Codex is OpenAI's.

import type * as React from "react"
import {
  ClaudeIcon,
  CursorIcon,
  GithubIcon,
  OpenaiIcon,
  OpencodeIcon,
} from "@fabricator-ui/icons/brands"

import type { Assistant } from "@/app/(app)/(create)/lib/setup"

export const ASSISTANT_ICONS: Record<
  Assistant,
  React.ComponentType<{ className?: string }>
> = {
  claude: ClaudeIcon,
  cursor: CursorIcon,
  vscode: GithubIcon,
  codex: OpenaiIcon,
  opencode: OpencodeIcon,
}
