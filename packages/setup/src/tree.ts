// The folders and key files a setup creates, for the page's preview.

import { getSkillDirectories, MCP_CONFIG_PATHS } from "./agent-files"
import {
  EXPO_SDK,
  getBaseLabel,
  getFrameworkLabel,
  hasDesignGuide,
  hasWebApp,
  isWebFramework,
  normalizeProjectSetup,
  projectName,
  type Framework,
  type ProjectSetup,
} from "./setup"

export type TreeMark = Framework | "electron" | "tauri"

export type ProjectTreeNode = {
  /** The node's path from the project folder, unique in the tree. */
  id: string
  name: string
  note?: string
  mark?: TreeMark
  /** A row that stands in for many files, like every other component. */
  muted?: boolean
  /** Present, empty included, for a folder; absent for a file. */
  children?: ProjectTreeNode[]
}

/** A folder or file before it has a path: built bottom-up, then given ids. */
type Draft = Omit<ProjectTreeNode, "id" | "children"> & {
  children?: Draft[]
}

const file = (name: string): Draft => ({ name })

/** `a/b/c.json` as folders around one file. */
function filePath(relative: string): Draft {
  const [name = relative, ...folders] = relative.split("/").reverse()
  return folders.reduce<Draft>(
    (child, folder) => ({ name: folder, children: [child] }),
    file(name)
  )
}

/** `a/b` as nested folders around its files; nothing for no files. */
function folderPath(relative: string, children: Draft[]): Draft[] {
  if (children.length === 0) return []
  const [name = relative, ...parents] = relative.split("/").reverse()
  return [
    parents.reduce<Draft>(
      (child, folder) => ({ name: folder, children: [child] }),
      { name, children }
    ),
  ]
}

/** One folder per name: `.claude/skills` and `.claude/…` share `.claude`. */
function mergeDrafts(drafts: Draft[]): Draft[] {
  const byName = new Map<string, Draft>()
  for (const draft of drafts) {
    const existing = byName.get(draft.name)
    byName.set(
      draft.name,
      existing?.children && draft.children
        ? { ...existing, children: [...existing.children, ...draft.children] }
        : (existing ?? draft)
    )
  }
  return [...byName.values()]
}

/** Folders first, then files, each by name; a stand-in row last. */
function compareDrafts(a: Draft, b: Draft) {
  if (Boolean(a.muted) !== Boolean(b.muted)) return a.muted ? 1 : -1
  const isFolderA = a.children !== undefined
  const isFolderB = b.children !== undefined
  if (isFolderA !== isFolderB) return isFolderA ? -1 : 1
  return a.name.localeCompare(b.name)
}

function withIds(draft: Draft, parentId?: string): ProjectTreeNode {
  const id = parentId ? `${parentId}/${draft.name}` : draft.name
  const { children, ...rest } = draft
  if (!children) return { ...rest, id }
  return {
    ...rest,
    id,
    children: mergeDrafts(children)
      .sort(compareDrafts)
      .map((child) => withIds(child, id)),
  }
}

/** The skill, the design guide and each assistant's MCP config, at the root. */
function agentFiles(setup: ProjectSetup): Draft[] {
  if (setup.assistants.length === 0) return []
  return [
    ...(setup.skill
      ? getSkillDirectories(setup.assistants).flatMap((directory) =>
          folderPath(directory, [file("SKILL.md")])
        )
      : []),
    ...(hasDesignGuide(setup) ? [file("DESIGN.md")] : []),
    ...(setup.mcp
      ? setup.assistants.map((assistant) =>
          filePath(MCP_CONFIG_PATHS[assistant])
        )
      : []),
  ]
}

const EVERY_OTHER_COMPONENT: Draft = {
  name: "every other component",
  muted: true,
}

/** The components every setup installs, then the ones its choices add. */
function componentFiles(setup: ProjectSetup, extra: string[] = []) {
  return [
    file("button.tsx"),
    file("spinner.tsx"),
    ...extra.map(file),
    ...(setup.appShell ? [file("app-shell.tsx")] : []),
    ...(setup.components === "all" ? [EVERY_OTHER_COMPONENT] : []),
  ]
}

/** Where each web template keeps its own components, beside packages/ui's. */
const WEB_COMPONENTS_DIRS: Record<Framework, string> = {
  next: "components",
  vite: "src/components",
  start: "src/components",
  "react-router": "app/components",
  astro: "src/components",
  laravel: "resources/js/components",
  expo: "src/components",
}

/** The App Shell's layout and the sounds' component, written into the app. */
function webAppComponents(setup: ProjectSetup): Draft[] {
  // Astro renders the shell as an island, without a root to wire it.
  const hasShellRoot = setup.framework !== "astro"
  return folderPath(WEB_COMPONENTS_DIRS[setup.framework], [
    ...(setup.appShell ? [file("app-shell-layout.tsx")] : []),
    ...(setup.appShell && hasShellRoot ? [file("app-shell-root.tsx")] : []),
    ...(setup.sound ? [file("sound-effects.tsx")] : []),
  ])
}

