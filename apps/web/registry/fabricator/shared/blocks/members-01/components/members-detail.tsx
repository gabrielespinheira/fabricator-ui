"use client"

import * as React from "react"

import { MembersAvatar } from "@/registry/bases/__base__/blocks/members-01/components/members-avatar"
import {
  MembersButton,
  MembersRolePicker,
  notifyMembers,
} from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import {
  MembersInvitationBadge,
  MembersTwoFactor,
} from "@/registry/bases/__base__/blocks/members-01/components/members-status"
import {
  describeOwned,
  formatAgo,
  formatDay,
  getFirstName,
  getRoleLabel,
  getRowName,
  type Invitation,
  type MemberRole,
  type MemberSession,
  type Person,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type DetailProps = {
  now: string
  roleNote: string | null
  onRoleChange: (row: TeamRow, role: MemberRole) => void
}

/** One person: what they can reach, where they are signed in, what they did. */
export function MembersDetail({
  row,
  onResend,
  onRevoke,
  ...props
}: DetailProps & {
  row: TeamRow | null
  onResend: (invitation: Invitation) => void
  onRevoke: (invitation: Invitation) => void
}) {
  if (!row) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPlaceholder
              lucide="UsersIcon"
              tabler="IconUsers"
              hugeicons="UserGroupIcon"
              phosphor="UsersIcon"
              remixicon="RiGroupLine"
            />
          </EmptyMedia>
          <EmptyTitle>Nobody open</EmptyTitle>
          <EmptyDescription>
            Choose a name to see their access, sessions and activity.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="flex flex-col gap-(--density-24) p-(--density-16)">
      <div className="flex items-center gap-(--density-12)">
        <MembersAvatar row={row} size="lg" />
        <div className="flex min-w-0 flex-col items-start gap-(--density-2)">
          <h2 className="max-w-full text-(length:--density-text-14) font-medium text-pretty wrap-anywhere text-foreground">
            {getRowName(row)}
          </h2>
          {row.name && (
            <span className="max-w-full truncate text-(length:--density-text-12) text-muted-foreground">
              {row.email}
            </span>
          )}
        </div>
      </div>
      {row.kind === "person" ? (
        <PersonDetail key={row.id} person={row} {...props} />
      ) : (
        <InvitationDetail
          invitation={row}
          onResend={onResend}
          onRevoke={onRevoke}
          {...props}
        />
      )}
    </div>
  )
}

function RoleValue({
  row,
  roleNote,
  onRoleChange,
}: Omit<DetailProps, "now"> & { row: TeamRow }) {
  return (
    <MembersRolePicker
      label={`Role of ${getRowName(row)}`}
      value={row.role}
      note={roleNote ?? undefined}
      isLocked={roleNote !== null}
      canBeOwner={row.kind === "person"}
      onValueChange={(role) => onRoleChange(row, role)}
      trigger={{
        variant: "ghost",
        className:
          "-me-3 -my-(--density-6) text-(length:--density-text-13) font-normal text-foreground",
        content: (
          <>
            {getRoleLabel(row.role)}
            <IconPlaceholder
              lucide="ChevronDownIcon"
              tabler="IconChevronDown"
              hugeicons="ArrowDown01Icon"
              phosphor="CaretDownIcon"
              remixicon="RiArrowDownSLine"
              data-icon="inline-end"
            />
          </>
        ),
      }}
    />
  )
}

function Facts({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-(--density-16) gap-y-(--density-12) text-(length:--density-text-13) [&>dd]:text-end [&>dd]:text-foreground [&>dt]:text-muted-foreground">
      {children}
    </dl>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-(--density-8)">
      <div className="flex min-h-(--density-28) items-center justify-between gap-(--density-8)">
        <h3 className="text-(length:--density-text-13) font-medium text-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Nothing({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-(length:--density-text-13) text-pretty text-muted-foreground">
      {children}
    </p>
  )
}

