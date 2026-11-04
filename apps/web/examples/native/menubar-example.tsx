import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  ClipboardIcon,
  CopyIcon,
  ScissorsIcon,
  TrashIcon,
} from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/registry/native/ui/menubar"

function MenubarExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showStatus, setShowStatus] = React.useState(true)
  const [theme, setTheme] = React.useState("system")
  return (
    <ExampleWrapper>
      <Example title="Popovers on tablets, sheets on phones">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarItem>
                  New tab
                  <MenubarShortcut>⌘T</MenubarShortcut>
                </MenubarItem>
                <MenubarItem disabled>New window</MenubarItem>
                <MenubarItem inset>Share</MenubarItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Export</MenubarSubTrigger>
                <MenubarPortal>
                  <MenubarSubContent>
                    <MenubarItem>PDF</MenubarItem>
                    <MenubarItem>Markdown</MenubarItem>
                  </MenubarSubContent>
                </MenubarPortal>
              </MenubarSub>
              <MenubarSub>
                <MenubarSubTrigger inset>Share with</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Team</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem variant="destructive">
                <TrashIcon />
                Delete
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarLabel>Clipboard</MenubarLabel>
              <MenubarGroup>
                <MenubarItem>
                  <ScissorsIcon />
                  Cut
                </MenubarItem>
                <MenubarItem>
                  <CopyIcon />
                  Copy
                </MenubarItem>
                <MenubarItem>
                  <ClipboardIcon />
                  Paste
                </MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                checked={showStatus}
                onCheckedChange={setShowStatus}
              >
                Status bar
              </MenubarCheckboxItem>
              <MenubarCheckboxItem defaultChecked>Toolbar</MenubarCheckboxItem>
              <MenubarCheckboxItem disabled>Minimap</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarLabel inset>Appearance</MenubarLabel>
              <MenubarRadioGroup value={theme} onValueChange={setTheme}>
                <MenubarRadioItem value="light">Light</MenubarRadioItem>
                <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
                <MenubarRadioItem value="system">System</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Window</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Minimize</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Docs</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Example>
      <Example title="Open from state">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open File
        </Button>
        <Menubar>
          <MenubarMenu open={isOpen} onOpenChange={setIsOpen}>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup defaultValue="draft">
                <MenubarRadioItem value="draft">Draft</MenubarRadioItem>
                <MenubarRadioItem value="final" closeOnClick>
                  Final
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Example>
    </ExampleWrapper>
  )
}

export { MenubarExample }
