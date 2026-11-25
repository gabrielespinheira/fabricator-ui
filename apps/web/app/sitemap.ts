import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/config"
import { source } from "@/lib/source"
import { BLOCKS } from "@/app/(app)/blocks/_lib/block-list"

const staticRoutes = ["/", "/app-shell", "/blocks", "/icons"]

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [
    ...staticRoutes,
    ...BLOCKS.map(({ name }) => `/blocks/${name}`),
    ...source.getPages().map((page) => page.url),
  ]

  return [...new Set(urls)].map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
  }))
}
