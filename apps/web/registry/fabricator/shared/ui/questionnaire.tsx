"use client"

import * as React from "react"
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"
import {
  buttonVariants,
  type Button,
} from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream questionnaire (identical in every base),
// drawn after Relay's agent questions so it can take a chat input's place.
// A choice is a row with its label and a chip at the end: the shortcut (1, 2,
// 3…) for a single choice, a square that fills for a multiple one, and an
// arrow on a single choice's hover when picking it moves on. One highlight
// glides between the rows. The native input still covers the row, so
// semantics and keyboard behaviour are upstream's.

type QuestionnaireShortcuts = "letters" | "numbers"

/**
 * Whether picking a choice moves to the next question (or submits the last):
 * a single choice picked with the pointer or by its shortcut. The arrows and
 * space only walk the choices, and a multiple choice takes several picks.
 */
function shouldAdvanceQuestionnaire({
  type,
  isPointer,
  key,
  shortcuts,
}: {
  type: "checkbox" | "radio"
  isPointer: boolean
  key: string | null
  shortcuts: QuestionnaireShortcuts | null
}) {
  if (type !== "radio") return false
  if (isPointer) return true
  if (!key || key.length !== 1 || !shortcuts) return false
  return shortcuts === "numbers" ? /^[1-9]$/.test(key) : /^[a-z]$/i.test(key)
}

type QuestionnaireAdvance = {
  shortcuts: QuestionnaireShortcuts | null
  /** The key that last went down in the questionnaire, read at click time. */
  getLastKey: () => string | null
}

const QuestionnaireAdvanceContext =
  React.createContext<QuestionnaireAdvance | null>(null)

function Questionnaire({
  className,
  advanceOnSelect = false,
  shortcuts,
  onKeyDownCapture,
  onPointerDownCapture,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Root> & {
  /** Picking a single choice with the pointer or its shortcut moves to the next question, or submits the last. */
  advanceOnSelect?: boolean
}) {
  const lastKey = React.useRef<string | null>(null)
  const getLastKey = React.useCallback(() => lastKey.current, [])
  const advance = React.useMemo(
    () =>
      advanceOnSelect ? { shortcuts: shortcuts ?? null, getLastKey } : null,
    [advanceOnSelect, shortcuts, getLastKey]
  )

  return (
    <QuestionnaireAdvanceContext.Provider value={advance}>
      <QuestionnairePrimitive.Root
        data-slot="questionnaire"
        data-advance-on-select={advanceOnSelect ? "" : undefined}
        shortcuts={shortcuts}
        className={cn(
          "cn-questionnaire flex w-full min-w-0 flex-col",
          className
        )}
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event)
          lastKey.current = event.key
        }}
        onPointerDownCapture={(event) => {
          onPointerDownCapture?.(event)
          lastKey.current = null
        }}
        {...props}
      />
    </QuestionnaireAdvanceContext.Provider>
  )
}

