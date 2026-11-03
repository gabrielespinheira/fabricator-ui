import { describe, expect, it } from "vitest"

import { diffIconSets } from "./icon-set-diff"

const before = new Map([
  ["house", { svg: "<svg>a</svg>", aliases: [] }],
  ["bell", { svg: "<svg>b</svg>", aliases: [] }],
  ["gone", { svg: "<svg>c</svg>", aliases: [] }],
])

const after = new Map([
  ["house", { svg: "<svg>a</svg>", aliases: ["home"] }],
  ["bell", { svg: "<svg>B</svg>", aliases: [] }],
  ["new-icon", { svg: "<svg>d</svg>", aliases: [] }],
])

describe("diffIconSets", () => {
  it("sorts every name into added, changed, aliased and removed", () => {
    expect(diffIconSets(before, after)).toEqual({
      added: ["new-icon"],
      changed: ["bell"],
      aliased: ["house → home"],
      removed: ["gone"],
    })
  })

  it("reports nothing for identical sets", () => {
    expect(diffIconSets(before, before)).toEqual({
      added: [],
      changed: [],
      aliased: [],
      removed: [],
    })
  })
})
