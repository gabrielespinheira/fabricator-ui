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

/** A monorepo's root has no components.json: the server reads the app's. */
function mcpCommand(appDir?: string) {
  return appDir ? [...MCP_COMMAND, "-c", appDir] : [...MCP_COMMAND]
}

export const MCP_CLIENTS = {
  claude: { label: "Claude Code", configPath: ".mcp.json" },
  cursor: { label: "Cursor", configPath: ".cursor/mcp.json" },
  vscode: { label: "VS Code", configPath: ".vscode/mcp.json" },
  codex: { label: "Codex", configPath: ".codex/config.toml" },
  opencode: { label: "OpenCode", configPath: "opencode.json" },
} as const

export type McpClient = keyof typeof MCP_CLIENTS

export function isMcpClient(value: unknown): value is McpClient {
  return typeof value === "string" && value in MCP_CLIENTS
}

type JsonObject = Record<string, unknown>

/** The server entry each client expects, keyed the way its config file nests it. */
export function buildMcpServerConfig(
  client: Exclude<McpClient, "codex">,
  appDir?: string
) {
  const [command = "npx", ...args] = mcpCommand(appDir)
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
            command: mcpCommand(appDir),
            enabled: true,
          },
        },
      }
  }
}

function buildCodexConfig(appDir?: string) {
  const [command, ...args] = mcpCommand(appDir)
  return `[mcp_servers.${MCP_SERVER_NAME}]
command = "${command}"
args = [${args.map((arg) => `"${arg}"`).join(", ")}]
`
}

export const CODEX_CONFIG = buildCodexConfig()

/** Adds the server to Codex's project config, leaving everything else as it is. */
export function mergeCodexConfig(existing: string, appDir?: string) {
  if (existing.includes(`[mcp_servers.${MCP_SERVER_NAME}]`)) return existing
  const block = buildCodexConfig(appDir)
  return existing.trim() ? `${existing.trimEnd()}\n\n${block}` : block
}

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

function writeCodexConfig(cwd: string, appDir?: string) {
  const configPath = path.join(cwd, MCP_CLIENTS.codex.configPath)
  const existing = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf8")
    : ""
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, mergeCodexConfig(existing, appDir))
  return MCP_CLIENTS.codex.configPath
}

function writeClientConfig(
  cwd: string,
  client: Exclude<McpClient, "codex">,
  appDir?: string
) {
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
      mergeMcpConfig(existing, buildMcpServerConfig(client, appDir)),
      null,
      2
    ) + "\n"
  )
  return MCP_CLIENTS[client].configPath
}

/** Writes each client's config. Returns the files, for the summary. */
export function writeMcpConfigs(
  cwd: string,
  clients: McpClient[],
  appDir?: string
) {
  return clients.map((client) =>
    client === "codex"
      ? writeCodexConfig(cwd, appDir)
      : writeClientConfig(cwd, client, appDir)
  )
}

/** `claude,codex`, or a question when no client is given. */
async function resolveClients(value: string | undefined): Promise<McpClient[]> {
  if (value !== undefined) {
    return value.split(",").map((client) => {
      if (!isMcpClient(client)) {
        throw new Error(
          `Unknown client "${client}". Use one of: ${Object.keys(MCP_CLIENTS).join(", ")}.`
        )
      }
      return client
    })
  }
  return [
    await promptSelect<McpClient>(
      "Which MCP client are you using?",
      Object.entries(MCP_CLIENTS).map(([client, { label }]) => ({
        title: label,
        value: client as McpClient,
      }))
    ),
  ]
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
      "MCP clients, comma-separated: claude, cursor, vscode, codex, opencode"
    )
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (options: { client?: string; cwd?: string }) => {
      try {
        const cwd = resolveCwd(options.cwd ?? mcp.opts<{ cwd?: string }>().cwd)
        const clients = await resolveClients(options.client)
        for (const configPath of writeMcpConfigs(cwd, clients)) {
          logger.success(
            `Configured the ${highlight.info(MCP_SERVER_NAME)} MCP server in ${highlight.info(configPath)}.`
          )
        }
        if (clients.includes("codex")) {
          logger.info(
            "Codex reads project config once you trust the project: it asks the next time it starts here."
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
