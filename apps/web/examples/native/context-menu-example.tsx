import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CopyIcon,
  PencilIcon,
  Trash2Icon,
} from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/registry/native/ui/context-menu"
import { Text } from "@/registry/native/ui/text"

const AREA =
  "border-border w-full items-center justify-center rounded-xl border border-dashed p-8"

function ContextMenuExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showBookmarks, setShowBookmarks] = React.useState(true)
  const [person, setPerson] = React.useState("gabs")
  return (
    <ExampleWrapper>
      <Example title="Items, groups and shortcuts">
        <ContextMenu>
          <ContextMenuTrigger className={AREA}>
            <Text>Long press here</Text>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel>Actions</ContextMenuLabel>
              <ContextMenuItem>
                <CopyIcon />
                Copy
                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem>
                <PencilIcon />
                Rename
              </ContextMenuItem>
              <ContextMenuItem disabled>Move</ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuItem inset>Share</ContextMenuItem>
            <ContextMenuItem variant="destructive">
              <Trash2Icon />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Example>
      <Example title="Checkbox and radio items">
        <ContextMenu>
          <ContextMenuTrigger className={AREA}>
            <Text>Long press here</Text>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem
              checked={showBookmarks}
              onCheckedChange={setShowBookmarks}
            >
              Show bookmarks
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem defaultChecked>
              Show full URLs
            </ContextMenuCheckboxItem>
            <ContextMenuSeparator />
            <ContextMenuLabel>People</ContextMenuLabel>
            <ContextMenuRadioGroup value={person} onValueChange={setPerson}>
              <ContextMenuRadioItem value="gabs">Gabs</ContextMenuRadioItem>
              <ContextMenuRadioItem value="acme">Acme Inc</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      </Example>
      <Example title="Submenus expand inline">
        <ContextMenu>
          <ContextMenuTrigger className={AREA}>
            <Text>Long press here</Text>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Back</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent>
                  <ContextMenuItem>Save page</ContextMenuItem>
                  <ContextMenuItem>Developer tools</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      </Example>
      <Example title="Above the finger">
        <ContextMenu>
          <ContextMenuTrigger className={AREA}>
            <Text>Long press here</Text>
          </ContextMenuTrigger>
          <ContextMenuContent side="top">
            <ContextMenuItem>Back</ContextMenuItem>
            <ContextMenuItem>Forward</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Example>
      <Example title="Disabled">
        <ContextMenu>
          <ContextMenuTrigger disabled className={AREA}>
            <Text className="text-muted-foreground">Doesn't open</Text>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Back</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Example>
      <Example title="Controlled">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open from state
        </Button>
        <ContextMenu
          open={isOpen}
          onOpenChange={setIsOpen}
          relativeTo="trigger"
        >
          <ContextMenuTrigger className={AREA}>
            <Text>Anchored to this area</Text>
          </ContextMenuTrigger>
          <ContextMenuContent side="bottom">
            <ContextMenuItem>Closes through onOpenChange</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Example>
    </ExampleWrapper>
  )
}

export { ContextMenuExample }
