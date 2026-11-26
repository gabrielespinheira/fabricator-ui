// Text Motion: how a string splits into pieces and when each piece plays.
//
// Every time here is a multiple of one piece's duration, the reveal motion
// role, so a project's speed, `data-motion` and `--motion-scale` retime the
// whole sequence. Pure: the web component and a native port share it.

export const TEXT_MOTION_BY = ["character", "word", "line", "text"] as const

export type TextMotionBy = (typeof TEXT_MOTION_BY)[number]

/** Entrance layers. Each sets its own property, so any set combines. */
export const TEXT_MOTION_LAYERS = [
  "fade",
  "blur",
  "rise",
  "fall",
  "slide",
  "scale",
  "flip",
  "mask",
  "scramble",
] as const

export type TextMotionLayer = (typeof TEXT_MOTION_LAYERS)[number]

/** A layer, a list of layers, or `type`, which plays on its own. */
export type TextMotionEffect = TextMotionLayer | TextMotionLayer[] | "type"

/** Loops that run once the entrance is over. */
export const TEXT_MOTION_LOOPS = ["shimmer", "wave"] as const

export type TextMotionLoop = (typeof TEXT_MOTION_LOOPS)[number]

/** Where the stagger starts. */
export const TEXT_MOTION_FROM = [
  "start",
  "end",
  "center",
  "edges",
  "random",
] as const

export type TextMotionFrom = (typeof TEXT_MOTION_FROM)[number]

export type TextMotionCharacter = { text: string; index: number }

export type TextMotionWord = {
  text: string
  index: number
  characters: TextMotionCharacter[]
}

export type TextMotionLine = {
  text: string
  index: number
  words: TextMotionWord[]
}

export type TextMotionSplit = {
  lines: TextMotionLine[]
  /** How many pieces play at the chosen level. */
  count: number
}

const DEFAULT_EFFECTS: TextMotionLayer[] = ["fade", "blur", "rise"]

// Smaller pieces sit closer together, so a word and a headline by
// characters take about as long to read in.
const STAGGER: Record<TextMotionBy, number> = {
  character: 0.05,
  word: 0.12,
  line: 0.3,
  text: 0,
}

// Typing shows each piece at once, one after another, near reading pace.
const TYPE_STAGGER: Record<TextMotionBy, number> = {
  character: 0.08,
  word: 0.3,
  line: 0.9,
  text: 0,
}

// The next Text Motion in a group starts while the last pieces of the one
// before it are still landing, so a sequence reads as one gesture.
const GROUP_OVERLAP = 0.4

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" })

function toCharacters(text: string) {
  return Array.from(graphemes.segment(text), (part) => part.segment)
}

/** Splits text into lines (at `\n`), words (at whitespace) and graphemes. */
export function splitTextMotion(
  text: string,
  by: TextMotionBy
): TextMotionSplit {
  let wordIndex = 0
  let characterIndex = 0
  const lines = text.split(/\r?\n/).map((lineText, lineIndex) => {
    const words = lineText
      .split(/\s+/)
      .filter(Boolean)
      .map((wordText) => ({
        text: wordText,
        index: wordIndex++,
        characters: toCharacters(wordText).map((characterText) => ({
          text: characterText,
          index: characterIndex++,
        })),
      }))
    return { text: lineText.trim(), index: lineIndex, words }
  })
  const countBy: Record<TextMotionBy, number> = {
    character: characterIndex,
    word: wordIndex,
    line: lines.filter((line) => line.words.length > 0).length,
    text: wordIndex > 0 ? 1 : 0,
  }
  return { lines, count: countBy[by] }
}

