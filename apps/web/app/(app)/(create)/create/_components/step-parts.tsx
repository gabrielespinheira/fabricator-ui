import * as React from "react"
import { cn } from "cn"

import { ArrowLeftIcon, ArrowRightIcon } from "@/lib/site-icons"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/styles/base-fabricator/ui/field"
import { RadioGroupItem } from "@/styles/base-fabricator/ui/radio-group"

/** A question on a step: a legend, a hint and its answers. */
export function StepSection({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <FieldSet className="gap-3">
      <FieldLegend className="text-[15px] font-semibold">{title}</FieldLegend>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {children}
    </FieldSet>
  )
}

/** One answer of a RadioGroup, as a card: icon, title and a short hint. */
export function ChoiceCard({
  value,
  title,
  description,
  icon,
}: {
  value: string
  title: string
  description?: string
  icon?: React.ReactNode
}) {
  const id = React.useId()

  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal" className="items-start">
        {icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4.5">
            {icon}
          </span>
        ) : null}
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
        </FieldContent>
        <RadioGroupItem value={value} id={id} />
      </Field>
    </FieldLabel>
  )
}

/** Back and next, at the end of a step. */
export function StepFooter({
  onBack,
  onNext,
  nextLabel,
  className,
}: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
      ) : (
        <span />
      )}
      {onNext && nextLabel ? (
        <Button onClick={onNext}>
          {nextLabel}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  )
}
