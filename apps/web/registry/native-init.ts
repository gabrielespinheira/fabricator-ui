// What `fabricator-ui init` installs in a React Native project, for a look. The
// CLI writes components.json first, because `shadcn add` needs it to resolve the
// `@fabricator` dependency below.

import { type RegistryItem } from "shadcn/schema"

import { parseLook, type FabricatorLook } from "@/registry/fabricator/look"
import {
  DEFAULT_NATIVE_LOOK,
  toNativeStylesheet,
} from "@/registry/fabricator/native-theme"

export function isNativeInit(searchParams: URLSearchParams) {
  return searchParams.get("platform") === "native"
}

type NativeLookResult =
  | { success: true; look: FabricatorLook }
  | { success: false; error: string }

/** The look a URL asks for, at a phone's density unless it names one. */
export function parseNativeLook(
  searchParams: URLSearchParams
): NativeLookResult {
  const result = parseLook(searchParams)
  if (!result.success) return result
  return {
    success: true,
    look: searchParams.has("density")
      ? result.look
      : { ...result.look, density: DEFAULT_NATIVE_LOOK.density },
  }
}

export function buildNativeInit(look: FabricatorLook): RegistryItem {
  return {
    name: "fabricator-native",
    type: "registry:item",
    title: "Fabricator UI for React Native",
    description:
      "Everything native components need, with this project's look as its theme.",
    registryDependencies: ["@fabricator/index"],
    files: [
      {
        path: "registry/native/fabricator.css",
        type: "registry:file",
        target: "fabricator.css",
        content: toNativeStylesheet(look),
      },
    ],
    css: { '@import "./fabricator.css"': {} },
  }
}
