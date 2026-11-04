import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  BookOpenIcon,
  CircleHelpIcon,
  RocketIcon,
} from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/registry/native/ui/navigation-menu"
import { Text } from "@/registry/native/ui/text"

function Menu(props: React.ComponentProps<typeof NavigationMenu>) {
  return (
    <NavigationMenu {...props}>
      <NavigationMenuList>
        <NavigationMenuItem value="start">
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink active>
              <RocketIcon />
              Introduction
            </NavigationMenuLink>
            <NavigationMenuLink>
              <BookOpenIcon />
              Installation
            </NavigationMenuLink>
            <NavigationMenuLink>
              <CircleHelpIcon />
              Help
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="components">
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink>Button</NavigationMenuLink>
            <NavigationMenuLink>Dialog</NavigationMenuLink>
            <NavigationMenuLink>Sidebar</NavigationMenuLink>
          </NavigationMenuContent>
          <NavigationMenuIndicator />
        </NavigationMenuItem>
        <NavigationMenuItem value="disabled">
          <NavigationMenuTrigger disabled>Disabled</NavigationMenuTrigger>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()}>
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function NavigationMenuExample() {
  const [value, setValue] = React.useState("")
  return (
    <ExampleWrapper>
      <Example title="A popover on tablets, a sheet on phones">
        <Menu />
      </Example>
      <Example title="Lined up with the trigger's end">
        <Menu align="end" />
      </Example>
      <Example title="Open from state">
        <Button variant="outline" onPress={() => setValue("components")}>
          Open Components
        </Button>
        <Text className="text-muted-foreground">
          Open: {value === "" ? "none" : value}
        </Text>
        <Menu value={value} onValueChange={setValue} />
      </Example>
      <Example title="A panel placed by hand">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem value="above">
              <NavigationMenuTrigger>Above</NavigationMenuTrigger>
              <NavigationMenuPositioner
                side="top"
                sideOffset={12}
                align="center"
              >
                <NavigationMenuLink>Over its trigger</NavigationMenuLink>
              </NavigationMenuPositioner>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Example>
    </ExampleWrapper>
  )
}

export { NavigationMenuExample }
