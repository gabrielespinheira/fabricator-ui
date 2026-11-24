"use client"

import { FileTypeIcon } from "@fabricator-ui/icons/files"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import { MessengerMuteSwitch } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import { type Photo } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message-body"
import { ME_PERSON } from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-data"
import {
  describeFile,
  formatClock,
  formatListTime,
  getSharedMedia,
  type Conversation,
  type Person,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import { AspectRatio } from "@/registry/bases/__base__/ui/aspect-ratio"
import { Field, FieldLabel } from "@/registry/bases/__base__/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"

// Two rows of three photos; the rest are in the transcript.
const PHOTO_COUNT = 6

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-(--density-8)">
      <h3 className="text-(length:--density-text-12) text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ContactFacts({
  contact,
  now,
  timeFormat,
}: {
  contact: Person
  now: number
  timeFormat: TimeFormat
}) {
  const facts = [
    { label: "Role", value: contact.role },
    {
      label: "Local time",
      value: contact.timeZone
        ? formatClock(now, { ...timeFormat, timeZone: contact.timeZone })
        : undefined,
    },
    { label: "Email", value: contact.email },
    { label: "Phone", value: contact.phone },
  ].filter(({ value }) => value !== undefined)

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-(--density-16) gap-y-(--density-6)">
      {facts.map((fact) => (
        <div key={fact.label} className="contents">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="min-w-0 wrap-break-word tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function MemberRow({
  name,
  detail,
  avatar,
  isOnline,
}: {
  name: string
  detail?: string
  avatar?: string
  isOnline: boolean
}) {
  return (
    <Item role="listitem" size="xs" className="flex-nowrap px-0">
      <ItemMedia>
        <MessengerAvatar name={name} src={avatar} isOnline={isOnline} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{name}</ItemTitle>
        {detail && <ItemDescription>{detail}</ItemDescription>}
      </ItemContent>
    </Item>
  )
}

/**
 * What the conversation's header can't hold: how to reach the person or who
 * is in the group, what was shared, and whether it makes a sound.
 */
export function MessengerDetails({
  conversation,
  members,
  now,
  timeFormat,
  onMutedChange,
  onOpenPhoto,
}: {
  conversation: Conversation
  members: Person[]
  now: number
  timeFormat: TimeFormat
  onMutedChange: (isMuted: boolean) => void
  onOpenPhoto: (photo: Photo) => void
}) {
  const contact = conversation.kind === "direct" ? members[0] : undefined
  const { photos, files } = getSharedMedia(conversation.messages)
  const muteId = `messenger-mute-${conversation.id}`

  return (
    <>
      <AppShellPanelHeader className="ps-(--density-16)">
        <AppShellPanelTitle>Details</AppShellPanelTitle>
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent className="flex flex-col gap-(--density-24) px-(--density-16) pt-(--density-8) pb-[max(var(--density-24),env(safe-area-inset-bottom))]">
        {contact ? (
          <Section title="Contact">
            <ContactFacts contact={contact} now={now} timeFormat={timeFormat} />
          </Section>
        ) : (
          <Section title={`${members.length + 1} people`}>
            <ItemGroup className="gap-0">
              {members.map((person) => (
                <MemberRow
                  key={person.id}
                  name={person.name}
                  detail={person.role}
                  avatar={person.avatar}
                  isOnline={person.presence.kind === "online"}
                />
              ))}
              <MemberRow
                name={ME_PERSON.name}
                detail="You"
                avatar={ME_PERSON.avatarUrl}
                isOnline
              />
            </ItemGroup>
          </Section>
        )}

        {photos.length > 0 && (
          <Section title={`Photos · ${photos.length}`}>
            <div className="grid grid-cols-3 gap-(--density-4)">
              {photos.slice(0, PHOTO_COUNT).map(({ id, body }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`Open photo: ${body.alt}`}
                  onClick={() => onOpenPhoto(body)}
                  className="cursor-pointer overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <AspectRatio ratio={1}>
                    <img
                      src={body.src}
                      alt=""
                      className="size-full object-cover"
                    />
                  </AspectRatio>
                </button>
              ))}
            </div>
          </Section>
        )}

        {files.length > 0 && (
          <Section title={`Files · ${files.length}`}>
            <ItemGroup className="gap-0">
              {files.map(({ id, body, sentAt }) => (
                <Item
                  key={id}
                  role="listitem"
                  size="xs"
                  className="flex-nowrap px-0"
                >
                  <ItemMedia>
                    <FileTypeIcon name={body.name} className="size-6" />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="wrap-anywhere">{body.name}</ItemTitle>
                    <ItemDescription>
                      {describeFile(body.name, body.size)},{" "}
                      {formatListTime(sentAt, now, timeFormat)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </Section>
        )}

        <Field orientation="horizontal">
          <FieldLabel htmlFor={muteId}>Mute notifications</FieldLabel>
          <MessengerMuteSwitch
            id={muteId}
            checked={conversation.isMuted}
            onCheckedChange={onMutedChange}
          />
        </Field>
      </AppShellPanelContent>
    </>
  )
}
