import { GithubIcon, LinearIcon, NotionIcon } from "@fabricator-ui/icons/brands"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { Button } from "@/styles/radix-nova/ui/button"
import { Switch } from "@/styles/radix-nova/ui/switch"

const connections = [
  {
    id: "github",
    name: "GitHub",
    description: "Link pull requests to issues",
    icon: GithubIcon,
    isConnected: true,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Sync issues both ways",
    icon: LinearIcon,
    isConnected: true,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Publish release notes",
    icon: NotionIcon,
    isConnected: false,
  },
]

// A connection: the logo, the name, one line, and a Switch once connected or
// "Connect" before. Every card in the grid has the same parts.
export function CardConnection() {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-(--density-16) md:grid-cols-3">
      {connections.map((connection) => (
        <Card key={connection.id} size="sm">
          <CardHeader>
            <CardMedia variant="icon">
              <connection.icon />
            </CardMedia>
            <CardTitle id={`${connection.id}-name`}>
              {connection.name}
            </CardTitle>
            <CardDescription>{connection.description}</CardDescription>
            <CardAction>
              {connection.isConnected ? (
                <Switch
                  defaultChecked
                  aria-labelledby={`${connection.id}-name`}
                />
              ) : (
                <Button variant="outline" size="sm">
                  Connect
                </Button>
              )}
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
