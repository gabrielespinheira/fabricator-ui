"use client"

import * as React from "react"

import { ForgotPasswordCodeStep } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-code-step"
import { ForgotPasswordEmailStep } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-email-step"
import {
  ForgotPasswordFrame,
  ForgotPasswordHeading,
} from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-frame"
import { ForgotPasswordNewStep } from "@/registry/bases/__base__/blocks/forgot-password-01/components/forgot-password-new-step"
import {
  CODE_LENGTH,
  getStepPosition,
  type ResetFailure,
  type ResetResult,
  type ResetStep,
} from "@/registry/bases/__base__/blocks/forgot-password-01/lib/forgot-password-model"
import { buttonVariants } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldGroup,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const HEADINGS: Record<ResetStep, { title: string; lead: string }> = {
  email: {
    title: "Reset your password",
    lead: `We'll email you a ${CODE_LENGTH}-digit code.`,
  },
  code: {
    title: "Check your email",
    lead: `Enter the ${CODE_LENGTH}-digit code we sent you.`,
  },
  password: {
    title: "Choose a password",
    lead: "Use one you don't use anywhere else.",
  },
  done: {
    title: "Password updated",
    lead: "You're signed out on your other devices.",
  },
}

export function ForgotPasswordFlow({
  signInHref,
  onSendCode,
  onVerifyCode,
  onResetPassword,
}: {
  signInHref: string
  onSendCode: (email: string) => Promise<ResetResult>
  onVerifyCode: (email: string, code: string) => Promise<ResetResult>
  onResetPassword: (
    email: string,
    code: string,
    password: string
  ) => Promise<ResetResult>
}) {
  const [step, setStep] = React.useState<ResetStep>("email")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [codeFailure, setCodeFailure] = React.useState<ResetFailure>()
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const position = getStepPosition(step)
  const { title, lead } = HEADINGS[step]

  // The earlier steps focus their field; the end has none.
  React.useEffect(() => {
    if (step === "done") headingRef.current?.focus()
  }, [step])

  return (
    <ForgotPasswordFrame hasSignInLink={step !== "done"}>
      <ForgotPasswordHeading
        headingRef={headingRef}
        title={title}
        aside={
          position ? (
            <p
              role="status"
              className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums"
            >
              Step {position.step} of {position.total}
              <span className="sr-only">: {title}</span>
            </p>
          ) : (
            <IconPlaceholder
              lucide="CircleCheckIcon"
              tabler="IconCircleCheck"
              hugeicons="CheckmarkCircle02Icon"
              phosphor="CheckCircleIcon"
              remixicon="RiCheckboxCircleLine"
              className="size-(--density-24) shrink-0 self-center text-success"
            />
          )
        }
      >
        {lead}
      </ForgotPasswordHeading>
      {step === "email" && (
        <ForgotPasswordEmailStep
          defaultEmail={email}
          onSendCode={onSendCode}
          onSent={(sentTo) => {
            setEmail(sentTo)
            setCodeFailure(undefined)
            setStep("code")
          }}
        />
      )}
      {step === "code" && (
        <ForgotPasswordCodeStep
          email={email}
          defaultFailure={codeFailure}
          onSendCode={() => onSendCode(email)}
          onVerifyCode={(value) => onVerifyCode(email, value)}
          onVerified={(value) => {
            setCode(value)
            setStep("password")
          }}
          onChangeEmail={() => setStep("email")}
        />
      )}
      {step === "password" && (
        <ForgotPasswordNewStep
          email={email}
          onSubmit={(password) => onResetPassword(email, code, password)}
          onCodeFailure={(failure) => {
            setCodeFailure(failure)
            setStep("code")
          }}
          onDone={() => setStep("done")}
        />
      )}
      {step === "done" && (
        <FieldGroup>
          <Field>
            <FieldTitle>Account</FieldTitle>
            <p className="min-h-(--density-36) rounded-lg bg-hover px-(--density-10) py-(--density-8) text-(length:--density-text-13) wrap-anywhere">
              {email}
            </p>
          </Field>
          <a
            href={signInHref}
            data-slot="button"
            className={buttonVariants({ className: "w-full" })}
          >
            Sign in
          </a>
        </FieldGroup>
      )}
    </ForgotPasswordFrame>
  )
}
