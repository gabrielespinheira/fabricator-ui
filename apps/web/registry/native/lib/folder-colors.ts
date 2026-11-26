import {
  formatHex,
  parseColor,
  type Rgba,
} from "@/registry/fabricator/shared/lib/color-model"

// The website mixes a folder's colours in CSS (styles/fabricator/folder.css):
// the surfaces tinted with a share of the folder's mark, never the mark at full
// strength. React Native draws the front with react-native-svg, which takes
// finished colours, so the same recipe runs here, mixed in sRGB, close enough
// to the website's OKLab at these shares.

class FolderColorError extends Error {
  constructor(color: string) {
    super(
      `Folder can't read the colour "${color}": use a palette name, a role, hex, rgb(), hsl() or oklch().`
    )
    this.name = "FolderColorError"
  }
}

type FolderTokens = {
  /** The folder's mark, resolved: a palette or role colour, or the muted text colour. */
  mark: string
  foreground: string
  surface1: string
  surface3: string
  surface4: string
  surface5: string
  isDark: boolean
}

type FolderColors = {
  back: string
  front: string
  frontTop: string
  glassTop: string
  glassBottom: string
  paper: string
  line: string
}

// The website's shares of the mark in each surface, per scheme. A dark theme
// tints its lighter surfaces more, so the front stays above the back.
const SHARES = {
  light: { back: 0.3, front: 0.2, frontTop: 0.12 },
  dark: { back: 0.24, front: 0.36, frontTop: 0.44 },
}

// Without a blur behind it, native glass is denser than the website's, so the
// files read as behind a frosted pane rather than a clear one.
const GLASS = { top: 0.8, bottom: 0.95 }

function readColor(color: string) {
  const parsed = parseColor(color)
  if (!parsed) throw new FolderColorError(color)
  return parsed
}

/** `from` moved `share` of the way to `to`. */
function mix(from: Rgba, to: Rgba, share: number): Rgba {
  const step = (a: number, b: number) => a + (b - a) * share
  return {
    r: step(from.r, to.r),
    g: step(from.g, to.g),
    b: step(from.b, to.b),
    a: step(from.a, to.a),
  }
}

function getFolderColors({
  mark,
  foreground,
  surface1,
  surface3,
  surface4,
  surface5,
  isDark,
}: FolderTokens): FolderColors {
  const tint = readColor(mark)
  const shares = SHARES[isDark ? "dark" : "light"]
  const back = mix(readColor(surface1), tint, shares.back)
  const front = mix(readColor(isDark ? surface4 : surface3), tint, shares.front)
  const frontTop = mix(
    readColor(isDark ? surface5 : surface3),
    tint,
    shares.frontTop
  )
  return {
    back: formatHex(back),
    front: formatHex(front),
    frontTop: formatHex(frontTop),
    glassTop: formatHex({ ...frontTop, a: GLASS.top }),
    glassBottom: formatHex({ ...front, a: GLASS.bottom }),
    paper: formatHex(
      isDark
        ? mix(readColor(surface3), readColor(foreground), 0.76)
        : readColor(surface5)
    ),
    line: formatHex({ ...tint, a: 0.3 }),
  }
}

export { FolderColorError, getFolderColors, type FolderColors }
