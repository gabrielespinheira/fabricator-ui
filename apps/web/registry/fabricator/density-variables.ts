import {
  DENSITY_ICON_STEPS,
  DENSITY_SPACE_STEPS,
  DENSITY_TEXT_STEPS,
  getIconStroke,
  type Density,
} from "@/registry/fabricator/density"

/** A density's size tokens as numbers, the form React Native reads. */
export function getDensityVariables(density: Density) {
  return {
    ...Object.fromEntries(
      DENSITY_SPACE_STEPS.map((step) => [
        `--density-${step}`,
        density.space[step],
      ])
    ),
    ...Object.fromEntries(
      DENSITY_TEXT_STEPS.map((step) => [
        `--density-text-${step}`,
        density.text[step],
      ])
    ),
    ...Object.fromEntries(
      DENSITY_ICON_STEPS.map((step) => [
        `--density-icon-${step}`,
        density.icon[step],
      ])
    ),
    ...Object.fromEntries(
      DENSITY_ICON_STEPS.map((step) => [
        `--density-icon-stroke-${step}`,
        getIconStroke(density.icon[step]),
      ])
    ),
  } as Record<string, number>
}