/** A React Native app's components, libs and layout, under its `src`. */
function nativeFiles(setup: ProjectSetup): Draft[] {
  return [
    ...folderPath(
      "src/components/ui",
      componentFiles(setup, ["fabricator-root.tsx"])
    ),
    ...folderPath("src/components", [
      ...(setup.appShell
        ? [file("app-shell-layout.tsx"), file("app-shell-root.tsx")]
        : []),
      ...(setup.sound ? [file("sound-effects.tsx")] : []),
    ]),
    ...folderPath(
      "src/lib",
      setup.sound
        ? [
            file("sound-recipes.ts"),
            file("sound-synth.ts"),
            file("sounds-model.ts"),
            file("sounds.ts"),
          ]
        : []
    ),
  ]
}

/** Only Next's template shares its ESLint and TypeScript configs as packages. */
function hasSharedConfigs(setup: ProjectSetup) {
  return setup.framework === "next"
}

function eslintFiles(setup: ProjectSetup) {
  return setup.tooling === "eslint-prettier" ? [file("eslint.config.js")] : []
}

function toolingFiles(setup: ProjectSetup) {
  if (setup.tooling === "biome") return [file("biome.json")]
  if (setup.tooling === "vite-plus") return [file("vite.config.ts")]
  return [file(".prettierrc")]
}

function webApp(setup: ProjectSetup, note: string): Draft {
  return {
    name: "web",
    note: setup.web ? note : `${note}, the window's UI`,
    mark: setup.framework,
    children: [
      file("components.json"),
      ...eslintFiles(setup),
      file("package.json"),
      ...webAppComponents(setup),
    ],
  }
}

function mobileApp(setup: ProjectSetup): Draft {
  return {
    name: "mobile",
    note: `Expo SDK ${EXPO_SDK}, React Native`,
    mark: "expo",
    children: [
      file("app.json"),
      file("components.json"),
      ...eslintFiles(setup),
      file("package.json"),
      ...nativeFiles(setup),
    ],
  }
}

function desktopApp(setup: ProjectSetup): Draft {
  return {
    name: "desktop",
    note: `${setup.desktop === "tauri" ? "Tauri" : "Electron"} window around apps/web`,
    mark: setup.desktop === "tauri" ? "tauri" : "electron",
    children: [file("package.json")],
  }
}

function webPackages(setup: ProjectSetup): Draft {
  const isEslint = setup.tooling === "eslint-prettier"
  const sharedConfigs = hasSharedConfigs(setup)
  return {
    name: "packages",
    children: [
      ...(sharedConfigs && isEslint
        ? [{ name: "eslint-config", children: [file("package.json")] }]
        : []),
      ...(sharedConfigs
        ? [{ name: "typescript-config", children: [file("package.json")] }]
        : []),
      {
        name: "ui",
        note: "Web components",
        children: [
          file("components.json"),
          ...eslintFiles(setup),
          file("package.json"),
          ...folderPath("src/components", componentFiles(setup)),
          ...folderPath(
            "src/lib",
            setup.sound ? [file("sound-recipes.ts"), file("sounds.ts")] : []
          ),
        ],
      },
    ],
  }
}

function monorepoTree(setup: ProjectSetup, note: string): Draft {
  const hasWeb = hasWebApp(setup)
  return {
    name: projectName(setup),
    children: [
      {
        name: "apps",
        children: [
          ...(hasWeb ? [webApp(setup, note)] : []),
          ...(setup.mobile ? [mobileApp(setup)] : []),
          ...(setup.desktop === "none" ? [] : [desktopApp(setup)]),
        ],
      },
      // A mobile app keeps its React Native components in apps/mobile.
      ...(hasWeb ? [webPackages(setup)] : []),
      ...(hasWeb && setup.runner === "turborepo" ? [file("turbo.json")] : []),
      ...toolingFiles(setup),
      ...agentFiles(setup),
      file("package.json"),
    ],
  }
}

export function getProjectTree(rawSetup: ProjectSetup): ProjectTreeNode {
  const setup = normalizeProjectSetup(rawSetup)
  const note = isWebFramework(setup.framework)
    ? `${getFrameworkLabel(setup.framework)}, ${getBaseLabel(setup.base)}`
    : `Expo SDK ${EXPO_SDK}, React Native`

  if (setup.project === "existing") {
    // Its components go where the CLI finds the project's components.json.
    return withIds({
      name: "your project",
      note: "Detected by the CLI",
      children: agentFiles(setup),
    })
  }
  if (setup.project === "new") {
    const isExpo = !isWebFramework(setup.framework)
    return withIds({
      name: projectName(setup),
      note,
      mark: setup.framework,
      children: [
        ...(isExpo
          ? [
              file("app.json"),
              file("components.json"),
              file("package.json"),
              ...nativeFiles(setup),
            ]
          : []),
        ...agentFiles(setup),
      ],
    })
  }
  return withIds(monorepoTree(setup, note))
}
