import { Example, ExampleWrapper } from "@/examples/native/example"
import { CommandIcon } from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import { Kbd, KbdGroup } from "@/registry/native/ui/kbd"

function KbdExample() {
  return (
    <ExampleWrapper>
      <Example title="Keys" className="flex-row flex-wrap items-center">
        <Kbd>Esc</Kbd>
        <Kbd>K</Kbd>
        <Kbd>
          <CommandIcon />
        </Kbd>
      </Example>
      <Example title="Group">
        <KbdGroup>
          <Kbd>
            <CommandIcon />
          </Kbd>
          +<Kbd>B</Kbd>
        </KbdGroup>
      </Example>
      <Example title="In a button">
        <Button variant="outline">
          Accept
          <Kbd>⏎</Kbd>
        </Button>
      </Example>
    </ExampleWrapper>
  )
}

export { KbdExample }
