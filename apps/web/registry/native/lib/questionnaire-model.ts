// A questionnaire's rules, the same as the website's primitive: which item is
// showing, what counts as an answer, and when it may continue. No React Native
// imports, so these stay testable anywhere.

export type QuestionnaireItemStatus = "unanswered" | "answered" | "skipped"
export type QuestionnaireShortcutMode = "letters" | "numbers"
export type QuestionnaireChoiceDefinition = {
  disabled?: boolean
  value: string
}
export type QuestionnaireItemDefinition = {
  choices?: readonly QuestionnaireChoiceDefinition[]
  disabled?: boolean
  invalid?: boolean
  multiple?: boolean
  name: string
  required?: boolean
}
export type QuestionnaireInputType =
  | "date"
  | "datetime-local"
  | "email"
  | "month"
  | "number"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week"

export type QuestionnaireAnswer = {
  selected: readonly string[]
  input: string
  skipped: boolean
  attempted: boolean
}

/** Where the free-text field sits among an item's selected answers. */
export const INPUT_ANSWER = "\u0000input"

export const EMPTY_ANSWER: QuestionnaireAnswer = {
  selected: [],
  input: "",
  skipped: false,
  attempted: false,
}

const LETTERS = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index)
)
const NUMBERS = Array.from({ length: 9 }, (_, index) => String(index + 1))

export function getEnabledItems<Item extends { disabled?: boolean }>(
  items: readonly Item[]
) {
  return items.filter((item) => !item.disabled)
}

/** The item to show: the wanted one if it can be, otherwise the first that can. */
export function resolveActiveItem(
  enabled: readonly { name: string }[],
  wanted: string | undefined
) {
  if (wanted && enabled.some((item) => item.name === wanted)) return wanted
  return enabled[0]?.name ?? null
}

export function getProgress(
  enabled: readonly { name: string }[],
  active: string | null
) {
  const index = enabled.findIndex((item) => item.name === active)
  const total = enabled.length
  return {
    index,
    current: index + 1,
    total,
    first: total > 0 && index === 0,
    last: total > 0 && index === total - 1,
  }
}

/** Items in the order they mounted; an item that changes keeps its place. */
export function upsertItem<Item extends { name: string }>(
  items: readonly Item[],
  item: Item
) {
  return items.some((entry) => entry.name === item.name)
    ? items.map((entry) => (entry.name === item.name ? item : entry))
    : [...items, item]
}

function setSelected(
  selected: readonly string[],
  id: string,
  isOn: boolean,
  multiple: boolean
) {
  if (!isOn) return selected.filter((entry) => entry !== id)
  if (!multiple) return [id]
  return selected.includes(id) ? selected : [...selected, id]
}

export function applyAnswer(
  answer: QuestionnaireAnswer,
  id: string,
  isOn: boolean,
  multiple: boolean
): QuestionnaireAnswer {
  return {
    ...answer,
    skipped: isOn ? false : answer.skipped,
    selected: setSelected(answer.selected, id, isOn, multiple),
  }
}

/** A default answer: a single-answer item keeps the first one it gets. */
export function seedAnswer(
  answer: QuestionnaireAnswer,
  id: string,
  multiple: boolean
): QuestionnaireAnswer {
  if (!multiple && answer.selected.length > 0) return answer
  return applyAnswer(answer, id, true, multiple)
}

export function applyInput(
  answer: QuestionnaireAnswer,
  text: string,
  multiple: boolean
): QuestionnaireAnswer {
  return applyAnswer(
    { ...answer, input: text },
    INPUT_ANSWER,
    text.trim().length > 0,
    multiple
  )
}

export function applySkip(answer: QuestionnaireAnswer): QuestionnaireAnswer {
  return { ...answer, selected: [], skipped: true }
}

export function getItemStatus(
  answer: QuestionnaireAnswer
): QuestionnaireItemStatus {
  if (answer.skipped) return "skipped"
  return answer.selected.length > 0 ? "answered" : "unanswered"
}

/** Whether an item may be left behind, and whether to show its error. */
export function getItemValidity(
  answer: QuestionnaireAnswer,
  {
    disabled = false,
    invalid = false,
    required = false,
  }: Pick<QuestionnaireItemDefinition, "disabled" | "invalid" | "required">
) {
  const status = getItemStatus(answer)
  const isSkipped = status === "skipped" && !required
  const canContinue =
    disabled || isSkipped || (!invalid && status === "answered")
  return {
    canContinue,
    isInvalid:
      !disabled &&
      !isSkipped &&
      (invalid || (answer.attempted && !canContinue)),
  }
}

/** What `onSubmit` receives for an item, as a form's data would hold it. */
export function getAnswerValue(answer: QuestionnaireAnswer, multiple: boolean) {
  const values = answer.selected.map((id) =>
    id === INPUT_ANSWER ? answer.input : id
  )
  return multiple ? values : values[0]
}

/** The keycaps for an item's choices. Disabled choices don't take one. */
export function getChoiceShortcuts(
  choices: readonly QuestionnaireChoiceDefinition[],
  mode: QuestionnaireShortcutMode | undefined
) {
  const shortcuts = new Map<string, string>()
  if (!mode) return shortcuts
  const keys = mode === "letters" ? LETTERS : NUMBERS
  for (const choice of choices) {
    if (choice.disabled) continue
    const key = keys[shortcuts.size]
    if (!key) break
    shortcuts.set(choice.value, key)
  }
  return shortcuts
}

const KEYBOARD_TYPES = {
  email: "email-address",
  number: "numeric",
  tel: "phone-pad",
  url: "url",
} as const

/** What a text field needs for the website's input `type`. */
export function getKeyboardProps(type: QuestionnaireInputType | undefined) {
  if (type === "password") return { secureTextEntry: true }
  if (
    type === "email" ||
    type === "number" ||
    type === "tel" ||
    type === "url"
  ) {
    return { keyboardType: KEYBOARD_TYPES[type] }
  }
  return {}
}
