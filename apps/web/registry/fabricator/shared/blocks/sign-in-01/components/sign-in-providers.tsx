"use client"

import * as React from "react"
import { AppleIcon, GoogleIcon } from "@fabricator-ui/icons/brands"

import {
  getProviderMessage,
  PROVIDER_NAMES,
  type ProviderResult,
  type SignInMethod,
  type SignInProvider,
} from "@/registry/bases/__base__/blocks/sign-in-01/lib/sign-in-form-model"
import { Alert, AlertDescription } from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const providers = [
  { id: "google", Icon: GoogleIcon },
  { id: "apple", Icon: AppleIcon },
] as const

type Failure = { provider: SignInProvider; message: string }

export function SignInProviders({
  pending,
  lastUsed,
  onSelect,
}: {
  /** The method under way; the others wait for it. */
  pending?: SignInMethod
  /** Marked, so people come back the way they came last time. */
  lastUsed?: SignInMethod
  onSelect: (provider: SignInProvider) => Promise<ProviderResult>
}) {
  const [failure, setFailure] = React.useState<Failure>()
  const rowRef = React.useRef<HTMLDivElement>(null)

  // Disabling the buttons dropped the focus; a failure gives it back.
  React.useEffect(() => {
    if (!failure) return
    rowRef.current
      ?.querySelector<HTMLElement>(`[data-provider="${failure.provider}"]`)
      ?.focus()
  }, [failure])

  const select = async (provider: SignInProvider) => {
    setFailure(undefined)
    const result = await onSelect(provider)
    if (result.ok) return
    setFailure({
      provider,
      message: getProviderMessage(provider, result.error),
    })
  }

  return (
    <div className="flex flex-col gap-(--density-12)">
      <p
        id="sign-in-providers"
        className="text-(length:--density-text-12) text-muted-foreground"
      >
        Or continue with
      </p>
      {failure && (
        <Alert variant="error">
          <IconPlaceholder
            lucide="CircleAlertIcon"
            tabler="IconAlertCircle"
            hugeicons="AlertCircleIcon"
            phosphor="WarningCircleIcon"
            remixicon="RiErrorWarningLine"
          />
          <AlertDescription>{failure.message}</AlertDescription>
        </Alert>
      )}
      <fieldset
        disabled={pending !== undefined}
        aria-labelledby="sign-in-providers"
        className="contents"
      >
        <div ref={rowRef} className="grid grid-cols-2 gap-(--density-8)">
          {providers.map(({ id, Icon }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              className="min-w-0"
              data-provider={id}
              onClick={() => void select(id)}
            >
              {pending === id ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Icon color="brand" data-icon="inline-start" />
              )}
              {pending === id
                ? `Opening ${PROVIDER_NAMES[id]}…`
                : PROVIDER_NAMES[id]}
              {lastUsed === id && pending !== id && (
                <span className="text-(length:--density-text-12) font-normal text-muted-foreground">
                  Last used
                </span>
              )}
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
