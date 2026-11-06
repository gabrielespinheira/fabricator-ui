// `create` on a terminal asks for what its flags leave open, in the page's order.

import { confirm, text } from "@clack/prompts"
import {
  ASSISTANTS,
  BASES,
  DEFAULT_PROJECT_NAME,
  DESKTOP_RUNTIMES,
  FRAMEWORKS,
  isWebFramework,
  MONOREPO_FRAMEWORKS,
  resolveApps,
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

/** Whether the flags already say what kind of project this is. */
function namesTheProject(flags: SetupFlags) {
  return (
    flags.monorepo !== undefined ||
    flags.web === false ||
    flags.mobile ||
    flags.desktop ||
    flags.template === "expo" ||
    flags.template === "laravel"
  )
}

function namesTheApps(flags: SetupFlags) {
  return (
    flags.web === false ||
    flags.mobile ||
    flags.desktop ||
    flags.template === "expo"
  )
}

async function askForApps(next: ProjectSetup) {
  if (next.project === "new") {
    const app = await promptSelect("Which app?", [
      { title: "Web", value: "web", description: "in the browser" },
      { title: "Mobile", value: "mobile", description: "React Native, Expo" },
    ])
    next.web = app === "web"
    next.mobile = app === "mobile"
    return
  }
  const apps = await promptCheckboxes(
    "Which apps? (space selects, enter confirms)",
    [
      { title: "Web", value: "web", description: "in the browser" },
      { title: "Mobile", value: "mobile", description: "React Native, Expo" },
      { title: "Desktop", value: "desktop", description: "a native window" },
    ],
    { required: true, initial: ["web"] }
  )
  next.web = apps.includes("web")
  next.mobile = apps.includes("mobile")
  next.desktop = apps.includes("desktop")
    ? await promptSelect("Desktop runtime", toChoices(DESKTOP_RUNTIMES))
    : "none"
}

/** Fills in what the flags didn't say. */
export async function askForSetup(
  setup: ProjectSetup,
  flags: SetupFlags,
  hasName: boolean
): Promise<ProjectSetup> {
  const next = { ...setup }

  if (!namesTheProject(flags)) {
    next.project = await promptSelect("What are you starting?", [
      {
        title: "A new monorepo",
        value: "monorepo",
        description: "web, mobile and desktop, in one place",
      },
      {
        title: "A new project",
        value: "new",
        description: "one app in one folder",
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

  if (!namesTheApps(flags)) await askForApps(next)

  const { framework, project } = resolveApps(next)
  if (isWebFramework(framework)) {
    if (!flags.template) {
      next.framework = await promptSelect(
        "Framework",
        toChoices(
          FRAMEWORKS.filter(
            ({ value }) =>
              isWebFramework(value) &&
              (project !== "monorepo" || MONOREPO_FRAMEWORKS.includes(value))
          )
        )
      )
    }
    if (!flags.base) {
      next.base = await promptSelect("Component primitives", toChoices(BASES))
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
