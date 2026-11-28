import { ChartBarIcon } from "@fabricator-ui/icons"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/styles/base-nova/ui/alert"
import { Button } from "@/styles/base-nova/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/styles/base-nova/ui/empty"
import { Skeleton } from "@/styles/base-nova/ui/skeleton"

// Every card has its states. Loading keeps the frame and the header and fills
// the content at its height; empty says what will show and how to start;
// an error stays inside its card, with Retry, while the others keep their data.
export function CardStates() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 items-stretch gap-(--density-16) md:grid-cols-3">
      <Card aria-busy>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Daily</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-(--density-16)">
          <Skeleton className="h-(--density-28) w-32" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Daily</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center">
          <Empty className="p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartBarIcon />
              </EmptyMedia>
              <EmptyTitle>No payments yet</EmptyTitle>
              <EmptyDescription>
                Revenue shows here once Stripe is connected.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                Connect Stripe
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Daily</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Revenue didn&apos;t load</AlertTitle>
            <AlertDescription>Stripe took too long to answer.</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm">
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
