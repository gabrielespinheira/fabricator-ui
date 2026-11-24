import { useMemo, useState } from "react"
import { searchIcons, type IconSet } from "@fabricator-ui/icons/catalog"
import { DynamicIcon } from "@fabricator-ui/icons/dynamic"

import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Card, CardContent } from "@/styles/base-fabricator/ui/card"
import { Input } from "@/styles/base-fabricator/ui/input"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

const iconSets = ["outline", "brands", "animated", "files"] as const

function IconsPage() {
  const [query, setQuery] = useState("")
  const [set, setSet] = useState<IconSet>("outline")
  const [visibleCount, setVisibleCount] = useState(72)
  const results = useMemo(() => searchIcons(query, { set }), [query, set])
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        The complete Fabricator Icons catalog, using the same geometry and names
        as the web and desktop renderers.
      </p>
      <Input
        type="search"
        aria-label="Find an icon"
        placeholder="Search names, aliases, tags or categories…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setVisibleCount(72)
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          aria-label="Icon set"
          value={[set]}
          onValueChange={(values) => {
            const next = iconSets.find((entry) => entry === values[0])
            if (next) {
              setSet(next)
              setVisibleCount(72)
            }
          }}
        >
          {iconSets.map((entry) => (
            <ToggleGroupItem key={entry} value={entry}>
              {entry.charAt(0).toUpperCase() + entry.slice(1)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Badge variant="secondary">{results.length} icons</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {results.slice(0, visibleCount).map((icon) => (
          <Card key={icon.name} size="sm">
            <CardContent className="flex flex-col items-center gap-3">
              <DynamicIcon name={icon.name} set={icon.set} className="size-6" />
              <span className="max-w-full truncate text-muted-foreground">
                {icon.name}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      {visibleCount < results.length && (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => setVisibleCount((count) => count + 72)}
        >
          Show more icons
        </Button>
      )}
    </div>
  )
}

export { IconsPage }
