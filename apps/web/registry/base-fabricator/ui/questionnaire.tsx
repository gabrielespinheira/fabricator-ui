"use client"

import * as React from "react"
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire"
import { cn } from "cn"

import {
  buttonVariants,
  type Button,
} from "@/registry/base-fabricator/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream questionnaire (identical in every base).
// It reuses the library's own controls instead of drawing its own: a choice's
// mark is the Checkbox (multiple) or the Radio Group item (single), built from
// their placeholders and driven by the choice's state, the free-text answer is
// the Input, and the shortcut is the Kbd keycap. The native input still covers
// the row, so semantics and keyboard behaviour are upstream's.

function QuestionnaireChoiceIndicator({
  checked,
  invalid,
  type,
}: {
  checked: boolean
  invalid: boolean
  type: "checkbox" | "radio"
}) {
  const state = {
    "aria-invalid": invalid || undefined,
    "data-checked": checked ? "" : undefined,
    "data-unchecked": checked ? undefined : "",
  }

  if (type === "radio") {
    return (
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        data-type={type}
        className="pointer-events-none relative flex aspect-square size-[calc(var(--density-icon-16)+2px)] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px]! border-foreground/25 bg-transparent transition-[background-color,border-color,box-shadow,scale] duration-feedback ease-feedback group-hover/questionnaire-choice:border-foreground/45 group-active/questionnaire-choice:scale-90 group-has-[:focus-visible]/field-label:ring-0 hover:border-foreground/45 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 aria-invalid:border-destructive aria-invalid:group-hover/questionnaire-choice:border-destructive motion-reduce:transition-none motion-reduce:group-active/questionnaire-choice:scale-100 motion-reduce:active:scale-100 data-checked:border-primary data-checked:bg-primary data-checked:group-hover/questionnaire-choice:border-primary data-checked:hover:border-primary aria-invalid:data-checked:border-destructive aria-invalid:data-checked:bg-destructive"
        {...state}
      >
        <span
          className="flex size-full scale-0 items-center justify-center opacity-0 transition-[opacity,scale] duration-feedback-exit ease-exit motion-reduce:transition-none data-checked:scale-100 data-checked:opacity-100 data-checked:duration-move data-checked:ease-enter"
          {...state}
        >
          <span
            data-slot="questionnaire-choice-indicator-dot"
            className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground"
          />
        </span>
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      data-slot="questionnaire-choice-indicator"
      data-type={type}
      className="pointer-events-none relative flex size-[calc(var(--density-icon-16)+2px)] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.5px] border-foreground/25 bg-transparent text-primary-foreground transition-[background-color,border-color,box-shadow,scale] duration-feedback ease-feedback group-hover/questionnaire-choice:border-foreground/45 group-active/questionnaire-choice:scale-90 group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 hover:border-foreground/45 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 aria-invalid:border-destructive aria-invalid:group-hover/questionnaire-choice:border-destructive data-indeterminate:border-primary data-indeterminate:bg-primary motion-reduce:transition-none motion-reduce:group-active/questionnaire-choice:scale-100 motion-reduce:active:scale-100 data-checked:border-primary data-checked:bg-primary data-checked:group-hover/questionnaire-choice:border-primary data-checked:hover:border-primary aria-invalid:data-checked:border-destructive aria-invalid:data-checked:bg-destructive"
      {...state}
    >
      <span
        className="grid scale-[0.6] place-content-center text-current opacity-0 transition-[opacity,scale,clip-path] duration-feedback-exit ease-exit [clip-path:inset(0_100%_0_0)] data-indeterminate:scale-100 data-indeterminate:opacity-100 data-indeterminate:duration-move data-indeterminate:ease-enter data-indeterminate:[clip-path:inset(0_0_0_0)] data-[state=indeterminate]:scale-100 data-[state=indeterminate]:opacity-100 data-[state=indeterminate]:duration-move data-[state=indeterminate]:ease-enter data-[state=indeterminate]:[clip-path:inset(0_0_0_0)] motion-reduce:transition-none data-checked:scale-100 data-checked:opacity-100 data-checked:duration-move data-checked:ease-enter data-checked:[clip-path:inset(0_0_0_0)] [&>svg]:size-[calc(var(--density-icon-16)-4px)] [&>svg]:stroke-[3]"
        {...state}
      >
        <IconPlaceholder
          data-slot="questionnaire-choice-indicator-check"
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
      </span>
    </span>
  )
}

function Questionnaire({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Root>) {
  return (
    <QuestionnairePrimitive.Root
      data-slot="questionnaire"
      className={cn(
        "flex w-full min-w-0 flex-col gap-(--density-12)",
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
        "min-h-[1lh] w-fit min-w-[14ch] text-(length:--density-text-12) font-medium text-muted-foreground tabular-nums",
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
        "flex min-w-0 flex-col gap-(--density-12) border-0 p-0 outline-none",
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
        "cn-font-heading mb-0.5 text-(length:--density-text-16) leading-snug font-semibold text-pretty text-foreground",
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
        "text-(length:--density-text-13) text-pretty text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireChoices({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Choices>) {
  return (
    <QuestionnairePrimitive.Choices
      data-slot="questionnaire-choices"
      className={cn(
        "group/questionnaire-choices -mx-2 grid min-w-0 gap-0.5",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireChoice({
  children,
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Choice>) {
  return (
    <QuestionnairePrimitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        "group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-(--density-10) rounded-lg bg-transparent px-(--density-8) py-(--density-12) text-start text-(length:--density-text-13) text-foreground transition-colors duration-feedback ease-feedback outline-none select-none hover:bg-hover has-[>input:focus-visible]:ring-1 has-[>input:focus-visible]:ring-focus-ring sm:min-h-(--density-36) sm:py-(--density-8) data-checked:bg-active data-checked:hover:bg-active",
        "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <QuestionnairePrimitive.ChoiceInput
        data-slot="questionnaire-choice-input"
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
        render={(inputProps, state) => (
          <>
            <input {...inputProps} />
            <QuestionnaireChoiceIndicator
              checked={state.checked}
              invalid={state.invalid}
              type={state.type}
            />
          </>
        )}
      />
      <QuestionnairePrimitive.ChoiceLabel
        data-slot="questionnaire-choice-label"
        className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug"
      >
        {children}
      </QuestionnairePrimitive.ChoiceLabel>
      <QuestionnairePrimitive.ChoiceShortcut
        data-slot="questionnaire-choice-shortcut"
        className="pointer-events-none ms-auto hidden h-(--density-20) w-fit min-w-(--density-20) shrink-0 items-center justify-center gap-1 rounded-[5px] bg-hover px-1 font-sans text-(length:--density-text-11) font-medium text-muted-foreground transition-colors duration-feedback ease-feedback select-none group-data-[shortcut]/questionnaire-choice:inline-flex group-data-checked/questionnaire-choice:text-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3"
      />
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
      className={cn(
        "text-(length:--density-text-12) font-normal text-muted-foreground",
        className
      )}
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
      className="group/questionnaire-input relative min-w-0 in-data-[slot=questionnaire-choices]:mx-2 in-data-[slot=questionnaire-choices]:mt-1"
    >
      <QuestionnairePrimitive.Input
        data-slot="questionnaire-input"
        className={cn(
          "h-(--density-36) min-h-11 w-full min-w-0 rounded-lg border-0 bg-transparent px-(--density-10) py-1 text-base text-foreground scheme-light ring-1 ring-border transition-[color,box-shadow,background-color] duration-feedback ease-feedback outline-none ring-inset file:me-(--density-8) file:h-(--density-24) file:cursor-pointer file:rounded-md file:bg-hover! file:px-(--density-8) file:text-(length:--density-text-12) file:font-medium file:transition-colors file:duration-feedback autofill:shadow-[inset_0_0_0_100vmax_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)] hover:bg-muted/50 hover:file:bg-active! focus-visible:bg-card focus-visible:ring-foreground/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/50 aria-invalid:hover:bg-destructive/5 aria-invalid:focus-visible:bg-card data-[slot=input-group-control]:bg-transparent data-[slot=input-group-control]:ring-0 data-[slot=input-group-control]:hover:bg-transparent data-[slot=input-group-control]:focus-visible:bg-transparent data-[slot=input-group-control]:aria-invalid:hover:bg-transparent sm:min-h-0 md:text-(length:--density-text-13) dark:scheme-dark [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-0 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:duration-feedback hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-date-and-time-value]:min-h-[1lh] [&::-webkit-date-and-time-value]:text-start [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&[type=color]]:cursor-pointer [&[type=color]]:p-(--density-6) [&[type=file]]:cursor-pointer [&[type=file]]:py-(--density-6) [&[type=file]]:ps-(--density-6) [&[type=file]]:text-muted-foreground [&[type=number]]:[appearance:textfield] [&[type=number]]:tabular-nums",
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
      className={cn(
        "text-(length:--density-text-12) text-destructive",
        className
      )}
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
        "mt-1 grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-(--density-8) sm:min-h-(--density-36)",
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
  variant = "outline",
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
        "col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0",
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
  variant = "outline",
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
        "col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0",
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
        "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
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
        "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
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
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
}
