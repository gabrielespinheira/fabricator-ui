// Morph Island: one pill whose width, height and corners are springs. Width
// is stiffer than height, so every change lands sideways first and then drops
// into place; while the height moves fast the width gives a little back, so
// the island keeps its volume like something soft. A change, or a press,
// kicks a small squash on a third spring. The numbers are the Motion
// Studies' Morph Island (designbookmark.com/motion).

import type { SpringConfig } from "./spring-model"

export const MORPH_ISLAND_SPRINGS = {
  width: { stiffness: 380, damping: 24 },
  height: { stiffness: 300, damping: 22 },
  press: { stiffness: 520, damping: 18 },
} as const satisfies Record<string, SpringConfig>

// Shrinking, height is a little stiffer so it never lags the width by much.
const SHRINK_HEIGHT_STIFFNESS = 1.3
// How much width the island gives back per unit of height speed, at most 5%.
const VOLUME_RATE = 1 / 7000
const VOLUME_LIMIT = 0.05
// Never thinner than this while a spring overshoots below zero.
const MIN_HEIGHT = 20

export const PRESS_SCALE = 0.96

/**
 * The default settle spring's stiffness. The island reads the page's settle
 * spring and plays its own springs as much faster or slower, so a speed
 * (smooth, snappy) and --motion-scale retime it like everything else.
 */
export const SPEED_REFERENCE_STIFFNESS = 280

/** The velocity a change kicks the press spring with: a deeper dip to grow. */
export const PRESS_KICK = { grow: -1.6, shrink: -1, same: -2 } as const

export type IslandSize = { width: number; height: number }

export function isIslandGrowing(from: IslandSize, to: IslandSize) {
  return to.width * to.height > from.width * from.height
}

export function getIslandHeightSpring(isGrowing: boolean): SpringConfig {
  const { stiffness, damping } = MORPH_ISLAND_SPRINGS.height
  return {
    stiffness: isGrowing ? stiffness : stiffness * SHRINK_HEIGHT_STIFFNESS,
    damping,
  }
}

/** What to draw from the springs' state: the box and its corner radius. */
export function getIslandFrame(
  {
    width,
    height,
    heightVelocity,
  }: { width: number; height: number; heightVelocity: number },
  maxRadius: number
) {
  const give = Math.max(
    -VOLUME_LIMIT,
    Math.min(VOLUME_LIMIT, -heightVelocity * VOLUME_RATE)
  )
  const drawnHeight = Math.max(height, MIN_HEIGHT)
  return {
    width: Math.round(width * (1 + give) * 100) / 100,
    height: Math.round(drawnHeight * 100) / 100,
    radius: Math.round(Math.min(drawnHeight / 2, maxRadius) * 100) / 100,
  }
}
