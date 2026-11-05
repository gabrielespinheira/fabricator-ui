// `create` on a terminal asks for what its flags leave open, in the page's order.

import { confirm, text } from "@clack/prompts"
import {
  ASSISTANTS,
  BASES,
  DEFAULT_PROJECT_NAME,
  DESKTOP_RUNTIMES,
  FRAMEWORKS,
  MONOREPO_FRAMEWORKS,
  type ProjectSetup,
} from "@fabricator-ui/setup"

import {
  exitIfCancelled,
  promptCheckboxes,
  promptSelect,
  type PromptChoice,
} from "../commands/shared"
import type { SetupFlags } from "./flags"

function toChoices<T extends string>(
  options: readonly { value: T; label: string; description?: string }[]
): PromptChoice<T>[] {
  return options.map(({ value, label, description }) => ({
    title: label,
    value,
    description,
  }))
}

/** Fills in what the flags didn't say. */
export async function askForSetup(
  setup: ProjectSetup,
  flags: SetupFlags,
  hasName: boolean
): Promise<ProjectSetup> {
  const next = { ...setup }

  const startsFromFlags = flags.monorepo || flags.mobile || flags.desktop
  if (!startsFromFlags) {
    next.project = await promptSelect("What are you starting?", [
      { title: "A new project", value: "new" },
      {
        title: "A new monorepo",
        value: "monorepo",
        description: "web, and optionally mobile and desktop",
      },
    ])
  }

  if (!hasName) {
    next.name = exitIfCancelled(
      await text({
        message: "Project name",
        placeholder: DEFAULT_PROJECT_NAME,
        defaultValue: DEFAULT_PROJECT_NAME,
      })
    )
  }

  if (!flags.template) {
    next.framework = await promptSelect(
      "Framework",
      toChoices(
        FRAMEWORKS.filter(
          ({ value }) =>
            next.project !== "monorepo" || MONOREPO_FRAMEWORKS.includes(value)
        )
      )
    )
  }

  if (!flags.base && next.framework !== "expo") {
    next.base = await promptSelect("Component primitives", toChoices(BASES))
  }

  if (next.project === "monorepo") {
    if (!flags.mobile) {
      next.mobile = exitIfCancelled(
        await confirm({
          message: "Add a mobile app (React Native and Expo)?",
          initialValue: false,
        })
      )
    }
    if (!flags.desktop) {
      next.desktop = await promptSelect("Add a desktop app?", [
        { title: "No", value: "none" },
        ...toChoices(DESKTOP_RUNTIMES),
      ])
    }
  }

  if (flags.sounds === undefined) {
    next.sound = exitIfCancelled(
      await confirm({ message: "Add interface sounds?", initialValue: true })
    )
  }

  if (!flags.agents) {
    next.assistants = await promptCheckboxes(
      "Which AI assistants do you use? (space selects, enter skips)",
      toChoices(ASSISTANTS)
    )
  }

  return next
}
