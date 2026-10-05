import { Command } from "commander"

import { exitLike, runShadcn } from "../utils/shadcn"
import { fail, resolveCwd } from "./shared"

export function createInfoCommand(): Command {
  return new Command("info")
    .description("get information about your project")
    .option("--json", "output as JSON")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (options: { json?: boolean; cwd?: string }) => {
      try {
        const args = [
          "info",
          ...(options.json ? ["--json"] : []),
          "--cwd",
          resolveCwd(options.cwd),
        ]
        exitLike(await runShadcn(args, { echo: !options.json }))
      } catch (error) {
        fail(error)
      }
    })
}
