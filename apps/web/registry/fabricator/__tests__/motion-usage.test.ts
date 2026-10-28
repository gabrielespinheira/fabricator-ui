import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Every Fabricator style map and override times its motion with the motion
// roles (registry/fabricator/motion.ts): `motion-<surface>` utilities,
// `duration-<role>`, `delay-<role>` and `ease-<curve>`. Milliseconds, literal
// curves, hard-coded zooms and the retired tier names would ignore the speed
// a project picks, so they fail here. New components follow the same rule.

const ROOT = path.join(process.cwd(), "registry")

const RULES: [string, RegExp][] = [
  [
    "the retired tier names (use a role: feedback, move, popup, …)",
    /\b(?:duration|delay)-(?:fast|moderate|slow)(?:-exit)?\b|\bease-spring(?:-bounce)?\b|--motion-(?:fast|moderate|slow|ease-spring)\b/,
  ],
  // 0 switches motion off, so it stays allowed.
  [
    "a fixed duration (use duration-<role>)",
    /\b(?:duration|delay)-(?!0\b)\d+\b/,
  ],
  [
    "milliseconds or seconds inside brackets",
    /\[[^\]\s]*?\d(?:\.\d+)?m?s\b[^\]\s]*\]/,
  ],
  ["a literal curve (use ease-<curve>)", /\bease-\[(?!var\()/],
  [
    "a fixed zoom (use motion-<surface> or --motion-<surface>-scale)",
    /\bzoom-(?:in|out)-(?:\[[\d.]+\]|(?!100\b)\d+)\b/,
  ],
]

// The search field's clear button pops in from 0.75: an icon swap, not a
// surface.
const ALLOWED = new Set(["zoom-in-75"])

function listFiles(dir: string, extension: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name)
    if (statSync(file).isDirectory()) return listFiles(file, extension)
    return file.endsWith(extension) ? [file] : []
  })
}

function findViolations(files: string[], pick: (source: string) => string[]) {
  return files.flatMap((file) =>
    pick(readFileSync(file, "utf8")).flatMap((classes) =>
      classes
        .split(/\s+/)
        .filter((token) => !ALLOWED.has(token.split(":").at(-1) ?? token))
        .flatMap((token) =>
          RULES.filter(([, pattern]) => pattern.test(token)).map(
            ([reason]) => `${path.relative(ROOT, file)}: ${token} (${reason})`
          )
        )
    )
  )
}

const applyLines = (source: string) =>
  [...source.matchAll(/@apply ([^;]*);/g)].map((match) => match[1])

const stringLiterals = (source: string) =>
  [...source.matchAll(/"([^"\n]*)"/g)].map((match) => match[1])

describe("motion usage", () => {
  it("style maps time motion with roles", () => {
    const files = listFiles(path.join(ROOT, "styles/fabricator"), ".css")
    expect(findViolations(files, applyLines)).toEqual([])
  })

  it("overrides time motion with roles", () => {
    const files = ["base", "radix", "aria", "shared"].flatMap((folder) =>
      listFiles(path.join(ROOT, "fabricator", folder), ".tsx")
    )
    expect(findViolations(files, stringLiterals)).toEqual([])
  })
})
