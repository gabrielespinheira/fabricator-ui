import * as React from "react"
import { ChevronRightIcon } from "@fabricator-ui/icons-react-native"
import { Pressable, SectionList, View } from "react-native"

import {
  AppShellContent,
  AppShellPageTitle,
} from "@/registry/native/ui/app-shell"
import { Item, ItemContent, ItemTitle } from "@/registry/native/ui/item"
import { Text } from "@/registry/native/ui/text"

import { EXPLORER_COMPONENTS } from "../nav"
import type { ShellOptions } from "../shell-options"
import { COMPONENTS_HREF, getComponentSections } from "./component-model"

const SECTIONS = getComponentSections(EXPLORER_COMPONENTS)

export function ComponentsPage({
  contentSize,
  onOpen,
}: {
  contentSize: ShellOptions["contentSize"]
  onOpen: (href: string) => void
}) {
  return (
    <SectionList
      sections={SECTIONS}
      keyExtractor={(component) => component.slug}
      stickySectionHeadersEnabled={false}
      renderScrollComponent={(props) => (
        <AppShellContent {...props} size={contentSize} />
      )}
      ListHeaderComponent={<AppShellPageTitle>Components</AppShellPageTitle>}
      renderSectionHeader={({ section }) => (
        <View className="pt-8 pb-2">
          <Text
            role="heading"
            className="text-(length:--density-text-12) font-medium text-muted-foreground"
          >
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Item
          size="sm"
          render={
            <Pressable
              role="link"
              onPress={() => onOpen(`${COMPONENTS_HREF}/${item.slug}`)}
            />
          }
        >
          <ItemContent>
            <ItemTitle>{item.title}</ItemTitle>
          </ItemContent>
          <ChevronRightIcon />
        </Item>
      )}
    />
  )
}
