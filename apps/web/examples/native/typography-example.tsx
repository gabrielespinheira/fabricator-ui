import { Example, ExampleWrapper } from "@/examples/native/example"

import { Text } from "@/registry/native/ui/text"

function TypographyExample() {
  return (
    <ExampleWrapper>
      <Example title="Headings">
        <Text role="heading" className="text-3xl font-semibold tracking-tight">
          The Joke Tax Chronicles
        </Text>
        <Text role="heading" className="text-2xl font-semibold">
          {"The king's plan"}
        </Text>
        <Text role="heading" className="text-xl font-medium">
          A new tax
        </Text>
      </Example>
      <Example title="Body and lead">
        <Text className="text-lg text-muted-foreground">
          Once upon a time, in a far-off land, there was a very lazy king who
          spent all day lounging on his throne.
        </Text>
        <Text>
          The king thought long and hard, and finally came up with a brilliant
          plan: he would tax the jokes in the kingdom.
        </Text>
      </Example>
      <Example title="Inline code and small text">
        <Text className="rounded bg-muted px-2 py-1 font-mono">
          @fabricator-ui/icons-react-native
        </Text>
        <Text className="text-xs text-muted-foreground">
          Every size follows the density of its region.
        </Text>
      </Example>
      <Example title="List">
        <Text>• Accessible components</Text>
        <Text>• Shared tokens and variants</Text>
        <Text>• Native platform behavior</Text>
      </Example>
    </ExampleWrapper>
  )
}
export { TypographyExample }
