import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  ArrowUpIcon,
  CopyIcon,
  MailIcon,
  SearchIcon,
} from "@fabricator-ui/icons-react-native"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/registry/native/ui/input-group"
import { Text } from "@/registry/native/ui/text"

function InputGroupExample() {
  const [query, setQuery] = React.useState("")
  return (
    <ExampleWrapper>
      <Example title="Addons on each side">
        <InputGroup>
          <InputGroupInput placeholder="Search" />
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
        </InputGroup>
      </Example>
      <Example title="Text">
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput placeholder="fabricator.dev" autoCapitalize="none" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Example>
      <Example title="Button sizes">
        <InputGroup>
          <InputGroupInput defaultValue="gabs@fabricator.dev" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="xs">Copy</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput defaultValue="Acme Inc" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="sm" variant="secondary">
              Rename
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput defaultValue="fab_live_key" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" accessibilityLabel="Copy">
              <CopyIcon />
            </InputGroupButton>
            <InputGroupButton size="icon-sm" accessibilityLabel="Send">
              <MailIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Example>
      <Example title="Block-aligned addons, with a textarea">
        <InputGroup>
          <InputGroupAddon align="block-start">
            <InputGroupText>Message</InputGroupText>
          </InputGroupAddon>
          <InputGroupTextarea placeholder="Ask anything" />
          <InputGroupAddon align="block-end">
            <InputGroupText>0 of 280</InputGroupText>
            <InputGroupButton
              size="icon-xs"
              variant="default"
              accessibilityLabel="Send"
              className="ms-auto"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Example>
      <Example title="Controlled">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChangeText={setQuery} />
        </InputGroup>
        <Text className="text-muted-foreground">
          {query || "Nothing typed yet"}
        </Text>
      </Example>
      <Example title="Invalid">
        <InputGroup>
          <InputGroupAddon>
            <MailIcon />
          </InputGroupAddon>
          <InputGroupInput aria-invalid defaultValue="not an email" />
        </InputGroup>
      </Example>
      <Example title="Disabled">
        <InputGroup>
          <InputGroupAddon>
            <MailIcon />
          </InputGroupAddon>
          <InputGroupInput
            editable={false}
            defaultValue="gabs@fabricator.dev"
          />
        </InputGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { InputGroupExample }
