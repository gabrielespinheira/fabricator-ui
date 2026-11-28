import { PlusIcon } from "@fabricator-ui/icons"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardValue,
  CardValueCaption,
} from "@/styles/radix-fabricator/ui/card"
import { Button } from "@/styles/radix-nova/ui/button"

// default lifts the card on the page. muted is a wash with no shadow, for
// secondary cards and empty slots. tray holds a lifted panel in a muted
// shell: the header and footer sit on the shell, on the same inset.
export function CardVariants() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-(--density-16) md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Lifted on the page</CardDescription>
        </CardHeader>
        <CardContent>
          <CardValue>
            1,284
            <CardValueCaption>orders</CardValueCaption>
          </CardValue>
        </CardContent>
      </Card>
      <Card variant="muted">
        <CardHeader>
          <CardTitle>Muted</CardTitle>
          <CardDescription>A slot for the next widget</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">
            <PlusIcon />
            Add widget
          </Button>
        </CardContent>
      </Card>
      <Card variant="tray">
        <CardHeader>
          <CardTitle>Tray</CardTitle>
          <CardDescription>A panel in a shell</CardDescription>
        </CardHeader>
        <CardContent>
          <CardValue>
            98.2%
            <CardValueCaption>uptime</CardValueCaption>
          </CardValue>
        </CardContent>
        <CardFooter>Updated 2 min ago</CardFooter>
      </Card>
    </div>
  )
}
