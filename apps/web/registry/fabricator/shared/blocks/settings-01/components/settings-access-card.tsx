"use client"

import * as React from "react"

import {
  SettingsDomains,
  SettingsRadio,
  SettingsRadioGroup,
  SettingsSwitch,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import {
  SettingsRow,
  SettingsSaveMark,
  SettingsSection,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-section"
import {
  type SaveSetting,
  type SaveStatus,
} from "@/registry/bases/__base__/blocks/settings-01/hooks/use-workspace-settings"
import {
  PEOPLE_COUNT,
  SEATS,
  WITHOUT_TWO_FACTOR,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-data"
import {
  addDomains,
  type JoinPolicy,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"

const POLICIES: { value: JoinPolicy; title: string; consequence: string }[] = [
  {
    value: "invite",
    title: "Only people you invite",
    consequence: "Admins send each invitation. 2 are waiting now.",
  },
  {
    value: "link",
    title: "Anyone with the invite link",
    consequence: "They join as a Viewer, until someone resets the link.",
  },
  {
    value: "domain",
    title: "Anyone at your company",
    consequence: `They join as a Member without asking. ${SEATS.total - SEATS.used} of ${SEATS.total} seats are free.`,
  },
]

function isJoinPolicy(value: string): value is JoinPolicy {
  return POLICIES.some((policy) => policy.value === value)
}

/** Who gets in, and what they need to sign in. */
export function SettingsAccessCard({
  id,
  joinPolicy,
  domains,
  requiresTwoFactor,
  statuses,
  onSave,
}: {
  id: string
  joinPolicy: JoinPolicy
  domains: string[]
  requiresTwoFactor: boolean
  statuses: {
    joinPolicy?: SaveStatus
    domains?: SaveStatus
    requiresTwoFactor?: SaveStatus
  }
  onSave: SaveSetting
}) {
  return (
    <SettingsSection
      id={id}
      title="Access"
      description="Who can join, and how they sign in."
    >
      <Field>
        <FieldTitle>
          Who can join
          <SettingsSaveMark status={statuses.joinPolicy} />
        </FieldTitle>
        <SettingsRadioGroup
          label="Who can join"
          value={joinPolicy}
          onValueChange={(next) => {
            if (isJoinPolicy(next)) {
              void onSave("joinPolicy", next, { undo: "Who can join changed" })
            }
          }}
        >
          {POLICIES.map((policy) => (
            <FieldLabel key={policy.value} htmlFor={`join-${policy.value}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{policy.title}</FieldTitle>
                  <FieldDescription className="text-foreground/70">
                    {policy.consequence}
                  </FieldDescription>
                </FieldContent>
                <SettingsRadio
                  id={`join-${policy.value}`}
                  value={policy.value}
                />
              </Field>
            </FieldLabel>
          ))}
        </SettingsRadioGroup>
      </Field>
      {joinPolicy === "domain" && (
        <DomainsField
          domains={domains}
          status={statuses.domains}
          onChange={(next, message) =>
            void onSave("domains", next, { undo: message })
          }
        />
      )}
      <TwoFactorRow
        isRequired={requiresTwoFactor}
        status={statuses.requiresTwoFactor}
        onChange={(next) =>
          void onSave("requiresTwoFactor", next, {
            undo: next
              ? "Two-factor is required from December 1"
              : "Two-factor is optional",
          })
        }
      />
    </SettingsSection>
  )
}

function DomainsField({
  domains,
  status,
  onChange,
}: {
  domains: string[]
  status?: SaveStatus
  onChange: (domains: string[], message: string) => void
}) {
  const [draft, setDraft] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const helpId = "workspace-domains-help"

  const add = (text: string) => {
    if (!text.trim()) return
    const result = addDomains(domains, text)
    setError(result.error)
    setDraft(result.error ? text.trim() : "")
    const added = result.domains.slice(domains.length)
    if (added.length > 0) {
      onChange(
        result.domains,
        added.length === 1
          ? `${added[0]} added`
          : `${added.length} domains added`
      )
    }
  }

  return (
    <Field data-invalid={error !== null || undefined}>
      <FieldLabel htmlFor="workspace-domains">
        Sign-in domains
        <SettingsSaveMark status={status} />
      </FieldLabel>
      <SettingsDomains
        id="workspace-domains"
        label="Sign-in domains"
        value={domains}
        draft={draft}
        isInvalid={error !== null}
        describedBy={helpId}
        onValueChange={(next) => {
          const removed = domains.find((domain) => !next.includes(domain))
          if (removed) onChange(next, `${removed} removed`)
        }}
        onDraftChange={(next) => {
          setDraft(next)
          setError(null)
        }}
        onAdd={add}
      />
      {error ? (
        <FieldError id={helpId}>{error}</FieldError>
      ) : domains.length === 0 ? (
        <FieldDescription id={helpId}>
          With no domain, nobody can join by themselves.
        </FieldDescription>
      ) : (
        <FieldDescription id={helpId}>
          Type a domain and press Enter, or paste several.
        </FieldDescription>
      )}
    </Field>
  )
}

function TwoFactorRow({
  isRequired,
  status,
  onChange,
}: {
  isRequired: boolean
  status?: SaveStatus
  onChange: (isRequired: boolean) => void
}) {
  const count = WITHOUT_TWO_FACTOR.length
  return (
    <SettingsRow
      title="Require two-factor"
      description={
        isRequired
          ? `${count} of ${PEOPLE_COUNT} people have until December 1 to set it up. After that they can't sign in.`
          : `${count} of ${PEOPLE_COUNT} people don't have it yet.`
      }
      htmlFor="workspace-two-factor"
      status={status}
      isInline
    >
      <AvatarGroup className="-mt-0.5 self-start">
        {WITHOUT_TWO_FACTOR.map((person) => (
          <Avatar key={person.id} size="sm" tooltip={person.name}>
            {person.photo && <AvatarImage src={person.photo} alt="" />}
            <AvatarFallback
              style={{
                background: "oklch(0.88 0.06 320)",
                color: "oklch(0.36 0.09 320)",
              }}
            >
              {person.name
                .split(" ")
                .map((word) => word.charAt(0))
                .join("")}
            </AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <SettingsSwitch
        id="workspace-two-factor"
        checked={isRequired}
        onCheckedChange={onChange}
      />
    </SettingsRow>
  )
}
