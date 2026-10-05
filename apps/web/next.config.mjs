import { existsSync, readdirSync, readFileSync } from "fs"
import path from "path"
import { createMDX } from "fumadocs-mdx/next"

const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/gabrielespinheira/fabricator-ui/refs/heads/main"

// The generated styles under styles/ are gitignored (see styles/README.md),
// but the per-style shards in registry/__components__/ (tracked in git)
// dynamically import from them. If a tracked shard references styles that were
// never generated locally (e.g. after pulling a commit that adds a new base),
// Turbopack hits hundreds of module-not-found errors compiling /docs and the
// dev server grinds to a halt. Fail fast with instructions instead.
if (process.env.NODE_ENV === "development") {
  const componentsDir = path.join(process.cwd(), "registry/__components__")
  const referencedStyles = existsSync(componentsDir)
    ? new Set(
        readdirSync(componentsDir)
          .filter((file) => file.endsWith(".tsx"))
          .flatMap((file) => [
            ...readFileSync(path.join(componentsDir, file), "utf-8").matchAll(
              /@\/styles\/([\w-]+)\//g
            ),
          ])
          .map((match) => match[1])
      )
    : new Set(["base-nova"])
  const missingStyles = [...referencedStyles].filter(
    (style) => !existsSync(path.join(process.cwd(), "styles", style, "ui"))
  )

  if (missingStyles.length > 0) {
    throw new Error(
      `Generated styles are missing or stale (${missingStyles.join(", ")}). ` +
        "Run `bun run registry:build --style all` in apps/web once, then restart the dev server."
    )
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Rewrite barrel imports to deep imports so a single icon doesn't pull the
    // whole package into the module graph. Next already optimizes lucide-react,
    // @tabler/icons-react, date-fns and lodash-es by default; these are the
    // heavy icon packages this app uses that are NOT on that default list.
    optimizePackageImports: [
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "@phosphor-icons/react",
      "@remixicon/react",
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./registry/**/*", "./styles/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
  redirects() {
    return [
      // Form redirects to /docs/forms.
      {
        source: "/docs/components/form",
        destination: "/docs/forms",
        permanent: true,
      },
      {
        source: "/docs/components/radix/form",
        destination: "/docs/forms",
        permanent: true,
      },
      {
        source: "/docs/components/base/form",
        destination: "/docs/forms",
        permanent: true,
      },
      {
        source: "/docs/components/aria/form",
        destination: "/docs/forms",
        permanent: true,
      },
      // Base UI Sonner redirects to Toast.
      {
        source: "/docs/components/base/sonner",
        destination: "/docs/components/base/toast",
        permanent: true,
      },
      {
        source: "/docs/components/base/sonner.md",
        destination: "/docs/components/base/toast.md",
        permanent: true,
      },
      // Component redirects (default to base).
      {
        source: "/docs/components/:name((?!radix|base|aria|form)[^/]+)",
        destination: "/docs/components/base/:name",
        permanent: false,
      },
      {
        source: "/docs/components/:name((?!radix|base|aria|form)[^/]+).md",
        destination: "/docs/components/base/:name.md",
        permanent: false,
      },
      // Other redirects.
      {
        source: "/components",
        destination: "/docs/components",
        permanent: true,
      },
      {
        source: "/docs/primitives/:path*",
        destination: "/docs/components/:path*",
        permanent: true,
      },
      {
        source: "/sidebar",
        destination: "/docs/components/sidebar",
        permanent: true,
      },
      {
        source: "/charts",
        destination: "/charts/area",
        permanent: true,
      },
      {
        source: "/view/styles/:style/:name",
        destination: "/view/:name",
        permanent: true,
      },
      {
        source: "/docs/:path*.mdx",
        destination: "/docs/:path*.md",
        permanent: true,
      },
      {
        source: "/mcp",
        destination: "/docs/mcp",
        permanent: false,
      },
      {
        source: "/new",
        destination: "/docs/new",
        permanent: false,
      },
      {
        source: "/cli",
        destination: "/docs/cli",
        permanent: true,
      },
      {
        source: "/themes",
        destination: "/create",
        permanent: true,
      },
      {
        source: "/code/:path*",
        destination: `${GITHUB_RAW_URL}/:path*`,
        permanent: false,
      },
    ]
  },
  headers() {
    return [
      {
        source: "/r/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ]
  },
  rewrites() {
    return [
      {
        source: "/docs/:path*.md",
        destination: "/llm/:path*",
      },
      {
        source: "/init.md",
        destination: "/init/md",
      },
      // Registry: Fabricator mode. Serves the Fabricator style compiled for
      // the base in the project's style id (e.g. base-nova -> base-fabricator).
      {
        source: "/r/fabricator/:base(base|radix|aria)-:style/:name",
        destination: "/r/styles/:base-fabricator/:name",
      },
      {
        source: "/r/fabricator/:style(new-york|new-york-v4|default)/:name",
        destination: "/r/styles/radix-fabricator/:name",
      },
      // Registry: blend mode. Serves items compiled in the project's own
      // style, e.g. /r/base-nova/button.json.
      {
        source: "/r/:style((?:base|radix|aria)-[a-z]+|new-york-v4)/:name",
        destination: "/r/styles/:style/:name",
      },
      {
        source: "/r/new-york/:name",
        destination: "/r/styles/new-york-v4/:name",
      },
    ]
  },
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
