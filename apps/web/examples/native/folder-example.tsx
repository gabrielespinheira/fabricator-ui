import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { LockIcon } from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import { Badge } from "@/registry/native/ui/badge"
import {
  Folder,
  FolderCover,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/registry/native/ui/folder"
import { Text } from "@/registry/native/ui/text"

const COLORS = [
  { color: undefined, name: "Neutral" },
  { color: "primary", name: "Primary" },
  { color: "blue", name: "Blue" },
  { color: "green", name: "Green" },
  { color: "orange", name: "Orange" },
  { color: "pink", name: "Pink" },
]

function Sheets({ count }: { count: number }) {
  return (
    <FolderFiles>
      {Array.from({ length: count }, (_, index) => (
        <FolderFile key={index} />
      ))}
    </FolderFiles>
  )
}

function FolderExample() {
  const [opened, setOpened] = React.useState<string | null>(null)
  return (
    <ExampleWrapper>
      <Example title="Tap to open">
        <View className="flex-row flex-wrap justify-center">
          <Folder
            variant="glass"
            className="w-1/2"
            onPress={() => setOpened("Onboarding")}
          >
            <FolderPreview>
              <Sheets count={2} />
              <FolderCover>
                <Text>MA</Text>
                <Badge variant="secondary">Updated 2h</Badge>
              </FolderCover>
            </FolderPreview>
            <FolderTitle>Onboarding</FolderTitle>
            <FolderDescription>15 files · 3 folders</FolderDescription>
          </Folder>
          <Folder
            color="blue"
            className="w-1/2"
            onPress={() => setOpened("Contracts")}
          >
            <FolderPreview>
              <Sheets count={3} />
              <FolderCover className="justify-end">
                <LockIcon accessibilityLabel="Private" />
              </FolderCover>
            </FolderPreview>
            <FolderTitle>Contracts</FolderTitle>
            <FolderDescription>12 files</FolderDescription>
          </Folder>
        </View>
        <Text className="text-center text-(length:--density-text-13) text-muted-foreground">
          {opened ? `Opened ${opened}` : "Nothing opened yet"}
        </Text>
      </Example>
      <Example title="Colors">
        <View className="flex-row flex-wrap justify-center">
          {COLORS.map(({ color, name }) => (
            <Folder key={name} color={color} size="sm" className="w-1/3">
              <FolderPreview>
                <Sheets count={2} />
              </FolderPreview>
              <FolderTitle>{name}</FolderTitle>
            </Folder>
          ))}
        </View>
      </Example>
      <Example title="Glass">
        <View className="flex-row flex-wrap justify-center">
          <Folder variant="glass" color="purple" className="w-1/2">
            <FolderPreview>
              <Sheets count={3} />
            </FolderPreview>
            <FolderTitle>Résumés</FolderTitle>
          </Folder>
          <Folder variant="glass" color="teal" className="w-1/2">
            <FolderPreview>
              <Sheets count={1} />
            </FolderPreview>
            <FolderTitle>Certificates</FolderTitle>
          </Folder>
        </View>
      </Example>
      <Example title="Empty and file counts">
        <View className="flex-row flex-wrap justify-center">
          {[0, 1, 2, 3, 12].map((count) => (
            <Folder key={count} color="cyan" size="sm" className="w-1/3">
              <FolderPreview>
                <Sheets count={count} />
              </FolderPreview>
              <FolderTitle>
                {count === 0
                  ? "Empty"
                  : `${count} ${count === 1 ? "file" : "files"}`}
              </FolderTitle>
            </Folder>
          ))}
        </View>
      </Example>
      <Example title="Sizes">
        <View className="flex-row flex-wrap items-end justify-center">
          {(["sm", "default", "lg"] as const).map((size) => (
            <Folder key={size} size={size} color="green">
              <FolderPreview>
                <Sheets count={2} />
              </FolderPreview>
              <FolderTitle>Reports</FolderTitle>
              <FolderDescription>{size}</FolderDescription>
            </Folder>
          ))}
        </View>
      </Example>
      <Example title="Held open">
        <View className="items-center">
          <Folder color="orange" open>
            <FolderPreview>
              <Sheets count={3} />
              <FolderCover className="justify-end">
                <Badge variant="secondary">Drop here</Badge>
              </FolderCover>
            </FolderPreview>
            <FolderTitle>Invoices 2026</FolderTitle>
            <FolderDescription>48 files</FolderDescription>
          </Folder>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { FolderExample }
