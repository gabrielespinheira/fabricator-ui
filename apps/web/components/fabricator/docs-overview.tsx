"use client"

import type * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/lib/config"
import type { DocsOverviewGroup } from "@/lib/docs-overview"
import { ArrowRightIcon } from "@/lib/site-icons"
import { Icons } from "@/components/icons"
import { AppShellPageTitle } from "@/styles/base-fabricator/ui/app-shell"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/styles/base-fabricator/ui/item"
import { SettingsCard } from "@/app/(view)/app-shell/_components/options-card"

type Icon = React.ComponentType<{ className?: string }>

/** The top of /docs: what the library is, where its parts live, its look. */
export function DocsOverview({
  groups,
  pageCount,
  latestRelease,
  getHref,
}: {
  groups: DocsOverviewGroup<Icon | undefined>[]
  pageCount: number
  latestRelease?: { url: string; title: string }
  /** Keeps the shell's layout choices in the URL while browsing. */
  getHref: (href: string) => string
}) {
  return (
    <div className="flex flex-col gap-10 pb-10">
      <header className="flex flex-col items-start gap-6">
        <div className="flex flex-col items-start gap-3">
          {latestRelease && (
            <Badge
              variant="secondary"
              render={<Link href={getHref(latestRelease.url)} />}
            >
              {latestRelease.title} is out
              <ArrowRightIcon />
            </Badge>
          )}
          <div className="flex flex-col gap-1">
            <AppShellPageTitle>Fabricator UI</AppShellPageTitle>
            <p className="max-w-2xl text-[15px] text-pretty text-muted-foreground">
              Accessible components for React, React Native and desktop. The CLI
              copies their source into your project, so every file is yours to
              read and change.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href={getHref("/docs/installation")} />}
          >
            Get started
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <Icons.gitHub data-icon="inline-start" />
            GitHub
          </Button>
        </div>
      </header>
      <section
        aria-labelledby="docs-overview-components"
        className="flex flex-col gap-4"
      >
        <SectionHeading id="docs-overview-components" title="Components">
          {pageCount} pages in {groups.length} groups, each for the web and
          React Native.
        </SectionHeading>
        <div className="@container">
          <div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
            {groups.map((group) => (
              <Item
                key={group.id}
                className="items-start rounded-xl bg-card shadow-surface-2"
                render={<Link href={getHref(group.href)} />}
              >
                {group.icon && (
                  <ItemMedia variant="icon">
                    <group.icon />
                  </ItemMedia>
                )}
                <ItemContent>
                  <ItemTitle>
                    {group.label}
                    <span className="font-normal text-muted-foreground tabular-nums">
                      {group.count}
                    </span>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {group.description}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </div>
        </div>
      </section>
      <section
        aria-labelledby="docs-overview-look"
        className="flex flex-col gap-4"
      >
        <SectionHeading id="docs-overview-look" title="Make it yours">
          Change the look and every page follows. The command sets up a project
          with the same choices.
        </SectionHeading>
        <SettingsCard />
      </section>
    </div>
  )
}

function SectionHeading({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-base font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-[14px] text-pretty text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
