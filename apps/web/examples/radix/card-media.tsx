import { WebhookIcon } from "@fabricator-ui/icons"
import { GithubIcon } from "@fabricator-ui/icons/brands"

import {
  Card,
  CardDescription,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/styles/radix-nova/ui/avatar"

// CardMedia gives a card its identity: an icon tile for a kind of thing, a
// logo for a brand, an avatar for a person. Keep it off metric and chart
// cards, where the title names a measure.
export function CardMediaExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-(--density-16)">
      <Card>
        <CardHeader>
          <CardMedia variant="icon">
            <WebhookIcon />
          </CardMedia>
          <CardTitle>Order created</CardTitle>
          <CardDescription>Webhook · 3 endpoints</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardMedia variant="icon">
            <GithubIcon />
          </CardMedia>
          <CardTitle>GitHub</CardTitle>
          <CardDescription>gabrielespinheira/fabricator-ui</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardMedia>
            <Avatar>
              <AvatarImage
                src="https://github.com/gabrielespinheira.png"
                alt="Gabriel"
              />
              <AvatarFallback>GE</AvatarFallback>
            </Avatar>
          </CardMedia>
          <CardTitle>Gabriel Espinheira</CardTitle>
          <CardDescription>Owner · Lisbon</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
