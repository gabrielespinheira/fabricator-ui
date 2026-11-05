import * as React from "react"
import { cn } from "cn"

import { ArrowLeftIcon, ArrowRightIcon } from "@/lib/site-icons"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
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

function CardIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4.5">
      {children}
    </span>
  )
}

/** A card's hint. Muted text is too faint on a checked card in light mode. */
export function CardHint({ children }: { children: React.ReactNode }) {
  return (
    <FieldDescription className="in-[[data-slot=field-label]:has([data-checked])]:text-foreground/70">
      {children}
    </FieldDescription>
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
        {icon ? <CardIcon>{icon}</CardIcon> : null}
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          {description ? <CardHint>{description}</CardHint> : null}
        </FieldContent>
        <RadioGroupItem value={value} id={id} />
      </Field>
    </FieldLabel>
  )
}

/** One of several answers that can all be true, as a card. */
export function CheckCard({
  title,
  description,
  icon,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = React.useId()

  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal" className="items-start">
        {icon ? <CardIcon>{icon}</CardIcon> : null}
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          {description ? <CardHint>{description}</CardHint> : null}
        </FieldContent>
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      </Field>
    </FieldLabel>
  )
}

function AppTile({
  id,
  title,
  description,
  icon,
  control,
}: {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  control: React.ReactNode
}) {
  return (
    <FieldLabel htmlFor={id}>
      <Field className="gap-3">
        <div className="flex items-start justify-between gap-2">
          <CardIcon>{icon}</CardIcon>
          {control}
        </div>
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          <CardHint>{description}</CardHint>
        </FieldContent>
      </Field>
    </FieldLabel>
  )
}

type AppTileContent = {
  title: string
  description: string
  icon: React.ReactNode
}

/** An app a project can have, as one of a row of tiles. */
export function AppCheckTile({
  checked,
  disabled,
  onCheckedChange,
  ...content
}: AppTileContent & {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = React.useId()

  return (
    <AppTile
      id={id}
      {...content}
      control={
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      }
    />
  )
}

/** The one app of a single project, as one of a row of tiles. */
export function AppChoiceTile({
  value,
  ...content
}: AppTileContent & { value: string }) {
  const id = React.useId()

  return (
    <AppTile
      id={id}
      {...content}
      control={<RadioGroupItem value={value} id={id} />}
    />
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
