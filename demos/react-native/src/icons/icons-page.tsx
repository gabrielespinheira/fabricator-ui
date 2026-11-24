import * as React from "react"
import { Icon } from "@fabricator-ui/icons-react-native"
import { BrandIcon } from "@fabricator-ui/icons-react-native/brands"
import { FileIcon } from "@fabricator-ui/icons-react-native/files"
import {
  brandNodes,
  fileNodes,
  outlineNodes,
} from "@fabricator-ui/icons-static/nodes"
import { searchIcons, type CatalogEntry } from "@fabricator-ui/icons/catalog"
import { Pressable, View } from "react-native"

import {
  getIconImport,
  getIconPage,
  getIconSets,
  type ExplorerIconSet,
} from "@/lib/icon-explorer"
import {
  AppShellContent,
  AppShellPageTitle,
} from "@/registry/native/ui/app-shell"
import { Button } from "@/registry/native/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/native/ui/dialog"
import { Input } from "@/registry/native/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/registry/native/ui/tabs"
import { Text } from "@/registry/native/ui/text"

import { CommandBox } from "../shell/command-box"

const SETS = getIconSets("native")
const LABELS = {
  outline: "Outline",
  brands: "Brands",
  files: "Files",
  animated: "Animated",
}
const SIZES = [16, 20, 24] as const

function IconGlyph({
  entry,
  size,
  strokeWidth,
  brandColor,
}: {
  entry: CatalogEntry
  size: number
  strokeWidth: number
  brandColor: boolean
}) {
  if (entry.set === "brands")
    return (
      <BrandIcon
        data={{ name: entry.name, ...brandNodes[entry.name] }}
        size={size}
        color={brandColor ? "brand" : undefined}
      />
    )
  if (entry.set === "files")
    return <FileIcon data={fileNodes[entry.name]} size={size} />
  return (
    <Icon
      data={{ name: entry.name, node: outlineNodes[entry.name] }}
      size={size}
      strokeWidth={strokeWidth}
    />
  )
}

const IconTile = React.memo(function IconTile({
  entry,
  size,
  strokeWidth,
  brandColor,
  onSelect,
}: {
  entry: CatalogEntry
  size: number
  strokeWidth: number
  brandColor: boolean
  onSelect: (entry: CatalogEntry) => void
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={entry.set === "brands" ? entry.title : entry.name}
      onPress={() => onSelect(entry)}
      className="min-h-24 w-1/3 items-center justify-center gap-2 rounded-xl p-2 active:bg-active md:w-1/6"
    >
      <IconGlyph
        entry={entry}
        size={size}
        strokeWidth={strokeWidth}
        brandColor={brandColor}
      />
      <Text numberOfLines={1} className="text-xs text-muted-foreground">
        {entry.set === "brands" ? entry.title : entry.name}
      </Text>
    </Pressable>
  )
})

export function NativeIconsPage() {
  const [query, setQuery] = React.useState("")
  const [set, setSet] = React.useState<ExplorerIconSet>("outline")
  const [size, setSize] = React.useState<number>(24)
  const [strokeWidth, setStrokeWidth] = React.useState(2)
  const [brandColor, setBrandColor] = React.useState(false)
  const [requestedPage, setRequestedPage] = React.useState(0)
  const [selected, setSelected] = React.useState<CatalogEntry | null>(null)
  const results = React.useMemo(() => searchIcons(query, { set }), [query, set])
  const page = getIconPage(results, requestedPage, 48)
  return (
    <>
      <AppShellContent size="lg" contentContainerClassName="gap-6">
        <View className="gap-2">
          <AppShellPageTitle>Fabricator UI Icons</AppShellPageTitle>
          <Text className="text-muted-foreground">
            Outline icons, brand marks, and file and folder icons. Animated
            icons are available on web and desktop.
          </Text>
        </View>
        <Input
          accessibilityLabel="Search icons"
          placeholder="Search icons"
          value={query}
          onChangeText={(next) => {
            setQuery(next)
            setRequestedPage(0)
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Tabs
          value={set}
          onValueChange={(value) => {
            const next = SETS.find((entry) => entry === value)
            if (next) {
              setSet(next)
              setRequestedPage(0)
            }
          }}
        >
          <TabsList accessibilityLabel="Icon family">
            {SETS.map((entry) => (
              <TabsTrigger key={entry} value={entry}>
                {LABELS[entry]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <View className="flex-row flex-wrap items-center gap-4">
          <Tabs
            value={String(size)}
            onValueChange={(value) => {
              const next = SIZES.find((entry) => String(entry) === value)
              if (next) setSize(next)
            }}
          >
            <TabsList accessibilityLabel="Icon size">
              {SIZES.map((entry) => (
                <TabsTrigger key={entry} value={String(entry)}>
                  {entry}px
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {set === "outline" && (
            <Tabs
              value={String(strokeWidth)}
              onValueChange={(value) =>
                setStrokeWidth(value === "1.5" ? 1.5 : 2)
              }
            >
              <TabsList accessibilityLabel="Stroke width">
                <TabsTrigger value="1.5">1.5</TabsTrigger>
                <TabsTrigger value="2">2</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </View>
        {set === "brands" && (
          <Tabs
            value={brandColor ? "brand" : "mono"}
            onValueChange={(value) => setBrandColor(value === "brand")}
          >
            <TabsList accessibilityLabel="Brand colors">
              <TabsTrigger value="mono">Mono</TabsTrigger>
              <TabsTrigger value="brand">Brand</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <Text
          accessibilityLiveRegion="polite"
          className="text-muted-foreground"
        >
          {results.length} icons
        </Text>
        <View className="flex-row flex-wrap rounded-xl bg-card p-1 shadow-surface-2">
          {page.items.map((entry) => (
            <IconTile
              key={`${entry.set}:${entry.name}`}
              entry={entry}
              size={size}
              strokeWidth={strokeWidth}
              brandColor={brandColor}
              onSelect={setSelected}
            />
          ))}
        </View>
        {results.length === 0 ? (
          <Text>No icons found.</Text>
        ) : (
          <View className="flex-row items-center justify-between gap-2">
            <Button
              variant="outline"
              disabled={page.page === 0}
              onPress={() => setRequestedPage(page.page - 1)}
            >
              Previous
            </Button>
            <Text className="text-muted-foreground">
              {page.page + 1} / {page.pages}
            </Text>
            <Button
              variant="outline"
              disabled={page.page + 1 === page.pages}
              onPress={() => setRequestedPage(page.page + 1)}
            >
              Next
            </Button>
          </View>
        )}
      </AppShellContent>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.set === "brands" ? selected.title : selected.name}
                </DialogTitle>
                <DialogDescription>
                  {LABELS[selected.set]} · React Native
                </DialogDescription>
              </DialogHeader>
              <View className="items-center p-6">
                <IconGlyph
                  entry={selected}
                  size={64}
                  strokeWidth={strokeWidth}
                  brandColor={brandColor}
                />
              </View>
              <CommandBox command="bun add @fabricator-ui/icons-react-native react-native-svg" />
              <CommandBox command={getIconImport(selected, "native")} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
