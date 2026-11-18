import { describe, expect, test } from "vitest"

import { rebrandCode, rebrandDocs } from "./rebrand"

describe("avatar demos", () => {
  test("drop a grayscale-only className from an avatar part", () => {
    expect(rebrandCode(`<AvatarGroup className="grayscale">`)).toBe(
      `<AvatarGroup>`
    )
    expect(
      rebrandCode(`<AvatarImage src={person.avatar} className="grayscale" />`)
    ).toBe(`<AvatarImage src={person.avatar} />`)
  })

  test("keep the other classes of an avatar part", () => {
    expect(
      rebrandCode(`<Avatar className="size-8 rounded-lg grayscale">`)
    ).toBe(`<Avatar className="size-8 rounded-lg">`)
  })

  test("reach a className on a later line of the tag", () => {
    const source = `<AvatarImage
  src="https://github.com/evilrabbit.png"
  alt="@evilrabbit"
  className="grayscale"
/>`
    expect(rebrandCode(source)).toBe(`<AvatarImage
  src="https://github.com/evilrabbit.png"
  alt="@evilrabbit"
/>`)
  })

  test("drop grayscale from a wrapper that styles its avatars", () => {
    expect(
      rebrandCode(
        `<div className="flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">`
      )
    ).toBe(`<div className="flex -space-x-2 *:data-[slot=avatar]:ring-2">`)
    expect(
      rebrandCode(`<div className="flex gap-2 grayscale">
  <Avatar size="sm">`)
    ).toBe(`<div className="flex gap-2">
  <Avatar size="sm">`)
  })

  test("leave grayscale on everything else", () => {
    const image = `<img className="object-cover grayscale" />`
    expect(rebrandCode(image)).toBe(image)
    const fallback = `<AvatarFallback className="grayscale">`
    expect(rebrandCode(fallback)).toBe(fallback)
  })

  test("apply to docs too", () => {
    expect(rebrandDocs(`<AvatarGroup className="grayscale">`)).toBe(
      `<AvatarGroup>`
    )
  })
})
