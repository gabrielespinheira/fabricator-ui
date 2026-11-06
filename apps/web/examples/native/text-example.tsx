import { Example, ExampleWrapper } from "@/examples/native/example"

import { Text, TextStyle } from "@/registry/native/ui/text"

function TextExample() {
  return (
    <ExampleWrapper>
      <Example title="Body">
        <Text>The default text: foreground, at the density's size.</Text>
        <Text className="text-muted-foreground">Muted text.</Text>
        <Text className="font-medium">Medium weight.</Text>
      </Example>
      <Example title="Inherited from a parent">
        <TextStyle className="font-medium text-destructive-text">
          <Text>This text takes its style from TextStyle.</Text>
          <Text className="text-primary-text">And can still override it.</Text>
        </TextStyle>
      </Example>
    </ExampleWrapper>
  )
}

export { TextExample }
