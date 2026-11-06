// Runs a plan: one line per step, child output in a log file, and the log's tail
// when something fails.

import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { spinner } from "@clack/prompts"
import {
  getNextSteps,
  getPrerequisites,
  normalizeProjectSetup,
  planSetup,
  projectName,
  type PackageManager,
  type PlanStep,
  type ProjectSetup,
} from "@fabricator-ui/setup"

import { highlight, logger } from "../utils/logger"
import { getBaseUrl } from "../utils/urls"
import { INTERACTIVE_STEPS, STEPS, type SetupContext } from "./steps"

export type RunOptions = {
  cwd: string
  packageManager: PackageManager
  dryRun?: boolean
  json?: boolean
  force?: boolean
}

function getPaths(setup: ProjectSetup, cwd: string) {
  const root =
    setup.project === "existing" ? cwd : path.join(cwd, projectName(setup))
  const isMonorepo = setup.project === "monorepo"
  return {
    root,
    webDir: isMonorepo ? path.join(root, "apps/web") : root,
    mobileDir: isMonorepo ? path.join(root, "apps/mobile") : root,
    desktopDir: path.join(root, "apps/desktop"),
  }
}

function printPlan(steps: PlanStep[]) {
  for (const [index, step] of steps.entries()) {
    logger.log(`${highlight.dim(`${index + 1}.`)} ${step.title}`)
    logger.log(`   ${highlight.dim(step.detail)}`)
  }
}

function formatSeconds(milliseconds: number) {
  return `${Math.round(milliseconds / 1000)}s`
}

function printFailure(step: PlanStep, error: unknown, logFile: string) {
  logger.break()
  logger.error(
    `${step.title} failed: ${error instanceof Error ? error.message : String(error)}`
  )
  try {
    const tail = readFileSync(logFile, "utf8").trim().split("\n").slice(-20)
    logger.log(highlight.dim(tail.join("\n")))
  } catch {
    // Nothing was logged yet.
  }
  logger.break()
  logger.log(`Full log: ${highlight.info(logFile)}`)
  logger.log("Run the same command again to pick up where it stopped.")
}

function printSummary(context: SetupContext) {
  const { setup, packageManager, notes } = context
  logger.break()
  logger.success(`${projectName(setup)} is ready.`)
  const prerequisites = getPrerequisites(setup)
  if (prerequisites.length > 0) {
    logger.break()
    logger.log("Before you run it:")
    for (const item of prerequisites) {
      logger.log(`  ${item.title}: ${highlight.dim(item.href)}`)
    }
  }
  if (notes.length > 0) {
    logger.break()
    logger.log("One thing left for you:")
    for (const note of notes) logger.log(`  ${note}`)
  }
  const next = getNextSteps(setup, packageManager)
  if (next.length > 0) {
    logger.break()
    logger.log("Next:")
    for (const step of next) {
      logger.log(`  ${highlight.info(step.code)}  ${highlight.dim(step.label)}`)
    }
  }
}

/** Runs a setup. Sets a failing exit code instead of throwing. */
export async function runSetup(rawSetup: ProjectSetup, options: RunOptions) {
  const setup = normalizeProjectSetup(rawSetup)
  const steps = planSetup(setup)
  const { cwd, packageManager, json } = options

  if (options.dryRun) {
    if (json) {
      logger.log(JSON.stringify({ setup, steps }, null, 2))
    } else {
      printPlan(steps)
    }
    return
  }

  const logFile = path.join(
    mkdtempSync(path.join(tmpdir(), "fabricator-ui-")),
    "setup.log"
  )
  const context: SetupContext = {
    setup,
    cwd,
    ...getPaths(setup, cwd),
    baseUrl: getBaseUrl(),
    packageManager,
    logFile,
    stream: Boolean(process.env.FABRICATOR_VERBOSE),
    force: Boolean(options.force),
    notes: [],
  }
  const results: { id: string; title: string; seconds: number }[] = []
  const useSpinner = Boolean(process.stdout.isTTY) && !json && !context.stream

  for (const step of steps) {
    const startedAt = Date.now()
    const isInteractive = INTERACTIVE_STEPS.includes(step.id)
    const spin = useSpinner && !isInteractive ? spinner() : undefined
    spin?.start(step.title)
    if (!spin && !json) logger.log(step.title)
    try {
      await STEPS[step.id](context)
    } catch (error) {
      spin?.error(step.title)
      if (json) {
        logger.log(
          JSON.stringify(
            {
              ok: false,
              failedStep: step.id,
              error: error instanceof Error ? error.message : String(error),
              logFile,
              steps: results,
            },
            null,
            2
          )
        )
      } else {
        printFailure(step, error, logFile)
      }
      process.exitCode = 1
      return
    }
    const elapsed = Date.now() - startedAt
    results.push({
      id: step.id,
      title: step.title,
      seconds: Math.round(elapsed / 1000),
    })
    spin?.stop(`${step.title} ${highlight.dim(formatSeconds(elapsed))}`)
  }

  if (json) {
    logger.log(
      JSON.stringify(
        {
          ok: true,
          projectDir: context.root,
          steps: results,
          notes: context.notes,
          prerequisites: getPrerequisites(setup),
          nextSteps: getNextSteps(setup, packageManager),
          logFile,
        },
        null,
        2
      )
    )
    return
  }
  printSummary(context)
}
