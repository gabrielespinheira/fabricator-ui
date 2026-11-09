"use client"

import * as React from "react"
import { ListChecksIcon } from "lucide-react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
} from "@/styles/radix-fabricator/ui/chat-input"
import { Kbd } from "@/styles/radix-fabricator/ui/kbd"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireHeader,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/styles/radix-fabricator/ui/questionnaire"

type Question = {
  name: string
  title: string
  multiple?: boolean
  required: boolean
  choices: { value: string; label: string; description?: string }[]
}

const QUESTIONS: Question[] = [
  {
    name: "scope",
    title: "Where should the agent start?",
    required: true,
    choices: [
      {
        value: "api",
        label: "The API",
        description: "Routes and validation first",
      },
      {
        value: "interface",
        label: "The interface",
        description: "Screens and their states first",
      },
      {
        value: "slices",
        label: "Both, in small slices",
        description: "One feature end to end at a time",
      },
    ],
  },
  {
    name: "tests",
    title: "How should it test the work?",
    required: true,
    choices: [
      { value: "unit", label: "Unit tests" },
      { value: "e2e", label: "End-to-end tests" },
      { value: "none", label: "No tests for now" },
    ],
  },
  {
    name: "checks",
    title: "What should it check before it's done?",
    multiple: true,
    required: false,
    choices: [
      { value: "types", label: "Types" },
      { value: "lint", label: "Lint" },
      { value: "a11y", label: "Accessibility" },
    ],
  },
]

function getLabel(name: string, value: FormDataEntryValue) {
  const question = QUESTIONS.find((entry) => entry.name === name)
  return (
    question?.choices.find((choice) => choice.value === value)?.label ??
    String(value)
  )
}

export function QuestionnaireChat() {
  const [isAsking, setAsking] = React.useState(true)
  const [reply, setReply] = React.useState(
    "Before I start, a few questions about the work."
  )
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  // The questions take the input's place, and give it back with the focus.
  function finish(message: string) {
    setReply(message)
    setAsking(false)
    requestAnimationFrame(() => fieldRef.current?.focus())
  }

  function ask() {
    setReply("A few more questions before the next step.")
    setAsking(true)
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLInputElement>("fieldset:not([hidden]) input")
        ?.focus()
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const answers = new FormData(event.currentTarget)
    const scope = answers.get("scope")
    const tests = answers.get("tests")
    const checks = answers.getAll("checks")
    finish(
      [
        scope && `Starting with ${getLabel("scope", scope).toLowerCase()}`,
        tests && getLabel("tests", tests).toLowerCase(),
        checks.length > 0 &&
          `checking ${checks.map((value) => getLabel("checks", value)).join(", ")}`,
      ]
        .filter(Boolean)
        .join(", ") + "."
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <p className="px-1 text-sm text-muted-foreground">{reply}</p>
      {isAsking ? (
        <Questionnaire
          ref={formRef}
          items={QUESTIONS}
          shortcuts="numbers"
          advanceOnSelect
          aria-label="Questions from the agent"
          className="rounded-2xl bg-surface-3 p-4 shadow-surface-3"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return
            event.preventDefault()
            finish("Stopped. Ask me anything.")
          }}
        >
          <QuestionnaireHeader>
            <QuestionnaireProgress />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => finish("Stopped. Ask me anything.")}
            >
              Stop
              <Kbd>esc</Kbd>
            </Button>
          </QuestionnaireHeader>
          {QUESTIONS.map((question) => (
            <QuestionnaireItem
              key={question.name}
              name={question.name}
              multiple={question.multiple}
              required={question.required}
            >
              <QuestionnaireTitle>{question.title}</QuestionnaireTitle>
              <QuestionnaireChoices>
                {question.choices.map((choice) => (
                  <QuestionnaireChoice key={choice.value} value={choice.value}>
                    {choice.label}
                    {choice.description && (
                      <QuestionnaireChoiceDescription>
                        {choice.description}
                      </QuestionnaireChoiceDescription>
                    )}
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
            </QuestionnaireItem>
          ))}
          <QuestionnaireActions>
            <QuestionnairePrevious>Back</QuestionnairePrevious>
            <QuestionnaireSkip />
            <QuestionnaireNext>Continue</QuestionnaireNext>
            <QuestionnaireSubmit>Send answers</QuestionnaireSubmit>
          </QuestionnaireActions>
        </Questionnaire>
      ) : (
        <ChatInput onSubmit={() => setReply("On it.")}>
          <ChatInputTextarea ref={fieldRef} placeholder="Reply to the agent…" />
          <ChatInputFooter>
            <ChatInputTools>
              <ChatInputButton
                aria-label="Ask the questions again"
                onClick={ask}
              >
                <ListChecksIcon />
              </ChatInputButton>
            </ChatInputTools>
            <ChatInputActions>
              <ChatInputSubmit />
            </ChatInputActions>
          </ChatInputFooter>
        </ChatInput>
      )}
    </div>
  )
}
