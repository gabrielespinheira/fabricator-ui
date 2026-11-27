"use client"

import * as React from "react"
import { BellIcon, HomeIcon, SearchIcon, UserIcon } from "lucide-react"

import {
  BottomNav,
  BottomNavItem,
} from "@/styles/aria-fabricator/ui/bottom-nav"

const TABS = [
  { label: "Home", icon: <HomeIcon /> },
  { label: "Search", icon: <SearchIcon /> },
  { label: "Activity", icon: <BellIcon /> },
  { label: "Profile", icon: <UserIcon /> },
]

export function BottomNavDemo() {
  const [active, setActive] = React.useState("Home")
  return (
    <BottomNav aria-label="Main">
      {TABS.map((tab) => (
        <BottomNavItem
          key={tab.label}
          label={tab.label}
          icon={tab.icon}
          active={active === tab.label}
          onClick={() => setActive(tab.label)}
        />
      ))}
    </BottomNav>
  )
}
