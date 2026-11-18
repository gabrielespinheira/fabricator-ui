import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  formatCommand,
  forPackageManager,
  getBaseLabel,
  getExpoBuildCommand,
  getFrameworkLabel,
  getNextSteps,
  getToolingLabel,
  hasWebApp,
  mergeAgentInstructions,
  mergeClaudeImport,
  projectName,
  type PackageManager,
  type ProjectSetup,
} from "@fabricator-ui/setup"
import { z } from "zod"

import {
  getBaseFromStyle,
  hasRegistry,
  readComponentsJson,
} from "../utils/config"
import { DEFAULT_BASE_URL } from "../utils/urls"
import { writeDesignGuide } from "./skill"

const DOCS_URL = `${DEFAULT_BASE_URL}/docs`
const EXPO_ENVIRONMENT =
  "https://docs.expo.dev/get-started/set-up-your-environment/"
const uiAliasesSchema = z.object({ ui: z.string() })

function describeStack(
  setup: ProjectSetup,
  packageManager: PackageManager,
  base = setup.base
) {
  const stack = ["TypeScript", packageManager]
  if (hasWebApp(setup)) {
    stack.unshift(
      getFrameworkLabel(setup.framework),
      "React",
      "Tailwind CSS",
      getBaseLabel(base)
    )
    if (setup.framework === "laravel") stack.push("Inertia")
  }
  if (setup.mobile || setup.framework === "expo") {
    stack.push("Expo Router", "React Native", "Uniwind")
  }
  if (setup.desktop !== "none") {
    stack.push(setup.desktop === "tauri" ? "Tauri" : "Electron")
  }
  if (setup.project === "monorepo") {
    if (hasWebApp(setup)) {
      stack.push(setup.runner === "vite-plus" ? "Vite+" : "Turborepo")
    }
    const tooling = getToolingLabel(setup.tooling)
    if (!stack.includes(tooling)) stack.push(tooling)
  }
  return stack.join(" · ")
}

function shellBlock(commands: string[]) {
  return ["```sh", ...commands, "```"].join("\n")
}

function renderQuickStart(setup: ProjectSetup, packageManager: PackageManager) {
  if (setup.framework === "laravel") {
    return [
      "## Getting started",
      "Install [PHP, Composer and Node.js](https://laravel.com/docs/installation). On a fresh clone, run the setup script to install dependencies, create the environment file and run migrations.",
      shellBlock(["composer run setup", "composer run dev"]),
    ].join("\n\n")
  }

  const commands =
    setup.framework === "expo"
      ? [
          {
            label: "Start Metro",
            code: forPackageManager("npm run start", packageManager),
          },
        ]
      : getNextSteps(setup, packageManager).slice(1)
  const launch =
    commands.length === 1
      ? shellBlock(commands.map(({ code }) => code))
      : [
          "| Task | Command |",
          "| --- | --- |",
          ...commands.map(({ label, code }) => `| ${label} | \`${code}\` |`),
        ].join("\n")

  return [
    "## Getting started",
    "Install dependencies from the project root.",
    shellBlock([`${packageManager} install`]),
    ...(setup.mobile || setup.framework === "expo"
      ? [
          `For the first native build, [set up Xcode or Android Studio](${EXPO_ENVIRONMENT}) and run the command for your platform${setup.mobile ? " from `apps/mobile`" : ""}.`,
          `- **iOS** \`${getExpoBuildCommand(packageManager, "ios")}\`\n- **Android** \`${getExpoBuildCommand(packageManager, "android")}\``,
        ]
      : []),
    ...(setup.desktop === "tauri"
      ? [
          "Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) before starting the desktop app.",
        ]
      : []),
    "Start development from the project root.",
    launch,
  ].join("\n\n")
}

function renderWorkspace(setup: ProjectSetup) {
  if (setup.project !== "monorepo") return []
  return [
    "## Project layout",
    [
      ...(hasWebApp(setup)
        ? [
            `- [\`apps/web\`](apps/web) contains the ${getFrameworkLabel(setup.framework)} ${setup.web ? "app" : "app rendered in the desktop window"}.`,
            "- [`packages/ui`](packages/ui) contains shared web components, styles and utilities.",
          ]
        : []),
      ...(setup.mobile
        ? [
            "- [`apps/mobile`](apps/mobile) contains the Expo app and its native components.",
          ]
        : []),
      ...(setup.desktop !== "none"
        ? [
            `- [\`apps/desktop\`](apps/desktop) contains the ${setup.desktop === "tauri" ? "Tauri" : "Electron"} window and desktop configuration.`,
          ]
        : []),
    ].join("\n"),
  ]
}

