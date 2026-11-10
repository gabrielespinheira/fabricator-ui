import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  ChatInput,
  ChatInputActions,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
} from "@/registry/native/ui/chat-input"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireHeader,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  useQuestionnaire,
  type QuestionnaireAnswers,
} from "@/registry/native/ui/questionnaire"
import { Text } from "@/registry/native/ui/text"

const PLAN_ITEMS = [
  {
    name: "direction",
    required: true,
    choices: [
      { value: "tools" },
      { value: "approvals" },
      { value: "handoffs" },
    ],
  },
  {
    name: "signals",
    choices: [
      { value: "progress" },
      { value: "decisions" },
      { value: "risks" },
    ],
  },
  { name: "timing", required: true },
]

type Question = {
  name: string
  title: string
  multiple?: boolean
  required: boolean
  choices: { value: string; label: string; description?: string }[]
}

// The website's "In a chat" questions.
const CHAT_QUESTIONS: Question[] = [
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
        label: "Vertical slices",
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

function getLabel(name: string, value: string) {
  const question = CHAT_QUESTIONS.find((entry) => entry.name === name)
  return (
    question?.choices.find((choice) => choice.value === value)?.label ?? value
  )
}

/**
 * The agent's questions in a chat input's place: a single pick moves on, Stop
 * gives the input back, and so does the last answer.
 */
function QuestionnaireChat() {
  const [isAsking, setAsking] = React.useState(true)
  const [reply, setReply] = React.useState(
    "Before I start, a few questions about the work."
  )
  const finish = (message: string) => {
    setReply(message)
    setAsking(false)
  }
  return (
    <View className="w-full gap-3">
      <Text className="px-1 text-sm text-muted-foreground">{reply}</Text>
      {isAsking ? (
        <Questionnaire
          items={CHAT_QUESTIONS}
          shortcuts="numbers"
          advanceOnSelect
          accessibilityLabel="Questions from the agent"
          className="rounded-2xl bg-surface-3 p-4 shadow-surface-3"
          onSubmit={(answers) => {
            const scope = answers.scope
            const tests = answers.tests
            const checks = answers.checks
            finish(
              [
                typeof scope === "string" &&
                  `Starting with ${getLabel("scope", scope).toLowerCase()}`,
                typeof tests === "string" &&
                  getLabel("tests", tests).toLowerCase(),
                Array.isArray(checks) &&
                  checks.length > 0 &&
                  `checking ${checks.map((value) => getLabel("checks", value)).join(", ")}`,
              ]
                .filter(Boolean)
                .join(", ") + "."
            )
          }}
        >
          <QuestionnaireHeader>
            <QuestionnaireProgress />
            <Button
              variant="ghost"
              size="sm"
              onPress={() => finish("Stopped. Ask me anything.")}
            >
              Stop
            </Button>
          </QuestionnaireHeader>
          {CHAT_QUESTIONS.map((question) => (
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
                    <Text>{choice.label}</Text>
                    {choice.description ? (
                      <QuestionnaireChoiceDescription>
                        {choice.description}
                      </QuestionnaireChoiceDescription>
                    ) : null}
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
          <ChatInputTextarea placeholder="Reply to the agent…" />
          <ChatInputFooter>
            <ChatInputActions>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setReply("A few more questions before the next step.")
                  setAsking(true)
                }}
              >
                Ask again
              </Button>
              <ChatInputSubmit />
            </ChatInputActions>
          </ChatInputFooter>
        </ChatInput>
      )}
    </View>
  )
}

function Answers({ answers }: { answers: QuestionnaireAnswers | null }) {
  if (!answers) return null
  return (
    <Text className="text-muted-foreground">{JSON.stringify(answers)}</Text>
  )
}

function ResetButton() {
  const { reset } = useQuestionnaire()
  return (
    <Button variant="ghost" onPress={reset}>
      Reset
    </Button>
  )
}

function QuestionnaireExample() {
  const [plan, setPlan] = React.useState<QuestionnaireAnswers | null>(null)
  const [item, setItem] = React.useState("scope")
  const [runtime, setRuntime] = React.useState("local")
  const conditionalItems = React.useMemo(
    () => [
      { name: "runtime", required: true },
      { name: "environment", required: true, disabled: runtime !== "cloud" },
      { name: "approval", required: true },
    ],
    [runtime]
  )
  return (
    <ExampleWrapper>
      <Example
        title="In a chat, moving on as you pick"
        className="items-stretch"
      >
        <QuestionnaireChat />
      </Example>
      <Example
        title="Required, multiple, skip and free text"
        className="items-stretch"
      >
        <Questionnaire
          defaultItem="direction"
          items={PLAN_ITEMS}
          shortcuts="letters"
          onSubmit={setPlan}
        >
          <QuestionnaireProgress />
          <QuestionnaireItem name="direction" required>
            <QuestionnaireTitle>
              What should the agent build next?
            </QuestionnaireTitle>
            <QuestionnaireDescription>
              Choose a direction or describe another task.
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="tools">
                <Text>Tool call timeline</Text>
                <QuestionnaireChoiceDescription>
                  Show what the agent ran and what came back.
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="approvals">
                <Text>Approval checkpoints</Text>
                <QuestionnaireChoiceDescription>
                  Ask before sensitive or destructive actions.
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="handoffs">
                <Text>Sub-agent handoffs</Text>
                <QuestionnaireChoiceDescription>
                  Make delegated work and results easier to follow.
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireInput
                aria-label="Another agent feature"
                placeholder="Describe another feature..."
              />
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="signals" multiple>
            <QuestionnaireTitle>
              What should every update include?
            </QuestionnaireTitle>
            <QuestionnaireDescription>
              Select all that apply, or skip this question.
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="progress">
                Progress
              </QuestionnaireChoice>
              <QuestionnaireChoice value="decisions" disabled>
                Decisions
              </QuestionnaireChoice>
              <QuestionnaireChoice value="risks">Risks</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="timing" required>
            <QuestionnaireTitle>When should work begin?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="now">Start now</QuestionnaireChoice>
              <QuestionnaireChoice value="backlog">
                Add it to the backlog
              </QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext>Next</QuestionnaireNext>
            <QuestionnaireSubmit>Save plan</QuestionnaireSubmit>
          </QuestionnaireActions>
        </Questionnaire>
        <Answers answers={plan} />
      </Example>
      <Example title="Controlled item" className="items-stretch">
        <Text className="text-muted-foreground">Checkpoint: {item}</Text>
        <Questionnaire item={item} onItemChange={setItem}>
          <QuestionnaireProgress />
          <QuestionnaireItem name="scope" required>
            <QuestionnaireTitle>What may the agent change?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="component">
                Only the target component
              </QuestionnaireChoice>
              <QuestionnaireChoice value="feature">
                The complete feature area
              </QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="checks" required>
            <QuestionnaireTitle>Which checks should it run?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="targeted">
                Targeted tests
              </QuestionnaireChoice>
              <QuestionnaireChoice value="full">
                Full verification
              </QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious size="sm" variant="ghost" />
            <QuestionnaireNext size="sm" />
            <QuestionnaireSubmit size="sm" />
          </QuestionnaireActions>
        </Questionnaire>
      </Example>
      <Example
        title="Conditional, with a controlled choice"
        className="items-stretch"
      >
        <Questionnaire defaultItem="runtime" items={conditionalItems}>
          <QuestionnaireProgress />
          <QuestionnaireItem name="runtime" required>
            <QuestionnaireTitle>Where should the agent run?</QuestionnaireTitle>
            <QuestionnaireDescription>
              Cloud runs add an environment question.
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireChoice
                checked={runtime === "local"}
                value="local"
                onChange={() => setRuntime("local")}
              >
                Local workspace
              </QuestionnaireChoice>
              <QuestionnaireChoice
                checked={runtime === "cloud"}
                value="cloud"
                onChange={() => setRuntime("cloud")}
              >
                Cloud workspace
              </QuestionnaireChoice>
            </QuestionnaireChoices>
          </QuestionnaireItem>
          <QuestionnaireItem
            disabled={runtime !== "cloud"}
            name="environment"
            required
          >
            <QuestionnaireTitle>Which environment?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="preview">Preview</QuestionnaireChoice>
              <QuestionnaireChoice value="staging">Staging</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="approval" required>
            <QuestionnaireTitle>When should it ask first?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="writes">
                Before writing files
              </QuestionnaireChoice>
              <QuestionnaireChoice value="sensitive">
                Only for sensitive actions
              </QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
      </Example>
      <Example
        title="Saved answers, reset, and an invalid item"
        className="items-stretch"
      >
        <Questionnaire defaultItem="verification">
          <QuestionnaireProgress />
          <QuestionnaireItem name="change" required>
            <QuestionnaireTitle>
              What kind of migration is this?
            </QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="incremental" defaultChecked>
                Incremental migration
              </QuestionnaireChoice>
              <QuestionnaireChoice value="cutover">
                Single cutover
              </QuestionnaireChoice>
            </QuestionnaireChoices>
          </QuestionnaireItem>
          <QuestionnaireItem name="verification" multiple required>
            <QuestionnaireTitle>How should it be verified?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="tests" defaultChecked>
                Run migration tests
              </QuestionnaireChoice>
              <QuestionnaireChoice value="typecheck" defaultChecked>
                Run the typecheck
              </QuestionnaireChoice>
              <QuestionnaireChoice value="manual">
                Perform a manual smoke test
              </QuestionnaireChoice>
            </QuestionnaireChoices>
          </QuestionnaireItem>
          <QuestionnaireItem name="notes" invalid>
            <QuestionnaireTitle>Anything else to remember?</QuestionnaireTitle>
            <QuestionnaireInput
              aria-label="Saved migration note"
              defaultValue="Keep the public API stable."
            />
            <QuestionnaireError>Too vague to act on.</QuestionnaireError>
          </QuestionnaireItem>
          <QuestionnaireActions>
            <ResetButton />
            <QuestionnairePrevious />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
      </Example>
    </ExampleWrapper>
  )
}

export { QuestionnaireExample }
