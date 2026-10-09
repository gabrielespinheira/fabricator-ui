"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "cn"
import { useDocsSearch } from "fumadocs-core/search/client"
import {
  ArrowRightIcon,
  CircleDashedIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  SquareDashedIcon,
} from "lucide-react"

import { trackEvent } from "@/lib/events"
import { showMcpDocs } from "@/lib/flags"
import { getCurrentBase, getPagesFromFolder } from "@/lib/page-tree"
import { type source } from "@/lib/source"
import { useConfig } from "@/hooks/use-config"
import { copyToClipboardWithMeta } from "@/components/copy-button"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/styles/base-fabricator/ui/command"
import { Kbd, KbdGroup } from "@/styles/base-fabricator/ui/kbd"
import { Separator } from "@/styles/base-fabricator/ui/separator"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"

type Block = { name: string; description: string; categories: string[] }

/** What the highlighted item does: drives the footer hints and ⌘C. */
type ItemAction = {
  kind: "page" | "component" | "block"
  copy?: string
}

const PAGE_ACTION: ItemAction = { kind: "page" }

const ACTION_LABELS: Record<ItemAction["kind"], string> = {
  page: "Go to page",
  component: "Go to page",
  block: "Open block",
}

export function CommandMenu({
  tree,
  blocks,
  navItems,
  trigger = "default",
}: {
  tree: typeof source.pageTree
  blocks?: Block[]
  navItems?: { href: string; label: string }[]
  /** pill: the top bar's centred search. sidebar: the docs sidebar row. */
  trigger?: "default" | "pill" | "sidebar"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [config] = useConfig()
  const currentBase = getCurrentBase(pathname)
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [renderDelayedGroups, setRenderDelayedGroups] = React.useState(false)
  const [highlighted, setHighlighted] = React.useState("")

  const { search, setSearch, query } = useDocsSearch({
    type: "fetch",
  })
  const runner = getRunner(config.packageManager || "bun")

  // Track search queries with debouncing to avoid excessive tracking.
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)
  const lastTrackedQueryRef = React.useRef<string>("")

  const trackSearchQuery = React.useCallback((query: string) => {
    const trimmedQuery = query.trim()

    // Only track if the query is different from the last tracked query and has content.
    if (trimmedQuery && trimmedQuery !== lastTrackedQueryRef.current) {
      lastTrackedQueryRef.current = trimmedQuery
      trackEvent({
        name: "search_query",
        properties: {
          query: trimmedQuery,
          query_length: trimmedQuery.length,
        },
      })
    }
  }, [])

  const handleSearchChange = React.useCallback(
    (value: string) => {
      // Clear existing timeout.
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Set new timeout to debounce both search and tracking.
      searchTimeoutRef.current = setTimeout(() => {
        React.startTransition(() => {
          setSearch(value)
          trackSearchQuery(value)
        })
      }, 500)
    },
    [setSearch, trackSearchQuery]
  )

  // Render the long groups one frame after opening, so the dialog opens fast.
  React.useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => {
        setRenderDelayedGroups(true)
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }

    setRenderDelayedGroups(false)
    setHighlighted("")
  }, [open])

  // Cleanup timeout on unmount.
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const commandFilter = React.useCallback(
    (value: string, searchValue: string, keywords?: string[]) => {
      const extendValue = value + " " + (keywords?.join(" ") || "")
      if (extendValue.toLowerCase().includes(searchValue.toLowerCase())) {
        return 1
      }
      return 0
    },
    []
  )

  const pageGroups = React.useMemo(
    () =>
      tree.children.flatMap((group) => {
        if (group.type !== "folder") {
          return []
        }

        const pages = getPagesFromFolder(group, currentBase).filter(
          (item) => showMcpDocs || !item.url.includes("/mcp")
        )

        return pages.length > 0 ? [{ group, pages }] : []
      }),
    [tree.children, currentBase]
  )

  // cmdk reports the highlighted item by its value; this maps each value to
  // what Enter and ⌘C do for it. Search results fall back to "page".
  const actions = React.useMemo(() => {
    const map = new Map<string, ItemAction>()

    navItems?.forEach((item) => {
      map.set(navValue(item.label), { kind: "page" })
    })
    pageGroups.forEach(({ group, pages }) => {
      pages.forEach((item) => {
        map.set(
          pageValue(group.name, item.name),
          isComponentPage(item.url)
            ? {
                kind: "component",
                copy: `${runner} fabricator-ui@latest add ${item.url.split("/").pop()}`,
              }
            : { kind: "page" }
        )
      })
    })
    blocks?.forEach((block) => {
      map.set(block.name, {
        kind: "block",
        copy: `${runner} fabricator-ui@latest add ${block.name}`,
      })
    })

    return map
  }, [navItems, pageGroups, blocks, runner])

  const action = actions.get(highlighted) ?? PAGE_ACTION

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  const navItemsSection = React.useMemo(() => {
    if (!navItems || navItems.length === 0) {
      return null
    }

    return (
      <CommandGroup heading="Pages">
        {navItems.map((item) => (
          <CommandItem
            key={item.href}
            value={navValue(item.label)}
            keywords={["nav", "navigation", item.label.toLowerCase()]}
            onSelect={() => {
              runCommand(() => router.push(item.href))
            }}
          >
            <ArrowRightIcon />
            {item.label}
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }, [navItems, runCommand, router])

  const pageGroupsSection = React.useMemo(() => {
    return pageGroups.map(({ group, pages }) => (
      <CommandGroup key={group.$id} heading={group.name}>
        {pages.map((item) => {
          const isComponent = isComponentPage(item.url)

          return (
            <CommandItem
              key={item.url}
              value={pageValue(group.name, item.name)}
              keywords={isComponent ? ["component"] : undefined}
              onSelect={() => {
                runCommand(() => router.push(item.url))
              }}
            >
              {isComponent ? <CircleDashedIcon /> : <ArrowRightIcon />}
              {item.name}
            </CommandItem>
          )
        })}
      </CommandGroup>
    ))
  }, [pageGroups, runCommand, router])

  const blocksSection = React.useMemo(() => {
    if (!blocks || blocks.length === 0) {
      return null
    }

    return (
      <CommandGroup heading="Blocks">
        {blocks.map((block) => (
          <CommandItem
            key={block.name}
            value={block.name}
            keywords={[
              "block",
              block.name,
              block.description,
              ...block.categories,
            ]}
            onSelect={() => {
              runCommand(() =>
                router.push(`/blocks/${block.categories[0]}#${block.name}`)
              )
            }}
          >
            <SquareDashedIcon />
            <span className="truncate">{block.description}</span>
            <CommandShortcut className="font-mono">
              {block.name}
            </CommandShortcut>
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }, [blocks, runCommand, router])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }

        // Pages mount one menu per breakpoint; only the visible one opens.
        if (!open && !triggerRef.current?.checkVisibility()) {
          return
        }

        e.preventDefault()
        setOpen((open) => !open)
      }

      // ⌘C copies the highlighted item's payload, unless the reader is
      // copying selected text.
      if (
        open &&
        action.copy &&
        e.key === "c" &&
        (e.metaKey || e.ctrlKey) &&
        !window.getSelection()?.toString()
      ) {
        e.preventDefault()
        const payload = action.copy
        runCommand(() =>
          copyToClipboardWithMeta(payload, {
            name: "copy_npm_command",
            properties: {
              command: payload,
              pm: config.packageManager || "bun",
            },
          })
        )
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, action, runCommand, config.packageManager])

  return (
    <>
      {trigger === "default" ? (
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground md:w-48 lg:w-40 xl:w-64"
          ref={triggerRef}
          onClick={() => setOpen(true)}
        >
          <span className="hidden xl:inline-flex">Search documentation...</span>
          <span className="inline-flex xl:hidden">Search...</span>
        </Button>
      ) : (
        <button
          type="button"
          data-trigger={trigger}
          className={cn(
            "group/search flex items-center gap-2.5 text-muted-foreground outline-none select-none focus-visible:ring-1 focus-visible:ring-focus-ring",
            trigger === "pill" &&
              "h-12 w-60 rounded-full bg-muted px-4 text-[15px] transition-colors duration-moderate ease-spring hover:bg-active",
            trigger === "sidebar" &&
              "h-8 w-full rounded-lg px-2 text-[13px] transition-colors duration-fast ease-spring hover:bg-hover hover:text-foreground"
          )}
          ref={triggerRef}
          onClick={() => setOpen(true)}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "shrink-0",
              trigger === "pill" ? "size-4.5" : "size-3.5"
            )}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="flex-1 text-start">Search</span>
          <kbd className="pointer-events-none rounded-md bg-foreground/8 px-1.5 font-sans text-[11px] leading-5 font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search documentation"
        description="Search pages, components, blocks, styles and colours."
        className="sm:max-w-xl"
      >
        <Command
          filter={commandFilter}
          value={highlighted}
          onValueChange={setHighlighted}
        >
          <div className="relative">
            <CommandInput
              placeholder="Search documentation..."
              onValueChange={handleSearchChange}
            />
            {query.isLoading && (
              <Spinner className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
          </div>
          <CommandList className="max-h-96 min-h-80">
            <CommandEmpty>
              {query.isLoading ? "Searching..." : "No results found."}
            </CommandEmpty>
            {navItemsSection}
            {renderDelayedGroups ? (
              <>
                {pageGroupsSection}
                {blocksSection}
                <SearchResults
                  setOpen={setOpen}
                  query={query}
                  search={search}
                />
              </>
            ) : null}
          </CommandList>
          <div className="flex h-10 items-center gap-3 border-t border-border/60 px-3 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Kbd>
                <CornerDownLeftIcon />
              </Kbd>
              {ACTION_LABELS[action.kind]}
            </div>
            {action.copy && (
              <>
                <Separator
                  orientation="vertical"
                  className="h-4 data-vertical:self-center"
                />
                <div className="flex min-w-0 items-center gap-2">
                  <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>C</Kbd>
                  </KbdGroup>
                  <span className="truncate">{action.copy}</span>
                </div>
              </>
            )}
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}

type Query = Awaited<ReturnType<typeof useDocsSearch>>["query"]

function SearchResults({
  setOpen,
  query,
  search,
}: {
  setOpen: (open: boolean) => void
  query: Query
  search: string
}) {
  const router = useRouter()

  const uniqueResults = React.useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) {
      return []
    }

    return query.data.filter(
      (item, index, self) =>
        !(
          item.type === "text" &&
          stripMarks(item.content).trim().split(/\s+/).length <= 1
        ) && index === self.findIndex((t) => t.content === item.content)
    )
  }, [query.data])

  if (!search.trim()) {
    return null
  }

  if (!query.data || query.data === "empty") {
    return null
  }

  if (query.data && uniqueResults.length === 0) {
    return null
  }

  return (
    <CommandGroup heading="Search Results">
      {uniqueResults.map((item) => {
        const text = stripMarks(item.content)

        return (
          <CommandItem
            key={item.id}
            data-type={item.type}
            onSelect={() => {
              router.push(item.url)
              setOpen(false)
            }}
            keywords={[text]}
            value={`${text} ${item.type}`}
          >
            <FileTextIcon />
            <span className="line-clamp-1">
              <Highlighted content={item.content} />
            </span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

// Fumadocs marks query matches in `content` with <mark> tags.
function Highlighted({ content }: { content: string }) {
  return content.split(/(<mark>.*?<\/mark>)/g).map((part, index) =>
    part.startsWith("<mark>") ? (
      <mark key={index} className="bg-transparent text-foreground">
        {stripMarks(part)}
      </mark>
    ) : (
      part
    )
  )
}

function stripMarks(content: string) {
  return content.replace(/<\/?mark>/g, "")
}

function navValue(label: string) {
  return `Navigation ${label}`
}

function pageValue(group: React.ReactNode, name: React.ReactNode) {
  return name?.toString() ? `${group} ${name}` : ""
}

function isComponentPage(url: string) {
  return url.includes("/components/")
}

function getRunner(packageManager: string) {
  switch (packageManager) {
    case "pnpm":
      return "pnpm dlx"
    case "yarn":
      return "yarn dlx"
    case "bun":
      return "bunx --bun"
    default:
      return "npx"
  }
}
