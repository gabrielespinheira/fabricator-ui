import type { ProjectSetup } from "./setup"

export const DISTRIBUTIONS = ["source", "package"] as const
export const REACT_PACKAGE = "@fabricator-ui/react"
export const REACT_PACKAGE_STYLES = `${REACT_PACKAGE}/styles.css`
export const REACT_PACKAGE_COMPONENTS = [
  "badge",
  "button",
  "card",
  "checkbox",
  "dialog",
  "dropdown-menu",
  "input",
  "label",
  "select",
  "switch",
  "tabs",
  "textarea",
] as const

export function getPackageSetupError(
  setup: Pick<
    ProjectSetup,
    "project" | "framework" | "web" | "mobile" | "desktop" | "name"
  >
) {
  if (setup.project === "existing") return null
  if (
    setup.project !== "monorepo" ||
    !setup.web ||
    setup.mobile ||
    setup.desktop !== "none"
  ) {
    return "Package setup is available for new web-only monorepos."
  }
  if (setup.framework !== "next" && setup.framework !== "vite") {
    return "Package setup supports Next.js and Vite React apps."
  }
  const name = setup.name.trim()
  if (name && !/^[a-z0-9][a-z0-9._-]{0,213}$/.test(name)) {
    return "Choose a project name using lowercase letters, numbers, dots, underscores or hyphens."
  }
  return null
}
