import { describe, expect, it } from "vitest"

import {
  applyAnswer,
  applyInput,
  applySkip,
  EMPTY_ANSWER,
  getAnswerValue,
  getChoiceShortcuts,
  getEnabledItems,
  getItemStatus,
  getItemValidity,
  getKeyboardProps,
  getProgress,
  INPUT_ANSWER,
  resolveActiveItem,
  seedAnswer,
  upsertItem,
  type QuestionnaireItemDefinition,
} from "@/registry/native/lib/questionnaire-model"

describe("getEnabledItems and resolveActiveItem", () => {
  const items = [{ name: "a", disabled: true }, { name: "b" }, { name: "c" }]
  const enabled = getEnabledItems(items)

  it("drops disabled items", () => {
    expect(enabled.map((item) => item.name)).toEqual(["b", "c"])
  })

  it("keeps a wanted item that is enabled", () => {
    expect(resolveActiveItem(enabled, "c")).toBe("c")
  })

  it("falls back to the first enabled item", () => {
    expect(resolveActiveItem(enabled, "a")).toBe("b")
    expect(resolveActiveItem(enabled, undefined)).toBe("b")
    expect(resolveActiveItem(enabled, "missing")).toBe("b")
  })

  it("has nothing to show without items", () => {
    expect(resolveActiveItem([], "a")).toBeNull()
  })
})

describe("getProgress", () => {
  const items = [{ name: "a" }, { name: "b" }, { name: "c" }]

  it("counts from one", () => {
    expect(getProgress(items, "a")).toEqual({
      index: 0,
      current: 1,
      total: 3,
      first: true,
      last: false,
    })
    expect(getProgress(items, "c")).toEqual({
      index: 2,
      current: 3,
      total: 3,
      first: false,
      last: true,
    })
  })

  it("reports an empty questionnaire", () => {
    expect(getProgress([], null)).toEqual({
      index: -1,
      current: 0,
      total: 0,
      first: false,
      last: false,
    })
  })
})

describe("upsertItem", () => {
  it("adds in mount order and keeps a changed item's place", () => {
    const first = upsertItem<QuestionnaireItemDefinition>([], { name: "a" })
    const second = upsertItem(first, { name: "b" })
    const changed = upsertItem(second, { name: "a", disabled: true })
    expect(changed).toEqual([{ name: "a", disabled: true }, { name: "b" }])
  })
})

describe("answers", () => {
  it("a single answer replaces the last", () => {
    const one = applyAnswer(EMPTY_ANSWER, "x", true, false)
    const two = applyAnswer(one, "y", true, false)
    expect(two.selected).toEqual(["y"])
  })

  it("a multiple answer adds and removes", () => {
    const one = applyAnswer(EMPTY_ANSWER, "x", true, true)
    const two = applyAnswer(one, "y", true, true)
    expect(two.selected).toEqual(["x", "y"])
    expect(applyAnswer(two, "x", false, true).selected).toEqual(["y"])
  })

  it("answering clears a skip", () => {
    const skipped = applySkip(applyAnswer(EMPTY_ANSWER, "x", true, false))
    expect(skipped.selected).toEqual([])
    expect(applyAnswer(skipped, "y", true, false).skipped).toBe(false)
  })

  it("the first default wins in a single answer", () => {
    const one = seedAnswer(EMPTY_ANSWER, "x", false)
    expect(seedAnswer(one, "y", false).selected).toEqual(["x"])
    const many = seedAnswer(EMPTY_ANSWER, "x", true)
    expect(seedAnswer(many, "y", true).selected).toEqual(["x", "y"])
  })
})

describe("applyInput", () => {
  it("typing makes the text the answer and clears a chosen one", () => {
    const chosen = applyAnswer(EMPTY_ANSWER, "x", true, false)
    const typed = applyInput(chosen, "Something else", false)
    expect(typed.selected).toEqual([INPUT_ANSWER])
    expect(typed.input).toBe("Something else")
  })

  it("adds to the choices of a multiple answer", () => {
    const chosen = applyAnswer(EMPTY_ANSWER, "x", true, true)
    expect(applyInput(chosen, "More", true).selected).toEqual([
      "x",
      INPUT_ANSWER,
    ])
  })

  it("only whitespace isn't an answer", () => {
    const typed = applyInput(EMPTY_ANSWER, "Text", false)
    expect(applyInput(typed, "   ", false).selected).toEqual([])
  })

  it("choosing keeps the text but stops it being the answer", () => {
    const typed = applyInput(EMPTY_ANSWER, "Text", false)
    const chosen = applyAnswer(typed, "x", true, false)
    expect(chosen.selected).toEqual(["x"])
    expect(chosen.input).toBe("Text")
  })
})

