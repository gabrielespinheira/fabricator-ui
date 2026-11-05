// The library's components, in the website's groups. Each row opens the item's
// demo from apps/web/examples/native, running the compiled registry source.
import * as React from "react"
import { NATIVE_BLOCKS, NATIVE_EXAMPLES } from "@/examples/native/__index__"
import { ExampleScreenContext } from "@/examples/native/example"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import { Pressable, View } from "react-native"
import Animated from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  COMPONENT_GROUPS,
  getComponentGroup,
  type ComponentGroup,
} from "@/lib/component-groups"
import { useFeedback } from "@/registry/native/lib/feedback"
import { FluidHoverList, useFluidRow } from "@/registry/native/lib/fluid-hover"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  AppShellContent,
  AppShellPageTitle,
} from "@/registry/native/ui/app-shell"
import { Button } from "@/registry/native/ui/button"
import { Input } from "@/registry/native/ui/input"
import { Text, TextStyle } from "@/registry/native/ui/text"

import {
  BLOCKS_HREF,
  COMPONENTS_HREF,
  filterComponents,
  getComponentTitle,
  getDemoName,
} from "./library-model"

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
  const press = () => {
    feedback("tick")
    onPress()
  }
  const { isLit, rowProps } = useFluidRow({ onActivate: press })
  return (
    <Pressable
      role="link"
      onPress={press}
      className="min-h-11 flex-row items-center justify-between rounded-lg px-3 py-2.5"
      {...rowProps}
    >
      <Text className="text-base text-foreground">
        {getComponentTitle(name)}
      </Text>
      <TextStyle
        eases
        className={isLit ? "text-foreground" : "text-muted-foreground"}
      >
        <ChevronRightIcon size={16} strokeWidth={isLit ? 2 : 1.5} />
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

function ComponentList({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [query, setQuery] = React.useState("")
  const names = filterComponents(Object.keys(NATIVE_EXAMPLES), query)
  const groups = ["Foundations", ...COMPONENT_GROUPS] as const
  return (
    <AppShellContent
      size="md"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-6"
    >
      <AppShellPageTitle>UI</AppShellPageTitle>
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
            <FluidHoverList
              track="hold"
              className="rounded-xl bg-card p-1 shadow-surface-2"
            >
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
    </AppShellContent>
  )
}

function ComponentDemo({ name }: { name: string }) {
  const getExample = NATIVE_EXAMPLES[name]
  const Example = getExample?.()
  // The way back is in the header's breadcrumb. The title scrolls with the demo,
  // under the header, and takes the header's place once it's gone.
  const heading = (
    <AppShellPageTitle>{getComponentTitle(name)}</AppShellPageTitle>
  )
  if (!Example) {
    return (
      <AppShellContent size="md" contentContainerClassName="gap-6">
        {heading}
        <Text className="text-muted-foreground">No demo for {name}.</Text>
      </AppShellContent>
    )
  }
  return (
    <ExampleScreenContext value={{ Scroller: AppShellContent, heading }}>
      <Example />
    </ExampleScreenContext>
  )
}

function BlockList({ onNavigate }: { onNavigate: (href: string) => void }) {
  const names = Object.keys(NATIVE_BLOCKS).sort()
  return (
    <AppShellContent size="md" contentContainerClassName="gap-6">
      <AppShellPageTitle>Blocks</AppShellPageTitle>
      <FluidHoverList
        track="hold"
        className="rounded-xl bg-card p-1 shadow-surface-2"
      >
        {names.map((name) => (
          <ComponentRow
            key={name}
            name={name}
            onPress={() => onNavigate(`${BLOCKS_HREF}/${name}`)}
          />
        ))}
      </FluidHoverList>
    </AppShellContent>
  )
}

/**
 * One block, as the screen it is: it has its own shell and its own header, so it
 * takes the whole window, with a way back floating over it.
 */
export function BlockScreen({
  name,
  onBack,
}: {
  name: string
  onBack: () => void
}) {
  const insets = useSafeAreaInsets()
  const Block = NATIVE_BLOCKS[name]?.()
  return (
    <PageTransition pageKey={name} isBack={false}>
      {Block ? (
        <Block />
      ) : (
        <Text className="p-4 text-muted-foreground">
          No block named {name}.
        </Text>
      )}
      <Button
        variant="outline"
        size="sm"
        accessibilityLabel="All blocks"
        onPress={onBack}
        className="absolute left-4 bg-background shadow-surface-3"
        style={{ bottom: insets.bottom + 8 }}
      >
        <ChevronLeftIcon />
        Blocks
      </Button>
    </PageTransition>
  )
}

/** The Blocks page. A block itself opens full screen, in `BlockScreen`. */
export function BlockLibrary({
  onNavigate,
}: {
  onNavigate: (href: string) => void
}) {
  return (
    <PageTransition pageKey={BLOCKS_HREF} isBack>
      <BlockList onNavigate={onNavigate} />
    </PageTransition>
  )
}

/** The Components page: the list, or one demo when the path names it. */
export function ComponentLibrary({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate: (href: string) => void
}) {
  const name = getDemoName(pathname)
  return (
    <PageTransition pageKey={pathname} isBack={!name}>
      {name ? (
        <ComponentDemo name={name} />
      ) : (
        <ComponentList onNavigate={onNavigate} />
      )}
    </PageTransition>
  )
}
