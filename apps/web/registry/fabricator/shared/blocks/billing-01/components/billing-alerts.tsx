import {
  BILLING_OWNER,
  SAMPLE_NOW,
  type BillingState,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatCount,
  formatDay,
  formatMoney,
  formatWeekday,
  getExtraRunsRate,
  getPlan,
  getTax,
  getUsageForecast,
  getUsageReset,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The alert's own end padding fits a short label; these are two words.
const WITH_ACTION = "has-data-[slot=alert-action]:pe-32"

/** The one thing the page depends on right now, worst first, or nothing. */
export function BillingAlert({
  state,
  onUpdateCard,
  onKeepRunning,
  onEditDetails,
  onSeePlans,
}: {
  state: BillingState
  onUpdateCard: () => void
  onKeepRunning: () => void
  onEditDetails: () => void
  onSeePlans: () => void
}) {
  const { account, card, invoices, role } = state
  const { name, limits } = getPlan(account.planId)
  const failed = invoices.find(({ status }) => status === "failed")

  if (role === "member") {
    return (
      <Alert className={WITH_ACTION}>
        <IconPlaceholder
          lucide="LockIcon"
          tabler="IconLock"
          hugeicons="SquareLock02Icon"
          phosphor="LockKeyIcon"
          remixicon="RiLockLine"
        />
        <AlertTitle>{BILLING_OWNER.name} manages billing</AlertTitle>
        <AlertDescription>
          You can see the plan and download invoices.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm">
            Ask Maya
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (failed) {
    return (
      <Alert variant="error" contrast="high" className={WITH_ACTION}>
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
        />
        <AlertTitle>
          The card was declined for {formatMoney(failed.total)}
        </AlertTitle>
        <AlertDescription>
          {name} stays on until December 3. We try again on Thursday.
        </AlertDescription>
        <AlertAction>
          <Button size="sm" onClick={onUpdateCard}>
            Update card
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (account.status === "trial" && !card) {
    return (
      <Alert variant="warning" className={WITH_ACTION}>
        <IconPlaceholder
          lucide="ClockIcon"
          tabler="IconClock"
          hugeicons="Clock01Icon"
          phosphor="ClockIcon"
          remixicon="RiTimeLine"
        />
        <AlertTitle>
          The trial ends on {formatWeekday(account.periodEnd)}
        </AlertTitle>
        <AlertDescription>
          Add a card to keep {name}. Without one, the workspace moves to Starter
          and {account.people - (getPlan("starter").limits.seats ?? 0)} people
          lose their seat.
        </AlertDescription>
        <AlertAction>
          <Button size="sm" onClick={onUpdateCard}>
            Add card
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  const { level, reachesOn } = getUsageForecast({
    used: account.runsUsed,
    limit: limits.runs,
    perDay: account.runsPerDay,
    now: SAMPLE_NOW,
    resetsOn: getUsageReset(SAMPLE_NOW),
  })
  if (level === "full" && account.extraRuns === "pause") {
    return (
      <Alert variant="error" contrast="high" className={WITH_ACTION}>
        <IconPlaceholder
          lucide="PauseIcon"
          tabler="IconPlayerPause"
          hugeicons="PauseIcon"
          phosphor="PauseIcon"
          remixicon="RiPauseFill"
        />
        <AlertTitle>6 automations are paused</AlertTitle>
        <AlertDescription>
          They start again on {formatDay(getUsageReset(SAMPLE_NOW), SAMPLE_NOW)}
          , or now for {getExtraRunsRate()} runs.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onKeepRunning}>
            Run now
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (level === "near" && reachesOn) {
    return (
      <Alert variant="warning" contrast="high" className={WITH_ACTION}>
        <IconPlaceholder
          lucide="TriangleAlertIcon"
          tabler="IconAlertTriangle"
          hugeicons="Alert02Icon"
          phosphor="WarningIcon"
          remixicon="RiErrorWarningLine"
        />
        <AlertTitle>
          {formatCount(account.runsUsed)} of {formatCount(limits.runs)} runs
          used
        </AlertTitle>
        <AlertDescription>
          At this pace you reach the limit on {formatWeekday(reachesOn)}.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onSeePlans}>
            See plans
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (getTax(account.details).canDrop) {
    return (
      <Alert variant="warning" className={WITH_ACTION}>
        <IconPlaceholder
          lucide="TriangleAlertIcon"
          tabler="IconAlertTriangle"
          hugeicons="Alert02Icon"
          phosphor="WarningIcon"
          remixicon="RiErrorWarningLine"
        />
        <AlertTitle>Invoices carry VAT you may not owe</AlertTitle>
        <AlertDescription>
          With a German VAT ID on file, the next invoice has none.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onEditDetails}>
            Add VAT ID
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return null
}
