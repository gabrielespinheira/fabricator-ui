import { Command } from "commander"

import { toFabricatorAddress } from "../utils/names"
import { exitLike } from "../utils/shadcn"
import { runWithFabricatorRegistry } from "./add"
import { fail, resolveCwd } from "./shared"

export interface DiffOptions {
  cwd?: string
}

export async function diff(
  item: string,
  rawOptions: DiffOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  const args = ["add", toFabricatorAddress(item), "--diff", "--cwd", cwd]
  exitLike(await runWithFabricatorRegistry(cwd, args, { readOnly: true }))
}

export function createDiffCommand(): Command {
  return new Command("diff")
    .description(
      "show what changed between the registry version of an item and your copy"
    )
    .argument("<item>", "item name or address")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (item: string, options: DiffOptions) => {
      try {
        await diff(item, options)
      } catch (error) {
        fail(error)
      }
    })
}
