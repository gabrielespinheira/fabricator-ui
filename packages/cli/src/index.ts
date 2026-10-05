#!/usr/bin/env node
import { Command } from "commander"

import pkg from "../package.json" with { type: "json" }
import { createAddCommand } from "./commands/add"
import { createApplyCommand } from "./commands/apply"
import { createDiffCommand } from "./commands/diff"
import { createDocsCommand } from "./commands/docs"
import { createDoctorCommand } from "./commands/doctor"
import { createInfoCommand } from "./commands/info"
import { createInitCommand } from "./commands/init"
import { createMcpCommand } from "./commands/mcp"
import { createSearchCommand } from "./commands/search"
import { createViewCommand } from "./commands/view"
import { highlight } from "./utils/logger"

export function createProgram(): Command {
  const program = new Command()
    .name("fabricator-ui")
    .description("Add Fabricator UI components to your project.")
    .version(pkg.version, "-v, --version", "display the version number")
    .option("--verbose", "print the underlying commands")
    .hook("preAction", (command) => {
      if (command.opts<{ verbose?: boolean }>().verbose) {
        process.env.FABRICATOR_VERBOSE = "1"
      }
    })
    .showHelpAfterError()
    .addHelpText(
      "beforeAll",
      `${highlight.bold("fabricator-ui")} ${highlight.dim(`v${pkg.version} · https://fabricator-ui.com`)}\n`
    )
    .addHelpText(
      "afterAll",
      `\nRegistry: ${highlight.dim("set FABRICATOR_REGISTRY_URL to use another registry host (e.g. http://localhost:4000).")}`
    )

  program
    .addCommand(createInitCommand())
    .addCommand(createAddCommand())
    .addCommand(createApplyCommand())
    .addCommand(createSearchCommand())
    .addCommand(createViewCommand())
    .addCommand(createDocsCommand())
    .addCommand(createDiffCommand())
    .addCommand(createInfoCommand())
    .addCommand(createDoctorCommand())
    .addCommand(createMcpCommand())

  return program
}

await createProgram().parseAsync(process.argv)
