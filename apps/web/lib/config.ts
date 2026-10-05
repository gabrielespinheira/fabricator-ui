const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL || "https://fabricator-ui.com"
).replace(/\/$/, "")

export const siteConfig = {
  name: "Fabricator UI",
  url: siteUrl,
  ogImage: `${siteUrl}/opengraph-image.png`,
  description:
    "The foundation for your design system. Open-code React components for Base UI, Radix and React Aria, with a design language of their own.",
  links: {
    github: "https://github.com/gabrielespinheira/fabricator-ui",
  },
  navItems: [
    {
      href: "/",
      label: "Home",
    },
    {
      href: "/docs/installation",
      label: "Docs",
    },
    {
      href: "/docs/components",
      label: "Components",
    },
    {
      href: "/blocks",
      label: "Blocks",
    },
    {
      href: "/charts/area",
      label: "Charts",
    },
    {
      href: "/create",
      label: "Create",
    },
    {
      href: "/colors",
      label: "Colors",
    },
  ],
}

// "owner/repo" derived from siteConfig.links.github, for the GitHub API.
export const githubRepo = new URL(siteConfig.links.github).pathname.replace(
  /^\/|\/$/g,
  ""
)

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}
