import { Example, ExampleWrapper } from "@/examples/native/example"

import { Badge } from "@/registry/native/ui/badge"
import { Button } from "@/registry/native/ui/button"
import { Spinner } from "@/registry/native/ui/spinner"

function SpinnerExample() {
  return (
    <ExampleWrapper>
      <Example title="Sizes" className="flex-row items-center">
        <Spinner className="size-3" />
        <Spinner />
        <Spinner className="size-6" />
        <Spinner className="size-8" />
      </Example>
      <Example title="Colours" className="flex-row items-center">
        <Spinner className="text-primary" />
        <Spinner className="text-destructive" />
        <Spinner className="text-muted-foreground" />
      </Example>
      <Example title="In a button" className="flex-row flex-wrap items-center">
        <Button disabled>
          <Spinner />
          Saving
        </Button>
        <Button variant="outline" disabled>
          <Spinner />
          Loading
        </Button>
      </Example>
      <Example title="In a badge">
        <Badge variant="secondary">
          <Spinner className="size-3" />
          Syncing
        </Badge>
      </Example>
      <Example title="Labelled">
        <Spinner aria-label="Sending your message" />
      </Example>
    </ExampleWrapper>
  )
}

export { SpinnerExample }
