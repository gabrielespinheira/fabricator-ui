export type IconSnapshot = { svg: string; aliases: string[] }

export type IconSetDiff = {
  added: string[]
  changed: string[]
  /** New aliases, written `name → alias`: usually a rename. */
  aliased: string[]
  removed: string[]
}

export function diffIconSets(
  before: Map<string, IconSnapshot>,
  after: Map<string, IconSnapshot>
): IconSetDiff {
  const diff: IconSetDiff = { added: [], changed: [], aliased: [], removed: [] }

  for (const [name, icon] of after) {
    const previous = before.get(name)
    if (!previous) {
      diff.added.push(name)
      continue
    }
    if (previous.svg !== icon.svg) diff.changed.push(name)
    for (const alias of icon.aliases) {
      if (!previous.aliases.includes(alias))
        diff.aliased.push(`${name} → ${alias}`)
    }
  }
  for (const name of before.keys()) {
    if (!after.has(name)) diff.removed.push(name)
  }

  for (const list of Object.values(diff)) list.sort()
  return diff
}
