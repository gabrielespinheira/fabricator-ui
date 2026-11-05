import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Button } from "@/registry/native/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/registry/native/ui/combobox"
import { Text } from "@/registry/native/ui/text"

const FRAMEWORKS = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"]

const COUNTRIES = [
  { value: "br", label: "Brazil" },
  { value: "ca", label: "Canada" },
  { value: "fr", label: "France" },
  { value: "jp", label: "Japan" },
  { value: "ke", label: "Kenya" },
]

const TIMEZONES = [
  { value: "Americas", items: ["(GMT-5) New York", "(GMT-3) São Paulo"] },
  { value: "Europe", items: ["(GMT+0) London", "(GMT+1) Paris"] },
  { value: "Asia/Pacific", items: ["(GMT+9) Tokyo", "(GMT+8) Singapore"] },
]

function FrameworkList() {
  return (
    <ComboboxContent>
      <ComboboxEmpty>No items found.</ComboboxEmpty>
      <ComboboxList>
        {(item) => (
          <ComboboxItem key={item} value={item}>
            {item}
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  )
}

function ComboboxExample() {
  const [value, setValue] = React.useState<string | null>("Remix")
  const [isOpen, setIsOpen] = React.useState(false)
  const anchor = useComboboxAnchor()
  return (
    <ExampleWrapper fit>
      <Example title="Default" className="items-stretch">
        <Combobox items={FRAMEWORKS}>
          <ComboboxInput placeholder="Select a framework" />
          <FrameworkList />
        </Combobox>
      </Example>
      <Example title="Clear button" className="items-stretch">
        <Combobox items={FRAMEWORKS} defaultValue="Astro">
          <ComboboxInput placeholder="Select a framework" showClear />
          <FrameworkList />
        </Combobox>
      </Example>
      <Example title="Disabled" className="items-stretch">
        <Combobox items={FRAMEWORKS} disabled>
          <ComboboxInput placeholder="Select a framework" disabled />
          <FrameworkList />
        </Combobox>
      </Example>
      <Example title="Invalid" className="items-stretch">
        <Combobox items={FRAMEWORKS}>
          <ComboboxInput placeholder="Select a framework" aria-invalid />
          <FrameworkList />
        </Combobox>
      </Example>
      <Example title="Controlled" className="items-stretch">
        <Combobox items={FRAMEWORKS} value={value} onValueChange={setValue}>
          <ComboboxInput placeholder="Select a framework" />
          <FrameworkList />
        </Combobox>
        <Text className="text-muted-foreground">{value ?? "Nothing yet"}</Text>
      </Example>
      <Example title="Open from state" className="items-stretch">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open the list
        </Button>
        <Combobox items={FRAMEWORKS} open={isOpen} onOpenChange={setIsOpen}>
          <FrameworkList />
        </Combobox>
      </Example>
      <Example title="Trigger, with a field in the popup">
        <Combobox items={COUNTRIES} defaultValue={COUNTRIES[0]}>
          <ComboboxTrigger
            render={
              <Button
                variant="outline"
                className="w-64 justify-between font-normal"
              />
            }
          >
            <ComboboxValue placeholder="Select country" />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput showTrigger={false} placeholder="Search" />
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof COUNTRIES)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Example>
      <Example title="Groups and separators" className="items-stretch">
        <Combobox items={TIMEZONES}>
          <ComboboxInput placeholder="Select a timezone" />
          <ComboboxContent>
            <ComboboxEmpty>No timezones found.</ComboboxEmpty>
            <ComboboxList>
              {(group: (typeof TIMEZONES)[number], index: number) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  <ComboboxLabel>{group.value}</ComboboxLabel>
                  <ComboboxCollection>
                    {(item) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                  {index < TIMEZONES.length - 1 && <ComboboxSeparator />}
                </ComboboxGroup>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Example>
      <Example title="Multiple, with chips" className="items-stretch">
        <Combobox multiple items={FRAMEWORKS} defaultValue={[FRAMEWORKS[0]]}>
          <ComboboxChips ref={anchor}>
            <ComboboxValue>
              {(values) => (
                <React.Fragment>
                  {values.map((name) => (
                    <ComboboxChip key={name}>{name}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder="Add a framework" />
                </React.Fragment>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Example>
    </ExampleWrapper>
  )
}

export { ComboboxExample }
