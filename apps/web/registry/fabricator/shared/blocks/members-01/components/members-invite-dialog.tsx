"use client"

import * as React from "react"
import { cn } from "cn"

import {
  MembersAddressBox,
  MembersButton,
  MembersDialog,
  MembersRadio,
  MembersRadioGroup,
  notifyMembers,
} from "@/registry/bases/__base__/blocks/members-01/components/members-controls"
import { MembersSeatStrip } from "@/registry/bases/__base__/blocks/members-01/components/members-seat-strip"
import { sendInvitations } from "@/registry/bases/__base__/blocks/members-01/lib/members-api"
import {
  checkAddresses,
  countSeatsUsed,
  describeProblem,
  formatMoney,
  getSeatPlan,
  isEmail,
  MEMBER_ROLES,
  parseAddresses,
  pluralize,
  type AddressProblem,
  type CheckedAddress,
  type MemberRole,
  type ParsedAddress,
  type Seats,
  type SendFailure,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const ROLES = MEMBER_ROLES.filter(({ value }) => value !== "owner")

type Result = { sent: ParsedAddress[]; failed: SendFailure[] }

/** Many people at once: paste them, pick a role, see what it costs, send. */
export function MembersInviteDialog({
  open,
  onOpenChange,
  isPhone,
  rows,
  seats,
  domains,
  now,
  onInvite,
  onAddSeats,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPhone: boolean
  rows: TeamRow[]
  seats: Seats
  domains: string[]
  now: string
  onInvite: (addresses: ParsedAddress[], role: MemberRole) => void
  onAddSeats: (count: number) => void
}) {
  const [addresses, setAddresses] = React.useState<ParsedAddress[]>([])
  const [draft, setDraft] = React.useState("")
  const [allowed, setAllowed] = React.useState<string[]>([])
  const [addsSeats, setAddsSeats] = React.useState(false)
  const [role, setRole] = React.useState<MemberRole>("member")
  const [isSending, setSending] = React.useState(false)
  const [result, setResult] = React.useState<Result | null>(null)

  const used = countSeatsUsed(rows)
  // What is still being typed counts once it is a whole address.
  const typed = parseAddresses(draft).filter(({ email }) => isEmail(email))
  const all = merge(addresses, typed)
  const check = (freeSeats: number) =>
    checkAddresses(all, { rows, domains, allowed, freeSeats })
  const wanted = check(Infinity).filter(
    ({ problem }) => problem === null
  ).length
  const plan = getSeatPlan(seats, { used, invited: wanted, now })
  const checked = check(addsSeats ? Infinity : plan.free)
  const ready = checked.filter(({ problem }) => problem === null)
  const seatsToAdd = addsSeats ? plan.over : 0

  const add = (text: string) => {
    const found = parseAddresses(text)
    if (found.length > 0) setAddresses((current) => merge(current, found))
    setDraft("")
  }
  const remove = (emails: readonly string[]) =>
    setAddresses((current) =>
      current.filter(({ email }) => !emails.includes(email))
    )
  const replace = (email: string, next: string) =>
    setAddresses((current) =>
      merge(
        [],
        current.map((address) =>
          address.email === email ? { ...address, email: next } : address
        )
      )
    )
  const reset = () => {
    setAddresses([])
    setDraft("")
    setAllowed([])
    setAddsSeats(false)
    setResult(null)
  }

  const send = async (
    batch: ParsedAddress[],
    earlier: ParsedAddress[] = []
  ) => {
    if (batch.length === 0) return
    setSending(true)
    const { sent, failed } = await sendInvitations(batch, {
      ownDomains: domains,
      isRetry: earlier.length > 0 || result !== null,
    })
    setSending(false)
    if (seatsToAdd > 0) onAddSeats(seatsToAdd)
    onInvite(sent, role)
    const total = [...earlier, ...sent]
    if (failed.length > 0) {
      setResult({ sent: total, failed })
      return
    }
    notifyMembers(
      total.length === 1 && total[0]
        ? `Invitation sent to ${total[0].email}`
        : `${total.length} invitations sent`
    )
    onOpenChange(false)
    reset()
  }

  const close = (next: boolean) => {
    if (isSending) return
    // Closing keeps what was typed; a result has been read.
    if (!next && result) reset()
    onOpenChange(next)
  }

  if (result) {
    const failedEmails = result.failed.map(({ email }) => email)
    const total = result.sent.length + result.failed.length
    return (
      <MembersDialog
        open={open}
        onOpenChange={close}
        isPhone={isPhone}
        title={`${result.sent.length} of ${pluralize(total, "invitation")} sent`}
        description={
          result.failed.length === 1
            ? "One address needs another try."
            : `${result.failed.length} addresses need another try.`
        }
        footer={
          <>
            <MembersButton
              variant="outline"
              isDisabled={isSending}
              onClick={() => close(false)}
            >
              Leave them out
            </MembersButton>
            <MembersButton
              isPending={isSending}
              onClick={() =>
                void send(
                  failedEmails.map((email) => ({ email })),
                  result.sent
                )
              }
            >
              {isSending ? "Sending" : "Try again"}
            </MembersButton>
          </>
        }
      >
        <ItemGroup className="gap-(--density-8)">
          {result.failed.map((failure) => (
            <Item key={failure.email} role="listitem" variant="muted" size="sm">
              <ItemContent>
                <ItemTitle>{failure.email}</ItemTitle>
                <ItemDescription className="text-foreground/70">
                  {failure.reason}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </MembersDialog>
    )
  }

  return (
    <MembersDialog
      open={open}
      onOpenChange={close}
      isPhone={isPhone}
      title="Invite people"
      description={`Each gets a link that works for 14 days.`}
      footer={
        <>
          <MembersButton
            variant="outline"
            isDisabled={isSending}
            onClick={() => close(false)}
          >
            Cancel
          </MembersButton>
          <MembersButton
            type="submit"
            form="invite-people"
            isDisabled={ready.length === 0}
            isPending={isSending}
          >
            {getSendLabel({ count: ready.length, seatsToAdd, isSending })}
          </MembersButton>
        </>
      }
    >
      <form
        id="invite-people"
        onSubmit={(event) => {
          event.preventDefault()
          add(draft)
          void send(ready)
        }}
      >
        <fieldset disabled={isSending} className="contents">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-addresses">
                Email addresses
              </FieldLabel>
              <MembersAddressBox
                id="invite-addresses"
                label="Email addresses"
                addresses={checked.filter(({ email }) =>
                  addresses.some((address) => address.email === email)
                )}
                draft={draft}
                describedBy="invite-addresses-help"
                renderChip={(email) => (
                  <AddressChip
                    email={email}
                    problem={
                      checked.find((address) => address.email === email)
                        ?.problem ?? null
                    }
                  />
                )}
                onRemove={remove}
                onDraftChange={setDraft}
                onAdd={add}
              />
              <FieldDescription id="invite-addresses-help">
                Paste a list from anywhere, names included.
              </FieldDescription>
              <AddressProblems
                addresses={checked}
                domains={domains}
                onRemove={(email) => remove([email])}
                onReplace={replace}
                onAllow={(email) =>
                  setAllowed((current) => [...current, email])
                }
              />
            </Field>
            <SeatsWell
              seats={seats}
              plan={plan}
              addsSeats={addsSeats}
              onAddsSeatsChange={setAddsSeats}
            />
            <Field>
              <FieldTitle>Role</FieldTitle>
              <MembersRadioGroup
                label="Role"
                value={role}
                onValueChange={setRole}
              >
                {ROLES.map((option) => (
                  <FieldLabel
                    key={option.value}
                    htmlFor={`invite-${option.value}`}
                  >
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>{option.label}</FieldTitle>
                        <FieldDescription className="text-foreground/70">
                          {option.description}
                        </FieldDescription>
                      </FieldContent>
                      <MembersRadio
                        id={`invite-${option.value}`}
                        value={option.value}
                      />
                    </Field>
                  </FieldLabel>
                ))}
              </MembersRadioGroup>
            </Field>
          </FieldGroup>
        </fieldset>
      </form>
    </MembersDialog>
  )
}

function merge(
  first: readonly ParsedAddress[],
  second: readonly ParsedAddress[]
): ParsedAddress[] {
  const found = new Map<string, ParsedAddress>()
  for (const address of [...first, ...second]) {
    const known = found.get(address.email)
    found.set(address.email, { ...address, name: known?.name ?? address.name })
  }
  return [...found.values()]
}

function getSendLabel({
  count,
  seatsToAdd,
  isSending,
}: {
  count: number
  seatsToAdd: number
  isSending: boolean
}) {
  if (isSending) return "Sending"
  if (count === 0) return "Send invitations"
  return seatsToAdd > 0
    ? `Add ${pluralize(seatsToAdd, "seat")} and send ${count}`
    : `Send ${pluralize(count, "invitation")}`
}

function AddressChip({
  email,
  problem,
}: {
  email: string
  problem: AddressProblem | null
}) {
  if (!problem) return email
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-(--density-4) [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0",
        problem.kind === "seat" ? "text-warning-text" : "text-destructive-text"
      )}
    >
      <IconPlaceholder
        lucide="TriangleAlertIcon"
        tabler="IconAlertTriangle"
        hugeicons="Alert02Icon"
        phosphor="WarningIcon"
        remixicon="RiErrorWarningLine"
      />
      <span className="truncate">{email}</span>
    </span>
  )
}

// What is wrong with each address, beside the one press that fixes it. Seats
// are one decision for all of them, made in the well below.
function AddressProblems({
  addresses,
  domains,
  onRemove,
  onReplace,
  onAllow,
}: {
  addresses: CheckedAddress[]
  domains: string[]
  onRemove: (email: string) => void
  onReplace: (email: string, next: string) => void
  onAllow: (email: string) => void
}) {
  const broken = addresses.flatMap((address) =>
    address.problem && address.problem.kind !== "seat"
      ? [{ email: address.email, problem: address.problem }]
      : []
  )
  if (broken.length === 0) return null

  const getFix = (email: string, problem: AddressProblem) => {
    if (problem.kind === "typo") {
      return {
        label: "Use it",
        run: () => onReplace(email, problem.suggestion),
      }
    }
    if (problem.kind === "domain") {
      return { label: "Invite anyway", run: () => onAllow(email) }
    }
    return { label: "Remove", run: () => onRemove(email) }
  }

  return (
    <ItemGroup aria-live="polite" className="gap-(--density-4)">
      {broken.map(({ email, problem }) => {
        const fix = getFix(email, problem)
        return (
          <Item
            key={email}
            role="listitem"
            variant="muted"
            size="xs"
            className="flex-nowrap"
          >
            <ItemContent className="min-w-0">
              <ItemTitle className="max-w-full truncate">{email}</ItemTitle>
              <ItemDescription className="text-foreground/70">
                {describeProblem(problem, domains)}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <MembersButton
                type="button"
                variant="outline"
                size="sm"
                aria-label={`${fix.label}: ${email}`}
                onClick={fix.run}
              >
                {fix.label}
              </MembersButton>
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}

function SeatsWell({
  seats,
  plan,
  addsSeats,
  onAddsSeatsChange,
}: {
  seats: Seats
  plan: ReturnType<typeof getSeatPlan>
  addsSeats: boolean
  onAddsSeatsChange: (addsSeats: boolean) => void
}) {
  const over = pluralize(plan.over, "seat")
  const price = `${formatMoney(plan.monthlyCost)} a month, ${formatMoney(plan.costUntilRenewal)} until December 1`

  const getSentence = () => {
    if (plan.over > 0 && addsSeats) return `Adds ${over} for ${price}.`
    if (plan.over > 0) {
      return `${over} short. Adding ${plan.over === 1 ? "it" : "them"} costs ${price}.`
    }
    if (plan.filled === 0) {
      return plan.free === 0
        ? "Every seat is taken. You can add some here."
        : `${pluralize(plan.free, "seat")} free. ${formatMoney(seats.pricePerSeat)} a month for each one more.`
    }
    const left = plan.free - plan.filled
    return left === 0
      ? `Takes the last ${pluralize(plan.filled, "seat")}. Nothing more to pay.`
      : `Takes ${pluralize(plan.filled, "seat")}, ${left} left. Nothing more to pay.`
  }

  return (
    <div className="flex flex-col gap-(--density-10) rounded-(--radius-control) bg-hover p-(--density-12)">
      <div className="flex items-baseline justify-between gap-(--density-8) text-(length:--density-text-13)">
        <span className="font-medium text-foreground">Seats</span>
        <span className="text-foreground/70 tabular-nums">
          {plan.used + plan.filled + (addsSeats ? plan.over : 0)} of{" "}
          {plan.total + (addsSeats ? plan.over : 0)}
        </span>
      </div>
      <MembersSeatStrip
        used={plan.used}
        filled={plan.filled + (addsSeats ? plan.over : 0)}
        over={addsSeats ? 0 : plan.over}
        total={plan.total + (addsSeats ? plan.over : 0)}
      />
      <div className="flex items-center justify-between gap-(--density-12)">
        <p
          aria-live="polite"
          className="text-(length:--density-text-12) text-pretty text-foreground/70 tabular-nums"
        >
          {getSentence()}
        </p>
        {plan.over > 0 && (
          <MembersButton
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onAddsSeatsChange(!addsSeats)}
          >
            {addsSeats ? "Don't add" : `Add ${over}`}
          </MembersButton>
        )}
      </div>
    </div>
  )
}
