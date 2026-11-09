// Syntax colours: the colours Syntax Highlight paints code with, as tokens in
// the foundations, built the way the colour roles are.
//
// - --syntax-function   info's hue and chroma
// - --syntax-string     success's
// - --syntax-constant   warning's (numbers, booleans, attributes)
// - --syntax-tag        destructive's (tags, selectors, variables)
// - --syntax-keyword    its own pair, --syntax-keyword-hue and -chroma
// - --syntax-type       its own pair, --syntax-type-hue and -chroma
// - --syntax-comment, --syntax-punctuation: neutrals tinted by the surfaces
//
// The four linked colours follow their role: retint info and functions turn
// with it; set a role to strength 0 and its tokens go neutral. Keyword and
// type have no role of their own (violet and cyan aren't statuses), so they
// take their own two variables.
//
// Every colour is one slot of the role recipe, the same lightness at any hue,
// so no token outshouts another: light text sits at 0.47 (the roles' coloured
// text is 0.45), dark at 0.78 with chroma capped at 0.11, which keeps every
// hue inside sRGB up to roleMaxChroma. __tests__/syntax-colors.test.ts checks
// 4.5:1 on the first four surfaces, tinted or not, for any role setting.

import {
  colorSlotCss,
  colorSlotLiteral,
  roleSlotCss,
  roleSlotLiteral,
  type ColorRole,
  type ColorSlot,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import {
  tintedCss,
  tintedLiteral,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"

type Mode = "light" | "dark"

export const SYNTAX_COLORS = [
  "keyword",
  "function",
  "string",
  "constant",
  "type",
  "tag",
] as const
export type SyntaxColor = (typeof SYNTAX_COLORS)[number]

/** Every token: the six colours and the two neutrals. */
export const SYNTAX_TOKENS = [
  ...SYNTAX_COLORS,
  "comment",
  "punctuation",
] as const

/** The role each colour follows, or null for its own variables. */
export const SYNTAX_SOURCES: Record<SyntaxColor, ColorRole | null> = {
  keyword: null,
  function: "info",
  string: "success",
  constant: "warning",
  type: null,
  tag: "destructive",
}

type OwnColor = "keyword" | "type"

/** The colours with their own variables, at their defaults. */
export const SYNTAX_DEFAULTS: Record<OwnColor, RoleColor> = {
  keyword: { hue: 315, chroma: 0.16 },
  type: { hue: 195, chroma: 0.08 },
}

const OWN_COLORS = Object.keys(SYNTAX_DEFAULTS) as OwnColor[]

const COLOR_SLOT: Record<Mode, ColorSlot> = {
  light: { l: [0.205, 0.47], share: 0.85 },
  dark: { l: [0.97, 0.78], share: 1, cap: 0.11 },
}

// Comments recede, punctuation sits between them and the code. Both take the
// surface tint, as muted text does; `drop` darkens a tinted comment so it
// keeps its contrast on a tinted page.
const NEUTRAL_STEPS: Record<
  "comment" | "punctuation",
  Record<Mode, { l: number; share: number; drop?: number }>
> = {
  comment: {
    light: { l: 0.51, share: 1, drop: 0.4 },
    dark: { l: 0.7, share: 1 },
  },
  punctuation: {
    light: { l: 0.42, share: 1, drop: 0.4 },
    dark: { l: 0.8, share: 1 },
  },
}

/** The syntax tokens as CSS that follows the roles and the surface tint. */
export function syntaxCss(mode: Mode): Record<string, string> {
  const slot = COLOR_SLOT[mode]
  return {
    ...Object.fromEntries(
      SYNTAX_COLORS.map((name) => {
        const role = SYNTAX_SOURCES[name]
        return [
          `syntax-${name}`,
          role
            ? roleSlotCss(role, slot)
            : colorSlotCss(
                slot,
                `var(--syntax-${name}-hue)`,
                `var(--syntax-${name}-chroma)`
              ),
        ]
      })
    ),
    "syntax-comment": tintedCss(NEUTRAL_STEPS.comment[mode]),
    "syntax-punctuation": tintedCss(NEUTRAL_STEPS.punctuation[mode]),
  }
}

/** The syntax tokens as literal colours for one look (native, tests). */
export function syntaxLiterals(
  mode: Mode,
  roles: Record<ColorRole, RoleColor>,
  tint: SurfaceTint
): Record<(typeof SYNTAX_TOKENS)[number], string> {
  const slot = COLOR_SLOT[mode]
  const colors = Object.fromEntries(
    SYNTAX_COLORS.map((name) => {
      const role = SYNTAX_SOURCES[name]
      return [
        name,
        role
          ? roleSlotLiteral(role, slot, roles[role])
          : colorSlotLiteral(slot, SYNTAX_DEFAULTS[name as OwnColor]),
      ]
    })
  ) as Record<SyntaxColor, string>
  return {
    ...colors,
    comment: tintedLiteral(NEUTRAL_STEPS.comment[mode], tint),
    punctuation: tintedLiteral(NEUTRAL_STEPS.punctuation[mode], tint),
  }
}

/** cssVars for the foundations: Tailwind colours plus light/dark values. */
export const SYNTAX_CSS_VARS = {
  theme: Object.fromEntries(
    SYNTAX_TOKENS.map((name) => [
      `color-syntax-${name}`,
      `var(--syntax-${name})`,
    ])
  ),
  light: {
    ...Object.fromEntries(
      OWN_COLORS.flatMap((name) => [
        [`syntax-${name}-hue`, String(SYNTAX_DEFAULTS[name].hue)],
        [`syntax-${name}-chroma`, String(SYNTAX_DEFAULTS[name].chroma)],
      ])
    ),
    ...syntaxCss("light"),
  },
  dark: syntaxCss("dark"),
}
