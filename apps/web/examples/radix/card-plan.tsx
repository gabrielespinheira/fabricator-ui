import { CheckIcon } from "@fabricator-ui/icons"

import { Badge } from "@/styles/radix-fabricator/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardValue,
  CardValueCaption,
} from "@/styles/radix-fabricator/ui/card"
import { Button } from "@/styles/radix-nova/ui/button"

const features = [
  "Unlimited projects",
  "50 GB of storage",
  "Single sign-on",
  "Priority support",
]

// A plan on the tray: who it's for on the shell, the price and what's
// included on the panel, the button under it.
export function CardPlan() {
  return (
    <Card variant="tray" className="w-full max-w-xs">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>For teams that ship every week</CardDescription>
        <CardAction>
          <Badge variant="secondary">Popular</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-(--density-16)">
        <CardValue>
          $24
          <CardValueCaption>per seat a month</CardValueCaption>
        </CardValue>
        <ul className="flex flex-col gap-(--density-8)">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-(--density-8)">
              <CheckIcon className="size-(--density-icon-16) text-muted-foreground" />
              {feature}
            </li>
          ))}
        </ul>
        <Button className="w-full">Choose Team</Button>
      </CardContent>
      <CardFooter>Billed yearly, cancel any time</CardFooter>
    </Card>
  )
}
