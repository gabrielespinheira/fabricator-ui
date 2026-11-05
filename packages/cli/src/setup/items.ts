// The URLs and items a setup asks the registry for.

import type { Framework, ProjectSetup } from "@fabricator-ui/setup"

import { buildInitUrl, buildNativeInitUrl } from "../utils/urls"

export function buildSetupInitUrl(setup: ProjectSetup, baseUrl: string) {
  return buildInitUrl(
    {
      base: setup.base,
      look: setup.look,
      ...(setup.project === "existing"
        ? {}
        : {
            template: setup.framework,
            monorepo: setup.project === "monorepo",
          }),
      ...(setup.iconLibrary === "fabricator"
        ? {}
        : { iconLibrary: setup.iconLibrary }),
    },
    baseUrl
  )
}

export function buildNativeSetupInitUrl(setup: ProjectSetup, baseUrl: string) {
  return buildNativeInitUrl(undefined, baseUrl, setup.look)
}

/** `/init/app-shell` for one app: `expo` asks for the native file. */
export function buildShellUrl(
  setup: ProjectSetup,
  baseUrl: string,
  framework: Framework | undefined
) {
  const params = new URLSearchParams(setup.shell)
  if (framework === "expo") {
    params.set("platform", "native")
  } else {
    if (setup.iconLibrary !== "fabricator") {
      params.set("iconLibrary", setup.iconLibrary)
    }
    if (framework) params.set("framework", framework)
    if (setup.desktop !== "none") params.set("desktop", setup.desktop)
  }
  const query = params.toString()
  return `${baseUrl}/init/app-shell${query ? `?${query}` : ""}`
}

/**
 * Everything a web app installs, in one list so it takes one install. `app-shell`
 * is named as well as the URL so the run knows the `@fabricator` registry.
 */
export function getWebItems(
  setup: ProjectSetup,
  baseUrl: string,
  framework: Framework | undefined,
  allComponents: string[]
) {
  return [
    "@fabricator/button",
    ...(setup.sound ? ["@fabricator/sounds"] : []),
    ...(setup.appShell
      ? ["@fabricator/app-shell", buildShellUrl(setup, baseUrl, framework)]
      : []),
    ...allComponents.map((name) => `@fabricator/${name}`),
  ].filter((item, index, list) => list.indexOf(item) === index)
}

export function getNativeItems(
  setup: ProjectSetup,
  baseUrl: string,
  allComponents: string[]
) {
  return [
    "@fabricator/fabricator-root",
    "@fabricator/button",
    ...(setup.sound ? ["@fabricator/sounds"] : []),
    ...(setup.appShell
      ? ["@fabricator/app-shell", buildShellUrl(setup, baseUrl, "expo")]
      : []),
    ...allComponents.map((name) => `@fabricator/${name}`),
  ].filter((item, index, list) => list.indexOf(item) === index)
}
