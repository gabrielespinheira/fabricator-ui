import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { SharpHawWordmark } from "@/components/fabricator/sharphaw-wordmark"
import { Icons } from "@/components/icons"

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/icons", label: "Icons" },
  { href: "/docs/changelog", label: "Changelog" },
  { href: "/llms.txt", label: "llms.txt" },
]

/** The footer for the homepage and the full-width pages. */
export function SiteFooter() {
  return (
    <footer className="group-has-data-[slot=docs-shell]/layout:hidden">
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-6 text-[13px] text-muted-foreground sm:grid-cols-3 sm:px-5">
        <p className="text-center sm:text-start">
          <span className="text-foreground">Open source</span> under the MIT
          License
        </p>
        <nav className="flex items-center justify-center gap-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm transition-colors duration-feedback ease-feedback outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm transition-colors duration-feedback ease-feedback outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            <Icons.gitHub className="size-4" />
            <span className="sr-only">GitHub</span>
          </Link>
        </nav>
        <p className="flex items-center justify-center gap-2 sm:justify-end">
          © {new Date().getFullYear()}
          <span aria-hidden>·</span>
          <a
            href="https://sharphaw.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-sm transition-colors duration-feedback ease-feedback outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            Built by
            <SharpHawWordmark className="h-5 w-auto" />
            <span className="sr-only">SharpHaw (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </footer>
  )
}
