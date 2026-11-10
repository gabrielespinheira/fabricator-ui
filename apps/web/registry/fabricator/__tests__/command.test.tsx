import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import * as BaseCommand from "@/registry/fabricator/base/ui/command"
import * as RadixCommand from "@/registry/fabricator/radix/ui/command"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

describe.each([
  ["base", BaseCommand],
  ["radix", RadixCommand],
] as const)("%s command", (_, { Command, CommandSeparator }) => {
  it("hides decorative dividers from listbox semantics", () => {
    const html = renderToStaticMarkup(
      <Command>
        <CommandSeparator />
      </Command>
    )
    expect(html).toMatch(/data-slot="command-separator"[^>]*aria-hidden="true"/)
  })
})
