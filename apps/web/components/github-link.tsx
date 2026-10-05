import * as React from "react"
import Link from "next/link"

import { githubRepo, siteConfig } from "@/lib/config"
import { Icons } from "@/components/icons"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Skeleton } from "@/registry/new-york-v4/ui/skeleton"

export function GitHubLink() {
  return (
    <Button asChild size="sm" variant="ghost" className="h-8 shadow-none">
      <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
        <Icons.gitHub />
        <span className="sr-only">GitHub</span>
        <React.Suspense fallback={<Skeleton className="h-4 w-[42px]" />}>
          <StarsCount />
        </React.Suspense>
      </Link>
    </Button>
  )
}

async function getStarsCount() {
  try {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}`, {
      next: { revalidate: 86400 },
    })

    // The repository may not exist yet (404) or the API may be rate limited.
    if (!response.ok) {
      return null
    }

    const json = (await response.json()) as { stargazers_count?: unknown }
    return typeof json.stargazers_count === "number"
      ? json.stargazers_count
      : null
  } catch {
    return null
  }
}

export async function StarsCount() {
  const count = await getStarsCount()

  if (count === null) {
    return null
  }

  const formattedCount =
    count >= 1000 ? `${Math.round(count / 1000)}k` : count.toLocaleString()

  return (
    <span className="w-fit text-xs text-muted-foreground tabular-nums">
      {formattedCount}
    </span>
  )
}
