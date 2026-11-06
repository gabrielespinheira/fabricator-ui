import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CalculatorIcon,
  CalendarIcon,
  CreditCardIcon,
  SettingsIcon,
  SmileIcon,
  UserIcon,
} from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/registry/native/ui/command"
import { Text } from "@/registry/native/ui/text"

function CommandMenu() {
  return (
    <>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <CalendarIcon />
            <Text>Calendar</Text>
          </CommandItem>
          <CommandItem>
            <SmileIcon />
            <Text>Search Emoji</Text>
          </CommandItem>
          <CommandItem disabled>
            <CalculatorIcon />
            <Text>Calculator</Text>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem value="Profile">
            <UserIcon />
            <Text>Profile</Text>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem value="Billing" keywords={["invoices", "payment"]}>
            <CreditCardIcon />
            <Text>Billing</Text>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem value="Settings">
            <SettingsIcon />
            <Text>Settings</Text>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  )
}

function CommandExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("cal")
  const [picked, setPicked] = React.useState("Nothing yet")
  const [theme, setTheme] = React.useState("System")
  return (
    <ExampleWrapper>
      <Example title="Default" className="items-stretch p-0">
        <Command className="h-auto">
          <CommandMenu />
        </Command>
      </Example>
      <Example title="Dialog, open from state">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open the menu
        </Button>
        <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
          <CommandMenu />
        </CommandDialog>
      </Example>
      <Example title="Controlled search" className="items-stretch p-0">
        <Command className="h-auto">
          <CommandInput value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandItem onSelect={setPicked}>Calendar</CommandItem>
            <CommandItem onSelect={setPicked}>Calculator</CommandItem>
            <CommandItem onSelect={setPicked}>Profile</CommandItem>
          </CommandList>
        </Command>
        <Text className="px-4 pb-4 text-muted-foreground">{picked}</Text>
      </Example>
      <Example title="Checked items" className="items-stretch p-0">
        <Command className="h-auto">
          <CommandList>
            <CommandGroup heading="Theme">
              {["Light", "Dark", "System"].map((name) => (
                <CommandItem
                  key={name}
                  data-checked={theme === name}
                  onSelect={setTheme}
                >
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </Example>
      <Example title="Filtering off" className="items-stretch p-0">
        <Command className="h-auto" shouldFilter={false}>
          <CommandInput placeholder="This list ignores the search" />
          <CommandList>
            <CommandItem>Always shown</CommandItem>
            <CommandItem disabled>Disabled</CommandItem>
          </CommandList>
        </Command>
      </Example>
    </ExampleWrapper>
  )
}

export { CommandExample }
