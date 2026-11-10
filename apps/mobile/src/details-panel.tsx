// The panel beside a component, as in the desktop example: what it is, the
// command that adds it, and its docs.
import { ExternalLinkIcon } from "@fabricator-ui/icons-react-native"
import { Linking, View } from "react-native"

import { getComponentGroup } from "@/lib/component-groups"
import {
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/registry/native/ui/app-shell"
import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

import {
  getComponentDocsUrl,
  getComponentInstallCommand,
  getComponentTitle,
} from "./library/library-model"
import { CommandBox } from "./shell/command-box"

export function DetailsPanel({ slug }: { slug: string | null }) {
  return (
    <>
      <AppShellPanelHeader>
        <AppShellPanelTitle>Details</AppShellPanelTitle>
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent contentContainerClassName="gap-4 px-(--density-16) pt-2 pb-8">
        {slug ? (
          <>
            <View className="gap-1">
              <Text className="font-medium text-foreground">
                {getComponentTitle(slug)}
              </Text>
              <Text className="text-muted-foreground">
                {getComponentGroup(slug)}
              </Text>
            </View>
            <View className="gap-2">
              <Text className="text-muted-foreground">Install</Text>
              <CommandBox command={getComponentInstallCommand(slug)} />
            </View>
            <Button
              variant="link"
              className="self-start px-0"
              onPress={() => void Linking.openURL(getComponentDocsUrl(slug))}
            >
              Read the docs
              <ExternalLinkIcon />
            </Button>
          </>
        ) : (
          <Text className="text-muted-foreground">
            Open a component to see how to install it.
          </Text>
        )}
      </AppShellPanelContent>
    </>
  )
}
