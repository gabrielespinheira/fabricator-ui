import { describe, expect, it } from "vitest"

import { getExplorerExamples } from "./explorer-examples"

describe("documented explorer examples", () => {
  it("keeps documented order and labels, deduplicates and ignores code fences", () => {
    const raw = `
<ComponentPreview name="button-demo" />
## Sizes
<ComponentPreview
  styleName="base-nova"
  name="button-size"
/>
<ComponentPreview name="button-size" />
\`\`\`mdx
<ComponentPreview name="fake-demo" />
\`\`\`
`
    expect(getExplorerExamples(raw)).toEqual([
      { name: "button-demo", title: "Overview" },
      { name: "button-size", title: "Sizes" },
    ])
  })
})
