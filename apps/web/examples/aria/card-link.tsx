import {
  BotIcon,
  DatabaseIcon,
  EllipsisIcon,
  WorkflowIcon,
} from "@fabricator-ui/icons"

import { Badge } from "@/styles/aria-fabricator/ui/badge"
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
} from "@/styles/aria-fabricator/ui/card"
import { Button } from "@/styles/aria-nova/ui/button"

const agents = [
  {
    id: "triage",
    name: "Triage",
    kind: "Classifier",
    icon: BotIcon,
    status: "Live",
    summary: "Labels every new ticket and routes it to the right queue.",
    runs: "1,204 runs today",
  },
  {
    id: "summarizer",
    name: "Summarizer",
    kind: "Writer",
    icon: WorkflowIcon,
    status: "Live",
    summary: "Reads the thread and posts a summary back to the channel.",
    runs: "312 runs today",
  },
  {
    id: "sync",
    name: "Warehouse sync",
    kind: "Pipeline",
    icon: DatabaseIcon,
    status: "Paused",
    summary: "Copies new orders to the warehouse every fifteen minutes.",
    runs: "Paused 2 h ago",
  },
]

// The title's CardLink opens the record from anywhere on the card; the menu
// button keeps working on its own. Hover lifts the card, a press gives a
// little and the focus ring follows the card's corner.
export function CardLinkExample() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-(--density-16) md:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id}>
          <CardHeader>
            <CardMedia variant="icon">
              <agent.icon />
            </CardMedia>
            <CardTitle>
              <CardLink href={`#${agent.id}`}>{agent.name}</CardLink>
            </CardTitle>
            <CardDescription>{agent.kind}</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${agent.name} options`}
              >
                <EllipsisIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>{agent.summary}</CardContent>
          <CardFooter className="justify-between">
            <span>{agent.runs}</span>
            <Badge variant={agent.status === "Live" ? "success" : "outline"}>
              {agent.status}
            </Badge>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
