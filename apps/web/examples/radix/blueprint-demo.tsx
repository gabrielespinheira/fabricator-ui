"use client"

import * as React from "react"
import { BoxIcon, GlobeIcon, ImageIcon, SparklesIcon } from "lucide-react"

import {
  Blueprint,
  BlueprintGroup,
} from "@/styles/radix-fabricator/ui/blueprint"
import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { Input } from "@/styles/radix-fabricator/ui/input"
import { Label } from "@/styles/radix-fabricator/ui/label"

const TILES = [
  { label: "Globe", icon: GlobeIcon },
  { label: "Package", icon: BoxIcon },
  { label: "Image", icon: ImageIcon },
  { label: "Spark", icon: SparklesIcon },
]

export function BlueprintDemo() {
  const [run, setRun] = React.useState(0)
  return (
    <div className="@container flex w-full flex-col items-center gap-6 py-6 @lg:gap-8 @lg:py-12">
      <BlueprintGroup
        key={run}
        className="flex w-full flex-col items-center gap-6 @lg:gap-10"
      >
        <div className="grid w-full max-w-lg grid-cols-4 gap-3 @lg:gap-8">
          {TILES.map(({ label, icon: Icon }) => (
            <Blueprint
              key={label}
              className="w-full max-w-24 justify-self-center"
            >
              <div
                role="img"
                aria-label={label}
                className="grid aspect-square w-full place-items-center rounded-[25%] bg-muted p-[8%]"
              >
                <div className="grid size-full place-items-center rounded-[20%] bg-background text-foreground">
                  <Icon className="size-[45%]" strokeWidth={1.25} />
                </div>
              </div>
            </Blueprint>
          ))}
        </div>
        <Blueprint className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Invite your team</CardTitle>
              <CardDescription>
                They get access to every project in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="blueprint-demo-email">Email</Label>
              <Input
                id="blueprint-demo-email"
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
      <Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  )
}
