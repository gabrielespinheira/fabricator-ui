// The library's components, in the website's groups. Each row opens the item's
// demo from apps/web/examples/native, running the compiled registry source.
import * as React from "react"
import { NATIVE_BLOCKS, NATIVE_EXAMPLES } from "@/examples/native/__index__"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import { Pressable, ScrollView, View } from "react-native"
import Animated from "react-native-reanimated"

import {
  COMPONENT_GROUPS,
  getComponentGroup,
  type ComponentGroup,
} from "@/lib/component-groups"
import { useFeedback } from "@/registry/native/lib/feedback"
import { FluidHoverList, useFluidRow } from "@/registry/native/lib/fluid-hover"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import { Input } from "@/registry/native/ui/input"
import { Text, TextStyle } from "@/registry/native/ui/text"

import { filterComponents, getComponentTitle } from "./library-model"

export const COMPONENTS_HREF = "/components"
export const BLOCKS_HREF = "/blocks"

const FOUNDATIONS = ["text", "density"]

// How far a page slides as it opens: a hint of direction, not a full push.
const PAGE_TRAVEL = 16

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
  const feedback = useFeedback()
  const { rowProps } = useFluidRow()
  return (
    <Pressable
      role="link"
      onPress={() => {
        feedback("tick")
        onPress()
      }}
      className="min-h-11 flex-row items-center justify-between rounded-lg px-3 py-2.5"
      {...rowProps}
    >
      <Text className="text-base text-foreground">
        {getComponentTitle(name)}
      </Text>
      <TextStyle className="text-muted-foreground">
        <ChevronRightIcon size={16} strokeWidth={1.5} />
      </TextStyle>
    </Pressable>
  )
}

/** A page moving in from the side it was opened from, on the move timing. */
function PageTransition({
  pageKey,
  isBack,
  children,
}: {
  pageKey: string
  isBack: boolean
  children: React.ReactNode
}) {
  const { entering } = useSurfaceAnimation("move", {
    translateX: isBack ? -PAGE_TRAVEL : PAGE_TRAVEL,
  })
  return (
    <Animated.View key={pageKey} entering={entering} className="flex-1">
      {children}
    </Animated.View>
  )
}

/** The link back to a list, above a demo. */
function BackLink({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string
  accessibilityLabel: string
  onPress: () => void
}) {
  const feedback = useFeedback()
  return (
    <Pressable
      role="link"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        feedback("tick")
        onPress()
      }}
      hitSlop={8}
      className="flex-row items-center gap-1 self-start px-4 pt-2 pb-1"
    >
      <TextStyle className="text-muted-foreground">
        <ChevronLeftIcon size={18} strokeWidth={1.5} />
        <Text>{label}</Text>
      </TextStyle>
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
            <FluidHoverList className="rounded-xl bg-card p-1 shadow-surface-2">
              {rows.map((name) => (
                <ComponentRow
                  key={name}
                  name={name}
                  onPress={() => onNavigate(`${COMPONENTS_HREF}/${name}`)}
                />
              ))}
            </FluidHoverList>
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
      <BackLink
        label="Components"
        accessibilityLabel="All components"
        onPress={() => onNavigate(COMPONENTS_HREF)}
      />
      <Text
        role="heading"
        className="px-4 pb-1 text-2xl font-semibold tracking-tight text-foreground"
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
      <FluidHoverList className="rounded-xl bg-card p-1 shadow-surface-2">
        {names.map((name) => (
          <ComponentRow
            key={name}
            name={name}
            onPress={() => onNavigate(`${BLOCKS_HREF}/${name}`)}
          />
        ))}
      </FluidHoverList>
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
      <BackLink
        label="Blocks"
        accessibilityLabel="All blocks"
        onPress={() => onNavigate(BLOCKS_HREF)}
      />
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
  return (
    <PageTransition pageKey={pathname} isBack={!name}>
      {name ? (
        <BlockDemo name={name} onNavigate={onNavigate} />
      ) : (
        <BlockList onNavigate={onNavigate} bottomInset={bottomInset} />
      )}
    </PageTransition>
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
  return (
    <PageTransition pageKey={pathname} isBack={!name}>
      {name ? (
        <ComponentDemo name={name} onNavigate={onNavigate} />
      ) : (
        <ComponentList onNavigate={onNavigate} bottomInset={bottomInset} />
      )}
    </PageTransition>
  )
}
