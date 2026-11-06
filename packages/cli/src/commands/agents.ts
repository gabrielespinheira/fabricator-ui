import { existsSync } from "node:fs"
import path from "node:path"
import {
  ASSISTANT_VALUES,
  getAssistantLabel,
  type Assistant,
} from "@fabricator-ui/setup"
import { Command } from "commander"

import { writeSkill } from "../setup/skill"
import { highlight, logger } from "../utils/logger"
import { findWorkspaceRoot } from "../utils/workspace"
import { writeMcpConfigs } from "./mcp"
import { fail, resolveCwd } from "./shared"

function parseAssistants(values: string[]): Assistant[] {
  return values
    .flatMap((value) => value.split(","))
    .map((value) => {
      const assistant = ASSISTANT_VALUES.find((name) => name === value)
      if (!assistant) {
        throw new Error(
          `Unknown assistant "${value}". Use one of: ${ASSISTANT_VALUES.join(", ")}.`
        )
      }
      return assistant
    })
}

/** Where a monorepo's MCP server finds a components.json. */
function getAppDir(cwd: string) {
  if (findWorkspaceRoot(cwd) !== cwd) return undefined
  return existsSync(path.join(cwd, "apps/web/components.json"))
    ? "apps/web"
    : undefined
}

export function createAgentsCommand(): Command {
  const agents = new Command("agents").description(
    "set up AI assistants: the agent skill and the MCP server"
  )
  agents
    .command("add")
    .description("set up one or more assistants in this project")
    .argument("<assistants...>", ASSISTANT_VALUES.join(", "))
    .option("--no-skill", "don't install the agent skill")
    .option("--no-mcp", "don't configure the MCP server")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(
      (
        values: string[],
        options: { skill?: boolean; mcp?: boolean; cwd?: string }
      ) => {
        try {
          const cwd = resolveCwd(options.cwd)
          const assistants = parseAssistants(values)
          if (options.skill !== false) {
            for (const directory of writeSkill(cwd, assistants)) {
              logger.success(`Wrote the skill to ${highlight.info(directory)}.`)
            }
          }
          if (options.mcp !== false) {
            for (const file of writeMcpConfigs(
              cwd,
              assistants,
              getAppDir(cwd)
            )) {
              logger.success(
                `Configured the MCP server in ${highlight.info(file)}.`
              )
            }
          }
          logger.log(
            `Set up ${assistants.map(getAssistantLabel).join(" and ")}.`
          )
        } catch (error) {
          fail(error)
        }
      }
    )
  return agents
}
