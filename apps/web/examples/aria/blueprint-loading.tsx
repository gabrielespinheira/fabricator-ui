"use client"

import * as React from "react"

import { Blueprint } from "@/styles/aria-fabricator/ui/blueprint"
import { Button } from "@/styles/aria-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/aria-fabricator/ui/card"
import { Skeleton } from "@/styles/aria-fabricator/ui/skeleton"

const STATS = [
  { label: "Tasks", value: "128" },
  { label: "Done", value: "86" },
  { label: "Due", value: "Dec 12" },
]

export function BlueprintLoading() {
  const [run, setRun] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)

  // Stands in for a request that takes a few seconds.
  React.useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 3000)
    return () => clearTimeout(timeout)
  }, [run])

  return (
    <div className="flex w-full flex-col items-center gap-8 py-8">
      <Blueprint key={run} loading={isLoading} className="w-full max-w-sm">
        <Card>
          <CardHeader>
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </>
            ) : (
              <>
                <CardTitle>Q4 launch</CardTitle>
                <CardDescription>
                  Website, docs and the new CLI.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {STATS.map(({ label, value }) =>
              isLoading ? (
                <Skeleton key={label} className="h-14" />
              ) : (
                <div
                  key={label}
                  className="flex flex-col gap-1 rounded-lg bg-muted p-3"
                >
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </Blueprint>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsLoading(true)
          setRun(run + 1)
        }}
      >
        Load again
      </Button>
    </div>
  )
}
