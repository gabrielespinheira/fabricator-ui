import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { cn } from "cn"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  MultiSelect,
  MultiSelectCollection,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectGroup,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectList,
  MultiSelectSeparator,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/registry/native/ui/multi-select"
import { Text } from "@/registry/native/ui/text"

type Team = { value: string; label: string; dot: string }

const design: Team = { value: "design", label: "Design", dot: "bg-destructive" }
const engineering: Team = {
  value: "engineering",
  label: "Engineering",
  dot: "bg-info",
}

const TEAMS = [
  {
    value: "Product teams",
    items: [
      design,
      engineering,
      { value: "product", label: "Product", dot: "bg-warning" },
      { value: "research", label: "Research", dot: "bg-primary" },
    ],
  },
  {
    value: "Business teams",
    items: [
      { value: "marketing", label: "Marketing", dot: "bg-success" },
      { value: "operations", label: "Operations", dot: "bg-muted-foreground" },
    ],
  },
]

const LABELS = ["Bug", "Feature", "Docs", "Design", "Performance", "Security"]

function LabelList() {
  return (
    <MultiSelectContent>
      <MultiSelectInput placeholder="Search labels" />
      <MultiSelectEmpty>No labels found.</MultiSelectEmpty>
      <MultiSelectList>
        {(label: string) => (
          <MultiSelectItem key={label} value={label}>
            {label}
          </MultiSelectItem>
        )}
      </MultiSelectList>
    </MultiSelectContent>
  )
}

function MultiSelectExample() {
  const [value, setValue] = React.useState<string[]>(["Bug", "Performance"])
  return (
    <ExampleWrapper fit>
      <Example title="Groups" className="items-stretch">
        <MultiSelect items={TEAMS} defaultValue={[design, engineering]}>
          <MultiSelectTrigger accessibilityLabel="Teams">
            <MultiSelectValue />
            <MultiSelectInput placeholder="Choose teams" />
          </MultiSelectTrigger>
          <MultiSelectContent>
            <MultiSelectInput placeholder="Search teams" />
            <MultiSelectEmpty>No teams found.</MultiSelectEmpty>
            <MultiSelectList>
              {(group: (typeof TEAMS)[number], index: number) => (
                <MultiSelectGroup key={group.value} items={group.items}>
                  <MultiSelectLabel>{group.value}</MultiSelectLabel>
                  <MultiSelectCollection>
                    {(team: Team) => (
                      <MultiSelectItem key={team.value} value={team}>
                        <View className={cn("size-2 rounded-full", team.dot)} />
                        <Text>{team.label}</Text>
                      </MultiSelectItem>
                    )}
                  </MultiSelectCollection>
                  {index < TEAMS.length - 1 && <MultiSelectSeparator />}
                </MultiSelectGroup>
              )}
            </MultiSelectList>
          </MultiSelectContent>
        </MultiSelect>
      </Example>
      <Example title="Controlled" className="items-stretch">
        <MultiSelect items={LABELS} value={value} onValueChange={setValue}>
          <MultiSelectTrigger accessibilityLabel="Labels">
            <MultiSelectValue />
            <MultiSelectInput placeholder="Add labels" />
          </MultiSelectTrigger>
          <LabelList />
        </MultiSelect>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">
            {value.length} selected
          </Text>
          <Button
            variant="outline"
            size="sm"
            disabled={value.length === 0}
            onPress={() => setValue([])}
          >
            Clear
          </Button>
        </View>
      </Example>
      <Example title="Empty" className="items-stretch">
        <MultiSelect items={LABELS}>
          <MultiSelectTrigger accessibilityLabel="Labels">
            <MultiSelectValue />
            <MultiSelectInput placeholder="Add labels" />
          </MultiSelectTrigger>
          <LabelList />
        </MultiSelect>
      </Example>
      <Example title="Invalid" className="items-stretch">
        <MultiSelect items={LABELS}>
          <MultiSelectTrigger accessibilityLabel="Labels" aria-invalid>
            <MultiSelectValue />
            <MultiSelectInput placeholder="Add at least one label" />
          </MultiSelectTrigger>
          <LabelList />
        </MultiSelect>
      </Example>
      <Example title="Disabled" className="items-stretch">
        <MultiSelect items={LABELS} defaultValue={["Docs"]} disabled>
          <MultiSelectTrigger accessibilityLabel="Labels">
            <MultiSelectValue />
            <MultiSelectInput placeholder="Add labels" />
          </MultiSelectTrigger>
          <LabelList />
        </MultiSelect>
      </Example>
    </ExampleWrapper>
  )
}

export { MultiSelectExample }
