"use client"

import * as React from "react"

import {
  SettingsButton,
  SettingsSuggestion,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import { SettingsLogo } from "@/registry/bases/__base__/blocks/settings-01/components/settings-logo"
import {
  SettingsSaveMark,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import {
  type SaveSetting,
  type SaveStatus,
} from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import {
  canSaveAddress,
  lookUpAddress,
  toAddress,
  type AddressState,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-address-model"
import {
  ADDRESS_ENDING,
  TAKEN_ADDRESSES,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  canSaveName,
  isTextDirty,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import {
  FileUpload,
  FileUploadTrigger,
} from "@/registry/bases/__base__/ui/file-upload"
import { Input } from "@/registry/bases/__base__/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/registry/bases/__base__/ui/input-group"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const LOGO_LIMIT = 2 * 1024 * 1024
const CHECK_TIME = 500

/** The workspace's logo, name and web address. */
export function SettingsWorkspaceCard({
  id,
  name,
  address,
  logo,
  color,
  statuses,
  onSave,
}: {
  id: string
  name: string
  address: string
  logo: string | null
  color: string
  statuses: { logo?: SaveStatus; name?: SaveStatus; address?: SaveStatus }
  onSave: SaveSetting
}) {
  return (
    <SettingsSection
      id={id}
      title="Workspace"
      description="How members and customers recognize you."
    >
      <LogoRow
        name={name}
        logo={logo}
        color={color}
        status={statuses.logo}
        onChange={(next) =>
          void onSave("logo", next, {
            undo: next ? "Logo changed" : "Logo removed",
          })
        }
      />
      <NameForm
        saved={name}
        status={statuses.name}
        onSave={(next) => onSave("name", next)}
      />
      <AddressForm
        saved={address}
        status={statuses.address}
        onSave={(next) => onSave("address", next)}
      />
    </SettingsSection>
  )
}

function LogoRow({
  name,
  logo,
  color,
  status,
  onChange,
}: {
  name: string
  logo: string | null
  color: string
  status?: SaveStatus
  onChange: (logo: string | null) => void
}) {
  const [error, setError] = React.useState<string | null>(null)

  return (
    <FileUpload
      accept="image/png,image/jpeg,image/svg+xml"
      maxSize={LOGO_LIMIT}
      value={[]}
      onValueChange={([file]) => {
        if (!file) return
        setError(null)
        onChange(URL.createObjectURL(file))
      }}
      onFileReject={([rejection]) => {
        if (!rejection) return
        setError(
          rejection.file.size > LOGO_LIMIT
            ? `${rejection.file.name} is over 2 MB. Export a smaller one.`
            : `${rejection.file.name} isn't an image. Use PNG, JPG or SVG.`
        )
      }}
      className="w-full"
    >
      <Field
        orientation="horizontal"
        data-invalid={error !== null || undefined}
        className="items-center! gap-(--density-12)"
      >
        <span className="size-(--density-48) shrink-0 rounded-(--radius-surface) text-(length:--density-text-16)">
          <SettingsLogo name={name} logo={logo} color={color} />
        </span>
        <FieldContent>
          <FieldTitle>
            Logo
            <SettingsSaveMark status={status} />
          </FieldTitle>
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>PNG, JPG or SVG, up to 2 MB.</FieldDescription>
          )}
        </FieldContent>
        <span className="flex shrink-0 items-center gap-(--density-4)">
          {logo && (
            <SettingsButton variant="ghost" onClick={() => onChange(null)}>
              Remove
            </SettingsButton>
          )}
          <FileUploadTrigger>{logo ? "Replace" : "Upload"}</FileUploadTrigger>
        </span>
      </Field>
    </FileUpload>
  )
}

function NameForm({
  saved,
  status,
  onSave,
}: {
  saved: string
  status?: SaveStatus
  onSave: (name: string) => Promise<boolean>
}) {
  const [text, setText] = React.useState(saved)
  const [hasFailed, setFailed] = React.useState(false)
  const isBlank = text.trim() === ""
  const isDirty = isTextDirty(text, saved)
  useUnsavedWarning(isDirty)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSaveName(text, saved)) return
        setFailed(false)
        setFailed(!(await onSave(text.trim())))
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setText(saved)
      }}
    >
      <Field data-invalid={isBlank || hasFailed || undefined}>
        <FieldLabel htmlFor="workspace-name">
          Name
          <SettingsSaveMark status={status} />
        </FieldLabel>
        <div className="flex items-center gap-(--density-8)">
          <Input
            id="workspace-name"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setFailed(false)
            }}
            autoComplete="organization"
            enterKeyHint="done"
            maxLength={60}
            aria-invalid={isBlank || hasFailed || undefined}
            aria-describedby="workspace-name-help"
          />
          <SettingsButton
            type="submit"
            variant={isDirty && !isBlank ? "default" : "outline"}
            isDisabled={!canSaveName(text, saved)}
            isPending={status === "saving"}
            aria-label="Save name"
          >
            Save
          </SettingsButton>
        </div>
        {isBlank ? (
          <FieldError id="workspace-name-help">
            Give the workspace a name.
          </FieldError>
        ) : hasFailed ? (
          <FieldError id="workspace-name-help">
            The name wasn&apos;t saved. Your text is still here.
          </FieldError>
        ) : (
          <FieldDescription id="workspace-name-help">
            On invitations, invoices and the sign-in page.
          </FieldDescription>
        )}
      </Field>
    </form>
  )
}

