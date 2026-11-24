import type { ComponentProps } from "react"

type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string | { pathname?: string; hash?: string }
  prefetch?: boolean
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  locale?: string | false
}

function Link({
  href,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  locale: _locale,
  ...props
}: LinkProps) {
  const destination =
    typeof href === "string" ? href : `${href.pathname ?? ""}${href.hash ?? ""}`
  return <a href={destination} {...props} />
}

export { Link as default }
