import * as React from "react"
import {
  BellIcon,
  CheckIcon,
  GlobeIcon,
  HomeIcon,
  KeyboardIcon,
  LinkIcon,
  LockIcon,
  MenuIcon,
  MessageCircleIcon,
  PaintbrushIcon,
  SettingsIcon,
  VideoIcon,
} from "@fabricator-ui/icons-react-native"
import { ScrollView, useWindowDimensions, View } from "react-native"
import { SafeAreaInsetsContext } from "react-native-safe-area-context"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/native/ui/breadcrumb"
import { Button } from "@/registry/native/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/native/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/registry/native/ui/sidebar"

const noop = () => {}

// The dialog isn't the window, so it has no safe areas of its own.
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

const BODY_HEIGHT = 480
const BODY_HEIGHT_FRACTION = 0.8

const data = {
  nav: [
    { name: "Notifications", icon: BellIcon },
    { name: "Navigation", icon: MenuIcon },
    { name: "Home", icon: HomeIcon },
    { name: "Appearance", icon: PaintbrushIcon },
    { name: "Messages & media", icon: MessageCircleIcon },
    { name: "Language & region", icon: GlobeIcon },
    { name: "Accessibility", icon: KeyboardIcon },
    { name: "Mark as read", icon: CheckIcon },
    { name: "Audio & video", icon: VideoIcon },
    { name: "Connected accounts", icon: LinkIcon },
    { name: "Privacy & visibility", icon: LockIcon },
    { name: "Advanced", icon: SettingsIcon },
  ],
}

function SettingsBody({ onNavigate }: { onNavigate: (name: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const navigate = (name: string) => {
    onNavigate(name)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <>
      {/* The website hides it on phones, leaving no way to the other pages. Here
          it slides over the dialog from a trigger in the header. */}
      <Sidebar collapsible={isMobile ? "offcanvas" : "none"}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.nav.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={item.name === "Messages & media"}
                      icon={item.icon}
                      onPress={() => navigate(item.name)}
                    >
                      {item.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <View className="min-w-0 flex-1 overflow-hidden">
        <View className="h-16 shrink-0 flex-row items-center gap-2 pr-12 pl-4">
          {isMobile ? <SidebarTrigger className="-ml-1" /> : null}
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:flex">
                <BreadcrumbLink onPress={() => onNavigate("Settings")}>
                  Settings
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem>
                <BreadcrumbPage>Messages & media</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-4"
        >
          {Array.from({ length: 10 }, (_, index) => (
            <View
              key={index}
              className="aspect-video max-w-3xl rounded-xl bg-muted/50"
            />
          ))}
        </ScrollView>
      </View>
    </>
  )
}

function Sidebar13({
  onNavigate = noop,
}: {
  onNavigate?: (name: string) => void
}) {
  const [open, setOpen] = React.useState(true)
  const { height } = useWindowDimensions()
  return (
    <View className="flex-1 items-center justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" />}>Open Dialog</DialogTrigger>
        <DialogContent className="gap-0 overflow-hidden p-0 md:max-w-[700px] lg:max-w-[800px]">
          <DialogHeader className="absolute size-0 overflow-hidden">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Customize your settings here.</DialogDescription>
          </DialogHeader>
          <SafeAreaInsetsContext value={NO_INSETS}>
            {/* A provider fills its parent, and this one has no height to give. */}
            <SidebarProvider
              className="flex-none"
              style={{
                height: Math.min(BODY_HEIGHT, height * BODY_HEIGHT_FRACTION),
              }}
            >
              <SettingsBody onNavigate={onNavigate} />
            </SidebarProvider>
          </SafeAreaInsetsContext>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export { Sidebar13 }
