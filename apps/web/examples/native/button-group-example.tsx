import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  ChevronDownIcon,
  CopyIcon,
  SearchIcon,
} from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/registry/native/ui/button-group"
import { Input } from "@/registry/native/ui/input"

function ButtonGroupExample() {
  return (
    <ExampleWrapper>
      <Example title="Horizontal">
        <ButtonGroup orientation="horizontal">
          <Button variant="outline">Archive</Button>
          <Button variant="outline">Report</Button>
          <Button variant="outline">Snooze</Button>
        </ButtonGroup>
      </Example>
      <Example title="Vertical">
        <ButtonGroup orientation="vertical">
          <Button variant="outline">Top</Button>
          <Button variant="outline">Middle</Button>
          <Button variant="outline">Bottom</Button>
        </ButtonGroup>
      </Example>
      <Example title="Separator">
        <ButtonGroup>
          <Button variant="secondary" size="sm">
            Copy
          </Button>
          <ButtonGroupSeparator />
          <Button variant="secondary" size="sm">
            Paste
          </Button>
        </ButtonGroup>
        <ButtonGroup orientation="vertical">
          <Button variant="secondary" size="sm">
            Up
          </Button>
          <ButtonGroupSeparator orientation="horizontal" />
          <Button variant="secondary" size="sm">
            Down
          </Button>
        </ButtonGroup>
      </Example>
      <Example title="Split">
        <ButtonGroup>
          <Button>Merge</Button>
          <ButtonGroupSeparator />
          <Button size="icon" accessibilityLabel="More merge options">
            <ChevronDownIcon />
          </Button>
        </ButtonGroup>
      </Example>
      <Example title="With text and an input" className="items-stretch">
        <ButtonGroup className="w-full">
          <ButtonGroupText>https://</ButtonGroupText>
          <Input className="flex-1" placeholder="fabricator.dev" />
        </ButtonGroup>
        <ButtonGroup className="w-full">
          <Input className="flex-1" placeholder="Search..." />
          <Button variant="outline" size="icon" accessibilityLabel="Search">
            <SearchIcon />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroupText>
            <CopyIcon />
            Copied
          </ButtonGroupText>
          <Button variant="outline">Undo</Button>
        </ButtonGroup>
      </Example>
      <Example title="Nested">
        <ButtonGroup>
          <ButtonGroup>
            <Button variant="outline">1</Button>
            <Button variant="outline">2</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline">3</Button>
            <Button variant="outline">4</Button>
          </ButtonGroup>
        </ButtonGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { ButtonGroupExample }