function PersonDetail({
  person,
  now,
  ...role
}: DetailProps & { person: Person }) {
  const [ended, setEnded] = React.useState<string[]>([])
  const sessions = person.sessions.filter(({ id }) => !ended.includes(id))
  const others = sessions.filter(({ isCurrent }) => !isCurrent)
  const owned = describeOwned(person.owns)

  const end = (ids: string[], message: string) => {
    setEnded((current) => [...current, ...ids])
    notifyMembers(message)
  }

  return (
    <>
      <Facts>
        <dt>Role</dt>
        <dd>
          <RoleValue row={person} {...role} />
        </dd>
        <dt>Two-factor</dt>
        <dd>
          <MembersTwoFactor isOn={person.hasTwoFactor} />
        </dd>
        <dt>Signs in with</dt>
        <dd>{person.signIn}</dd>
        <dt>Owns</dt>
        <dd>
          {owned || <span className="text-muted-foreground">Nothing</span>}
        </dd>
        <dt>Joined</dt>
        <dd className="tabular-nums">{formatMonth(person.joinedAt)}</dd>
      </Facts>
      <Section title="Teams">
        {person.teams.length > 0 ? (
          <div className="flex flex-wrap gap-(--density-6)">
            {person.teams.map((team) => (
              <Badge key={team} variant="secondary">
                {team}
              </Badge>
            ))}
          </div>
        ) : (
          <Nothing>In no team yet.</Nothing>
        )}
      </Section>
      <Section
        title="Sessions"
        action={
          others.length > 1 && (
            <MembersButton
              variant="ghost"
              size="sm"
              className="-me-3"
              onClick={() =>
                end(
                  others.map(({ id }) => id),
                  `${getFirstName(person.name)} signed out everywhere`
                )
              }
            >
              Sign out all
            </MembersButton>
          )
        }
      >
        {sessions.length > 0 ? (
          <ItemGroup className="gap-(--density-4)">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                now={now}
                onEnd={() => end([session.id], `${session.device} signed out`)}
              />
            ))}
          </ItemGroup>
        ) : (
          <Nothing>Signed out everywhere.</Nothing>
        )}
      </Section>
      <Section title="Activity">
        {person.activity.length > 0 ? (
          <ul className="flex flex-col gap-(--density-10) text-(length:--density-text-13)">
            {person.activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-baseline justify-between gap-(--density-12)"
              >
                <span className="text-pretty text-foreground">
                  {entry.text}
                </span>
                <span className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums">
                  {formatAgo(entry.at, now)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Nothing>Nothing in the last 30 days.</Nothing>
        )}
      </Section>
    </>
  )
}

function SessionItem({
  session,
  now,
  onEnd,
}: {
  session: MemberSession
  now: string
  onEnd: () => void
}) {
  return (
    <Item role="listitem" variant="muted" size="xs">
      <ItemMedia variant="icon">
        {session.kind === "desktop" ? (
          <IconPlaceholder
            lucide="MonitorIcon"
            tabler="IconDeviceDesktop"
            hugeicons="ComputerIcon"
            phosphor="MonitorIcon"
            remixicon="RiComputerLine"
          />
        ) : (
          <IconPlaceholder
            lucide="SmartphoneIcon"
            tabler="IconDeviceMobile"
            hugeicons="SmartPhone01Icon"
            phosphor="DeviceMobileIcon"
            remixicon="RiSmartphoneLine"
          />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{session.device}</ItemTitle>
        <ItemDescription className="text-foreground/70 tabular-nums">
          {session.place},{" "}
          {session.isCurrent
            ? "this device"
            : formatAgo(session.lastActiveAt, now)}
        </ItemDescription>
      </ItemContent>
      {!session.isCurrent && (
        <ItemActions>
          <MembersButton
            variant="ghost"
            size="sm"
            aria-label={`Sign out ${session.device}`}
            onClick={onEnd}
          >
            Sign out
          </MembersButton>
        </ItemActions>
      )}
    </Item>
  )
}

function InvitationDetail({
  invitation,
  now,
  onResend,
  onRevoke,
  ...role
}: DetailProps & {
  invitation: Invitation
  onResend: (invitation: Invitation) => void
  onRevoke: (invitation: Invitation) => void
}) {
  return (
    <>
      <Facts>
        <dt>Status</dt>
        <dd>
          <MembersInvitationBadge status={invitation.status} />
        </dd>
        <dt>Role</dt>
        <dd>
          <RoleValue row={invitation} {...role} />
        </dd>
        <dt>Invited by</dt>
        <dd>{invitation.invitedBy}</dd>
        <dt>Sent</dt>
        <dd className="tabular-nums">{formatAgo(invitation.sentAt, now)}</dd>
      </Facts>
      <div className="flex flex-wrap gap-(--density-8)">
        <MembersButton
          variant="outline"
          className="flex-1"
          onClick={() => onResend(invitation)}
        >
          {invitation.status === "undelivered" ? "Fix address" : "Resend"}
        </MembersButton>
        <MembersButton
          variant="destructive"
          className="flex-1"
          onClick={() => onRevoke(invitation)}
        >
          Revoke
        </MembersButton>
      </div>
    </>
  )
}

function formatMonth(iso: string) {
  return `${formatDay(iso)}, ${iso.slice(0, 4)}`
}
