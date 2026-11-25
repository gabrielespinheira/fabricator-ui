import { hasWebApp, type ProjectSetup } from "./setup"

export const DISTRIBUTIONS = ["source", "package"] as const
export const REACT_PACKAGE = "@fabricator-ui/react"
export const REACT_PACKAGE_STYLES = `${REACT_PACKAGE}/styles.css`
export const REACT_NATIVE_PACKAGE = "@fabricator-ui/react-native"
export const REACT_NATIVE_PACKAGE_STYLES = `${REACT_NATIVE_PACKAGE}/styles.css`
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

export const REACT_NATIVE_PACKAGE_COMPONENTS = [
  ...REACT_PACKAGE_COMPONENTS,
  "fabricator-root",
] as const

export function getPackageSetupError(
  setup: Pick<
    ProjectSetup,
    "project" | "framework" | "web" | "mobile" | "desktop" | "name"
  >
) {
  if (setup.project === "existing") return null
  if (setup.project !== "monorepo") {
    return "Create a monorepo to set up packages in a new project."
  }
  if (
    hasWebApp(setup) &&
    setup.framework !== "next" &&
    setup.framework !== "vite"
  ) {
    return "Package setup supports Next.js and Vite React apps."
  }
  const name = setup.name.trim()
  if (name && !/^[a-z0-9][a-z0-9._-]{0,213}$/.test(name)) {
    return "Choose a project name using lowercase letters, numbers, dots, underscores or hyphens."
  }
  return null
}