/** The row above the questions: the progress at the start, actions such as Stop at the end. */
function QuestionnaireHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-header"
      className={cn(
        "cn-questionnaire-header flex min-w-0 items-center justify-between",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireProgress({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Progress>) {
  return (
    <QuestionnairePrimitive.Progress
      data-slot="questionnaire-progress"
      className={cn(
        "cn-questionnaire-progress min-h-[1lh] w-fit min-w-[14ch] font-medium text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireItem({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Item>) {
  return (
    <QuestionnairePrimitive.Item
      data-slot="questionnaire-item"
      className={cn(
        "cn-questionnaire-item min-w-0 border-0 p-0 outline-none",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireTitle({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Title>) {
  return (
    <QuestionnairePrimitive.Title
      data-slot="questionnaire-title"
      className={cn(
        "cn-questionnaire-title cn-font-heading text-pretty",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireDescription({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Description>) {
  return (
    <QuestionnairePrimitive.Description
      data-slot="questionnaire-description"
      className={cn(
        "cn-questionnaire-description text-pretty text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireChoices({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Choices>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: "[data-slot=questionnaire-choice]",
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <QuestionnairePrimitive.Choices
      data-slot="questionnaire-choices"
      className={cn(
        "cn-questionnaire-choices group/questionnaire-choices relative isolate grid min-w-0",
        className
      )}
      ref={mergedRef}
      {...fluid.props}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </QuestionnairePrimitive.Choices>
  )
}

function QuestionnaireChoice({
  children,
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Choice>) {
  const advance = React.useContext(QuestionnaireAdvanceContext)

  function handleInputClick(event: React.MouseEvent<HTMLInputElement>) {
    if (!advance) return
    const input = event.currentTarget
    const isAdvancing = shouldAdvanceQuestionnaire({
      type: input.type === "checkbox" ? "checkbox" : "radio",
      isPointer: event.detail > 0,
      key: advance.getLastKey(),
      shortcuts: advance.shortcuts,
    })
    if (!isAdvancing) return
    // Once the pick is in, Enter on a chosen answer moves on (or submits the
    // last question), with the questionnaire's own validation.
    requestAnimationFrame(() =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        })
      )
    )
  }

  return (
    <QuestionnairePrimitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        "cn-questionnaire-choice group/questionnaire-choice relative flex cursor-pointer items-center text-start transition-colors outline-none select-none",
        "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <QuestionnairePrimitive.ChoiceInput
        data-slot="questionnaire-choice-input"
        className="cn-questionnaire-choice-input absolute inset-0 z-10 size-full cursor-pointer opacity-0"
        onClick={handleInputClick}
      />
      <QuestionnairePrimitive.ChoiceLabel
        data-slot="questionnaire-choice-label"
        className="cn-questionnaire-choice-label cn-questionnaire-choice-content flex min-w-0 flex-1 flex-col"
      >
        {children}
      </QuestionnairePrimitive.ChoiceLabel>
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        className="cn-questionnaire-choice-indicator pointer-events-none relative inline-flex shrink-0 items-center justify-center"
      >
        <QuestionnairePrimitive.ChoiceShortcut
          data-slot="questionnaire-choice-shortcut"
          className="cn-questionnaire-choice-shortcut cn-questionnaire-shortcut select-none"
        />
        <IconPlaceholder
          data-slot="questionnaire-choice-indicator-check"
          className="cn-questionnaire-choice-check absolute"
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
        <IconPlaceholder
          data-slot="questionnaire-choice-advance"
          className="cn-questionnaire-choice-advance absolute"
          lucide="ArrowRightIcon"
          tabler="IconArrowRight"
          hugeicons="ArrowRight02Icon"
          phosphor="ArrowRightIcon"
          remixicon="RiArrowRightLine"
        />
      </span>
    </QuestionnairePrimitive.Choice>
  )
}

function QuestionnaireChoiceDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="questionnaire-choice-description"
      className={cn("cn-questionnaire-choice-description", className)}
      {...props}
    />
  )
}

function QuestionnaireInput({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Input>) {
  return (
    <div
      data-slot="questionnaire-input-wrapper"
      className="cn-questionnaire-input-wrapper group/questionnaire-input relative min-w-0"
    >
      <QuestionnairePrimitive.Input
        data-slot="questionnaire-input"
        className={cn(
          "cn-input cn-questionnaire-input min-h-11 w-full min-w-0 transition-[color,box-shadow,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0",
          "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
    </div>
  )
}

function QuestionnaireError({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Error>) {
  return (
    <QuestionnairePrimitive.Error
      data-slot="questionnaire-error"
      className={cn("cn-questionnaire-error text-destructive", className)}
      {...props}
    />
  )
}

function QuestionnaireActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn(
        "cn-questionnaire-actions grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center",
        className
      )}
      {...props}
    />
  )
}

function QuestionnairePrevious({
  children,
  className,
  size = "default",
  variant = "ghost",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Previous> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Previous
      data-slot="questionnaire-previous"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "cn-questionnaire-previous col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Previous"}
    </QuestionnairePrimitive.Previous>
  )
}

function QuestionnaireSkip({
  children,
  className,
  size = "default",
  variant = "ghost",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Skip> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Skip
      data-slot="questionnaire-skip"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "cn-questionnaire-skip col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Skip"}
    </QuestionnairePrimitive.Skip>
  )
}

function QuestionnaireNext({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Next> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Next
      data-slot="questionnaire-next"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "cn-questionnaire-next col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Next"}
    </QuestionnairePrimitive.Next>
  )
}

function QuestionnaireSubmit({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Submit> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Submit
      data-slot="questionnaire-submit"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "cn-questionnaire-submit col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Submit"}
    </QuestionnairePrimitive.Submit>
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
  QuestionnaireHeader,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  shouldAdvanceQuestionnaire,
}
