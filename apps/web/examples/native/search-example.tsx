import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Search } from "@/registry/native/ui/search"
import { Text } from "@/registry/native/ui/text"

const FRAMEWORKS = ["Next.js", "Remix", "Astro", "Vite", "Gatsby", "Nuxt"]

function SearchExample() {
  const [value, setValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const results = FRAMEWORKS.filter((name) =>
    name.toLowerCase().includes(value.trim().toLowerCase())
  )
  return (
    <ExampleWrapper fit>
      <Example title="Collapsible">
        <Search placeholder="Search components" />
      </Example>
      <Example title="Sizes">
        <Search size="sm" />
        <Search />
        <Search size="lg" />
      </Example>
      <Example title="Outline">
        <Search variant="outline" />
      </Example>
      <Example title="Always open">
        <Search collapsible={false} width="100%" defaultValue="Button" />
      </Example>
      <Example title="No clear button">
        <Search collapsible={false} clearable={false} width="100%" />
      </Example>
      <Example title="Disabled">
        <Search collapsible={false} width="100%" editable={false} />
      </Example>
      <Example title="Controlled">
        <Search
          collapsible={false}
          value={value}
          onValueChange={setValue}
          placeholder="Filter frameworks"
          width="100%"
        />
        <Text className="text-muted-foreground">
          {value
            ? `${results.length} of ${FRAMEWORKS.length}: ${results.join(", ") || "none"}`
            : `${FRAMEWORKS.length} frameworks`}
        </Text>
      </Example>
      <Example title="Open from state">
        <Search open={isOpen} onOpenChange={setIsOpen} width={240} />
        <Text className="text-muted-foreground">
          {isOpen ? "Open" : "Closed"}
        </Text>
      </Example>
    </ExampleWrapper>
  )
}

export { SearchExample }
