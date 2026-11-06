import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"

function DropdownMenuExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showStatus, setShowStatus] = React.useState(true)
  const [position, setPosition] = React.useState("bottom")
  return (
    <ExampleWrapper>
      <Example title="Groups, labels, icons and shortcuts">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Open
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>gabs@fabricator.dev</DropdownMenuLabel>
              <DropdownMenuItem>
                <UserIcon />
                Profile
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem inset>Support</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
      <Example title="Checkbox items">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showStatus}
              onCheckedChange={setShowStatus}
            >
              Status bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem defaultChecked>
              Activity bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem disabled>Panel</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem closeOnClick>
              Closes when pressed
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
      <Example title="Radio group">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Panel: {position}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Panel position</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={position}
              onValueChange={setPosition}
            >
              <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">
                Bottom
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right" disabled>
                Right
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
      <Example title="Submenus expand inline">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Team
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                  <DropdownMenuItem>Message</DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      More options
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>Slack</DropdownMenuItem>
                        <DropdownMenuItem>Webhook</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>New team</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
      <Example title="Sides and alignment" className="flex-row flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Above, at the end
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end">
            <DropdownMenuItem>First</DropdownMenuItem>
            <DropdownMenuItem>Second</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
      <Example title="Long menus scroll">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Every option
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Array.from({ length: 40 }, (_, index) => (
              <DropdownMenuItem key={index}>
                Option {index + 1}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
      <Example title="Controlled">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open from state
        </Button>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger render={<Button variant="secondary" />}>
            Anchor
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Closes through onOpenChange</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Example>
    </ExampleWrapper>
  )
}

export { DropdownMenuExample }
