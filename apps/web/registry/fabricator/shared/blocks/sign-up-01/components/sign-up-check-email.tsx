"use client"

import * as React from "react"

import {
  captionLinkClassName,
  SignUpHeading,
} from "@/registry/bases/__base__/blocks/sign-up-01/components/sign-up-frame"
import { useSignUpResend } from "@/registry/bases/__base__/blocks/sign-up-01/hooks/use-sign-up-resend"
import {
  formatCountdown,
  getInbox,
} from "@/registry/bases/__base__/blocks/sign-up-01/lib/sign-up-form-model"
import { Button, buttonVariants } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Shown after the account exists: the link in the email confirms it, often on
// another device, so this page has a way on of its own.
export function SignUpCheckEmail({
  email,
  onResend,
  onContinue,
  onChangeEmail,
}: {
  email: string
  onResend: () => Promise<void>
  /** Resolves to whether the address is confirmed. */
  onContinue: () => Promise<boolean>
  onChangeEmail: () => void
}) {
  const { secondsLeft, isSending, hasResent, resend } =
    useSignUpResend(onResend)
  const [isChecking, setChecking] = React.useState(false)
  const [isUnconfirmed, setUnconfirmed] = React.useState(false)
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const inbox = getInbox(email)

  React.useEffect(() => headingRef.current?.focus(), [])

  const check = async () => {
    setUnconfirmed(false)
    setChecking(true)
    const isConfirmed = await onContinue()
    if (isConfirmed) return
    setChecking(false)
    setUnconfirmed(true)
  }

  const sendAgain = () => {
    setUnconfirmed(false)
    void resend()
  }

  return (
    <>
      <SignUpHeading headingRef={headingRef} title="Check your email">
        Open the link we sent you, then continue.
      </SignUpHeading>
      <FieldGroup>
        <Field>
          <div className="flex items-center justify-between gap-(--density-8)">
            <FieldTitle>Sent to</FieldTitle>
            <span className="text-(length:--density-text-12) leading-none text-muted-foreground tabular-nums">
              {isSending && "Sending…"}
              {!isSending &&
                secondsLeft > 0 &&
                `Resend in ${formatCountdown(secondsLeft)}`}
              {!isSending && secondsLeft === 0 && (
                <button
                  type="button"
                  className={`font-medium text-foreground ${captionLinkClassName}`}
                  onClick={sendAgain}
                >
                  Resend email
                </button>
              )}
            </span>
          </div>
          <div className="flex min-h-(--density-36) items-center justify-between gap-(--density-12) rounded-(--radius-control) bg-hover px-(--density-10) py-(--density-6) text-(length:--density-text-13)">
            <span className="wrap-anywhere">{email}</span>
            <button
              type="button"
              className={`text-(length:--density-text-12) text-foreground/70 ${captionLinkClassName}`}
              onClick={onChangeEmail}
            >
              Change
            </button>
          </div>
          <div className="min-h-lh text-(length:--density-text-12)">
            {isUnconfirmed ? (
              <FieldError>Not confirmed yet. Open the link first.</FieldError>
            ) : (
              <FieldDescription role="status">
                {hasResent
                  ? "Sent again. Only the newest link works."
                  : "The link works for 24 hours. Check spam too."}
              </FieldDescription>
            )}
          </div>
        </Field>
        <div className="flex flex-col gap-(--density-8)">
          {inbox && (
            <a
              href={inbox.href}
              target="_blank"
              rel="noreferrer"
              data-slot="button"
              className={buttonVariants({ className: "w-full" })}
            >
              Open {inbox.name}
              <IconPlaceholder
                lucide="ArrowUpRightIcon"
                tabler="IconArrowUpRight"
                hugeicons="ArrowUpRight01Icon"
                phosphor="ArrowUpRightIcon"
                remixicon="RiArrowRightUpLine"
                data-icon="inline-end"
              />
            </a>
          )}
          <fieldset disabled={isChecking} className="contents">
            <Button
              type="button"
              variant={inbox ? "outline" : "default"}
              className="w-full"
              onClick={() => void check()}
            >
              {isChecking && <Spinner data-icon="inline-start" />}
              {isChecking ? "Checking…" : "Continue"}
            </Button>
          </fieldset>
        </div>
      </FieldGroup>
    </>
  )
}
