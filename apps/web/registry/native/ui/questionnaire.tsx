import * as React from "react"
import { CheckIcon } from "@fabricator-ui/icons-react-native"
import {
  useAccessibilityFocus,
  useControllableState,
} from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, TextInput, View } from "react-native"
import Animated, { useAnimatedStyle } from "react-native-reanimated"

import { usePressScale } from "@/registry/native/lib/motion"
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
  type QuestionnaireAnswer,
  type QuestionnaireInputType,
  type QuestionnaireItemDefinition,
  type QuestionnaireItemStatus,
  type QuestionnaireShortcutMode,
} from "@/registry/native/lib/questionnaire-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { Button } from "@/registry/native/ui/button"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// The website's questionnaire reuses the library's controls, and so does this:
// a choice's mark takes the Checkbox or Radio Group item's placeholders, the
// free-text answer the Input's, and the shortcut the Kbd's. A web form hands its
// answers to `onSubmit` as form data; here they come as an object.

type QuestionnaireAnswers = Record<string, string | string[] | undefined>

type QuestionnaireProgressState = ReturnType<typeof getProgress>

type QuestionnaireContextValue = {
  answers: Readonly<Record<string, QuestionnaireAnswer>>
  activeItem: string | null
  activeItemRequired: boolean | null
  activeItemStatus: QuestionnaireItemStatus | null
  definitions: readonly QuestionnaireItemDefinition[] | undefined
  hasNavigated: boolean
  progress: QuestionnaireProgressState
  shortcuts: QuestionnaireShortcutMode | undefined
  goNext: () => void
  goPrevious: () => void
  register: (item: QuestionnaireItemDefinition) => void
  reset: () => void
  seed: (
    name: string,
    change: (answer: QuestionnaireAnswer) => QuestionnaireAnswer
  ) => void
  skip: () => void
  submit: () => void
  unregister: (name: string) => void
  update: (
    name: string,
    change: (answer: QuestionnaireAnswer) => QuestionnaireAnswer
  ) => void
}

type QuestionnaireItemContextValue = {
  answer: QuestionnaireAnswer
  disabled: boolean
  isInvalid: boolean
  multiple: boolean
  name: string
  required: boolean
  shortcuts: ReadonlyMap<string, string>
  status: QuestionnaireItemStatus
}

const QuestionnaireContext =
  React.createContext<QuestionnaireContextValue | null>(null)
const QuestionnaireItemContext =
  React.createContext<QuestionnaireItemContextValue | null>(null)
// A free-text answer among the choices backs out of their bleed.
const QuestionnaireChoicesContext = React.createContext(false)

/** The questionnaire's state and actions, for a control of your own. */
function useQuestionnaire() {
  const context = React.use(QuestionnaireContext)
  if (!context) {
    throw new Error("useQuestionnaire must be used within a Questionnaire.")
  }
  return context
}

function useQuestionnaireItem() {
  const context = React.use(QuestionnaireItemContext)
  if (!context) {
    throw new Error(
      "useQuestionnaireItem must be used within a QuestionnaireItem."
    )
  }
  return context
}

