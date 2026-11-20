import { Command } from "commander"

import {
  getPackageDeclaration,
  getPackageOnlyDirectory,
  getPackageStatus,
} from "../setup/package-install"
import { logger } from "../utils/logger"
import { readNativeLanguageConfig } from "../utils/native-files"
import { captureShadcn, exitLike, runShadcn } from "../utils/shadcn"
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
        const cwd = resolveCwd(options.cwd)
        const config = await readNativeLanguageConfig(cwd)
        if (config) {
          logger.log(JSON.stringify(config, null, 2))
          return
        }
        const args = ["info", ...(options.json ? ["--json"] : []), "--cwd", cwd]
        const packageOnly = getPackageOnlyDirectory(cwd)
        if (packageOnly) {
          logger.log(JSON.stringify(getPackageStatus(packageOnly), null, 2))
          return
        }
        if (getPackageDeclaration(cwd) && options.json) {
          const registry = await captureShadcn(args)
          if (registry.code === 0)
            logger.log(
              JSON.stringify(
                {
                  ...JSON.parse(registry.stdout),
                  reactPackage: getPackageStatus(cwd),
                },
                null,
                2
              )
            )
          else exitLike(registry)
          return
        }
        if (getPackageDeclaration(cwd))
          logger.log(JSON.stringify(getPackageStatus(cwd), null, 2))
        exitLike(await runShadcn(args, { echo: !options.json }))
      } catch (error) {
        fail(error)
      }
    })
}
