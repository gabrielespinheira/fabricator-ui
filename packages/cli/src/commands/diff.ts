import { Command } from "commander"

import { toFabricatorAddress } from "../utils/names"
import { readNativeLanguageConfig } from "../utils/native-files"
import { exitLike } from "../utils/shadcn"
import { runWithFabricatorRegistry } from "./add"
import { addNativeLanguage } from "./native-language"
import { fail, resolveCwd } from "./shared"

export interface DiffOptions {
  cwd?: string
}

export async function diff(
  item: string,
  rawOptions: DiffOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  const languageConfig = await readNativeLanguageConfig(cwd)
  if (languageConfig)
    return addNativeLanguage([item], languageConfig, { cwd, diff: true })
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