describe("getItemStatus", () => {
  it("follows the answer", () => {
    expect(getItemStatus(EMPTY_ANSWER)).toBe("unanswered")
    expect(getItemStatus(applyAnswer(EMPTY_ANSWER, "x", true, false))).toBe(
      "answered"
    )
    expect(getItemStatus(applySkip(EMPTY_ANSWER))).toBe("skipped")
  })
})

describe("getItemValidity", () => {
  const answered = applyAnswer(EMPTY_ANSWER, "x", true, false)
  const attempted = { ...EMPTY_ANSWER, attempted: true }

  it("needs an answer to continue, and shows no error before an attempt", () => {
    expect(getItemValidity(EMPTY_ANSWER, {})).toEqual({
      canContinue: false,
      isInvalid: false,
    })
    expect(getItemValidity(attempted, {})).toEqual({
      canContinue: false,
      isInvalid: true,
    })
  })

  it("an answer continues", () => {
    expect(getItemValidity(answered, {}).canContinue).toBe(true)
  })

  it("a skipped optional item continues; a required one doesn't", () => {
    const skipped = { ...applySkip(EMPTY_ANSWER), attempted: true }
    expect(getItemValidity(skipped, {})).toEqual({
      canContinue: true,
      isInvalid: false,
    })
    expect(getItemValidity(skipped, { required: true })).toEqual({
      canContinue: false,
      isInvalid: true,
    })
  })

  it("a disabled item never blocks", () => {
    expect(getItemValidity(attempted, { disabled: true })).toEqual({
      canContinue: true,
      isInvalid: false,
    })
  })

  it("marking an item invalid blocks even when answered", () => {
    expect(getItemValidity(answered, { invalid: true })).toEqual({
      canContinue: false,
      isInvalid: true,
    })
  })
})

describe("getAnswerValue", () => {
  it("gives a single answer as a string", () => {
    const answer = applyAnswer(EMPTY_ANSWER, "x", true, false)
    expect(getAnswerValue(answer, false)).toBe("x")
  })

  it("gives the text when it is the answer", () => {
    expect(getAnswerValue(applyInput(EMPTY_ANSWER, "Note", false), false)).toBe(
      "Note"
    )
  })

  it("gives a multiple answer as a list, with the text", () => {
    const choice = applyAnswer(EMPTY_ANSWER, "x", true, true)
    expect(getAnswerValue(applyInput(choice, "Note", true), true)).toEqual([
      "x",
      "Note",
    ])
  })

  it("leaves out what wasn't answered", () => {
    expect(getAnswerValue(EMPTY_ANSWER, false)).toBeUndefined()
    expect(getAnswerValue(EMPTY_ANSWER, true)).toEqual([])
    const skipped = applySkip(applyAnswer(EMPTY_ANSWER, "x", true, false))
    expect(getAnswerValue(skipped, false)).toBeUndefined()
  })
})

describe("getChoiceShortcuts", () => {
  const choices = [
    { value: "a" },
    { value: "b", disabled: true },
    { value: "c" },
  ]

  it("gives letters to enabled choices in order", () => {
    expect([...getChoiceShortcuts(choices, "letters")]).toEqual([
      ["a", "A"],
      ["c", "B"],
    ])
  })

  it("gives numbers from one", () => {
    expect([...getChoiceShortcuts(choices, "numbers")]).toEqual([
      ["a", "1"],
      ["c", "2"],
    ])
  })

  it("gives nothing without a mode", () => {
    expect(getChoiceShortcuts(choices, undefined).size).toBe(0)
  })

  it("stops at nine numbers", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      value: String(index),
    }))
    expect(getChoiceShortcuts(many, "numbers").size).toBe(9)
    expect(getChoiceShortcuts(many, "letters").size).toBe(12)
  })
})

describe("getKeyboardProps", () => {
  it("maps the web's input types", () => {
    expect(getKeyboardProps("email").keyboardType).toBe("email-address")
    expect(getKeyboardProps("number").keyboardType).toBe("numeric")
    expect(getKeyboardProps("tel").keyboardType).toBe("phone-pad")
    expect(getKeyboardProps("url").keyboardType).toBe("url")
    expect(getKeyboardProps("password").secureTextEntry).toBe(true)
    expect(getKeyboardProps("text")).toEqual({})
    expect(getKeyboardProps(undefined)).toEqual({})
  })
})
