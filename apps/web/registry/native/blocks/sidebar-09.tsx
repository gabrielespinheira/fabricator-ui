import * as React from "react"
import {
  ArchiveXIcon,
  BadgeCheckIcon,
  BellIcon,
  CreditCardIcon,
  FileIcon,
  InboxIcon,
  LogOutIcon,
  SendIcon,
  SparklesIcon,
  TerminalIcon,
  Trash2Icon,
} from "@fabricator-ui/icons-react-native"
import { Pressable, ScrollView, View } from "react-native"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/native/ui/breadcrumb"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/native/ui/dropdown-menu"
import { Label } from "@/registry/native/ui/label"
import { Separator } from "@/registry/native/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/registry/native/ui/sidebar"
import { Switch } from "@/registry/native/ui/switch"
import { Text, TextStyle } from "@/registry/native/ui/text"
import { UserMenu } from "@/registry/native/ui/user-menu"

const noop = () => {}

const data = {
  user: { name: "Gabs Fabricator", email: "gabs@fabricator.dev" },
  navMain: [
    { title: "Inbox", icon: InboxIcon },
    { title: "Drafts", icon: FileIcon },
    { title: "Sent", icon: SendIcon },
    { title: "Junk", icon: ArchiveXIcon },
    { title: "Trash", icon: Trash2Icon },
  ],
  mails: [
    {
      name: "William Smith",
      email: "williamsmith@example.com",
      subject: "Meeting Tomorrow",
      date: "09:34 AM",
      teaser:
        "Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates.",
    },
    {
      name: "Alice Smith",
      email: "alicesmith@example.com",
      subject: "Re: Project Update",
      date: "Yesterday",
      teaser:
        "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps.",
    },
    {
      name: "Bob Johnson",
      email: "bobjohnson@example.com",
      subject: "Weekend Plans",
      date: "2 days ago",
      teaser:
        "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?",
    },
    {
      name: "Emily Davis",
      email: "emilydavis@example.com",
      subject: "Re: Question about Budget",
      date: "2 days ago",
      teaser:
        "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?",
    },
    {
      name: "Michael Wilson",
      email: "michaelwilson@example.com",
      subject: "Important Announcement",
      date: "1 week ago",
      teaser:
        "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future.",
    },
    {
      name: "Sarah Brown",
      email: "sarahbrown@example.com",
      subject: "Re: Feedback on Proposal",
      date: "1 week ago",
      teaser:
        "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?",
    },
    {
      name: "David Lee",
      email: "davidlee@example.com",
      subject: "New Project Idea",
      date: "1 week ago",
      teaser:
        "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?",
    },
    {
      name: "Olivia Wilson",
      email: "oliviawilson@example.com",
      subject: "Vacation Plans",
      date: "1 week ago",
      teaser:
        "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave.",
    },
    {
      name: "James Martin",
      email: "jamesmartin@example.com",
      subject: "Re: Conference Registration",
      date: "1 week ago",
      teaser:
        "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end.",
    },
    {
      name: "Sophia White",
      email: "sophiawhite@example.com",
      subject: "Team Dinner",
      date: "1 week ago",
      teaser:
        "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.",
    },
  ],
}

function AppSidebar({ onNavigate }: { onNavigate: (title: string) => void }) {
  // State shows the active item here. In an app it comes from your router.
  const [activeTitle, setActiveTitle] = React.useState("Inbox")
  const [mails, setMails] = React.useState(data.mails)
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const navigate = (title: string) => {
    onNavigate(title)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <Sidebar collapsible="icon" className="overflow-hidden">
      {/* Two columns in one Sidebar, where the website nests two more. Here each
          would report itself to the provider over this one and add the safe areas
          again, and the classes that lay them out side by side don't exist. */}
      <View className="min-h-0 flex-1 flex-row">
        <View className="w-(--density-48) shrink-0 border-r border-border">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  accessibilityLabel="Acme Inc, Enterprise"
                  className="h-(--density-32) justify-center pl-0"
                  style={{ paddingRight: 0 }}
                  onPress={() => navigate("Acme Inc")}
                >
                  <TextStyle className="text-primary-foreground">
                    <View className="size-(--density-32) items-center justify-center rounded-lg bg-primary">
                      <TerminalIcon />
                    </View>
                  </TextStyle>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {data.navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        accessibilityLabel={item.title}
                        icon={item.icon}
                        isActive={activeTitle === item.title}
                        className="justify-center"
                        onPress={() => {
                          setActiveTitle(item.title)
                          setMails(
                            [...data.mails]
                              .sort(() => Math.random() - 0.5)
                              .slice(
                                0,
                                Math.max(5, Math.floor(Math.random() * 10) + 1)
                              )
                          )
                          setOpen(true)
                        }}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="items-center">
            <UserMenu variant="mark" align="start" user={data.user}>
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <SparklesIcon />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <BadgeCheckIcon />
                  Account
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
                <DropdownMenuItem>
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </UserMenu>
          </SidebarFooter>
        </View>
        <View className="min-w-0 flex-1">
          <SidebarHeader className="gap-3.5 border-b border-border p-4">
            <View className="flex-row items-center justify-between gap-2">
              <Text
                numberOfLines={1}
                className="min-w-0 shrink text-(length:--density-text-16) font-medium text-foreground"
              >
                {activeTitle}
              </Text>
              <View className="flex-row items-center gap-2">
                <Label>Unreads</Label>
                <Switch accessibilityLabel="Unreads" />
              </View>
            </View>
            <SidebarInput
              accessibilityLabel="Search"
              placeholder="Type to search..."
              returnKeyType="search"
            />
          </SidebarHeader>
          <SidebarContent keyboardShouldPersistTaps="handled">
            {mails.map((mail) => (
              <Pressable
                key={mail.email}
                role="link"
                className="gap-2 border-b border-border p-4 active:bg-hover"
                onPress={() => navigate(mail.subject)}
              >
                <View className="flex-row items-center gap-2">
                  <Text numberOfLines={1} className="min-w-0 shrink">
                    {mail.name}
                  </Text>
                  <Text className="ml-auto text-(length:--density-text-12)">
                    {mail.date}
                  </Text>
                </View>
                <Text numberOfLines={1} className="font-medium">
                  {mail.subject}
                </Text>
                <Text
                  numberOfLines={2}
                  className="text-(length:--density-text-12)"
                >
                  {mail.teaser}
                </Text>
              </Pressable>
            ))}
          </SidebarContent>
        </View>
      </View>
    </Sidebar>
  )
}

function Sidebar09({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  return (
    <SidebarProvider width="350px" widthMobile="350px">
      <AppSidebar onNavigate={onNavigate} />
      <SidebarInset>
        <View className="shrink-0 flex-row items-center gap-2 border-b border-border bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 h-4 data-[orientation=vertical]:self-center"
          />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:flex">
                <BreadcrumbLink onPress={() => onNavigate("All Inboxes")}>
                  All Inboxes
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem>
                <BreadcrumbPage>Inbox</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pt-4 pb-safe-offset-4"
        >
          {Array.from({ length: 24 }, (_, index) => (
            <View key={index} className="h-12 rounded-lg bg-muted/50" />
          ))}
        </ScrollView>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { Sidebar09 }
