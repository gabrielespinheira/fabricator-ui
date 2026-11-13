import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Checkbox as AriaCheckbox } from "../aria/ui/checkbox"
import { Checkbox as BaseCheckbox } from "../base/ui/checkbox"
import { Checkbox as RadixCheckbox } from "../radix/ui/checkbox"

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

const getIndicator = (markup: string) =>
  markup.match(/<span[^>]*data-slot="checkbox-indicator"[^>]*>/)?.[0] ?? ""

const BASES = {
  base: {
    off: <BaseCheckbox />,
    on: <BaseCheckbox defaultChecked />,
    mixed: <BaseCheckbox indeterminate />,
  },
  radix: {
    off: <RadixCheckbox />,
    on: <RadixCheckbox defaultChecked />,
    mixed: <RadixCheckbox checked="indeterminate" />,
  },
  aria: {
    off: <AriaCheckbox aria-label="Accept" />,
    on: <AriaCheckbox aria-label="Accept" defaultSelected />,
    mixed: <AriaCheckbox aria-label="Accept" isIndeterminate />,
  },
}

describe.each(Object.entries(BASES))("%s checkbox", (_, states) => {
  it("keeps the drawn mark mounted while unchecked, so it can animate out", () => {
    const markup = render(states.off)
    expect(markup).toContain('data-slot="checkbox-indicator"')
    expect(markup).toContain('data-slot="checkbox-mark"')
    expect(markup).toContain("group/checkbox-indicator")
  })

  it("draws a check and a minus with a normalised length", () => {
    const markup = render(states.on)
    expect(markup.match(/pathLength="1"/g)).toHaveLength(2)
    expect(markup).toContain("cn-checkbox-check")
    expect(markup).toContain("cn-checkbox-minus")
    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/)
  })

  it("marks the indicator checked when checked", () => {
    expect(getIndicator(render(states.on))).toMatch(
      /data-checked|data-state="checked"/
    )
  })

  it("marks the indicator indeterminate when mixed", () => {
    expect(getIndicator(render(states.mixed))).toMatch(
      /data-indeterminate|data-state="indeterminate"/
    )
  })
})
