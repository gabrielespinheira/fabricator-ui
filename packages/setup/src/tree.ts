// The folders and key files a setup creates, for the page's preview.

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
  /** Present, empty included, for a folder; absent for a file. */
  children?: ProjectTreeNode[]
}

/** A folder or file before it has a path: built bottom-up, then given ids. */
type Draft = Omit<ProjectTreeNode, "id" | "children"> & {
  children?: Draft[]
}

const file = (name: string): Draft => ({ name })

/** Folders first, then files, each by name. */
function compareDrafts(a: Draft, b: Draft) {
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
    children: [...children]
      .sort(compareDrafts)
      .map((child) => withIds(child, id)),
  }
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
      ...(hasDesignGuide(setup) ? [file("DESIGN.md")] : []),
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
    return {
      id: "your project",
      name: "your project",
      note: "Detected by the CLI",
      children: [],
    }
  }
  if (setup.project === "new") {
    return withIds({
      name: projectName(setup),
      note,
      mark: setup.framework,
      children: [],
    })
  }
  return withIds(monorepoTree(setup, note))
}
