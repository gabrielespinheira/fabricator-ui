"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import { AppShellPageTitle } from "@/styles/base-fabricator/ui/app-shell"

import { playgroundParsers } from "../_lib/options"
import { SetupCards } from "./options-card"
import { DOCUMENTS, getNavGroups, INITIAL_TABS } from "./playground-data"
import { PlaceholderPage, ShellDemo } from "./shell-demo"

export function AppShellPlayground() {
  const [options, setOptions] = useQueryStates(playgroundParsers)
  const groups = React.useMemo(
    () => getNavGroups({ reorderable: options.reorder }),
    [options.reorder]
  )

  return (
    <ShellDemo
      options={options}
      groups={groups}
      documents={DOCUMENTS}
      initialTabs={INITIAL_TABS}
      renderPage={({ isHome, title }) =>
        isHome ? (
          <div className="flex flex-col gap-6 pb-28">
            <AppShellPageTitle>{title}</AppShellPageTitle>
            <p className="text-muted-foreground">
              Set up the shell and its look here. Press F6 to move between the
              sidebar, the page and the panel.
            </p>
            <SetupCards options={options} setOptions={setOptions} />
          </div>
        ) : (
          <PlaceholderPage title={title}>
            The shell&apos;s options and settings are on Home. Press F6 to move
            between the sidebar, the page and the panel.
          </PlaceholderPage>
        )
      }
    />
  )
}
