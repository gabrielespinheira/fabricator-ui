// The library's components, in the website's groups. Each row opens the item's
// demo from apps/web/examples/native, running the compiled registry source.
import * as React from "react"
import { NATIVE_BLOCKS, NATIVE_EXAMPLES } from "@/examples/native/__index__"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"

import {
  COMPONENT_GROUPS,
  getComponentGroup,
  type ComponentGroup,
} from "@/lib/component-groups"
import { Input } from "@/registry/native/ui/input"
import { Text } from "@/registry/native/ui/text"

import { filterComponents, getComponentTitle } from "./library-model"

export const COMPONENTS_HREF = "/components"
export const BLOCKS_HREF = "/blocks"

const FOUNDATIONS = ["text", "density"]

function getGroup(name: string): ComponentGroup | "Foundations" {
  return FOUNDATIONS.includes(name) ? "Foundations" : getComponentGroup(name)
}

function ComponentRow({
  name,
  onPress,
}: {
  name: string
  onPress: () => void
}) {
  return (
    <Pressable
      role="link"
      onPress={onPress}
      className="min-h-11 flex-row items-center justify-between rounded-lg px-3 py-2.5 active:bg-active"
    >
      <Text className="text-base text-foreground">
        {getComponentTitle(name)}
      </Text>
      <ChevronRightIcon size={16} color="#a3a3a3" />
    </Pressable>
  )
}

function ComponentList({
  onNavigate,
  bottomInset,
}: {
  onNavigate: (href: string) => void
  bottomInset: number
}) {
  const [query, setQuery] = React.useState("")
  const names = filterComponents(Object.keys(NATIVE_EXAMPLES), query)
  const groups = ["Foundations", ...COMPONENT_GROUPS] as const
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-6 p-4"
      contentContainerStyle={{ paddingBottom: 32 + bottomInset }}
    >
      <Input
        placeholder={`Search ${Object.keys(NATIVE_EXAMPLES).length} components`}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {groups.map((group) => {
        const rows = names.filter((name) => getGroup(name) === group)
        if (rows.length === 0) return null
        return (
          <View key={group} className="gap-1">
            <Text className="px-3 text-xs font-medium text-muted-foreground">
              {group}
            </Text>
            <View className="rounded-xl bg-card p-1 shadow-surface-2">
              {rows.map((name) => (
                <ComponentRow
                  key={name}
                  name={name}
                  onPress={() => onNavigate(`${COMPONENTS_HREF}/${name}`)}
                />
              ))}
            </View>
          </View>
        )
      })}
      {names.length === 0 && (
        <Text className="px-3 text-muted-foreground">No components found.</Text>
      )}
    </ScrollView>
  )
}

function ComponentDemo({
  name,
  onNavigate,
}: {
  name: string
  onNavigate: (href: string) => void
}) {
  const getExample = NATIVE_EXAMPLES[name]
  const Example = getExample?.()
  return (
    <View className="flex-1">
      <Pressable
        role="link"
        accessibilityLabel="All components"
        onPress={() => onNavigate(COMPONENTS_HREF)}
        hitSlop={8}
        className="flex-row items-center gap-1 px-4 pt-2 pb-1"
      >
        <ChevronLeftIcon size={18} color="#a3a3a3" />
        <Text className="text-muted-foreground">Components</Text>
      </Pressable>
      <Text
        role="heading"
        className="px-4 pb-1 text-2xl font-semibold text-foreground"
      >
        {getComponentTitle(name)}
      </Text>
      {Example ? (
        <Example />
      ) : (
        <Text className="p-4 text-muted-foreground">No demo for {name}.</Text>
      )}
    </View>
  )
}

function BlockList({
  onNavigate,
  bottomInset,
}: {
  onNavigate: (href: string) => void
  bottomInset: number
}) {
  const names = Object.keys(NATIVE_BLOCKS).sort()
  return (
    <ScrollView
      contentContainerClassName="gap-1 p-4"
      contentContainerStyle={{ paddingBottom: 32 + bottomInset }}
    >
      <View className="rounded-xl bg-card p-1 shadow-surface-2">
        {names.map((name) => (
          <ComponentRow
            key={name}
            name={name}
            onPress={() => onNavigate(`${BLOCKS_HREF}/${name}`)}
          />
        ))}
      </View>
    </ScrollView>
  )
}

function BlockDemo({
  name,
  onNavigate,
}: {
  name: string
  onNavigate: (href: string) => void
}) {
  const Block = NATIVE_BLOCKS[name]?.()
  return (
    <View className="flex-1">
      <Pressable
        role="link"
        accessibilityLabel="All blocks"
        onPress={() => onNavigate(BLOCKS_HREF)}
        hitSlop={8}
        className="flex-row items-center gap-1 px-4 pt-2 pb-1"
      >
        <ChevronLeftIcon size={18} color="#a3a3a3" />
        <Text className="text-muted-foreground">Blocks</Text>
      </Pressable>
      {Block ? (
        <Block />
      ) : (
        <Text className="p-4 text-muted-foreground">
          No block named {name}.
        </Text>
      )}
    </View>
  )
}

/** The Blocks page: the list, or one block full screen. */
export function BlockLibrary({
  pathname,
  onNavigate,
  bottomInset = 0,
}: {
  pathname: string
  onNavigate: (href: string) => void
  bottomInset?: number
}) {
  const name = pathname.slice(BLOCKS_HREF.length + 1)
  return name ? (
    <BlockDemo name={name} onNavigate={onNavigate} />
  ) : (
    <BlockList onNavigate={onNavigate} bottomInset={bottomInset} />
  )
}

/** The Components page: the list, or one demo when the path names it. */
export function ComponentLibrary({
  pathname,
  onNavigate,
  bottomInset = 0,
}: {
  pathname: string
  onNavigate: (href: string) => void
  bottomInset?: number
}) {
  const name = pathname.slice(COMPONENTS_HREF.length + 1)
  return name ? (
    <ComponentDemo name={name} onNavigate={onNavigate} />
  ) : (
    <ComponentList onNavigate={onNavigate} bottomInset={bottomInset} />
  )
}
