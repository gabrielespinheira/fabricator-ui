import { Example, ExampleWrapper } from "@/examples/native/example"
import { BotIcon } from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
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
  CardValue,
  CardValueCaption,
} from "@/registry/native/ui/card"
import { Delta } from "@/registry/native/ui/delta"
import { Text } from "@/registry/native/ui/text"

function CardExample() {
  return (
    <ExampleWrapper>
      <Example title="Stat" className="bg-transparent p-0 shadow-none">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Money in</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>
              $981K
              <Delta change={11.5} />
              <CardValueCaption>from $879.5K</CardValueCaption>
            </CardValue>
          </CardContent>
        </Card>
      </Example>
      <Example title="Object" className="bg-transparent p-0 shadow-none">
        <Card className="w-full">
          <CardHeader>
            <CardMedia variant="icon">
              <BotIcon />
            </CardMedia>
            <CardTitle>
              <CardLink onPress={() => {}}>Triage</CardLink>
            </CardTitle>
            <CardDescription>Classifier</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>
              Labels every new ticket and routes it to the right queue.
            </Text>
          </CardContent>
          <CardFooter>
            <Text>1,204 runs today</Text>
          </CardFooter>
        </Card>
      </Example>
      <Example title="Logo" className="bg-transparent p-0 shadow-none">
        <Card size="sm" className="w-full">
          <CardHeader>
            <CardMedia variant="image">
              <BotIcon />
            </CardMedia>
            <CardTitle>Assistant</CardTitle>
            <CardDescription>Connected</CardDescription>
          </CardHeader>
        </Card>
      </Example>
      <Example title="Muted" className="bg-transparent p-0 shadow-none">
        <Card variant="muted" className="w-full">
          <CardHeader>
            <CardTitle>Add a widget</CardTitle>
            <CardDescription>A slot for the next card.</CardDescription>
          </CardHeader>
        </Card>
      </Example>
      <Example title="Tray" className="bg-transparent p-0 shadow-none">
        <Card variant="tray" className="w-full">
          <CardHeader>
            <CardTitle>Uptime</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <CardValue>
              98.2%
              <CardValueCaption>uptime</CardValueCaption>
            </CardValue>
          </CardContent>
          <CardFooter>
            <Text>Updated 2 min ago</Text>
          </CardFooter>
        </Card>
      </Example>
      <Example title="Default" className="bg-transparent p-0 shadow-none">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Project status</CardTitle>
            <CardDescription>Everything in this release.</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>Twelve tasks are done and three are in review.</Text>
          </CardContent>
          <CardFooter>
            <Button size="sm">Open</Button>
            <Button size="sm" variant="ghost">
              Dismiss
            </Button>
          </CardFooter>
        </Card>
      </Example>
      <Example title="Small" className="bg-transparent p-0 shadow-none">
        <Card size="sm" className="w-full">
          <CardHeader>
            <CardTitle>Small card</CardTitle>
            <CardDescription>Tighter spacing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>The parts read the size from the card.</Text>
          </CardContent>
        </Card>
      </Example>
      <Example
        title="With an action"
        className="bg-transparent p-0 shadow-none"
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Renews on the first.</CardDescription>
            <CardAction>
              <Button size="xs" variant="outline">
                Manage
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      </Example>
    </ExampleWrapper>
  )
}

export { CardExample }
