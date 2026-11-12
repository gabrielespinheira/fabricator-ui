import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

import { ThemeToggle } from "../shared/ui/theme-toggle"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

it("keeps the server trigger inert and stable until its theme is resolved", () => {
  const markup = renderToStaticMarkup(
    <ThemeToggle theme={undefined} onThemeChange={() => {}} />
  )
  expect(markup).toContain('data-slot="theme-toggle"')
  expect(markup).toContain('data-ready="false"')
  expect(markup).toContain("disabled")
  expect(markup).toContain('type="button"')
  expect(markup).toContain('aria-label="Switch to dark theme"')
  expect(markup).toContain('aria-hidden="true"')
})

it("composes Button's variants, sizes and accessible name", () => {
  const markup = renderToStaticMarkup(
    <ThemeToggle
      theme="dark"
      onThemeChange={() => {}}
      buttonVariant="outline"
      size="icon-sm"
      aria-label="Change appearance"
    />
  )
  expect(markup).toContain("cn-button-variant-outline")
  expect(markup).toContain("cn-button-size-icon-sm")
  expect(markup).toContain('aria-label="Change appearance"')
  expect(markup.match(/data-slot="theme-toggle-sun"/g)).toHaveLength(1)
  expect(markup.match(/data-slot="theme-toggle-moon"/g)).toHaveLength(1)
})
