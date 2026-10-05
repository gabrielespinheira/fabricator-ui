// Registry items and overrides that exist only in Fabricator styles.
//
// Fabricator styles compile from the same base sources as the upstream styles,
// plus an overlay:
//
// - registry/fabricator/shared/<path>: files used by every base.
// - registry/fabricator/<base>/<path>: per-base files. A file with the same
//   path as an upstream source (e.g. ui/dropdown-menu.tsx) replaces it in the
//   Fabricator style only, so upstream styles keep their exact output.
//
// Overlay files import other registry files through
// `@/registry/bases/__base__/…`; the build substitutes the base being compiled.
// See AGENTS.md, "Fabricator overrides".

import { type Registry } from "shadcn/schema"

import { FABRICATOR_FOUNDATIONS } from "@/registry/fabricator/foundations"

export const fabricatorItems = [
  {
    name: "foundations",
    type: "registry:lib",
    title: "Foundations",
    description:
      "Fabricator surfaces, interaction tokens, focus colour, spring easings and scrollbars.",
    cssVars: FABRICATOR_FOUNDATIONS.cssVars,
    css: FABRICATOR_FOUNDATIONS.css,
  },
  {
    name: "fluid-hover",
    type: "registry:lib",
    title: "Fluid Hover",
    description:
      "One highlight that glides to the item nearest the pointer, and a selection background that slides between selected items.",
    files: [{ path: "lib/fluid-hover.tsx", type: "registry:lib" }],
  },
] satisfies Registry["items"]

// Extra dependencies for items whose Fabricator source differs from upstream.
// Bare names are namespaced to @fabricator by the build.
// Applied only for bases that have an override file for the item.
export const fabricatorOverrides: Record<
  string,
  { dependencies?: string[]; registryDependencies?: string[] }
> = {
  "dropdown-menu": { registryDependencies: ["fluid-hover"] },
  "context-menu": { registryDependencies: ["fluid-hover"] },
  menubar: { registryDependencies: ["fluid-hover"] },
  select: { registryDependencies: ["fluid-hover"] },
  combobox: { registryDependencies: ["fluid-hover"] },
  command: { registryDependencies: ["fluid-hover"] },
  "navigation-menu": { registryDependencies: ["fluid-hover"] },
  tabs: { registryDependencies: ["fluid-hover"] },
  "toggle-group": { registryDependencies: ["fluid-hover"] },
  sidebar: { registryDependencies: ["fluid-hover"] },
  accordion: { registryDependencies: ["fluid-hover"] },
  table: { registryDependencies: ["fluid-hover"] },
}

/** Items that every Fabricator component installs alongside itself. */
export const FABRICATOR_REQUIRED_ITEMS = ["foundations"]
