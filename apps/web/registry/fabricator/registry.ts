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
  {
    name: "sounds",
    type: "registry:lib",
    title: "Sounds",
    description:
      "Interface sounds synthesized with the Web Audio API, and <SoundEffects /> to play them for every component. Off until you turn them on.",
    files: [
      { path: "lib/sounds.ts", type: "registry:lib" },
      { path: "components/sound-effects.tsx", type: "registry:component" },
    ],
  },
  {
    name: "radius-pill",
    type: "registry:theme",
    title: "Pill radius",
    description:
      "Sets --radius to 1.25rem: controls become full pills and containers stay concentric. The default is 0.5rem.",
    cssVars: {
      light: { radius: "1.25rem" },
    },
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

/**
 * Fabricator items that don't depend on the Fabricator style, so they also
 * ship in blend mode (/r/{style}/{name}.json) for existing projects: sounds
 * key on data-slot and ARIA attributes that every style shares, and the radius
 * item only sets --radius.
 */
export const BLEND_ITEMS = ["sounds", "radius-pill"]

/** Items that every Fabricator component installs alongside itself. */
export const FABRICATOR_REQUIRED_ITEMS = ["foundations"]
