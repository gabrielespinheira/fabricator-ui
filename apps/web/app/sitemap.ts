import type { MetadataRoute } from "next"

import { registryCategories } from "@/lib/categories"
import { siteConfig } from "@/lib/config"
import { source } from "@/lib/source"

const staticRoutes = ["/", "/blocks"]

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [
    ...staticRoutes,
    ...source.getPages().map((page) => page.url),
    ...registryCategories.map((category) => `/blocks/${category.slug}`),
  ]

  return [...new Set(urls)].map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
  }))
}
