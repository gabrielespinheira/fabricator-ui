// The explorer's own pages, as the desktop example has them: the overview with
// the setup cards, and a blank tab. Both end on a card per component group.
import * as React from "react"
import { Pressable, View } from "react-native"

import {
  AppShellContent,
  AppShellPageTitle,
} from "@/registry/native/ui/app-shell"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/registry/native/ui/item"
import { Text } from "@/registry/native/ui/text"

import { GROUP_ROWS } from "./nav"
import { NEW_TAB_TITLE } from "./page-tabs"
import type { ShellOptions } from "./shell-options"

/** A card per component group, which opens the group's first component. */
function GroupGrid({
  isPhone,
  onOpen,
}: {
  isPhone: boolean
  onOpen: (href: string) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {GROUP_ROWS.map((group) => {
        const first = group.children?.[0]
        const Icon = group.icon
        return (
          <Item
            key={group.id}
            variant="muted"
            className={isPhone ? "w-full" : "min-w-56 flex-1"}
            render={
              <Pressable
                role="link"
                onPress={() => first?.href && onOpen(first.href)}
              />
            }
          >
            {Icon ? (
              <ItemMedia variant="icon">
                {React.isValidElement(Icon) ? Icon : <Icon />}
              </ItemMedia>
            ) : null}
            <ItemContent>
              <ItemTitle>{group.label}</ItemTitle>
              <ItemDescription>
                {group.children?.length} components
              </ItemDescription>
            </ItemContent>
          </Item>
        )
      })}
    </View>
  )
}

/** The first tab: what the app is, its setup, and the groups. */
export function OverviewPage({
  contentSize,
  isPhone,
  setup,
  onOpen,
}: {
  contentSize: ShellOptions["contentSize"]
  isPhone: boolean
  setup: React.ReactNode
  onOpen: (href: string) => void
}) {
  return (
    <AppShellContent size={contentSize} contentContainerClassName="gap-6">
      <View className="gap-2">
        <AppShellPageTitle>Fabricator UI</AppShellPageTitle>
        <Text className="text-base text-muted-foreground">
          Every component in a React Native app built with the App Shell. Pick
          one in Components; it opens in a tab, and the Details panel has its
          install command.
        </Text>
      </View>
      {setup}
      <GroupGrid isPhone={isPhone} onOpen={onOpen} />
    </AppShellContent>
  )
}

export function NewTabPage({
  contentSize,
  isPhone,
  onOpen,
}: {
  contentSize: ShellOptions["contentSize"]
  isPhone: boolean
  onOpen: (href: string) => void
}) {
  return (
    <AppShellContent size={contentSize} contentContainerClassName="gap-6">
      <View className="gap-2">
        <AppShellPageTitle>{NEW_TAB_TITLE}</AppShellPageTitle>
        <Text className="text-base text-muted-foreground">
          Pick a component here or in the sidebar, and it opens in this tab.
        </Text>
      </View>
      <GroupGrid isPhone={isPhone} onOpen={onOpen} />
    </AppShellContent>
  )
}
