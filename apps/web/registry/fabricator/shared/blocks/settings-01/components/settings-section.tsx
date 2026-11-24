"use client"

import * as React from "react"

import { type SaveStatus } from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** A card of settings about one subject, reachable from the section index. */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-(--density-24)">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>{children}</FieldGroup>
        </CardContent>
      </Card>
    </section>
  )
}

/** The quiet word beside a setting while it saves, and once it has. */
export function SettingsSaveMark({ status }: { status?: SaveStatus }) {
  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-(--density-4) text-(length:--density-text-12) font-normal text-muted-foreground [&_svg]:size-(--density-icon-14)"
    >
      {status === "saving" && (
        <>
          <Spinner aria-hidden />
          Saving
        </>
      )}
      {status === "saved" && (
        <>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="text-success"
          />
          Saved
        </>
      )}
      {status === "failed" && (
        <span className="text-destructive-text">Not saved</span>
      )}
    </span>
  )
}

/**
 * One setting: its name and effect at the start, its control at the end.
 * `inline` controls (a switch, a swatch, a button) stay beside their label on
 * phones; the others stack under it.
 */
export function SettingsRow({
  title,
  description,
  htmlFor,
  descriptionId,
  status,
  isInline = false,
  children,
}: {
  title: string
  description: React.ReactNode
  htmlFor?: string
  descriptionId?: string
  status?: SaveStatus
  isInline?: boolean
  children: React.ReactNode
}) {
  const label = (
    <>
      {title}
      <SettingsSaveMark status={status} />
    </>
  )
  return (
    <Field orientation={isInline ? "horizontal" : "responsive"}>
      <FieldContent>
        {htmlFor ? (
          <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        ) : (
          <FieldTitle>{label}</FieldTitle>
        )}
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      </FieldContent>
      {isInline ? (
        children
      ) : (
        <div className="shrink-0 @md/field-group:max-w-64 @md/field-group:min-w-64">
          {children}
        </div>
      )}
    </Field>
  )
}
