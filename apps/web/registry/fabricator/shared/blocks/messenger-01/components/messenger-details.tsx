"use client"

import { FileTypeIcon } from "@fabricator-ui/icons/files"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import { MessengerMuteSwitch } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import {
  describeFile,
  formatPresence,
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
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"

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

/**
 * The conversation's details beside it: who it's with, what was shared, and
 * its settings, in sections parted by space and a label.
 */
export function MessengerDetails({
  conversation,
  people,
  now,
  timeFormat,
  onMutedChange,
  onBlock,
  onUnblock,
}: {
  conversation: Conversation
  people: Person[]
  now: number
  timeFormat: TimeFormat
  onMutedChange: (isMuted: boolean) => void
  onBlock: () => void
  onUnblock: () => void
}) {
  const members = conversation.memberIds.flatMap(
    (id) => people.find((person) => person.id === id) ?? []
  )
  const contact = conversation.kind === "direct" ? members[0] : undefined
  const photos = conversation.messages.flatMap((message) =>
    message.body.kind === "image" ? [{ id: message.id, ...message.body }] : []
  )
  const files = conversation.messages.flatMap((message) =>
    message.body.kind === "file" ? [{ id: message.id, ...message.body }] : []
  )
  const muteId = `messenger-mute-${conversation.id}`

  return (
    <>
      <AppShellPanelHeader>
        <AppShellPanelClose />
        <AppShellPanelTitle>Details</AppShellPanelTitle>
      </AppShellPanelHeader>
      <AppShellPanelContent className="flex flex-col gap-(--density-24) px-(--density-12) pt-(--density-8) pb-(--density-24)">
        <div className="flex items-center gap-(--density-12)">
          <MessengerAvatar
            name={conversation.title}
            src={conversation.avatar ?? contact?.avatar}
            size="lg"
            className="size-14"
          />
          <div className="flex min-w-0 flex-col gap-(--density-2)">
            <p className="truncate text-[14px] font-medium">
              {conversation.title}
            </p>
            <p className="truncate text-(length:--density-text-12) text-muted-foreground">
              {contact
                ? formatPresence(contact.presence, now, timeFormat)
                : `${members.length + 1} members`}
            </p>
          </div>
        </div>

        {contact ? (
          <Section title="Contact">
            <dl className="grid grid-cols-[auto_1fr] gap-x-(--density-16) gap-y-(--density-6)">
              {contact.phone && (
                <>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="truncate tabular-nums">{contact.phone}</dd>
                </>
              )}
              {contact.email && (
                <>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate">{contact.email}</dd>
                </>
              )}
            </dl>
          </Section>
        ) : (
          <Section title="Members">
            <ItemGroup className="gap-0">
              {members.map((person) => (
                <Item
                  key={person.id}
                  role="listitem"
                  size="xs"
                  className="px-0"
                >
                  <ItemMedia>
                    <MessengerAvatar
                      name={person.name}
                      src={person.avatar}
                      isOnline={person.presence.kind === "online"}
                      size="sm"
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{person.name}</ItemTitle>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </Section>
        )}

        {photos.length > 0 && (
          <Section title="Photos">
            <div className="grid grid-cols-3 gap-(--density-6)">
              {photos.map((photo) => (
                <AspectRatio key={photo.id} ratio={1}>
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="size-full rounded-md object-cover"
                  />
                </AspectRatio>
              ))}
            </div>
          </Section>
        )}

        {files.length > 0 && (
          <Section title="Files">
            <ItemGroup className="gap-(--density-6)">
              {files.map((file) => (
                <Item key={file.id} role="listitem" size="sm" variant="muted">
                  <ItemMedia>
                    <FileTypeIcon name={file.name} className="size-6" />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="min-w-0 truncate">
                      {file.name}
                    </ItemTitle>
                    <ItemDescription>
                      {describeFile(file.name, file.size)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </Section>
        )}

        <Section title="Notifications">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={muteId}>Mute notifications</FieldLabel>
              <FieldDescription>
                Messages still arrive, without a sound or a banner.
              </FieldDescription>
            </FieldContent>
            <MessengerMuteSwitch
              id={muteId}
              checked={conversation.isMuted}
              onCheckedChange={onMutedChange}
            />
          </Field>
        </Section>

        {contact &&
          (conversation.isBlocked ? (
            <Button
              variant="outline"
              className="self-start"
              onClick={onUnblock}
            >
              Unblock {contact.name.split(" ")[0]}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="self-start"
              onClick={onBlock}
            >
              Block {contact.name.split(" ")[0]}…
            </Button>
          ))}
      </AppShellPanelContent>
    </>
  )
}