function renderComponentDocs(
  root: string,
  setup: ProjectSetup,
  packageManager: PackageManager,
  needsLaravelSetup: boolean
) {
  const isWorkspace = setup.project === "monorepo"
  const targets = [
    ...(hasWebApp(setup)
      ? [
          {
            directory: isWorkspace ? "apps/web" : "",
            label: getBaseLabel(setup.base),
          },
        ]
      : []),
    ...(setup.mobile || setup.framework === "expo"
      ? [{ directory: isWorkspace ? "apps/mobile" : "", label: "React Native" }]
      : []),
  ]

  return [
    "## Fabricator UI",
    "Read [DESIGN.md](DESIGN.md) for screen layouts, component choices and the UI review checklist.",
    ...(needsLaravelSetup
      ? [
          `The React starter comes with its own UI configuration. Run this once to configure the Fabricator theme and registry for ${getBaseLabel(setup.base)}. See the [Laravel guide](${DOCS_URL}/installation/laravel).`,
          shellBlock([
            formatCommand(
              [
                "init",
                "--force",
                "--base",
                setup.base,
                "--no-reinstall",
                "--yes",
              ],
              packageManager
            ),
          ]),
        ]
      : []),
    "The CLI copies components from the `@fabricator` registry into the project as editable source. Start with the components you already have.",
    ...targets.flatMap(({ directory, label }) => {
      const configPath = directory
        ? `${directory}/components.json`
        : "components.json"
      const config = readComponentsJson(path.join(root, directory))
      const aliases =
        config.exists && "config" in config
          ? uiAliasesSchema.safeParse(config.config.aliases).data
          : undefined
      const cwd = directory ? ["--cwd", directory] : []
      return [
        ...(isWorkspace ? [`### ${label}`] : []),
        `Find the registry and import aliases in [\`${configPath}\`](${configPath}). Use \`docs\` to find examples and API references. Use \`add\` to copy a component into the project.`,
        shellBlock([
          formatCommand(["docs", "button", ...cwd], packageManager),
          formatCommand(["add", "card", ...cwd], packageManager),
        ]),
        ...(aliases
          ? [
              "Import components from the configured alias.",
              `\`\`\`tsx\nimport { Button } from "${aliases.ui}/button"\n\`\`\``,
            ]
          : []),
      ]
    }),
    "## Reference",
    [
      `- [Fabricator UI docs](${DOCS_URL})`,
      `- [CLI reference](${DOCS_URL}/cli)`,
      ...(hasWebApp(setup) && !needsLaravelSetup
        ? [
            `- [Button for ${getBaseLabel(setup.base)}](${DOCS_URL}/components/${setup.base}/button)`,
          ]
        : []),
      ...(setup.mobile || setup.framework === "expo"
        ? [
            `- [Fabricator UI for React Native](${DOCS_URL}/installation/react-native)`,
            `- [Button for React Native](${DOCS_URL}/components/native/button)`,
          ]
        : []),
    ].join("\n"),
  ]
}

function readIfPresent(file: string) {
  return existsSync(file) ? readFileSync(file, "utf8") : undefined
}

export function writeProjectDocs(
  root: string,
  setup: ProjectSetup,
  packageManager: PackageManager
) {
  if (setup.project === "existing") return

  const title = projectName(setup)
    .replace(/\s+/g, " ")
    .replace(/[\\`*_[\]<>#]/g, "\\$&")
  const laravelConfig =
    setup.framework === "laravel" ? readComponentsJson(root) : undefined
  const config =
    laravelConfig && "config" in laravelConfig
      ? laravelConfig.config
      : undefined
  const needsLaravelSetup =
    setup.framework === "laravel" && !hasRegistry(config)
  const base = getBaseFromStyle(config?.style) ?? setup.base
  const stack = describeStack(setup, packageManager, base)
  const hasSkill = setup.skill && setup.assistants.length > 0
  if (!existsSync(path.join(root, "DESIGN.md"))) writeDesignGuide(root)
  writeFileSync(
    path.join(root, "README.md"),
    [
      `# ${title}`,
      ...(needsLaravelSetup ? [stack] : ["Built with Fabricator UI.", stack]),
      renderQuickStart(setup, packageManager),
      ...renderWorkspace(setup),
      ...renderComponentDocs(
        root,
        { ...setup, base },
        packageManager,
        needsLaravelSetup
      ),
    ].join("\n\n") + "\n"
  )

  const agents = path.join(root, "AGENTS.md")
  writeFileSync(
    agents,
    mergeAgentInstructions(
      readIfPresent(agents),
      [
        `## ${title}`,
        "",
        needsLaravelSetup ? stack : `${stack} · Fabricator UI`,
        "",
        "- Read [DESIGN.md](DESIGN.md) before changing a screen.",
        ...(hasSkill
          ? ["- Load the `fabricator` skill before writing UI code."]
          : []),
        needsLaravelSetup
          ? "- See [README.md](README.md#fabricator-ui) for Fabricator UI setup and component commands."
          : "- Reuse local Fabricator UI components. See [README.md](README.md#fabricator-ui) for component paths and CLI commands.",
      ].join("\n")
    )
  )
  if (!setup.assistants.includes("claude")) return
  const claude = path.join(root, "CLAUDE.md")
  writeFileSync(claude, mergeClaudeImport(readIfPresent(claude)))
}
