import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { confirm, isCancel } from "@clack/prompts"
import { Command } from "commander"
import { z } from "zod"

import { writeSkill } from "../setup/skill"
import { highlight, logger } from "../utils/logger"
import { captureShadcn, exitLike, runShadcn } from "../utils/shadcn"
import { fail, requireComponentsJson, resolveCwd } from "./shared"

const installedItemsSchema = z.object({
  components: z.array(z.unknown()).optional(),
})

export function parseInstalledItems(stdout: string): string[] {
  const { components = [] } = installedItemsSchema.parse(JSON.parse(stdout))
  return components.filter((name): name is string => typeof name === "string")
}

export function buildUpgradeArgs(
  items: string[],
  options: { cwd: string; dryRun?: boolean }
) {
  return [
    "add",
    ...items.map((name) => `@fabricator/${name}`),
    ...(options.dryRun ? ["--dry-run"] : ["--overwrite"]),
    "--yes",
    "--cwd",
    options.cwd,
  ]
}

function isGitDirty(cwd: string) {
  try {
    return (
      execFileSync("git", ["status", "--porcelain"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() !== ""
    )
  } catch {
    return false
  }
}

async function upgrade(
  names: string[],
  options: { cwd?: string; yes?: boolean; dryRun?: boolean; force?: boolean }
) {
  const cwd = resolveCwd(options.cwd)
  requireComponentsJson(cwd)
  let items = names
  if (items.length === 0) {
    const info = await captureShadcn(["info", "--json", "--cwd", cwd])
    if (info.code !== 0)
      throw new Error("Couldn't read the project's components.")
    items = parseInstalledItems(info.stdout)
  }
  if (items.length === 0) {
    logger.log("No components to upgrade.")
    return
  }
  logger.info(`Upgrading ${highlight.info(items.join(", "))}.`)
  if (options.dryRun) {
    exitLike(await runShadcn(buildUpgradeArgs(items, { cwd, dryRun: true })))
    return
  }
  if (isGitDirty(cwd) && !options.force) {
    throw new Error(
      "Upgrading overwrites your component files, and this project has uncommitted work. Commit it first, or pass --force."
    )
  }
  if (!options.yes && process.stdin.isTTY) {
    const isSure = await confirm({
      message:
        "Overwrite these files? Your edits to them will show up as a git diff.",
    })
    if (isCancel(isSure) || !isSure) return
  }
  const result = await runShadcn(buildUpgradeArgs(items, { cwd }))
  if (result.code === 0 && !result.signal) {
    const assistants = [
      ...(existsSync(path.join(cwd, ".claude/skills/fabricator"))
        ? (["claude"] as const)
        : []),
      ...(existsSync(path.join(cwd, ".agents/skills/fabricator"))
        ? (["codex"] as const)
        : []),
    ]
    if (assistants.length > 0) {
      writeSkill(cwd, [...assistants])
      logger.info("Updated the agent skill.")
    }
  }
  exitLike(result)
}

export function createUpgradeCommand(): Command {
  return new Command("upgrade")
    .description(
      "reinstall your Fabricator components at their latest versions"
    )
    .argument("[items...]", "items to upgrade (default: everything installed)")
    .option("-y, --yes", "skip the confirmation")
    .option("-f, --force", "upgrade over uncommitted work")
    .option("--dry-run", "show what would change")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (items: string[], options) => {
      try {
        await upgrade(items, options)
      } catch (error) {
        fail(error)
      }
    })
}
