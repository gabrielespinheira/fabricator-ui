import {
  ChevronRightIcon,
  CreditCardIcon,
  MailIcon,
  ShieldIcon,
} from "@fabricator-ui/icons"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { Button } from "@/styles/radix-nova/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/styles/radix-nova/ui/item"

const tasks = [
  {
    id: "card",
    icon: CreditCardIcon,
    title: "Update the card on file",
    description: "2 payments failed, $412.20 at risk",
  },
  {
    id: "invite",
    icon: MailIcon,
    title: "Resend 3 invitations",
    description: "Sent 7 days ago, not accepted",
  },
  {
    id: "sso",
    icon: ShieldIcon,
    title: "Turn on single sign-on",
    description: "Required for teams over 50 seats",
  },
]

// An ItemGroup reaches the card's edges by itself: the rows' hover wash spans
// the card while each icon sits on the card's inset.
export function CardList() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>Ordered by money at risk</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" className="-me-2">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {tasks.map((task) => (
            <Item key={task.id} size="sm" asChild>
              <a href={`#${task.id}`}>
                <ItemMedia variant="icon">
                  <task.icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{task.title}</ItemTitle>
                  <ItemDescription>{task.description}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-(--density-icon-16) text-muted-foreground" />
                </ItemActions>
              </a>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
