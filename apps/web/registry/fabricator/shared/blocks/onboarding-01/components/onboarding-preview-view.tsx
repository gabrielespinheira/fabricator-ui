"use client"

import * as React from "react"
import { cn } from "cn"

import { OnboardingAvatar } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-avatar"
import {
  ONBOARDING_COLUMNS,
  ONBOARDING_RECORDS,
  ONBOARDING_SOURCE_MARKS,
  ONBOARDING_TREND,
  type OnboardingPerson,
  type OnboardingRecord,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  type OnboardingLayout,
  type OnboardingUse,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import { LineChart } from "@/registry/bases/__base__/ui/line-chart"

const ARRIVES = "animate-in fade-in-0 zoom-in-95 duration-move ease-move"

const trendConfig = { revenue: { label: "Revenue" } }

function SourceMark({ source }: { source?: string }) {
  const Mark = source ? ONBOARDING_SOURCE_MARKS[source] : undefined
  return Mark ? <Mark size={14} color="brand" className="shrink-0" /> : null
}

/** Work belongs to people as they are invited. */
function RecordPerson({
  person,
  className,
}: {
  person: OnboardingPerson | undefined
  className?: string
}) {
  return (
    <span className={cn("size-(--density-24) shrink-0", className)}>
      {person && (
        <OnboardingAvatar
          key={person.email}
          person={person}
          className={ARRIVES}
        />
      )}
    </span>
  )
}

function BoardView({
  columns,
  records,
  getPerson,
}: {
  columns: string[]
  records: OnboardingRecord[]
  getPerson: (record: OnboardingRecord) => OnboardingPerson | undefined
}) {
  return (
    <div className="grid flex-1 grid-cols-3 gap-(--density-16)">
      {columns.map((column, index) => {
        const own = records.filter((record) => record.column === index)
        return (
          <div key={column} className="flex min-w-0 flex-col gap-(--density-8)">
            <span className="flex items-center gap-(--density-6) font-medium">
              {column}
              <span className="text-muted-foreground tabular-nums">
                {own.length}
              </span>
            </span>
            {own.map((record) => (
              <Card key={record.id} size="sm" className={ARRIVES}>
                <CardContent className="flex flex-col gap-(--density-10)">
                  <span className="text-pretty">{record.title}</span>
                  <span className="flex h-(--density-24) items-center gap-(--density-8) text-muted-foreground tabular-nums">
                    <SourceMark source={record.source} />
                    <Badge variant="secondary">{record.tag}</Badge>
                    {record.detail}
                    <RecordPerson
                      person={getPerson(record)}
                      className="ms-auto"
                    />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ListView({
  columns,
  records,
  getPerson,
}: {
  columns: string[]
  records: OnboardingRecord[]
  getPerson: (record: OnboardingRecord) => OnboardingPerson | undefined
}) {
  return (
    <div className="flex flex-col gap-(--density-20)">
      {columns.map((column, index) => (
        <div key={column} className="flex flex-col gap-(--density-4)">
          <span className="font-medium">{column}</span>
          {records
            .filter((record) => record.column === index)
            .map((record) => (
              <span
                key={record.id}
                className={cn(
                  "flex h-(--density-36) items-center gap-(--density-10)",
                  ARRIVES
                )}
              >
                <SourceMark source={record.source} />
                <span className="truncate">{record.title}</span>
                <Badge variant="secondary">{record.tag}</Badge>
                <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">
                  {record.detail}
                </span>
                <RecordPerson person={getPerson(record)} />
              </span>
            ))}
        </div>
      ))}
    </div>
  )
}

function ChartsView({ records }: { records: OnboardingRecord[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-(--density-16)">
      <div className="grid grid-cols-3 gap-(--density-16) xl:grid-cols-4">
        {records.slice(0, 8).map((record) => (
          <Card key={record.id} size="sm" className={ARRIVES}>
            <CardContent className="flex flex-col gap-(--density-4)">
              <span className="flex items-center gap-(--density-6) text-muted-foreground">
                <SourceMark source={record.source} />
                <span className="truncate">{record.title}</span>
              </span>
              <span className="text-(length:--density-text-16) tracking-tight tabular-nums weight-semibold">
                {record.detail}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className={cn("max-h-112 min-h-64 flex-1", ARRIVES)}>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Weekly</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <LineChart
            className="min-h-0 flex-1"
            data={ONBOARDING_TREND}
            index="week"
            config={trendConfig}
            label="Weekly revenue"
            formatValue={(value) => `$${Math.round(value / 1000)}K`}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/** The page's body in the preview: what the answers made. */
export function OnboardingPreviewView({
  use,
  view,
  sources,
  people,
}: {
  use: OnboardingUse
  view: OnboardingLayout
  sources: string[]
  people: OnboardingPerson[]
}) {
  const records = ONBOARDING_RECORDS[use].filter(
    ({ source }) => !source || sources.includes(source)
  )
  const getPerson = ({ person }: OnboardingRecord) => people[person]

  if (view === "charts") return <ChartsView records={records} />
  const props = { columns: ONBOARDING_COLUMNS[use], records, getPerson }
  return view === "board" ? <BoardView {...props} /> : <ListView {...props} />
}