/** FNV-1a, so a seed string always draws the same numbers. */
function hashText(text: string) {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Mulberry32: a small seeded generator from 0 to 1. */
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let next = Math.imul(state ^ (state >>> 15), 1 | state)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The step each piece plays on. Pieces sharing a step play together: from
 * the centre, the two around it go first. `random` is seeded by the text, so
 * the server and the browser agree.
 */
export function getTextMotionOrder(
  count: number,
  from: TextMotionFrom,
  seed: string
): number[] {
  const indexes = Array.from({ length: count }, (_, index) => index)
  const middle = (count - 1) / 2
  const fromCenter = (index: number) => Math.floor(Math.abs(index - middle))
  if (from === "end") return indexes.map((index) => count - 1 - index)
  if (from === "center") return indexes.map(fromCenter)
  if (from === "edges") {
    const farthest = fromCenter(0)
    return indexes.map((index) => farthest - fromCenter(index))
  }
  if (from === "random") {
    const random = createRandom(hashText(seed))
    const shuffled = [...indexes]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1))
      ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
    }
    return shuffled
  }
  return indexes
}

/** The time between one step and the next, in piece durations. */
export function getTextMotionStagger(by: TextMotionBy, isTyping: boolean) {
  return (isTyping ? TYPE_STAGGER : STAGGER)[by]
}

/** How long a whole Text Motion plays, in piece durations. */
export function getTextMotionSpan(
  steps: number,
  stagger: number,
  isTyping: boolean
) {
  if (steps === 0) return 0
  if (isTyping) return steps * stagger
  return (steps - 1) * stagger + 1
}

/** When each Text Motion in a group starts, in piece durations. */
export function getTextMotionStarts(spans: number[]) {
  return spans.reduce<number[]>((starts, _, index) => {
    if (index === 0) return [0]
    const previous = starts[index - 1] + spans[index - 1] - GROUP_OVERLAP
    return [...starts, Math.max(starts[index - 1], previous)]
  }, [])
}

/** The entrance layers, once each; fade, blur and rise by default. */
export function getTextMotionEffects(
  effect: TextMotionLayer | TextMotionLayer[] | undefined
): TextMotionLayer[] {
  if (effect === undefined) return DEFAULT_EFFECTS
  return [...new Set(Array.isArray(effect) ? effect : [effect])]
}

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const LOWER = "abcdefghijklmnopqrstuvwxyz"
const DIGITS = "0123456789"
const SYMBOLS = "#%&*+=<>/\\[]{}"

function getGlyphs(character: string) {
  if (/\p{Lu}/u.test(character)) return UPPER
  if (/\p{Ll}/u.test(character)) return LOWER
  if (/\p{Nd}/u.test(character)) return DIGITS
  if (/[\p{L}\p{N}]/u.test(character)) return SYMBOLS
  return null
}

/**
 * A scrambled frame of `text` at `progress` (0 to 1). Characters settle from
 * the start; the rest draw a random glyph of the same kind (capital, small,
 * digit), so the shape of the text holds. Spaces and punctuation stay.
 */
export function getTextMotionScramble(
  text: string,
  progress: number,
  frame: number
) {
  const characters = toCharacters(text)
  const random = createRandom(hashText(`${text}:${frame}`))
  return characters
    .map((character, index) => {
      const glyphs = getGlyphs(character)
      const draw = random()
      if (!glyphs || progress >= (index + 1) / characters.length) {
        return character
      }
      return glyphs[Math.floor(draw * glyphs.length)]
    })
    .join("")
}

/**
 * A motion token read from the page (`700ms` or `.7s`, as minified CSS
 * writes it) times `--motion-scale`, in milliseconds.
 */
export function getTextMotionDuration(duration: string, scale: string) {
  const match = duration.trim().match(/^(-?[\d.]+)(ms|s)$/)
  if (!match) return 0
  const milliseconds = Number(match[1]) * (match[2] === "s" ? 1000 : 1)
  const factor = scale.trim() === "" ? 1 : Number(scale)
  return milliseconds * factor
}

/** A piece's progress at `elapsed`, given when it starts and how long. */
export function getTextMotionProgress(
  elapsed: number,
  start: number,
  duration: number
) {
  if (duration <= 0) return elapsed >= start ? 1 : 0
  return Math.min(1, Math.max(0, (elapsed - start) / duration))
}
