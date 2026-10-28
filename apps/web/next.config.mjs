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
    // `next build` was killed by the out-of-memory killer on a standard Vercel
    // build machine (4 cores, 8 GB): compiling ~12k modules took more than
    // 8 GB, the process died with no message, and the deployment sat in
    // "Building".
    // Next 16.3 turned on the Turbopack build cache by default and builds
    // source maps for every chunk; neither is needed for a deploy. Running the
    // MDX/PostCSS loaders as worker threads instead of child processes saves
    // another ~0.5 GB. Together with the leaner component shards from
    // `scripts/build-registry.mts`, the build fits in 7 GB (checked in a
    // container limited to 4 CPUs).
    // Worker threads are for builds only: in `next dev` a worker that first ran
    // the MDX loaders later receives the PostCSS job for app/globals.css and
    // fails with "Cannot read properties of undefined (reading 'map')".
    turbopackFileSystemCacheForBuild: false,
    turbopackSourceMaps: false,
    ...(process.env.NODE_ENV !== "development" && {
      turbopackPluginRuntimeStrategy: "workerThreads",
    }),
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
      // The blocks gallery is removed for now.
      {
        source: "/blocks/:path*",
        destination: "/docs/components",
        permanent: false,
      },
      {
        source: "/blocks",
        destination: "/docs/components",
        permanent: false,
      },
      // Form and the removed /docs/forms guides redirect to Field.
      {
        source: "/docs/forms/:path*",
        destination: "/docs/components/base/field",
        permanent: true,
      },
      {
        source: "/docs/forms",
        destination: "/docs/components/base/field",
        permanent: true,
      },
      {
        source: "/docs/components/form",
        destination: "/docs/components/base/field",
        permanent: true,
      },
      {
        source: "/docs/components/radix/form",
        destination: "/docs/components/radix/field",
        permanent: true,
      },
      {
        source: "/docs/components/base/form",
        destination: "/docs/components/base/field",
        permanent: true,
      },
      {
        source: "/docs/components/aria/form",
        destination: "/docs/components/aria/field",
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
      // Native Select isn't part of the Fabricator library; Select replaces it.
      {
        source: "/docs/components/:base(base|radix|aria)/native-select",
        destination: "/docs/components/:base/select",
        permanent: false,
      },
      {
        source: "/docs/components/:base(base|radix|aria)/native-select.md",
        destination: "/docs/components/:base/select.md",
        permanent: false,
      },
      // The Colors page isn't part of the site for now.
      {
        source: "/colors/:path*",
        destination: "/docs/foundations/colors",
        permanent: false,
      },
      // Chart isn't part of the Fabricator library for now.
      {
        source: "/charts/:path*",
        destination: "/docs/components",
        permanent: false,
      },
      {
        source: "/docs/components/:base(base|radix|aria)/chart",
        destination: "/docs/components",
        permanent: false,
      },
      {
        source: "/docs/components/:base(base|radix|aria)/chart.md",
        destination: "/docs/components",
        permanent: false,
      },
      // Theming is removed, and Surfaces is part of Colors: Colors covers
      // every colour token.
      {
        source: "/docs/theming",
        destination: "/docs/foundations/colors",
        permanent: true,
      },
      {
        source: "/docs/theming.md",
        destination: "/docs/foundations/colors.md",
        permanent: true,
      },
      {
        source: "/docs/foundations/surfaces",
        destination: "/docs/foundations/colors",
        permanent: true,
      },
      {
        source: "/docs/foundations/surfaces.md",
        destination: "/docs/foundations/colors.md",
        permanent: true,
      },
      // Scrollbars moved from Foundations to Utilities.
      {
        source: "/docs/foundations/scrollbars",
        destination: "/docs/utils/scrollbars",
        permanent: true,
      },
      {
        source: "/docs/foundations/scrollbars.md",
        destination: "/docs/utils/scrollbars.md",
        permanent: true,
      },
      // RTL isn't part of Fabricator UI.
      {
        source: "/docs/rtl",
        destination: "/docs",
        permanent: false,
      },
      {
        source: "/docs/rtl/:path*",
        destination: "/docs",
        permanent: false,
      },
      {
        source: "/docs/rtl.md",
        destination: "/docs.md",
        permanent: false,
      },
      {
        source: "/docs/components/:base(base|radix|aria)/direction",
        destination: "/docs/components",
        permanent: false,
      },
      {
        source: "/examples/rtl",
        destination: "/examples/dashboard",
        permanent: false,
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
        destination: "/docs/foundations/colors",
        permanent: true,
      },
      {
        source: "/code/:path*",
        destination: `${GITHUB_RAW_URL}/:path*`,
        permanent: false,
      },
      // Registry: the removed blend-mode URLs (/r/{style}/{name}.json and
      // upstream-style /r/styles/...) now serve the Fabricator style, so
      // projects initialized with them keep installing.
      {
        source:
          "/r/:style((?:base|radix|aria)-[a-z]+|new-york-v4|new-york)/:name",
        destination: "/r/fabricator/:style/:name",
        permanent: true,
      },
      {
        source:
          "/r/styles/:style((?:base|radix|aria)-(?!fabricator)[a-z]+|new-york-v4)/:name",
        destination: "/r/fabricator/:style/:name",
        permanent: true,
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
            value:
              "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
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
      // Registry. Serves the Fabricator style compiled for
      // the base in the project's style id (e.g. base-nova -> base-fabricator).
      {
        source: "/r/fabricator/:base(base|radix|aria)-:style/:name",
        destination: "/r/styles/:base-fabricator/:name",
      },
      {
        source: "/r/fabricator/:style(new-york|new-york-v4|default)/:name",
        destination: "/r/styles/radix-fabricator/:name",
      },
    ]
  },
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
