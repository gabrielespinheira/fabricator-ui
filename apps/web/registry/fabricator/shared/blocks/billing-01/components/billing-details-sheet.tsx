"use client"

import * as React from "react"

import {
  BillingCountrySelect,
  BillingSheet,
} from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  canHaveVatId,
  formatMoney,
  getNextInvoice,
  getTax,
  getVatIdError,
  getVatIdExample,
  isVatIdValid,
  type BillingAccount,
  type BillingDetails,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import { Input } from "@/registry/bases/__base__/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/bases/__base__/ui/input-group"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function TaxEffect({
  account,
  details,
}: {
  account: BillingAccount
  details: BillingDetails
}) {
  const before = getNextInvoice(account, SAMPLE_NOW)
  const after = getNextInvoice({ ...account, details }, SAMPLE_NOW)
  const tax = getTax(details)
  const difference = after.total - before.total
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-(--density-4) rounded-(--radius-control) bg-hover p-(--density-12) tabular-nums"
    >
      <span className="flex justify-between gap-(--density-8)">
        Next invoice
        <span className="weight-semibold">{formatMoney(after.total)}</span>
      </span>
      <span className="text-(length:--density-text-12) text-foreground/70">
        VAT: {tax.detail}
        {difference !== 0 &&
          `. ${formatMoney(Math.abs(difference))} ${difference < 0 ? "less" : "more"} than now`}
        .
      </span>
    </div>
  )
}

/** The details on invoices. Country and VAT ID change what is charged. */
export function BillingDetailsSheet({
  account,
  isOpen,
  onOpenChange,
  onSave,
}: {
  account: BillingAccount
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (details: BillingDetails) => void
}) {
  const id = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const [draft, setDraft] = React.useState(account.details)
  const [hasTried, setTried] = React.useState(false)
  const [wasOpen, setWasOpen] = React.useState(isOpen)

  // Each opening starts from what is saved.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setDraft(account.details)
      setTried(false)
    }
  }

  const errors = {
    company:
      draft.company.trim() === "" ? "Enter the company's name." : undefined,
    vatId: getVatIdError(draft.country, draft.vatId),
    email: EMAIL.test(draft.email)
      ? undefined
      : "Enter an email address like billing@acme.com.",
  }
  const shown = hasTried
    ? errors
    : { company: undefined, vatId: undefined, email: undefined }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (errors.company || errors.vatId || errors.email) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus()
      )
      return
    }
    onOpenChange(false)
    onSave({
      ...draft,
      vatId: canHaveVatId(draft.country) ? draft.vatId.trim() : "",
    })
  }

  return (
    <BillingSheet
      open={isOpen}
      onOpenChange={onOpenChange}
      title="Billing details"
      description="Used from the next invoice on."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`}>
            Save details
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} ref={formRef} noValidate onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={!!shown.company || undefined}>
            <FieldLabel htmlFor={`${id}-company`}>Company</FieldLabel>
            <Input
              id={`${id}-company`}
              autoComplete="organization"
              value={draft.company}
              aria-invalid={!!shown.company || undefined}
              aria-describedby={shown.company && `${id}-company-error`}
              onChange={(event) =>
                setDraft({ ...draft, company: event.target.value })
              }
            />
            {shown.company && (
              <FieldError id={`${id}-company-error`}>
                {shown.company}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-address`}>Address</FieldLabel>
            <Input
              id={`${id}-address`}
              autoComplete="street-address"
              value={draft.address}
              onChange={(event) =>
                setDraft({ ...draft, address: event.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-country`}>Country</FieldLabel>
            <BillingCountrySelect
              id={`${id}-country`}
              value={draft.country}
              onValueChange={(country) => setDraft({ ...draft, country })}
            />
          </Field>
          {canHaveVatId(draft.country) && (
            <Field data-invalid={!!shown.vatId || undefined}>
              <FieldLabel htmlFor={`${id}-vat`}>VAT ID</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={`${id}-vat`}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.vatId}
                  placeholder={getVatIdExample(draft.country)}
                  aria-invalid={!!shown.vatId || undefined}
                  aria-describedby={`${id}-vat-help`}
                  onChange={(event) =>
                    setDraft({ ...draft, vatId: event.target.value })
                  }
                />
                {isVatIdValid(draft.country, draft.vatId) && (
                  <InputGroupAddon align="inline-end">
                    <IconPlaceholder
                      lucide="CircleCheckIcon"
                      tabler="IconCircleCheck"
                      hugeicons="CheckmarkCircle02Icon"
                      phosphor="CheckCircleIcon"
                      remixicon="RiCheckboxCircleLine"
                      className="size-(--density-icon-16) text-success"
                    />
                  </InputGroupAddon>
                )}
              </InputGroup>
              {shown.vatId ? (
                <FieldError id={`${id}-vat-help`}>{shown.vatId}</FieldError>
              ) : (
                <FieldDescription id={`${id}-vat-help`}>
                  A valid one takes VAT off, except in Ireland.
                </FieldDescription>
              )}
            </Field>
          )}
          <Field data-invalid={!!shown.email || undefined}>
            <FieldLabel htmlFor={`${id}-email`}>Send invoices to</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={draft.email}
              aria-invalid={!!shown.email || undefined}
              aria-describedby={shown.email && `${id}-email-error`}
              onChange={(event) =>
                setDraft({ ...draft, email: event.target.value })
              }
            />
            {shown.email && (
              <FieldError id={`${id}-email-error`}>{shown.email}</FieldError>
            )}
          </Field>
          <TaxEffect account={account} details={draft} />
        </FieldGroup>
      </form>
    </BillingSheet>
  )
}