function QuestionnaireChoiceIndicator({
  checked,
  invalid,
  type,
}: {
  checked: boolean
  invalid: boolean
  type: "checkbox" | "radio"
}) {
  const state = checked ? "checked" : "unchecked"

  if (type === "radio") {
    return (
      <View
        aria-hidden
        data-slot="questionnaire-choice-indicator"
        data-type={type}
        data-state={state}
        data-invalid={invalid}
        className="cn-radio-group-item cn-questionnaire-choice-indicator relative shrink-0 items-center justify-center"
      >
        {checked ? (
          <View
            data-state={state}
            className="cn-radio-group-indicator items-center justify-center"
          >
            <View
              data-slot="questionnaire-choice-indicator-dot"
              className="cn-radio-group-indicator-icon"
            />
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View
      aria-hidden
      data-slot="questionnaire-choice-indicator"
      data-type={type}
      data-state={state}
      data-invalid={invalid}
      className="cn-checkbox cn-questionnaire-choice-indicator relative shrink-0 items-center justify-center"
    >
      {checked ? (
        <TextStyle className="cn-checkbox-indicator-text">
          <View
            data-slot="questionnaire-choice-indicator-check"
            className="cn-checkbox-indicator items-center justify-center"
          >
            <CheckIcon strokeWidth={3} />
          </View>
        </TextStyle>
      ) : null}
    </View>
  )
}

function Questionnaire({
  className,
  defaultItem,
  item,
  items,
  onItemChange,
  onReset,
  onSubmit,
  shortcuts,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  defaultItem?: string
  item?: string
  items?: readonly QuestionnaireItemDefinition[]
  onItemChange?: (item: string) => void
  onReset?: () => void
  onSubmit?: (answers: QuestionnaireAnswers) => void
  shortcuts?: QuestionnaireShortcutMode
}) {
  const [registered, setRegistered] = React.useState<
    readonly QuestionnaireItemDefinition[]
  >([])
  const [answers, setAnswers] = React.useState<
    Readonly<Record<string, QuestionnaireAnswer>>
  >({})
  const [hasNavigated, setHasNavigated] = React.useState(false)
  const defaults = React.useRef<Record<string, QuestionnaireAnswer>>({})
  const [wanted, setWanted] = useControllableState<string>({
    prop: item,
    defaultProp: defaultItem,
    onChange: onItemChange,
  })

  const enabled = getEnabledItems(items ?? registered)
  const activeItem = resolveActiveItem(enabled, wanted)
  const progress = getProgress(enabled, activeItem)

  // `items` says what the questionnaire holds; the rendered item adds its own
  // `invalid` and `multiple`.
  const getDefinition = (name: string): QuestionnaireItemDefinition => ({
    ...registered.find((entry) => entry.name === name),
    ...items?.find((entry) => entry.name === name),
    name,
  })
  const getAnswer = (
    from: Readonly<Record<string, QuestionnaireAnswer>>,
    name: string
  ) => from[name] ?? EMPTY_ANSWER
  const canContinue = (
    from: Readonly<Record<string, QuestionnaireAnswer>>,
    name: string
  ) => getItemValidity(getAnswer(from, name), getDefinition(name)).canContinue

  // A wanted item that stops being enabled moves on to the first that is.
  React.useEffect(() => {
    if (wanted !== undefined && activeItem && wanted !== activeItem) {
      setWanted(activeItem)
    }
  }, [activeItem, setWanted, wanted])

  const goTo = (name: string | null | undefined) => {
    if (!name || name === activeItem) return
    setHasNavigated(true)
    setWanted(name)
  }
  const update = React.useCallback(
    (
      name: string,
      change: (answer: QuestionnaireAnswer) => QuestionnaireAnswer
    ) => {
      setAnswers((all) => ({
        ...all,
        [name]: change(all[name] ?? EMPTY_ANSWER),
      }))
    },
    []
  )
  const seed = React.useCallback(
    (
      name: string,
      change: (answer: QuestionnaireAnswer) => QuestionnaireAnswer
    ) => {
      defaults.current[name] = change(defaults.current[name] ?? EMPTY_ANSWER)
      update(name, change)
    },
    [update]
  )
  const register = React.useCallback((entry: QuestionnaireItemDefinition) => {
    setRegistered((all) => upsertItem(all, entry))
  }, [])
  const unregister = React.useCallback((name: string) => {
    setRegistered((all) => all.filter((entry) => entry.name !== name))
  }, [])
  const markAttempted = (names: string[]) => {
    setAnswers((all) => {
      const next = { ...all }
      for (const name of names) {
        next[name] = { ...getAnswer(all, name), attempted: true }
      }
      return next
    })
  }

  const submit = (from = answers) => {
    markAttempted(enabled.map((entry) => entry.name))
    const blocked = enabled.find((entry) => !canContinue(from, entry.name))
    if (blocked) {
      goTo(blocked.name)
      return
    }
    const result: QuestionnaireAnswers = {}
    for (const { name } of enabled) {
      const { multiple = false } = getDefinition(name)
      result[name] = getAnswerValue(getAnswer(from, name), multiple)
    }
    onSubmit?.(result)
  }

  const context: QuestionnaireContextValue = {
    answers,
    activeItem,
    activeItemRequired: activeItem
      ? Boolean(getDefinition(activeItem).required)
      : null,
    activeItemStatus: activeItem
      ? getItemStatus(getAnswer(answers, activeItem))
      : null,
    definitions: items,
    hasNavigated,
    progress,
    shortcuts,
    register,
    seed,
    unregister,
    update,
    goPrevious: () => goTo(enabled[progress.index - 1]?.name),
    goNext: () => {
      if (!activeItem || progress.last) return
      markAttempted([activeItem])
      if (canContinue(answers, activeItem)) {
        goTo(enabled[progress.index + 1]?.name)
      }
    },
    skip: () => {
      if (!activeItem || getDefinition(activeItem).required) return
      const next = {
        ...answers,
        [activeItem]: applySkip(getAnswer(answers, activeItem)),
      }
      setAnswers(next)
      if (progress.last) submit(next)
      else goTo(enabled[progress.index + 1]?.name)
    },
    submit: () => submit(),
    reset: () => {
      setAnswers({ ...defaults.current })
      onReset?.()
      goTo(resolveActiveItem(enabled, defaultItem))
    },
  }

  return (
    <QuestionnaireContext value={context}>
      <View
        data-slot="questionnaire"
        className={cn("cn-questionnaire w-full flex-col", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </QuestionnaireContext>
  )
}

function QuestionnaireProgress({
  className,
  children,
  render,
  ...props
}: Omit<React.ComponentProps<typeof Text>, "children"> & {
  children?: React.ReactNode
  render?:
    | React.ReactElement<{ children?: React.ReactNode }>
    | ((
        props: React.ComponentProps<typeof Text>,
        state: QuestionnaireProgressState
      ) => React.ReactNode)
}) {
  const { progress } = useQuestionnaire()
  const label = progress.total
    ? `Question ${progress.current} of ${progress.total}`
    : undefined
  const shared = {
    "data-slot": "questionnaire-progress",
    role: "progressbar" as const,
    "aria-label": "Questionnaire progress",
    accessibilityLiveRegion: "polite" as const,
    accessibilityValue: progress.total
      ? {
          min: 1,
          max: progress.total,
          now: progress.current,
          text: label,
        }
      : undefined,
    className: cn(
      "cn-questionnaire-progress font-medium text-muted-foreground",
      className
    ),
    ...props,
  }
  if (typeof render === "function") return render(shared, progress)
  return (
    renderSlot({ render }, shared, children ?? label) ?? (
      <Text {...shared}>{children ?? label}</Text>
    )
  )
}

function QuestionnaireItem({
  className,
  children,
  disabled = false,
  invalid = false,
  multiple = false,
  name,
  onStatusChange,
  required = false,
  ...props
}: React.ComponentProps<typeof View> & {
  disabled?: boolean
  invalid?: boolean
  multiple?: boolean
  name: string
  onStatusChange?: (status: QuestionnaireItemStatus) => void
  required?: boolean
}) {
  const root = useQuestionnaire()
  const { register, unregister } = root
  const answer = root.answers[name] ?? EMPTY_ANSWER
  const status = getItemStatus(answer)
  const { isInvalid } = getItemValidity(answer, { disabled, invalid, required })
  const isActive = !disabled && root.activeItem === name
  const lastStatus = React.useRef(status)
  const focusRef = useAccessibilityFocus<React.ComponentRef<typeof View>>(
    isActive && root.hasNavigated
  )

  React.useLayoutEffect(() => {
    register({ name, disabled, invalid, multiple, required })
  }, [disabled, invalid, multiple, name, register, required])
  React.useLayoutEffect(() => () => unregister(name), [name, unregister])
  React.useEffect(() => {
    if (lastStatus.current === status) return
    lastStatus.current = status
    onStatusChange?.(status)
  }, [onStatusChange, status])

  const choices = root.definitions?.find(
    (entry) => entry.name === name
  )?.choices
  const shortcuts = React.useMemo(
    () => getChoiceShortcuts(choices ?? [], root.shortcuts),
    [choices, root.shortcuts]
  )
  const context: QuestionnaireItemContextValue = {
    answer,
    disabled,
    isInvalid,
    multiple,
    name,
    required,
    shortcuts,
    status,
  }

  return (
    <QuestionnaireItemContext value={context}>
      <View
        ref={focusRef}
        data-slot="questionnaire-item"
        data-active={isActive}
        data-status={status}
        role="group"
        aria-invalid={isInvalid || undefined}
        accessibilityElementsHidden={!isActive}
        importantForAccessibility={isActive ? "auto" : "no-hide-descendants"}
        className={cn("cn-questionnaire-item flex-col", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </QuestionnaireItemContext>
  )
}

function QuestionnaireTitle({
  className,
  render,
  children,
  ...props
}: React.ComponentProps<typeof Text> & RenderProps) {
  const shared = {
    "data-slot": "questionnaire-title",
    role: "heading" as const,
    className: cn("cn-questionnaire-title", className),
    ...props,
  }
  return (
    renderSlot({ render }, shared, children) ?? (
      <Text {...shared}>{children}</Text>
    )
  )
}

function QuestionnaireDescription({
  className,
  render,
  children,
  ...props
}: React.ComponentProps<typeof Text> & RenderProps) {
  const shared = {
    "data-slot": "questionnaire-description",
    className: cn(
      "cn-questionnaire-description text-muted-foreground",
      className
    ),
    ...props,
  }
  return (
    renderSlot({ render }, shared, children) ?? (
      <Text {...shared}>{children}</Text>
    )
  )
}

function QuestionnaireChoices({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { multiple } = useQuestionnaireItem()
  return (
    <QuestionnaireChoicesContext value={true}>
      <View
        data-slot="questionnaire-choices"
        role={multiple ? "group" : "radiogroup"}
        className={cn("cn-questionnaire-choices flex-col", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </QuestionnaireChoicesContext>
  )
}

function QuestionnaireChoice({
  children,
  className,
  checked,
  defaultChecked = false,
  disabled = false,
  onChange,
  onPressIn,
  onPressOut,
  value,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  value: string
  children?: React.ReactNode
}) {
  const root = useQuestionnaire()
  const item = useQuestionnaireItem()
  const { seed, update } = root
  const { multiple, name } = item
  const isControlled = checked !== undefined
  const isDisabled = item.disabled || disabled
  const isSkipped = item.status === "skipped"
  const isChecked = isControlled
    ? !isSkipped && checked
    : item.answer.selected.includes(value)
  const shortcut = item.shortcuts.get(value)

  const press = usePressScale()
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))

  React.useLayoutEffect(() => {
    if (!defaultChecked) return
    seed(name, (answer) => seedAnswer(answer, value, multiple))
  }, [defaultChecked, multiple, name, seed, value])
  React.useLayoutEffect(() => {
    if (checked === undefined) return
    update(name, (answer) => applyAnswer(answer, value, checked, multiple))
  }, [checked, multiple, name, update, value])

  return (
    <Pressable
      data-slot="questionnaire-choice"
      data-checked={isChecked}
      role={multiple ? "checkbox" : "radio"}
      aria-checked={isChecked}
      aria-disabled={isDisabled || undefined}
      aria-invalid={item.isInvalid || undefined}
      disabled={isDisabled}
      className={cn(
        "cn-questionnaire-choice relative min-h-11 flex-row items-start disabled:opacity-50",
        className
      )}
      onPressIn={(event) => {
        press.onPressIn()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.onPressOut()
        onPressOut?.(event)
      }}
      onPress={() => {
        const next = multiple ? !isChecked : true
        onChange?.(next)
        if (!isControlled || (isSkipped && checked === next)) {
          update(name, (answer) => applyAnswer(answer, value, next, multiple))
        }
      }}
      {...props}
    >
      <Animated.View
        data-slot="questionnaire-choice-input"
        className="cn-questionnaire-choice-input"
        style={markStyle}
      >
        <QuestionnaireChoiceIndicator
          checked={isChecked}
          invalid={item.isInvalid}
          type={multiple ? "checkbox" : "radio"}
        />
      </Animated.View>
      <View
        data-slot="questionnaire-choice-label"
        className="cn-questionnaire-choice-label cn-questionnaire-choice-content flex-col"
      >
        {renderTextChildren(children)}
      </View>
      {shortcut ? (
        <View
          data-slot="questionnaire-choice-shortcut"
          aria-hidden
          className="cn-kbd cn-questionnaire-choice-shortcut cn-questionnaire-shortcut items-center justify-center"
        >
          <Text
            data-checked={isChecked}
            className="cn-kbd-text cn-questionnaire-shortcut-text"
          >
            {shortcut}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

function QuestionnaireChoiceDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="questionnaire-choice-description"
      className={cn("cn-questionnaire-choice-description", className)}
      {...props}
    />
  )
}

function QuestionnaireInput({
  className,
  defaultValue,
  disabled = false,
  onChangeText,
  type,
  value,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  disabled?: boolean
  type?: QuestionnaireInputType
}) {
  const root = useQuestionnaire()
  const item = useQuestionnaireItem()
  const isInChoices = React.use(QuestionnaireChoicesContext)
  const { seed, update } = root
  const { multiple, name } = item
  const isDisabled = item.disabled || disabled

  React.useLayoutEffect(() => {
    if (!defaultValue) return
    seed(name, (answer) =>
      seedAnswer({ ...answer, input: defaultValue }, INPUT_ANSWER, multiple)
    )
  }, [defaultValue, multiple, name, seed])
  React.useLayoutEffect(() => {
    if (value === undefined) return
    update(name, (answer) => applyInput(answer, value, multiple))
  }, [multiple, name, update, value])

  return (
    <View
      data-slot="questionnaire-input-wrapper"
      data-nested={isInChoices}
      className="cn-questionnaire-input-wrapper relative"
    >
      <TextInput
        data-slot="questionnaire-input"
        data-invalid={item.isInvalid}
        aria-invalid={item.isInvalid || undefined}
        editable={!isDisabled}
        placeholderTextColorClassName="accent-muted-foreground"
        selectionColorClassName="accent-primary"
        className={cn(
          "cn-input cn-questionnaire-input min-h-11 w-full sm:min-h-0",
          className
        )}
        value={value ?? item.answer.input}
        onChangeText={(text) => {
          onChangeText?.(text)
          if (value === undefined) {
            update(name, (answer) => applyInput(answer, text, multiple))
          }
        }}
        {...getKeyboardProps(type)}
        {...props}
      />
    </View>
  )
}

function QuestionnaireError({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { isInvalid, required } = useQuestionnaireItem()
  if (!isInvalid) return null
  return (
    <Text
      data-slot="questionnaire-error"
      role="alert"
      accessibilityLiveRegion="assertive"
      className={cn("cn-questionnaire-error text-destructive-text", className)}
      {...props}
    >
      {children ??
        (required
          ? "Choose an answer to continue."
          : "Choose an answer or skip this question.")}
    </Text>
  )
}

function QuestionnaireActions({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="questionnaire-actions"
      className={cn(
        "cn-questionnaire-actions min-h-11 w-full flex-row items-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function QuestionnairePrevious({
  children,
  className,
  size = "default",
  variant = "outline",
  onPress,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { activeItemStatus, goPrevious, progress } = useQuestionnaire()
  if (progress.total <= 1 || progress.first) return null
  return (
    <Button
      data-slot="questionnaire-previous"
      data-size={size}
      data-variant={variant}
      data-status={activeItemStatus}
      size={size}
      variant={variant}
      className={cn("cn-questionnaire-previous min-h-11 sm:min-h-0", className)}
      onPress={(event) => {
        onPress?.(event)
        goPrevious()
      }}
      {...props}
    >
      {children ?? "Previous"}
    </Button>
  )
}

function QuestionnaireSkip({
  children,
  className,
  size = "default",
  variant = "outline",
  onPress,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { activeItemRequired, activeItemStatus, skip } = useQuestionnaire()
  if (activeItemRequired !== false) return null
  return (
    <Button
      data-slot="questionnaire-skip"
      data-size={size}
      data-variant={variant}
      data-status={activeItemStatus}
      size={size}
      variant={variant}
      className={cn("cn-questionnaire-skip min-h-11 sm:min-h-0", className)}
      onPress={(event) => {
        onPress?.(event)
        skip()
      }}
      {...props}
    >
      {children ?? "Skip"}
    </Button>
  )
}

function QuestionnaireNext({
  children,
  className,
  size = "default",
  variant = "default",
  onPress,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { activeItemStatus, goNext, progress } = useQuestionnaire()
  if (progress.total <= 1 || progress.last) return null
  return (
    <Button
      data-slot="questionnaire-next"
      data-size={size}
      data-variant={variant}
      data-status={activeItemStatus}
      size={size}
      variant={variant}
      className={cn("cn-questionnaire-next min-h-11 sm:min-h-0", className)}
      onPress={(event) => {
        onPress?.(event)
        goNext()
      }}
      {...props}
    >
      {children ?? "Next"}
    </Button>
  )
}

function QuestionnaireSubmit({
  children,
  className,
  size = "default",
  variant = "default",
  onPress,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { activeItemStatus, progress, submit } = useQuestionnaire()
  if (!progress.last) return null
  return (
    <Button
      data-slot="questionnaire-submit"
      data-size={size}
      data-variant={variant}
      data-status={activeItemStatus}
      size={size}
      variant={variant}
      className={cn("cn-questionnaire-submit min-h-11 sm:min-h-0", className)}
      onPress={(event) => {
        onPress?.(event)
        submit()
      }}
      {...props}
    >
      {children ?? "Submit"}
    </Button>
  )
}

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
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
}
