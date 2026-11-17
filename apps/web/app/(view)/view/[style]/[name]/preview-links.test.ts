import { describe, expect, it } from "vitest"

import {
  getPreviewGuardScript,
  shouldKeepFormInPlace,
  shouldKeepPreviewInPlace,
} from "./preview-links"

describe("shouldKeepPreviewInPlace", () => {
  it("stops links that would leave the preview", () => {
    for (const href of [
      "/messages",
      "/",
      "/sign-up?plan=pro",
      "https://gartner.com/saas-growth-2026",
      "//cdn.example.com/x",
      "mailto:ada@acme.com",
      "tel:+351912345678",
    ]) {
      expect(shouldKeepPreviewInPlace({ href }), href).toBe(true)
    }
  })

  it("lets links that stay on the page or save a file through", () => {
    expect(shouldKeepPreviewInPlace({ href: "#details" })).toBe(false)
    expect(shouldKeepPreviewInPlace({ href: "" })).toBe(false)
    expect(shouldKeepPreviewInPlace({ href: null })).toBe(false)
    expect(shouldKeepPreviewInPlace({ href: "javascript:void(0)" })).toBe(false)
    expect(
      shouldKeepPreviewInPlace({
        href: "blob:http://localhost/1",
        download: true,
      })
    ).toBe(false)
    expect(
      shouldKeepPreviewInPlace({ href: "/report.csv", download: true })
    ).toBe(false)
  })
})

describe("shouldKeepFormInPlace", () => {
  it("stops a native submit, which would reload or leave the preview", () => {
    expect(shouldKeepFormInPlace(null)).toBe(true)
    expect(shouldKeepFormInPlace("")).toBe(true)
    expect(shouldKeepFormInPlace("/subscribe")).toBe(true)
  })

  it("leaves forms React runs through a function action alone", () => {
    expect(
      shouldKeepFormInPlace(
        "javascript:throw new Error('React form unexpectedly submitted.')"
      )
    ).toBe(false)
  })
})

describe("getPreviewGuardScript", () => {
  // Runs the inline script against a stand-in document and returns its
  // capture listeners.
  function install() {
    class FakeElement {
      constructor(
        private attributes: Record<string, string> = {},
        private link: FakeElement | null = null
      ) {}
      closest() {
        return this.link
      }
      getAttribute(name: string) {
        return this.attributes[name] ?? null
      }
      hasAttribute(name: string) {
        return name in this.attributes
      }
    }
    class FakeForm extends FakeElement {}
    const listeners: Record<string, (event: unknown) => void> = {}
    const document = {
      addEventListener: (
        type: string,
        listener: (event: unknown) => void,
        capture: boolean
      ) => {
        if (capture) listeners[type] = listener
      },
    }
    new Function(
      "document",
      "Element",
      "HTMLFormElement",
      getPreviewGuardScript()
    )(document, FakeElement, FakeForm)
    const dispatch = (type: string, target: unknown) => {
      let isPrevented = false
      listeners[type]?.({ target, preventDefault: () => (isPrevented = true) })
      return isPrevented
    }
    return { FakeElement, FakeForm, dispatch }
  }

  it("cancels a click on an app link before the page has hydrated", () => {
    const { FakeElement, dispatch } = install()
    const link = new FakeElement({ href: "/messages" })
    expect(dispatch("click", new FakeElement({}, link))).toBe(true)
    const anchor = new FakeElement({ href: "#main" })
    expect(dispatch("click", new FakeElement({}, anchor))).toBe(false)
  })

  it("cancels a form's native submit", () => {
    const { FakeForm, dispatch } = install()
    expect(dispatch("submit", new FakeForm())).toBe(true)
    expect(
      dispatch("submit", new FakeForm({ action: "javascript:throw 1" }))
    ).toBe(false)
  })
})
