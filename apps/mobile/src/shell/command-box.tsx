import { ShareIcon } from "@fabricator-ui/icons-react-native"
import { Share, View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

/** A command to copy. The share sheet has Copy. */
export function CommandBox({ command }: { command: string }) {
  return (
    <View className="flex-row items-start gap-2 rounded-lg bg-foreground/5 py-2 pr-1 pl-3">
      <Text
        selectable
        className="flex-1 font-mono text-(length:--density-text-11) text-foreground"
      >
        {command}
      </Text>
      <Button
        variant="ghost"
        size="icon-sm"
        accessibilityLabel="Share the command"
        onPress={() => void Share.share({ message: command })}
      >
        <ShareIcon />
      </Button>
    </View>
  )
}
