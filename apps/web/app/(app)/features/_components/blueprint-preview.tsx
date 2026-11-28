"use client"

import * as React from "react"
import { RotateCcwIcon } from "@fabricator-ui/icons"

import { Badge } from "@/styles/base-fabricator/ui/badge"
import {
  Blueprint,
  BlueprintGroup,
} from "@/styles/base-fabricator/ui/blueprint"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { Input } from "@/styles/base-fabricator/ui/input"
import { Label } from "@/styles/base-fabricator/ui/label"

import { PreviewStage } from "./preview-stage"

export function BlueprintPreview() {
  const [run, setRun] = React.useState(0)

  return (
    <PreviewStage
      caption="It plays once the preview scrolls into view."
      controls={
        <Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
          <RotateCcwIcon />
          Replay
        </Button>
      }
    >
      <BlueprintGroup key={run} className="flex w-full max-w-sm flex-col gap-4">
        <Blueprint className="w-full">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Monthly revenue</CardDescription>
              <CardTitle className="flex items-center gap-2 text-[24px] tabular-nums">
                $48,210
                <Badge variant="secondary">+12.4%</Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        </Blueprint>
        <Blueprint className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>Invite your team</CardTitle>
              <CardDescription>
                They get access to every project in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="feature-blueprint-email">Email</Label>
              <Input
                id="feature-blueprint-email"
                type="email"
                placeholder="name@company.com"
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost">Cancel</Button>
              <Button>Send invite</Button>
            </CardFooter>
          </Card>
        </Blueprint>
      </BlueprintGroup>
    </PreviewStage>
  )
}
