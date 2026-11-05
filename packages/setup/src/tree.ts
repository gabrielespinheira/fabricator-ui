// The folders a setup creates, for the page's preview.

import {
  EXPO_SDK,
  getBaseLabel,
  getFrameworkLabel,
  isWebFramework,
  normalizeProjectSetup,
  projectName,
  type Framework,
  type ProjectSetup,
} from "./setup"

export type TreeMark = Framework | "electron" | "tauri"

export type ProjectTreeNode = {
  name: string
  note?: string
  mark?: TreeMark
  children: ProjectTreeNode[]
}

export function getProjectTree(rawSetup: ProjectSetup): ProjectTreeNode {
  const setup = normalizeProjectSetup(rawSetup)
  const name = projectName(setup)
  const webNote = isWebFramework(setup.framework)
    ? `${getFrameworkLabel(setup.framework)}, ${getBaseLabel(setup.base)}`
    : `Expo SDK ${EXPO_SDK}, React Native`

  if (setup.project === "existing") {
    return { name: "your project", note: "Detected by the CLI", children: [] }
  }
  if (setup.project === "new") {
    return { name, note: webNote, mark: setup.framework, children: [] }
  }
  return {
    name,
    children: [
      {
        name: "apps",
        children: [
          { name: "web", note: webNote, mark: setup.framework, children: [] },
          ...(setup.mobile
            ? [
                {
                  name: "mobile",
                  note: `Expo SDK ${EXPO_SDK}, React Native`,
                  mark: "expo" as const,
                  children: [],
                },
              ]
            : []),
          ...(setup.desktop === "none"
            ? []
            : [
                {
                  name: "desktop",
                  note: `${setup.desktop === "tauri" ? "Tauri" : "Electron"} window around apps/web`,
                  mark: setup.desktop,
                  children: [],
                },
              ]),
        ],
      },
      {
        name: "packages",
        children: [{ name: "ui", note: "Web components", children: [] }],
      },
    ],
  }
}
