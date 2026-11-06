import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { SlashIcon } from "@fabricator-ui/icons-react-native"

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/native/ui/breadcrumb"
import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

function BreadcrumbExample() {
  const [lastPressed, setLastPressed] = React.useState("Press a link")
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onPress={() => setLastPressed("Home")}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onPress={() => setLastPressed("Components")}>
                Components
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Text className="text-muted-foreground">{lastPressed}</Text>
      </Example>
      <Example title="Folded with an ellipsis">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>
      <Example title="A custom separator">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <SlashIcon size={14} />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Components</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>
      <Example title="A link that renders something else">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Button variant="ghost" size="xs" />}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Components</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>
      <Example title="Too long for the screen, it scrolls to the end">
        <Breadcrumb>
          <BreadcrumbList>
            {["Home", "Projects", "Fabricator", "Registry", "Native"].map(
              (name) => (
                <React.Fragment key={name}>
                  <BreadcrumbItem>
                    <BreadcrumbLink>{name}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </React.Fragment>
              )
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>Components and their examples</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>
    </ExampleWrapper>
  )
}

export { BreadcrumbExample }
