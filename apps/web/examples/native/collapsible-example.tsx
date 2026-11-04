import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { ChevronsUpDownIcon } from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/native/ui/collapsible"
import { Text } from "@/registry/native/ui/text"

function CollapsibleExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Collapsible className="w-full gap-2">
          <CollapsibleTrigger>Order #4189</CollapsibleTrigger>
          <CollapsibleContent className="gap-1">
            <Text className="text-muted-foreground">Shipped to Acme Inc.</Text>
            <Text className="text-muted-foreground">Arrives on Thursday.</Text>
          </CollapsibleContent>
        </Collapsible>
      </Example>
      <Example title="Open at the start">
        <Collapsible defaultOpen className="w-full gap-2">
          <CollapsibleTrigger>Shipping address</CollapsibleTrigger>
          <CollapsibleContent>
            <Text className="text-muted-foreground">
              100 Market St, San Francisco
            </Text>
          </CollapsibleContent>
        </Collapsible>
      </Example>
      <Example title="Controlled, with render">
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="w-full gap-2"
        >
          <View className="flex-row items-center justify-between">
            <Text>{isOpen ? "Open" : "Closed"}</Text>
            <CollapsibleTrigger
              accessibilityLabel="Toggle details"
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <ChevronsUpDownIcon />
            </CollapsibleTrigger>
          </View>
          <CollapsibleContent>
            <Text className="text-muted-foreground">
              Notifications go to gabs@fabricator.dev.
            </Text>
          </CollapsibleContent>
        </Collapsible>
      </Example>
      <Example title="Disabled">
        <Collapsible disabled className="w-full">
          <CollapsibleTrigger>Archived orders</CollapsibleTrigger>
          <CollapsibleContent>
            <Text>Nothing to show.</Text>
          </CollapsibleContent>
        </Collapsible>
      </Example>
    </ExampleWrapper>
  )
}

export { CollapsibleExample }
