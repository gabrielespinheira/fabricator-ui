"use client"

import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "@/lib/site-icons"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/styles/base-fabricator/ui/alert"
import { Badge } from "@/styles/base-fabricator/ui/badge"

// Homepage demos for the status colours: a stack of alerts in both contrasts
// and a row of status badges.
export function AlertStatusDemo() {
  return (
    <div className="flex w-[300px] flex-col gap-2">
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>A new version is available</AlertTitle>
      </Alert>
      <Alert variant="success" contrast="high">
        <CircleCheckIcon />
        <AlertTitle>Deployed to production</AlertTitle>
        <AlertDescription>All 12 checks passed.</AlertDescription>
      </Alert>
      <Alert variant="warning" contrast="high">
        <TriangleAlertIcon />
        <AlertTitle>Storage is 90% full</AlertTitle>
      </Alert>
      <Alert variant="error">
        <CircleAlertIcon />
        <AlertTitle>Payment failed</AlertTitle>
      </Alert>
    </div>
  )
}

export function BadgeStatusDemo() {
  return (
    <div className="flex max-w-[280px] flex-wrap items-center justify-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="info">
        <InfoIcon data-icon="inline-start" />
        Info
      </Badge>
      <Badge variant="success">
        <CircleCheckIcon data-icon="inline-start" />
        Success
      </Badge>
      <Badge variant="warning">
        <TriangleAlertIcon data-icon="inline-start" />
        Warning
      </Badge>
      <Badge variant="error">
        <CircleAlertIcon data-icon="inline-start" />
        Error
      </Badge>
    </div>
  )
}
