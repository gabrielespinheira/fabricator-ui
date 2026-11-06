import { Example, ExampleWrapper } from "@/examples/native/example"

import { Button } from "@/registry/native/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card"
import { Text } from "@/registry/native/ui/text"

function CardExample() {
  return (
    <ExampleWrapper>
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
