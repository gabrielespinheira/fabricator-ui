import { cn } from "cn"

import {
  BILLING_PEOPLE,
  SAMPLE_NOW,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatCount,
  formatDay,
  formatStorage,
  formatWeekday,
  getPlan,
  getUsageForecast,
  getUsageReset,
  type BillingAccount,
  type BillingForecast,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Card, CardContent } from "@/registry/bases/__base__/ui/card"
import { Progress } from "@/registry/bases/__base__/ui/progress"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function LevelBadge({ forecast }: { forecast: BillingForecast }) {
  if (forecast.level === "ok") return null
  if (forecast.level === "full") {
    return <Badge variant="destructive">At the limit</Badge>
  }
  return (
    <Badge variant="warning" className="tabular-nums">
      <IconPlaceholder
        lucide="TriangleAlertIcon"
        tabler="IconAlertTriangle"
        hugeicons="Alert02Icon"
        phosphor="WarningIcon"
        remixicon="RiErrorWarningLine"
      />
      {forecast.percent}%
    </Badge>
  )
}

function UsageCard({
  label,
  value,
  limit,
  percent,
  badge,
  isLoading,
  children,
}: {
  label: string
  value: string
  limit: string
  percent: number
  badge?: React.ReactNode
  isLoading: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="flex-1">
      <CardContent className="flex flex-1 flex-col justify-between gap-(--density-12)">
        <div className="flex min-h-(--density-24) items-center justify-between gap-(--density-8)">
          <span className="truncate text-muted-foreground">{label}</span>
          {!isLoading && badge}
        </div>
        {isLoading ? (
          <Skeleton
            role="status"
            aria-busy
            aria-label={`Loading ${label.toLowerCase()}`}
            className="h-20"
          />
        ) : (
          <>
            <div className="flex items-baseline gap-(--density-6)">
              <span className="text-2xl tracking-tight tabular-nums weight-semibold">
                {value}
              </span>
              <span className="text-muted-foreground tabular-nums">
                of {limit}
              </span>
            </div>
            <Progress value={percent} aria-label={label} />
            <div className="text-(length:--density-text-12) text-pretty text-muted-foreground">
              {children}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function getRunsNote(account: BillingAccount, forecast: BillingForecast) {
  const reset = formatDay(getUsageReset(SAMPLE_NOW), SAMPLE_NOW)
  if (forecast.level === "full") {
    return account.extraRuns === "pause"
      ? `Automations are paused until ${reset}.`
      : "Runs past the limit are charged as extra."
  }
  if (forecast.reachesOn) {
    return `At this pace you reach it on ${formatWeekday(forecast.reachesOn)}.`
  }
  return `Starts over on ${reset}.`
}

/** A goal card per limit: how close, and when it gets there. */
export function BillingUsageCards({
  account,
  isLoading,
  className,
}: {
  account: BillingAccount
  isLoading: boolean
  className?: string
}) {
  const { limits } = getPlan(account.planId)
  const runs = getUsageForecast({
    used: account.runsUsed,
    limit: limits.runs,
    perDay: account.runsPerDay,
    now: SAMPLE_NOW,
    resetsOn: getUsageReset(SAMPLE_NOW),
  })
  const [seats, storage] = [
    { used: account.people, limit: account.seats },
    { used: account.storageUsed, limit: limits.storage },
  ].map(({ used, limit }) =>
    getUsageForecast({
      used,
      limit,
      perDay: 0,
      now: SAMPLE_NOW,
      resetsOn: SAMPLE_NOW,
    })
  )
  const free = account.seats - account.people
  const left = limits.storage - account.storageUsed

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-(--density-16) @2xl:grid-cols-3 @4xl:flex @4xl:flex-col",
        className
      )}
    >
      <UsageCard
        label="Automation runs"
        value={formatCount(account.runsUsed)}
        limit={formatCount(limits.runs)}
        percent={runs.percent}
        badge={<LevelBadge forecast={runs} />}
        isLoading={isLoading}
      >
        {getRunsNote(account, runs)}
      </UsageCard>
      <UsageCard
        label="Seats"
        value={formatCount(account.people)}
        limit={formatCount(account.seats)}
        percent={seats?.percent ?? 0}
        badge={
          <AvatarGroup>
            {BILLING_PEOPLE.slice(0, 4).map((person) => (
              <Avatar key={person.name} size="sm" tooltip={person.name}>
                <AvatarImage src={person.photo} alt="" />
                <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
            <AvatarGroupCount>+{account.people - 4}</AvatarGroupCount>
          </AvatarGroup>
        }
        isLoading={isLoading}
      >
        {free === 0 ? "Every seat is taken." : `${free} free to give out.`}
      </UsageCard>
      <UsageCard
        label="Storage"
        value={formatStorage(account.storageUsed)}
        limit={formatStorage(limits.storage)}
        percent={storage?.percent ?? 0}
        badge={storage && <LevelBadge forecast={storage} />}
        isLoading={isLoading}
      >
        {left > 0
          ? `${formatStorage(left)} left.`
          : "Full. New files can't be added."}
      </UsageCard>
    </div>
  )
}
