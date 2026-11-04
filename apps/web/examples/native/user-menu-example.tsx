import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  UserIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/registry/native/ui/dropdown-menu"
import { SidebarProvider } from "@/registry/native/ui/sidebar"
import { UserMenu } from "@/registry/native/ui/user-menu"

const USER = { name: "Gabs Fabricator", email: "gabs@fabricator.dev" }

function Items() {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <UserIcon />
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCardIcon />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <BellIcon />
          Notifications
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem variant="destructive">
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

function UserMenuExample() {
  return (
    <ExampleWrapper>
      <Example title="A sidebar row: a sheet on phones, a menu on tablets">
        <SidebarProvider className="w-full flex-none flex-col">
          <View className="w-full">
            <UserMenu user={USER}>
              <Items />
            </UserMenu>
          </View>
        </SidebarProvider>
      </Example>
      <Example title="The mark: the avatar alone">
        <SidebarProvider className="flex-none flex-col">
          <UserMenu user={USER} variant="mark" side="bottom" align="start">
            <Items />
          </UserMenu>
        </SidebarProvider>
      </Example>
      <Example title="With a photo, and no items">
        <SidebarProvider className="w-full flex-none flex-col">
          <View className="w-full">
            <UserMenu
              user={{
                ...USER,
                avatarUrl: "https://fabricator-ui.vercel.app/avatars/01.png",
              }}
            />
          </View>
        </SidebarProvider>
      </Example>
      <Example title="Without an email">
        <SidebarProvider className="w-full flex-none flex-col">
          <View className="w-full">
            <UserMenu user={{ name: "Gabs" }} />
          </View>
        </SidebarProvider>
      </Example>
    </ExampleWrapper>
  )
}

export { UserMenuExample }
