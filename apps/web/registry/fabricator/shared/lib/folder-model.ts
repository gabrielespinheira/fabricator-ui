// Where the files peeking out of a folder sit, closed and open, the shape of
// its front panel and the colour it's drawn in. React web and React Native
// draw the same folder from these numbers, so the two can't drift.

import {
  getPaletteLiteral,
  getPaletteMark,
  isPaletteColorName,
  isPaletteRole,
  PALETTE_COLORS,
  type PaletteScheme,
} from "./palette-model"

/** A folder shows its first three files; the rest stay inside. */
const FOLDER_MAX_FILES = 3

/**
 * The front panel, a tab on the left that eases down into the body. Drawn
 * stretched to its box, which keeps this view box's aspect ratio, so the
 * corners stay round at any size.
 */
const FOLDER_FRONT_VIEW_BOX = "0 0 160 84"
const FOLDER_FRONT_PATH =
  "M0 10A10 10 0 0 1 10 0H56C67 0 69 14 80 14H150A10 10 0 0 1 160 24V74A10 10 0 0 1 150 84H10A10 10 0 0 1 0 74Z"

type FolderFileTransform = {
  /** Across, as a share of the file's own width. */
  x: number
  /** Down, as a share of the file's own height; below 0 lifts it. */
  y: number
  /** Degrees, clockwise. */
  rotate: number
}

type FolderFilePose = {
  rest: FolderFileTransform
  open: FolderFileTransform
  /** Stacking order: the first file lies on top. */
  layer: number
}

// At rest the files sit nearly straight, each one behind a step lower, like
// papers dropped in. Open, they rise and fan out like a hand of cards. Two
// files fan a little narrower than three, so they still overlap.
const REST = { spread: 0.22, step: 0.045, tilt: 2 }
const OPEN = { spread: 0.42, lift: 0.16, drop: 0.07, step: 0.02, tilt: 12 }
const PAIR_SPREAD = 0.7

// Whole thousandths, and never -0, so poses compare and print cleanly.
const round = (value: number) => Math.round(value * 1000) / 1000 || 0

/** How many files a folder shows for a count of files. */
function getFolderFileCount(count: number) {
  return Math.min(FOLDER_MAX_FILES, Math.max(0, Math.floor(count)))
}

/** Where a file sits, closed and open, by its place among the files shown. */
function getFolderFilePose(index: number, count: number): FolderFilePose {
  const shown = Math.max(1, getFolderFileCount(count))
  const place = Math.min(Math.max(0, index), shown - 1)
  // -1 at the left edge, 0 in the middle, 1 at the right.
  const offset = shown === 1 ? 0 : (place / (shown - 1)) * 2 - 1
  const spread = shown === 2 ? PAIR_SPREAD : 1
  return {
    rest: {
      x: round(offset * REST.spread * spread),
      y: round(place * REST.step),
      rotate: round(offset * REST.tilt),
    },
    open: {
      x: round(offset * OPEN.spread * spread),
      y: round(-OPEN.lift + Math.abs(offset) * OPEN.drop + place * OPEN.step),
      rotate: round(offset * OPEN.tilt),
    },
    layer: shown - place,
  }
}

/**
 * A folder's tone in one scheme: the mark its surfaces are tinted with and the
 * ink for text on its cover. No ink means a CSS colour the palette doesn't
 * know: the renderer mixes one from the mark and the text colour.
 */
type FolderTone = { mark: string; ink?: string }

/** The tone a colour gives a folder: a role's tokens, a palette colour's
 * mark and text, or a CSS colour as given. Gray is the neutral folder. */
function getFolderTone(color: string, scheme: PaletteScheme): FolderTone {
  if (color === "gray") {
    return { mark: "var(--muted-foreground)", ink: "var(--foreground)" }
  }
  if (isPaletteRole(color)) {
    return { mark: `var(--${color})`, ink: `var(--${color}-text)` }
  }
  if (isPaletteColorName(color)) {
    return {
      mark: getPaletteMark(color)[scheme],
      ink: getPaletteLiteral("text", scheme, PALETTE_COLORS[color]),
    }
  }
  return { mark: color }
}

// A CSS colour the palette doesn't know gets ink halfway to the text colour.
const getInk = ({ mark, ink }: FolderTone) =>
  ink ?? `color-mix(in oklab, ${mark} 55%, var(--foreground))`

/**
 * The variables a folder's colour sets on the website, per scheme; the style
 * map picks the scheme's. None for a neutral folder, which the style map
 * tints with the muted text colour.
 */
function getFolderColorVariables(color: string | undefined) {
  if (!color) return undefined
  const light = getFolderTone(color, "light")
  const dark = getFolderTone(color, "dark")
  return {
    "--folder-mark-light": light.mark,
    "--folder-mark-dark": dark.mark,
    "--folder-ink-light": getInk(light),
    "--folder-ink-dark": getInk(dark),
  }
}

export {
  FOLDER_FRONT_PATH,
  FOLDER_FRONT_VIEW_BOX,
  FOLDER_MAX_FILES,
  getFolderColorVariables,
  getFolderFileCount,
  getFolderFilePose,
  getFolderTone,
  type FolderFilePose,
  type FolderTone,
  type FolderFileTransform,
}
