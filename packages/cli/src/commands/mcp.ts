import fs from "node:fs"
import path from "node:path"
import { Command } from "commander"

import { ensureRegistry, readComponentsJson } from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { exitLike, runShadcn } from "../utils/shadcn"
import { fabricatorRegistryTemplate, getBaseUrl } from "../utils/urls"
import { fail, promptSelect, resolveCwd } from "./shared"

export const MCP_SERVER_NAME = "fabricator"
const MCP_COMMAND = ["npx", "fabricator-ui@latest", "mcp"] as const

export const MCP_CLIENTS = {
  claude: { label: "Claude Code", configPath: ".mcp.json" },
  cursor: { label: "Cursor", configPath: ".cursor/mcp.json" },
  vscode: { label: "VS Code", configPath: ".vscode/mcp.json" },
  codex: { label: "Codex", configPath: "~/.codex/config.toml" },
  opencode: { label: "OpenCode", configPath: "opencode.json" },
} as const

export type McpClient = keyof typeof MCP_CLIENTS

export function isMcpClient(value: unknown): value is McpClient {
  return typeof value === "string" && value in MCP_CLIENTS
}

type JsonObject = Record<string, unknown>

/** The server entry each client expects, keyed the way its config file nests it. */
export function buildMcpServerConfig(client: Exclude<McpClient, "codex">) {
  const [command, ...args] = MCP_COMMAND
  switch (client) {
    case "claude":
    case "cursor":
      return { mcpServers: { [MCP_SERVER_NAME]: { command, args } } }
    case "vscode":
      return { servers: { [MCP_SERVER_NAME]: { command, args } } }
    case "opencode":
      return {
        $schema: "https://opencode.ai/config.json",
        mcp: {
          [MCP_SERVER_NAME]: {
            type: "local",
            command: [...MCP_COMMAND],
            enabled: true,
          },
        },
      }
  }
}

export const CODEX_CONFIG = `[mcp_servers.${MCP_SERVER_NAME}]
command = "npx"
args = ["fabricator-ui@latest", "mcp"]
`

/** Adds the Fabricator server to an existing config without touching other servers. */
export function mergeMcpConfig(existing: JsonObject, addition: JsonObject) {
  const merged: JsonObject = { ...existing }
  for (const [key, value] of Object.entries(addition)) {
    const current = merged[key]
    merged[key] =
      isPlainObject(current) && isPlainObject(value)
        ? { ...current, ...value }
        : (current ?? value)
  }
  return merged
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function writeClientConfig(cwd: string, client: Exclude<McpClient, "codex">) {
  const configPath = path.join(cwd, MCP_CLIENTS[client].configPath)
  let existing: JsonObject = {}
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, "utf8")) as JsonObject
    } catch {
      throw new Error(
        `${MCP_CLIENTS[client].configPath} is not valid JSON. Fix it and run the command again.`
      )
    }
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      mergeMcpConfig(existing, buildMcpServerConfig(client)),
      null,
      2
    ) + "\n"
  )
  return MCP_CLIENTS[client].configPath
}

async function resolveClient(client: string | undefined): Promise<McpClient> {
  if (client !== undefined) {
    if (!isMcpClient(client)) {
      throw new Error(
        `Unknown client "${client}". Use one of: ${Object.keys(MCP_CLIENTS).join(", ")}.`
      )
    }
    return client
  }
  return promptSelect<McpClient>(
    "Which MCP client are you using?",
    Object.entries(MCP_CLIENTS).map(([value, { label }]) => ({
      title: label,
      value: value as McpClient,
    }))
  )
}

export function createMcpCommand(): Command {
  const mcp = new Command("mcp")
    .description(
      "run the Fabricator MCP server (browse, search and install @fabricator items)"
    )
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (options: { cwd?: string }) => {
      try {
        // stdout is the MCP transport: never echo anything before the server starts.
        exitLike(
          await runShadcn(["mcp", "--cwd", resolveCwd(options.cwd)], {
            echo: false,
          })
        )
      } catch (error) {
        fail(error)
      }
    })

  mcp
    .command("init")
    .description("configure the Fabricator MCP server for your editor or agent")
    .option(
      "--client <client>",
      "MCP client: claude, cursor, vscode, codex, opencode"
    )
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (options: { client?: string; cwd?: string }) => {
      try {
        const cwd = resolveCwd(options.cwd ?? mcp.opts<{ cwd?: string }>().cwd)
        const client = await resolveClient(options.client)

        if (client === "codex") {
          logger.info(
            `Add this to ${highlight.info(MCP_CLIENTS.codex.configPath)}, then restart Codex:`
          )
          logger.log(`\n${CODEX_CONFIG}`)
        } else {
          const configPath = writeClientConfig(cwd, client)
          logger.success(
            `Configured the ${highlight.info(MCP_SERVER_NAME)} MCP server in ${highlight.info(configPath)}.`
          )
        }

        const ensured = ensureRegistry(
          cwd,
          fabricatorRegistryTemplate(getBaseUrl())
        )
        if (ensured.status === "added") {
          logger.info(
            `Added the ${highlight.info("@fabricator")} registry to components.json.`
          )
        } else if (
          ensured.status === "missing" &&
          !readComponentsJson(cwd).exists
        ) {
          logger.warn(
            `No components.json in ${highlight.info(cwd)}. Run ${highlight.info("fabricator-ui init")} so the MCP server can see @fabricator.`
          )
        }
      } catch (error) {
        fail(error)
      }
    })

  return mcp
}