function AddressForm({
  saved,
  status,
  onSave,
}: {
  saved: string
  status?: SaveStatus
  onSave: (address: string) => Promise<boolean>
}) {
  const [text, setText] = React.useState(saved)
  const [hasFailed, setFailed] = React.useState(false)
  const state = useAddressState(text, saved)
  const isInvalid =
    hasFailed || ["empty", "invalid", "taken"].includes(state.kind)
  useUnsavedWarning(text !== saved)

  const change = (next: string) => {
    setText(toAddress(next))
    setFailed(false)
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSaveAddress(state)) return
        setFailed(false)
        setFailed(!(await onSave(text)))
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") change(saved)
      }}
    >
      <Field data-invalid={isInvalid || undefined}>
        <FieldLabel htmlFor="workspace-address">
          Web address
          <SettingsSaveMark status={status} />
        </FieldLabel>
        <div className="flex items-center gap-(--density-8)">
          <InputGroup>
            <InputGroupInput
              id="workspace-address"
              value={text}
              onChange={(event) => change(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="url"
              enterKeyHint="done"
              aria-invalid={isInvalid || undefined}
              aria-describedby="workspace-address-help"
            />
            <InputGroupAddon align="inline-end">
              <AddressIcon state={state} />
              <InputGroupText>{ADDRESS_ENDING}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <SettingsButton
            type="submit"
            variant={canSaveAddress(state) ? "default" : "outline"}
            isDisabled={!canSaveAddress(state)}
            isPending={status === "saving"}
            aria-label="Save web address"
          >
            Save
          </SettingsButton>
        </div>
        <div id="workspace-address-help" aria-live="polite">
          {hasFailed ? (
            <FieldError>
              The address wasn&apos;t saved. Your text is still here.
            </FieldError>
          ) : (
            <AddressHelp address={text} state={state} onPick={change} />
          )}
        </div>
      </Field>
    </form>
  )
}

function AddressIcon({ state }: { state: AddressState }) {
  if (state.kind === "checking") return <Spinner aria-hidden />
  if (state.kind === "available")
    return (
      <IconPlaceholder
        lucide="CircleCheckIcon"
        tabler="IconCircleCheckFilled"
        hugeicons="CheckmarkCircle01Icon"
        phosphor="CheckCircleIcon"
        remixicon="RiCheckboxCircleFill"
        className="text-success"
      />
    )
  if (state.kind === "taken")
    return (
      <IconPlaceholder
        lucide="CircleAlertIcon"
        tabler="IconExclamationCircle"
        hugeicons="AlertCircleIcon"
        phosphor="WarningCircleIcon"
        remixicon="RiErrorWarningLine"
        className="text-destructive"
      />
    )
  return null
}

function AddressHelp({
  address,
  state,
  onPick,
}: {
  address: string
  state: AddressState
  onPick: (address: string) => void
}) {
  switch (state.kind) {
    case "current":
      return <FieldDescription>Where people sign in.</FieldDescription>
    case "checking":
      return <FieldDescription>Checking {address}</FieldDescription>
    case "empty":
      return (
        <FieldError>Type an address, or press Escape to keep yours.</FieldError>
      )
    case "invalid":
      return <FieldError>{state.reason}</FieldError>
    case "available":
      return (
        <FieldDescription>
          {address} is free. Old links keep working for 90 days.
        </FieldDescription>
      )
    case "taken":
      return (
        <FieldError className="flex flex-wrap items-center gap-x-(--density-6)">
          {address} is taken. Try
          {state.suggestions.map((suggestion) => (
            <SettingsSuggestion
              key={suggestion}
              onClick={() => onPick(suggestion)}
            >
              {suggestion}
            </SettingsSuggestion>
          ))}
        </FieldError>
      )
  }
}

// The answer for what is typed, once the person pauses.
function useAddressState(text: string, saved: string): AddressState {
  const [checked, setChecked] = React.useState(saved)
  const answer = lookUpAddress(text, { current: saved, taken: TAKEN_ADDRESSES })
  const needsServer = answer.kind === "available" || answer.kind === "taken"

  React.useEffect(() => {
    if (!needsServer) return
    const timer = setTimeout(() => setChecked(text), CHECK_TIME)
    return () => clearTimeout(timer)
  }, [needsServer, text])

  return needsServer && checked !== text ? { kind: "checking" } : answer
}

function useUnsavedWarning(isDirty: boolean) {
  React.useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])
}
