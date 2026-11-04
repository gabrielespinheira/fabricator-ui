import * as React from "react"
import {
  BadgeCheckIcon,
  BellIcon,
  CheckIcon,
  CreditCardIcon,
  LogOutIcon,
  PlusIcon,
  SparklesIcon,
} from "@fabricator-ui/icons-react-native"
import { ScrollView, View } from "react-native"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/registry/native/ui/breadcrumb"
import { Calendar } from "@/registry/native/ui/calendar"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/native/ui/dropdown-menu"
import { Separator } from "@/registry/native/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/registry/native/ui/sidebar"
import { TextStyle } from "@/registry/native/ui/text"
import { UserMenu } from "@/registry/native/ui/user-menu"

const data = {
  user: { name: "Gabs Fabricator", email: "gabs@fabricator.dev" },
  calendars: [
    { name: "My Calendars", items: ["Personal", "Work", "Family"] },
    { name: "Favorites", items: ["Holidays", "Birthdays"] },
    { name: "Other", items: ["Travel", "Reminders", "Deadlines"] },
  ],
}

function DatePicker() {
  const [date, setDate] = React.useState<Date | undefined>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 12)
  )
  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(next) => setDate(next)}
          captionLayout="dropdown"
          className="w-full bg-transparent"
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function CalendarBox({ isActive }: { isActive: boolean }) {
  return (
    <TextStyle className="text-primary-foreground">
      <View
        data-active={isActive}
        className="size-(--density-icon-16) shrink-0 items-center justify-center rounded-sm border border-border data-[active=true]:border-primary data-[active=true]:bg-primary"
      >
        {isActive ? <CheckIcon size={12} /> : null}
      </View>
    </TextStyle>
  )
}

function Calendars() {
  return data.calendars.map((calendar, index) => (
    <React.Fragment key={calendar.name}>
      <SidebarGroup collapsible defaultOpen={index === 0}>
        <SidebarGroupLabel>{calendar.name}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {calendar.items.map((item, itemIndex) => (
              <SidebarMenuItem key={item}>
                <SidebarMenuButton
                  icon={<CalendarBox isActive={itemIndex < 2} />}
                  accessibilityState={{ checked: itemIndex < 2 }}
                >
                  {item}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
    </React.Fragment>
  ))
}

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border">
        <UserMenu align="start" user={data.user}>
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
      </SidebarHeader>
      <SidebarContent>
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <Calendars />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton icon={PlusIcon}>New Calendar</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function Sidebar12() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <View className="h-16 shrink-0 flex-row items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 h-4 data-[orientation=vertical]:self-center"
          />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>October 2024</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pt-4 pb-safe-offset-4 md:flex-row md:flex-wrap md:justify-between"
        >
          {Array.from({ length: 20 }, (_, index) => (
            <View
              key={index}
              className="aspect-square rounded-xl bg-muted/50 md:w-[18%]"
            />
          ))}
        </ScrollView>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { Sidebar12 }
