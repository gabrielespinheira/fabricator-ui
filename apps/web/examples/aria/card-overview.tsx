"use client"

import * as React from "react"
import { EllipsisIcon, WorkflowIcon } from "@fabricator-ui/icons"

import { BarChart } from "@/styles/aria-fabricator/ui/bar-chart"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardMedia,
  CardTitle,
  CardValue,
  CardValueCaption,
} from "@/styles/aria-fabricator/ui/card"
import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"
import { SegmentedMeter } from "@/styles/aria-fabricator/ui/segmented-meter"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/styles/aria-nova/ui/avatar"
import { Button } from "@/styles/aria-nova/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/styles/aria-nova/ui/tabs"

const traffic = {
  day: [
    { day: "Sep 22", direct: 420, search: 610, social: 180, referral: 90 },
    { day: "Sep 23", direct: 380, search: 590, social: 240, referral: 110 },
    { day: "Sep 24", direct: 460, search: 720, social: 210, referral: 70 },
    { day: "Sep 25", direct: 510, search: 680, social: 320, referral: 130 },
    { day: "Sep 26", direct: 470, search: 750, social: 260, referral: 120 },
    { day: "Sep 27", direct: 300, search: 420, social: 190, referral: 60 },
    { day: "Sep 28", direct: 280, search: 390, social: 150, referral: 50 },
    { day: "Sep 29", direct: 530, search: 810, social: 280, referral: 140 },
    { day: "Sep 30", direct: 560, search: 790, social: 350, referral: 150 },
    { day: "Oct 1", direct: 490, search: 860, social: 300, referral: 120 },
    { day: "Oct 2", direct: 610, search: 900, social: 380, referral: 170 },
    { day: "Oct 3", direct: 580, search: 870, social: 330, referral: 160 },
  ],
  week: [
    { day: "Aug 25", direct: 2900, search: 4300, social: 1500, referral: 700 },
    { day: "Sep 1", direct: 3100, search: 4700, social: 1700, referral: 760 },
    { day: "Sep 8", direct: 2800, search: 4500, social: 1900, referral: 820 },
    { day: "Sep 15", direct: 3300, search: 5100, social: 1800, referral: 900 },
    { day: "Sep 22", direct: 3500, search: 5300, social: 2100, referral: 980 },
    { day: "Sep 29", direct: 3800, search: 5600, social: 2300, referral: 1020 },
  ],
}

const trafficConfig = {
  direct: { label: "Direct" },
  search: { label: "Search" },
  social: { label: "Social" },
  referral: { label: "Referral" },
} satisfies ChartConfig

type Period = keyof typeof traffic

function isPeriod(value: unknown): value is Period {
  return value === "day" || value === "week"
}

const formatNumber = new Intl.NumberFormat("en-US").format

function TrafficCard() {
  const [period, setPeriod] = React.useState<Period>("day")
  const data = traffic[period]
  const visits = data.reduce(
    (sum, row) => sum + row.direct + row.search + row.social + row.referral,
    0
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic</CardTitle>
        <CardAction>
          <Tabs
            selectedKey={period}
            onSelectionChange={(key) => isPeriod(key) && setPeriod(key)}
          >
            <TabsList aria-label="Period">
              <TabsTrigger id="day">Day</TabsTrigger>
              <TabsTrigger id="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-(--density-16)">
        <CardValue>
          {formatNumber(visits)}
          <CardValueCaption>visits</CardValueCaption>
        </CardValue>
        <BarChart
          data={data}
          index="day"
          config={trafficConfig}
          label="Visits by source"
          stack="stacked"
          legend={false}
          minimal
          className="h-36"
        />
      </CardContent>
    </Card>
  )
}

const context = [
  { label: "Chat", value: 92.4 },
  { label: "Files", value: 41.8 },
  { label: "Tools", value: 22.1 },
  { label: "System", value: 12.6 },
  { label: "Memory", value: 6.7 },
]

const formatTokens = (value: number) => `${Math.round(value * 10) / 10}K`

function ContextCard() {
  const used = context.reduce((sum, part) => sum + part.value, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Context</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            Compact
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-(--density-16)">
        <CardValue>
          {formatTokens(used)}
          <CardValueCaption>of 200K</CardValueCaption>
        </CardValue>
        <SegmentedMeter
          label="Context"
          segments={context}
          max={200}
          formatValue={formatTokens}
        />
      </CardContent>
    </Card>
  )
}

function AgentCard() {
  return (
    <Card>
      <CardHeader>
        <CardMedia variant="icon">
          <WorkflowIcon />
        </CardMedia>
        <CardTitle>
          <CardLink href="#node-07">Node 07</CardLink>
        </CardTitle>
        <CardDescription>Summarizer · runs on every new thread</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label="Node 07 options">
            <EllipsisIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        Reads the thread, writes a summary, and posts it back to the channel it
        came from.
      </CardContent>
      <CardFooter className="justify-between">
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarImage
              src="https://github.com/gabrielespinheira.png"
              alt="Gabriel"
            />
            <AvatarFallback>GE</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage src="https://github.com/maxleiter.png" alt="Max" />
            <AvatarFallback>ML</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage src="https://github.com/evilrabbit.png" alt="Evil" />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
        <span>Ran 4 min ago</span>
      </CardFooter>
    </Card>
  )
}

export function CardOverview() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 items-stretch gap-(--density-16) md:grid-cols-3">
      <TrafficCard />
      <ContextCard />
      <AgentCard />
    </div>
  )
}
