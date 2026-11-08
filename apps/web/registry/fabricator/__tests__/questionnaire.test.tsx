import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireHeader,
  QuestionnaireItem,
  QuestionnaireProgress,
  QuestionnaireTitle,
  shouldAdvanceQuestionnaire,
} from "@/registry/fabricator/shared/ui/questionnaire"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

describe("shouldAdvanceQuestionnaire", () => {
  it("moves on when a single choice is picked with the pointer", () => {
    expect(
      shouldAdvanceQuestionnaire({
        type: "radio",
        isPointer: true,
        key: null,
        shortcuts: "numbers",
      })
    ).toBe(true)
  })

  it("moves on when a single choice is picked by its shortcut", () => {
    expect(
      shouldAdvanceQuestionnaire({
        type: "radio",
        isPointer: false,
        key: "2",
        shortcuts: "numbers",
      })
    ).toBe(true)
    expect(
      shouldAdvanceQuestionnaire({
        type: "radio",
        isPointer: false,
        key: "b",
        shortcuts: "letters",
      })
    ).toBe(true)
  })

  it("stays while the arrows or space walk the choices", () => {
    for (const key of ["ArrowDown", "ArrowUp", " "])
      expect(
        shouldAdvanceQuestionnaire({
          type: "radio",
          isPointer: false,
          key,
          shortcuts: "numbers",
        })
      ).toBe(false)
  })

  it("ignores a key that isn't one of the shortcuts", () => {
    expect(
      shouldAdvanceQuestionnaire({
        type: "radio",
        isPointer: false,
        key: "a",
        shortcuts: "numbers",
      })
    ).toBe(false)
    expect(
      shouldAdvanceQuestionnaire({
        type: "radio",
        isPointer: false,
        key: "1",
        shortcuts: null,
      })
    ).toBe(false)
  })

  it("never moves on from a multiple choice, which takes several picks", () => {
    expect(
      shouldAdvanceQuestionnaire({
        type: "checkbox",
        isPointer: true,
        key: null,
        shortcuts: "numbers",
      })
    ).toBe(false)
  })
})

function renderQuestion(props: { advanceOnSelect?: boolean }) {
  return renderToStaticMarkup(
    <Questionnaire shortcuts="numbers" {...props}>
      <QuestionnaireHeader>
        <QuestionnaireProgress />
      </QuestionnaireHeader>
      <QuestionnaireItem name="timing">
        <QuestionnaireTitle>When should work begin?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="now">Start now</QuestionnaireChoice>
          <QuestionnaireChoice value="later">Later</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
    </Questionnaire>
  )
}

describe("Questionnaire", () => {
  it("marks the form when a single pick moves on", () => {
    expect(renderQuestion({ advanceOnSelect: true })).toContain(
      "data-advance-on-select"
    )
    expect(renderQuestion({})).not.toContain("data-advance-on-select")
  })

  it("puts each choice's chip after its label", () => {
    const html = renderQuestion({})
    const label = html.indexOf('data-slot="questionnaire-choice-label"')
    const chip = html.indexOf('data-slot="questionnaire-choice-indicator"')
    expect(label).toBeGreaterThan(-1)
    expect(chip).toBeGreaterThan(label)
  })

  it("renders the header row around the progress", () => {
    const html = renderQuestion({})
    expect(html).toContain('data-slot="questionnaire-header"')
    expect(html.indexOf('data-slot="questionnaire-header"')).toBeLessThan(
      html.indexOf('data-slot="questionnaire-progress"')
    )
  })
})
