"use client"

import * as React from "react"

import { BillingCardBrandMark } from "@/registry/bases/__base__/blocks/billing-01/components/billing-card-brand"
import { BillingDialog } from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import {
  formatCardNumber,
  formatExpiry,
  getCardBrand,
  getCardBrandName,
  getCardErrors,
  getCardOutcome,
  getCodeLength,
  toCard,
  type BillingCard,
  type BillingCardErrors,
  type BillingCardValues,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-card-model"
import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/bases/__base__/ui/input-group"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Swap the timers for your payment provider: saving the card, then waiting for
// the bank when it asks the person to approve it. The sample bank declines
// 4000 0000 0000 0002.
const SAVE_TIME = 900
const APPROVAL_TIME = 2200

type Step = "form" | "saving" | "bank"

const EMPTY_VALUES: BillingCardValues = { number: "", expiry: "", code: "" }

/** A new card: typed, checked, approved by the bank or declined by it. */
export function BillingCardDialog({
  isOpen,
  onOpenChange,
  amountDue,
  onSave,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** What the old card couldn't pay, already written. */
  amountDue?: string
  onSave: (card: BillingCard) => void
}) {
  const id = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const [values, setValues] = React.useState(EMPTY_VALUES)
  const [errors, setErrors] = React.useState<BillingCardErrors>({})
  const [step, setStep] = React.useState<Step>("form")
  const [isDeclined, setDeclined] = React.useState(false)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const brand = getCardBrand(values.number)
  const codeLength = getCodeLength(values.number)

  const change = (patch: Partial<BillingCardValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      if (patch.number !== undefined) delete next.number
      if (patch.expiry !== undefined) delete next.expiry
      if (patch.code !== undefined) delete next.code
      return next
    })
    setDeclined(false)
  }

  // Leaving a field reports it, unless it was left empty on the way past.
  const check = (field: keyof BillingCardValues) => {
    if (values[field] === "") return
    const error = getCardErrors(values, SAMPLE_NOW)[field]
    if (error) setErrors((current) => ({ ...current, [field]: error }))
  }

  const close = () => {
    clearTimeout(timer.current)
    setStep("form")
    onOpenChange(false)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = getCardErrors(values, SAMPLE_NOW)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus()
      )
      return
    }
    setDeclined(false)
    setStep("saving")
    timer.current = setTimeout(() => {
      if (getCardOutcome(values.number) === "declined") {
        setStep("form")
        setDeclined(true)
        return
      }
      setStep("bank")
      timer.current = setTimeout(() => {
        const card = toCard(values)
        setStep("form")
        setValues(EMPTY_VALUES)
        onOpenChange(false)
        onSave(card)
      }, APPROVAL_TIME)
    }, SAVE_TIME)
  }

  const isSaving = step === "saving"

  return (
    <BillingDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) onOpenChange(true)
        else close()
      }}
      title="Update card"
      description={
        amountDue
          ? `The new card pays ${amountDue} now and every invoice after.`
          : "The new card pays from the next invoice on."
      }
      footer={
        step === "bank" ? (
          <Button variant="outline" onClick={close}>
            Stop waiting
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <fieldset disabled={isSaving} className="contents">
              <Button type="submit" form={`${id}-form`}>
                {isSaving && <Spinner data-icon="inline-start" />}
                {isSaving
                  ? "Checking…"
                  : amountDue
                    ? `Pay ${amountDue}`
                    : "Save card"}
              </Button>
            </fieldset>
          </>
        )
      }
    >
      {step === "bank" ? (
        <div role="status">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner />
              </EmptyMedia>
              <EmptyTitle>Approve it in your bank&apos;s app</EmptyTitle>
              <EmptyDescription>
                {getCardBrandName(brand)} sent a request to your phone. This
                closes by itself once you approve it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <form id={`${id}-form`} ref={formRef} noValidate onSubmit={submit}>
          <fieldset disabled={isSaving} className="contents">
            <FieldGroup>
              {isDeclined && (
                <Alert variant="error">
                  <IconPlaceholder
                    lucide="CircleAlertIcon"
                    tabler="IconExclamationCircle"
                    hugeicons="AlertCircleIcon"
                    phosphor="WarningCircleIcon"
                    remixicon="RiErrorWarningLine"
                  />
                  <AlertTitle>The bank declined this card</AlertTitle>
                  <AlertDescription>
                    Nothing was charged. Try another card, or ask the bank why.
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!errors.number || undefined}>
                <FieldLabel htmlFor={`${id}-number`}>Card number</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id={`${id}-number`}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    className="tabular-nums"
                    value={values.number}
                    aria-invalid={!!errors.number || undefined}
                    aria-describedby={errors.number && `${id}-number-error`}
                    onChange={(event) =>
                      change({ number: formatCardNumber(event.target.value) })
                    }
                    onBlur={() => check("number")}
                  />
                  <InputGroupAddon align="inline-end">
                    <BillingCardBrandMark brand={brand} />
                  </InputGroupAddon>
                </InputGroup>
                {errors.number && (
                  <FieldError id={`${id}-number-error`}>
                    {errors.number}
                  </FieldError>
                )}
              </Field>
              <div className="grid grid-cols-2 items-start gap-(--density-12)">
                <Field data-invalid={!!errors.expiry || undefined}>
                  <FieldLabel htmlFor={`${id}-expiry`}>Expires</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`${id}-expiry`}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      className="tabular-nums"
                      value={values.expiry}
                      aria-invalid={!!errors.expiry || undefined}
                      aria-describedby={errors.expiry && `${id}-expiry-error`}
                      onChange={(event) =>
                        change({ expiry: formatExpiry(event.target.value) })
                      }
                      onBlur={() => check("expiry")}
                    />
                  </InputGroup>
                  {errors.expiry && (
                    <FieldError id={`${id}-expiry-error`}>
                      {errors.expiry}
                    </FieldError>
                  )}
                </Field>
                <Field data-invalid={!!errors.code || undefined}>
                  <FieldLabel htmlFor={`${id}-code`}>Security code</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`${id}-code`}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={codeLength}
                      placeholder={codeLength === 4 ? "1234" : "123"}
                      className="tabular-nums"
                      value={values.code}
                      aria-invalid={!!errors.code || undefined}
                      aria-describedby={errors.code && `${id}-code-error`}
                      onChange={(event) =>
                        change({ code: event.target.value.replace(/\D/g, "") })
                      }
                      onBlur={() => check("code")}
                    />
                  </InputGroup>
                  {errors.code && (
                    <FieldError id={`${id}-code-error`}>
                      {errors.code}
                    </FieldError>
                  )}
                </Field>
              </div>
            </FieldGroup>
          </fieldset>
        </form>
      )}
    </BillingDialog>
  )
}
