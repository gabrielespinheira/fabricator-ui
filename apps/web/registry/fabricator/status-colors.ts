// Status colours: info, success, warning and error, each with a full surface
// ladder. A status block (a banner, an alert, a toast, a callout) can stack
// raised parts inside it exactly like the neutral surfaces, just tinted.
//
// Per status <s>:
// - --<s>              the solid colour: icons, dots, solid fills (≥ 3:1 on
//                      every neutral and tinted surface)
// - --<s>-foreground   text on a solid <s> fill (≥ 4.5:1)
// - --<s>-text         text on <s> surfaces and on neutral surfaces (≥ 4.5:1)
// - --<s>-border       a tinted hairline
// - --<s>-surface-1…8  the tinted ladder, matching the neutral one level for
//                      level: light lifts towards white and leans on shadows,
//                      dark lifts each level a step lighter
//
// Tailwind gets them as colours: bg-success-surface-3, text-success-text,
// border-success-border, bg-warning text-warning-foreground, fill-info…
// Values are OKLCH; the contrast test in __tests__/status-colors.test.ts keeps
// every pair above WCAG 2.2 AA.

export const STATUSES = ["info", "success", "warning", "error"] as const
export type Status = (typeof STATUSES)[number]

type Tone = {
  /** Hue in OKLCH degrees. */
  hue: number
  light: { solid: string; foreground: string; text: string; border: string }
  dark: { solid: string; foreground: string; text: string; border: string }
  /** Peak chroma of the tinted surfaces (level 1); higher levels taper off. */
  chroma: { light: number; dark: number }
}

const TONES: Record<Status, Tone> = {
  info: {
    hue: 256,
    light: {
      solid: "oklch(0.546 0.215 262.9)",
      foreground: "oklch(0.985 0 0)",
      text: "oklch(0.47 0.2 264)",
      border: "oklch(0.623 0.188 259.8 / 0.28)",
    },
    dark: {
      solid: "oklch(0.809 0.105 251.8)",
      foreground: "oklch(0.205 0 0)",
      text: "oklch(0.86 0.075 250)",
      border: "oklch(0.707 0.165 254.6 / 0.32)",
    },
    chroma: { light: 0.035, dark: 0.04 },
  },
  success: {
    hue: 152,
    light: {
      solid: "oklch(0.52 0.14 150)",
      foreground: "oklch(0.985 0 0)",
      text: "oklch(0.45 0.12 151)",
      border: "oklch(0.627 0.194 149.2 / 0.28)",
    },
    dark: {
      solid: "oklch(0.845 0.143 152)",
      foreground: "oklch(0.205 0 0)",
      text: "oklch(0.88 0.11 153)",
      border: "oklch(0.723 0.192 149.6 / 0.32)",
    },
    chroma: { light: 0.035, dark: 0.035 },
  },
  warning: {
    hue: 75,
    light: {
      solid: "oklch(0.62 0.14 60)",
      foreground: "oklch(0.205 0 0)",
      text: "oklch(0.47 0.115 50)",
      border: "oklch(0.769 0.165 70.1 / 0.38)",
    },
    dark: {
      solid: "oklch(0.86 0.155 88)",
      foreground: "oklch(0.205 0 0)",
      text: "oklch(0.89 0.12 90)",
      border: "oklch(0.828 0.189 84.4 / 0.3)",
    },
    chroma: { light: 0.045, dark: 0.04 },
  },
  error: {
    hue: 25,
    light: {
      solid: "oklch(0.577 0.215 27.3)",
      foreground: "oklch(0.985 0 0)",
      text: "oklch(0.5 0.19 27.5)",
      border: "oklch(0.637 0.237 25.3 / 0.28)",
    },
    dark: {
      solid: "oklch(0.808 0.114 19.6)",
      foreground: "oklch(0.205 0 0)",
      text: "oklch(0.85 0.09 18)",
      border: "oklch(0.704 0.191 22.2 / 0.32)",
    },
    chroma: { light: 0.03, dark: 0.04 },
  },
}

// The neutral ladder's lightness, level 1 to 8 (see foundations.ts).
const LIGHT_L = [0.97, 0.978, 0.986, 0.99, 0.993, 0.995, 0.997, 0.999]
const DARK_L = [0.215, 0.245, 0.274, 0.303, 0.331, 0.358, 0.385, 0.412]
// Chroma tapers as surfaces rise, so the top of the ladder stays calm.
const CHROMA_STEP = [1, 0.85, 0.72, 0.62, 0.54, 0.48, 0.43, 0.39]

function ladder(status: Status, mode: "light" | "dark") {
  const tone = TONES[status]
  const lightness = mode === "light" ? LIGHT_L : DARK_L
  return Object.fromEntries(
    lightness.map((l, index) => [
      `${status}-surface-${index + 1}`,
      `oklch(${l} ${(tone.chroma[mode] * CHROMA_STEP[index]).toFixed(4)} ${tone.hue})`,
    ])
  )
}

function vars(mode: "light" | "dark") {
  return Object.fromEntries(
    STATUSES.flatMap((status) => {
      const tone = TONES[status][mode]
      return [
        [status, tone.solid],
        [`${status}-foreground`, tone.foreground],
        [`${status}-text`, tone.text],
        [`${status}-border`, tone.border],
        ...Object.entries(ladder(status, mode)),
      ]
    })
  )
}

/** cssVars for the foundations item: Tailwind colours plus light/dark values. */
export const STATUS_CSS_VARS = {
  theme: Object.fromEntries(
    STATUSES.flatMap((status) => [
      [`color-${status}`, `var(--${status})`],
      [`color-${status}-foreground`, `var(--${status}-foreground)`],
      [`color-${status}-text`, `var(--${status}-text)`],
      [`color-${status}-border`, `var(--${status}-border)`],
      ...Array.from({ length: 8 }, (_, index) => [
        `color-${status}-surface-${index + 1}`,
        `var(--${status}-surface-${index + 1})`,
      ]),
    ])
  ),
  light: vars("light"),
  dark: vars("dark"),
}
