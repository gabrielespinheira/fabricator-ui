import { Command } from "commander"

import { exitLike, runShadcn } from "../utils/shadcn"
import { fail, resolveCwd, resolveReadAddresses } from "./shared"

export interface ViewOptions {
  cwd?: string
  upstream?: boolean
}

export async function view(
  items: string[],
  rawOptions: ViewOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  const addresses = resolveReadAddresses(cwd, items, {
    upstream: rawOptions.upstream,
  })
  exitLike(await runShadcn(["view", ...addresses, "--cwd", cwd]))
}

export function createViewCommand(): Command {
  return new Command("view")
    .description("view Fabricator UI items from the registry")
    .argument("<items...>", "item names or addresses")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .option("--upstream", "view items from the upstream shadcn/ui registry")
    .action(async (items: string[], options: ViewOptions) => {
      try {
        await view(items, options)
      } catch (error) {
        fail(error)
      }
    })
}
